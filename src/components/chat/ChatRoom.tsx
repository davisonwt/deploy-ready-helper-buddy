import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Send,
  Mic,
  Paperclip,
  Phone,
  PhoneOff,
  Video,
  DollarSign,
  Loader2,
  Edit2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import { DonateModal } from './DonateModal';
import { useCallManager } from '@/hooks/useCallManager';
import Peer from 'peerjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ChatRoomProps {
  roomId: string;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCall } = useCallManager();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const scrollAreaRef = useRef(null);
  
  // Voice recording
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  
  // WebRTC call
  const [callActive, setCallActive] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // Donations
  const [showDonate, setShowDonate] = useState(false);

  // Typing indicators
  const [usersTyping, setUsersTyping] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Message editing
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Message replies
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // In-room invites
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (roomId && user) {
      console.debug('[ChatRoom] init', { roomId, userId: user.id });
      fetchRoomInfo();
      fetchMessages();
      fetchParticipants();
      setupRealtimeSubscription();
      setupTypingSubscription();
    }
  }, [roomId, user]);

  // Setup typing indicator subscription
  const setupTypingSubscription = () => {
    const channel = supabase
      .channel(`typing:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing',
          filter: `room_id=eq.${roomId}`
        } as any,
        (payload: any) => {
          if (payload.new && payload.new.user_id !== user.id) {
            setUsersTyping(prev => {
              const filtered = prev.filter(id => id !== payload.new.user_id);
              if (payload.new.is_typing) {
                return [...filtered, payload.new.user_id];
              }
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const fetchRoomInfo = async () => {
    console.debug('[ChatRoom] fetchRoomInfo start', { roomId, userId: user?.id });
    try {
      // First try: if user is the creator, fetch room directly
      const { count: creatorCount } = await supabase
        .from('chat_rooms')
        .select('id', { count: 'exact', head: true })
        .eq('id', roomId)
        .eq('created_by', user.id);

      if ((creatorCount || 0) > 0) {
        const { data: room } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();
        if (room) {
          setRoomInfo(room);
          return;
        }
      }

      // Fallback: participant-based access (works for members)
      const { data, error } = await supabase
        .from('chat_participants')
        .select('chat_rooms!inner(*)')
        .eq('user_id', user.id)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      const room = (data as any)?.chat_rooms || null;
      if (!room || room.is_active === false) {
        toast({ title: 'Chat unavailable', description: 'This chat no longer exists or was archived.' });
        onBack?.();
        return;
      }

      setRoomInfo(room);
    } catch (error) {
      console.error('Error fetching room info:', error);
      toast({ title: 'Chat unavailable', description: 'Could not open this chat.' });
      onBack?.();
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      console.debug('[ChatRoom] fetchMessages start', { roomId });
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.debug('[ChatRoom] fetchMessages loaded', { count: (data || []).length });
      
      // Fetch profiles separately for all unique sender IDs
      const senderIds = Array.from(new Set((data || []).map(m => m.sender_id)));
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', senderIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        
        // Enrich messages with profile data
        const enriched = (data || []).map(msg => ({
          ...msg,
          sender_profile: profileMap.get(msg.sender_id) || null
        }));
        
        setMessages(enriched);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Participants
  const fetchParticipants = async () => {
    try {
      // Fetch active participants without relying on a missing FK relationship
      const { data: partRows, error: partErr } = await supabase
.from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_active', true);
      if (partErr) throw partErr;

      const ids = (partRows || []).map((r: any) => r.user_id);
      setParticipantIds(ids);

      if (ids.length === 0) {
        setParticipants([]);
        return;
      }

      // Fetch profiles separately and merge
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', ids);
      if (profErr) throw profErr;

      const profileById: Record<string, any> = Object.fromEntries(
        (profs || []).map((p: any) => [p.user_id, p])
      );

      const enriched = ids.map((uid: string) => ({
        user_id: uid,
        profiles: profileById[uid] || null,
      }));

      setParticipants(enriched);
    } catch (e) {
      console.error('Error fetching participants:', e);
      setParticipants([]);
    }
  };

  // Fallback: If RLS prevents seeing other participants, infer from messages
  useEffect(() => {
    const inferOther = async () => {
      try {
        if (!user?.id) return;
        if ((participants || []).length >= 2) return;
        const otherId = (messages || []).map((m:any) => m.sender_id).find((id:string) => id && id !== user.id);
        if (!otherId) return;
        if (participants.some((p:any) => p.user_id === otherId)) return;
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .eq('user_id', otherId)
          .maybeSingle();
        setParticipants(prev => [...prev, { user_id: otherId, profiles: prof || null }]);
      } catch (e) {
        console.warn('Participant inference failed:', e);
      }
    };
    inferOther();
  }, [participants, messages, user?.id]);
  // Ensure current user is a member of this room before sending
  const ensureMembership = async () => {
    try {
      if (!participantIds.includes(user.id)) {
        const { error } = await supabase
          .from('chat_participants')
          .insert({ room_id: roomId, user_id: user.id, is_moderator: false, is_active: true } as any);
        // Ignore duplicate errors
        if (error && (error as any)?.code !== '23505') throw error;
        await fetchParticipants();
      }
    } catch (e) {
      console.error('ensureMembership error:', e);
    }
  };

  useEffect(() => {
    if (roomId && user) {
      fetchParticipants();
    }
  }, [roomId, user]);

  // Load available users when invite dialog is open or search changes
  useEffect(() => {
    const run = async () => {
      if (!inviteOpen) return;
      try {
        setLoadingUsers(true);
        let query = supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .neq('user_id', user.id)
          .limit(20);
        if (inviteSearch.trim()) {
          query = query.or(`display_name.ilike.%${inviteSearch}%,first_name.ilike.%${inviteSearch}%,last_name.ilike.%${inviteSearch}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        // Filter out blank names and current participants
        const filtered = (data || []).filter((u: any) => {
          const name = (u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim());
          return !participantIds.includes(u.user_id) && name.length > 1 && name !== ' ';
        });
        setAvailableUsers(filtered);
      } catch (e: any) {
        console.error('Error loading users:', e);
      } finally {
        setLoadingUsers(false);
      }
    };
    run();
  }, [inviteOpen, inviteSearch, participantIds, user?.id]);

  const toggleInvitee = (uid: string) => {
    setSelectedInvitees(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleInvite = async () => {
    if (selectedInvitees.length === 0) return;
    try {
      const rows = selectedInvitees.map(uid => ({
        room_id: roomId,
        user_id: uid,
        is_moderator: false,
        is_active: true
      }));
      const { error } = await supabase.from('chat_participants').insert(rows);
      if (error) throw error;
      toast({ title: 'Invitations sent', description: `${selectedInvitees.length} user(s) invited` });
      setInviteOpen(false);
      setSelectedInvitees([]);
      setInviteSearch('');
      fetchParticipants();
    } catch (e: any) {
      console.error('Invite error:', e);
      toast({ variant: 'destructive', title: 'Invite failed', description: e.message });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch the message and its sender profile separately
          const { data: msg } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('id', payload.new.id)
            .maybeSingle();

          if (msg) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, display_name, first_name, last_name, avatar_url')
              .eq('user_id', msg.sender_id)
              .maybeSingle();
            
            setMessages(prev => [...prev, { ...msg, sender_profile: profile || null }]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
        () => {
          toast({ title: 'Chat removed', description: 'This chat was deleted.' });
          onBack?.();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if ((payload.new as any)?.is_active === false) {
            toast({ title: 'Chat archived', description: 'This chat is no longer available.' });
            onBack?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status (ignore errors if table doesn't exist yet)
    supabase
      .from('typing' as any)
      .upsert({ room_id: roomId, user_id: user.id, is_typing: true } as any, { onConflict: 'room_id,user_id' } as any)
      .then(() => {
        typingTimeoutRef.current = setTimeout(async () => {
          try {
            await supabase
              .from('typing' as any)
              .delete()
              .eq('room_id', roomId)
              .eq('user_id', user.id);
          } catch (e) {
            // Ignore typing errors
          }
        }, 2000);
      });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      // Ensure membership so RPC passes membership check
      await ensureMembership();
      // Use secure RPC that enforces membership and inserts as the current user
      const { data: inserted, error } = await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: replyingTo ? `@${replyingTo.sender_profile?.display_name || 'user'}: ${message.trim()}` : message.trim(),
        p_message_type: 'text'
      });

      if (error) throw error;

      // Optimistically append so it shows even if realtime publication isn't enabled
      if (inserted) setMessages(prev => [...prev, inserted]);
      setMessage('');
      setReplyingTo(null);

      // Typing clear best-effort
      try {
        await supabase
          .from('typing' as any)
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      } catch (e) {}
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send',
        description: error?.message || 'Could not send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast({ title: 'Message deleted' });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content: newContent, is_edited: true })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, content: newContent, is_edited: true } : msg
        )
      );

      setEditingMessageId(null);
      toast({ title: 'Message updated' });
    } catch (error: any) {
      toast({
        title: 'Edit failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `chat-files/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      // Determine file type
      let fileType: 'audio' | 'document' | 'image' | 'video' = 'document';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';

      await ensureMembership();
      const { data: inserted, error } = await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: '[File]',
        p_message_type: 'file',
        p_file_url: publicUrl,
        p_file_name: file.name,
        p_file_type: fileType,
        p_file_size: file.size
      });
      if (error) throw error;
      if (inserted) setMessages(prev => [...prev, inserted]);
      
      toast({
        title: 'File uploaded',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'voice-note.wav', { type: 'audio/wav' });
        await handleFileUpload(file);
        stream.getTracks().forEach((track) => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setRecording(true);
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecording(false);
        }
      }, 60000);
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        variant: 'destructive',
        title: 'Recording failed',
        description: 'Could not access microphone',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleCallClick = async () => {
    try {
      await ensureMembership();
      await fetchParticipants();

      const otherParticipant = participants.find(p => p.user_id !== user?.id);
      if (!otherParticipant) {
        toast({ title: 'No other participants', description: 'Add someone to this chat before calling.', variant: 'destructive' });
        return;
      }

      const receiverName = otherParticipant.profiles?.display_name
        || `${otherParticipant.profiles?.first_name || ''} ${otherParticipant.profiles?.last_name || ''}`.trim()
        || 'Unknown User';

      await startCall(otherParticipant.user_id, receiverName, 'audio', roomId);
    } catch (err) {
      console.error('Call start error:', err);
      toast({ title: 'Call Failed', description: 'Unable to start the call', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {roomInfo?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{roomInfo?.name}</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {roomInfo?.room_type === 'direct' ? 'Direct Message' : 'Group Chat'}
                </p>
                {participants.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex -space-x-2">
                      {participants.slice(0, 3).map((p: any) => (
                        <Avatar key={p.user_id} className="h-5 w-5 border-2 border-background">
                          <AvatarImage src={p.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {(p.profiles?.display_name || p.profiles?.first_name || 'U')?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {participants.length} member{participants.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={recording ? 'destructive' : 'ghost'}
              size="sm"
              onClick={recording ? stopRecording : startRecording}
            >
              <Mic className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const otherParticipant = participants.find(p => p.user_id !== user?.id);
                if (!otherParticipant) {
                  toast({ title: 'No other participants', description: 'Unable to start call', variant: 'destructive' });
                  return;
                }
                
                const receiverName = otherParticipant.profiles?.display_name 
                  || `${otherParticipant.profiles?.first_name || ''} ${otherParticipant.profiles?.last_name || ''}`.trim()
                  || 'Unknown User';
                
                await startCall(otherParticipant.user_id, receiverName, 'audio', roomId);
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
            
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInviteOpen(true)}
            >
              Invite
            </Button>
            
            {roomInfo?.created_by === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm('Delete this entire chat room? This cannot be undone.')) return;
                  try {
                    await supabase.from('chat_messages').delete().eq('room_id', roomId);
                    await supabase.from('chat_participants').delete().eq('room_id', roomId);
                    await supabase.from('chat_rooms').delete().eq('id', roomId);
                    toast({ title: 'Room deleted' });
                    onBack();
                  } catch (error: any) {
                    toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Room
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDonate(true)}
            >
              <DollarSign className="h-4 w-4" />
            </Button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(handleFileUpload);
                }}
              />
              <Button variant="ghost" size="sm" asChild>
                <span>
                  <Paperclip className="h-4 w-4" />
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {/* Typing Indicator */}
        {usersTyping.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded-lg">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span>
              {usersTyping.slice(0, 2).join(', ')}
              {usersTyping.length > 2 && ' and others'} typing...
            </span>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => {
            const isEditing = editingMessageId === msg.id;
            const isOwn = msg.sender_id === user.id;

            return (
              <div key={msg.id} className="group">
                {replyingTo?.id === msg.id && (
                  <div className="mb-2 ml-12 p-2 bg-muted/50 rounded-lg border-l-2 border-primary text-xs">
                    <div className="flex items-center justify-between">
                      <span>Replying to this message</span>
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-5 px-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full px-4">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditMessage(msg.id, editText);
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleEditMessage(msg.id, editText)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`}>
                    <div className="flex flex-col gap-1">
                      <ChatMessage
                        message={msg}
                        isOwn={isOwn}
                        onDelete={isOwn ? () => handleDeleteMessage(msg.id) : undefined}
                      />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(msg)}
                          className="h-6 px-2 text-xs hover:bg-muted"
                        >
                          Reply
                        </Button>
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditText(msg.content || '');
                            }}
                            className="h-6 px-2 text-xs hover:bg-muted"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        {replyingTo && (
          <div className="mb-2 p-2 bg-muted rounded-lg border-l-2 border-primary text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold">Replying to:</span>
              <span className="ml-2 text-muted-foreground">{replyingTo.content?.substring(0, 50)}...</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 px-2">
              Cancel
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            disabled={sending}
            onFocus={handleTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Invite Users Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite users</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search users by name..."
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">Selected: {selectedInvitees.length}</div>
            <ScrollArea className="h-56 border rounded-md p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">Loading...</div>
              ) : availableUsers.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No users found</div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((u: any) => (
                    <div
                      key={u.user_id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => toggleInvitee(u.user_id)}
                    >
                      <Checkbox
                        checked={selectedInvitees.includes(u.user_id)}
                        onCheckedChange={() => toggleInvitee(u.user_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{(u.display_name || u.first_name || 'U')?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm truncate">
                        {u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={selectedInvitees.length === 0}>Invite</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Donate Modal */}
      <DonateModal
        isOpen={showDonate}
        onClose={() => setShowDonate(false)}
        hostWallet={roomInfo?.created_by}
        hostName={roomInfo?.name}
      />
    </div>
  );
};
