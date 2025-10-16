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

  // In-room invites
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (roomId && user) {
      fetchRoomInfo();
      fetchMessages();
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
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoomInfo(data);
    } catch (error) {
      console.error('Error fetching room info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender_profile:profiles!chat_messages_sender_profile_id_fkey(
            id,
            user_id,
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
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
      const { data, error } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_active', true);
      if (error) throw error;
      setParticipantIds((data || []).map((r: any) => r.user_id));
    } catch (e) {
      console.error('Error fetching participants:', e);
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
        const filtered = (data || []).filter((u: any) => !participantIds.includes(u.user_id));
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
          // Fetch the full message with profile data
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender_profile:profiles!chat_messages_sender_profile_id_fkey(
                id,
                user_id,
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
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
      .upsert({ room_id: roomId, user_id: user.id, is_typing: true })
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
      
      const { data: inserted, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: message.trim(),
          message_type: 'text'
        })
        .select()
        .single();

      if (error) throw error;
      
      setMessage('');
      
      // Clear typing indicator
      try {
        await supabase
          .from('typing' as any)
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      } catch (e) {
        // Ignore if typing table doesn't exist
      }

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

      const { data: inserted, error } = await supabase.from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          message_type: 'file',
          file_url: publicUrl,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size
        })
        .select()
        .single();
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

  const toggleCall = async () => {
    if (!callActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoOn, 
          audio: true 
        });
        
        localStreamRef.current = stream;
        peerRef.current = new Peer(user.id);
        
        setCallActive(true);
        
        toast({
          title: 'Call started',
          description: 'You are now in the call',
        });
      } catch (error) {
        console.error('Call error:', error);
        toast({
          variant: 'destructive',
          title: 'Call failed',
          description: 'Could not start call',
        });
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      setCallActive(false);
      setVideoOn(false);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoOn;
        setVideoOn(!videoOn);
      }
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
              <p className="text-xs text-muted-foreground">
                {roomInfo?.room_type === 'direct' ? 'Direct Message' : 'Group Chat'}
              </p>
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
              variant={callActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={toggleCall}
            >
              {callActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            </Button>
            
            {callActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleVideo}
              >
                <Video className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInviteOpen(true)}
            >
              Invite
            </Button>
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
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full">
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
                      <Button
                        size="sm"
                        onClick={() => handleEditMessage(msg.id, editText)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingMessageId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ChatMessage
                        message={msg}
                        isOwn={isOwn}
                      />
                      {isOwn && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditText(msg.content || '');
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
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
            placeholder="Type a message..."
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
