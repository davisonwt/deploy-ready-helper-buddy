/**
 * UnifiedConversation - WhatsApp-style unified chat + call experience
 * Merges text messaging with voice/video calls in a single seamless interface
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallManager } from '@/hooks/useCallManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationHeader } from './ConversationHeader';
import { ActiveCallBar } from './ActiveCallBar';
import { CallEventBubble, CallEventType, CallStatus } from './CallEventBubble';
import { MessageInput } from './MessageInput';
import { OnlineIndicator } from './OnlineIndicator';
import ChatMessage from './ChatMessage';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface UnifiedConversationProps {
  roomId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  sender_id: string | null;
  created_at: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  reply_to_id?: string;
  is_edited?: boolean;
  sender_profile?: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface Participant {
  user_id: string;
  profiles?: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export const UnifiedConversation: React.FC<UnifiedConversationProps> = ({
  roomId,
  onBack,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCall, currentCall, endCall } = useCallManager();
  
  // Room and messages state
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callStartTime, setCallStartTime] = useState<number>(0);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [jitsiRoomName, setJitsiRoomName] = useState('');
  
  // UI state
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [usersTyping, setUsersTyping] = useState<string[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const jitsiApiRef = useRef<any>(null);

  // Get the other participant for direct chats
  const otherParticipant = participants.find(p => p.user_id !== user?.id);
  const displayName = otherParticipant?.profiles?.display_name || 
    `${otherParticipant?.profiles?.first_name || ''} ${otherParticipant?.profiles?.last_name || ''}`.trim() ||
    roomInfo?.name || 'Chat';

  // Fetch room info and messages
  useEffect(() => {
    if (roomId && user) {
      fetchRoomInfo();
      fetchMessages();
      fetchParticipants();
      setupRealtimeSubscription();
    }
  }, [roomId, user]);

  // Track currentCall from useCallManager
  useEffect(() => {
    if (currentCall && currentCall.status === 'accepted') {
      setIsCallActive(true);
      setCallType(currentCall.type || 'audio');
      setCallStartTime(currentCall.startTime || Date.now());
      setJitsiRoomName(currentCall.id.replace(/-/g, '').substring(0, 12));
    } else if (!currentCall) {
      setIsCallActive(false);
      setJitsiRoomName('');
    }
  }, [currentCall]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const fetchRoomInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('chat_rooms!inner(*)')
        .eq('user_id', user?.id)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setRoomInfo((data as any)?.chat_rooms || null);
    } catch (error) {
      console.error('Error fetching room:', error);
      toast({ title: 'Error', description: 'Could not load chat', variant: 'destructive' });
      onBack();
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich with profiles
      const senderIds = Array.from(new Set((data || []).map(m => m.sender_id).filter(Boolean)));
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const enriched = (data || []).map(msg => ({
          ...msg,
          sender_profile: profileMap.get(msg.sender_id) || null,
        }));
        setMessages(enriched);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data: partRows } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_active', true);

      const ids = (partRows || []).map((r: any) => r.user_id);
      if (ids.length === 0) {
        setParticipants([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', ids);

      const profileById = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      setParticipants(ids.map((uid: string) => ({
        user_id: uid,
        profiles: profileById[uid] || null,
      })));
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender profile
          if (newMsg.sender_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, display_name, first_name, last_name, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .single();
            newMsg.sender_profile = profile || undefined;
          }
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Handlers
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;

    try {
      console.log('💬 [UnifiedConv] Sending message to room:', roomId, 'content:', content.substring(0, 50));
      const { data, error } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: content.trim(),
        message_type: 'text',
        reply_to_id: replyingTo?.id || null,
      }).select().single();

      if (error) {
        console.error('💬 [UnifiedConv] Message send error:', error);
        throw error;
      }
      console.log('💬 [UnifiedConv] Message sent successfully:', data?.id);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleVoiceCall = async () => {
    console.log('📞 [UnifiedConv] handleVoiceCall called', { otherParticipant, startCall: !!startCall, roomType: roomInfo?.room_type, participants: participants.length });
    
    // For group chats or when no single other participant, use JitsiRoom directly
    if (!otherParticipant) {
      if (participants.length > 1) {
        // Group call - start Jitsi room
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let rn = `S2G_${roomId.replace(/-/g, '').slice(0, 8)}_`;
        for (let i = 0; i < 8; i++) rn += chars.charAt(Math.floor(Math.random() * chars.length));
        setJitsiRoomName(rn);
        setIsCallActive(true);
        setCallType('audio');
        setCallStartTime(Date.now());
        toast({ title: 'Starting voice call', description: 'Connecting...' });
        return;
      }
      toast({ title: 'Error', description: 'No participants found to call', variant: 'destructive' });
      return;
    }
    
    if (!startCall) {
      toast({ title: 'Error', description: 'Call system not initialized. Please refresh.', variant: 'destructive' });
      return;
    }
    
    try {
      const result = await startCall(otherParticipant.user_id, displayName, 'audio', roomId);
      console.log('📞 [UnifiedConv] startCall result:', result);
      if (!result) {
        toast({ title: 'Call Failed', description: 'Could not start the call. Try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast({ title: 'Error', description: 'Failed to start call', variant: 'destructive' });
    }
  };

  const handleVideoCall = async () => {
    console.log('📞 [UnifiedConv] handleVideoCall called', { otherParticipant, startCall: !!startCall, roomType: roomInfo?.room_type, participants: participants.length });
    
    // For group chats or when no single other participant, use JitsiRoom directly
    if (!otherParticipant) {
      if (participants.length > 1) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let rn = `S2G_${roomId.replace(/-/g, '').slice(0, 8)}_`;
        for (let i = 0; i < 8; i++) rn += chars.charAt(Math.floor(Math.random() * chars.length));
        setJitsiRoomName(rn);
        setIsCallActive(true);
        setCallType('video');
        setCallStartTime(Date.now());
        toast({ title: 'Starting video call', description: 'Connecting...' });
        return;
      }
      toast({ title: 'Error', description: 'No participants found to call', variant: 'destructive' });
      return;
    }
    
    if (!startCall) {
      toast({ title: 'Error', description: 'Call system not initialized. Please refresh.', variant: 'destructive' });
      return;
    }
    
    try {
      const result = await startCall(otherParticipant.user_id, displayName, 'video', roomId);
      console.log('📞 [UnifiedConv] startCall result:', result);
      if (!result) {
        toast({ title: 'Call Failed', description: 'Could not start the call. Try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({ title: 'Error', description: 'Failed to start call', variant: 'destructive' });
    }
  };

  const handleEndCall = () => {
    if (currentCall?.id) {
      endCall(currentCall.id, 'ended');
    }
    setIsCallActive(false);
    setJitsiRoomName('');
  };

  const handleToggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  };

  const handleToggleVideo = () => {
    setIsVideoMuted(!isVideoMuted);
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  };

  const handleTyping = useCallback(() => {
    // Debounced typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Send typing indicator here if needed
    typingTimeoutRef.current = setTimeout(() => {
      // Clear typing indicator
    }, 3000);
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      const filePath = `chat/${roomId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);

      await supabase.from('chat_messages').insert([{
        room_id: roomId,
        sender_id: user?.id,
        content: file.name,
        message_type: 'file',
        file_url: urlData.publicUrl,
        file_name: file.name,
      }]);

      toast({ title: 'File sent' });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
    }
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    try {
      const fileName = `voice_${Date.now()}.webm`;
      const filePath = `chat/${roomId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);

      await supabase.from('chat_messages').insert([{
        room_id: roomId,
        sender_id: user?.id,
        content: `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        message_type: 'voice',
        file_url: urlData.publicUrl,
        file_name: fileName,
      }]);

      toast({ title: 'Voice message sent' });
    } catch (error) {
      console.error('Error sending voice:', error);
      toast({ title: 'Error', description: 'Failed to send voice message', variant: 'destructive' });
    }
  };

  const loadAvailableUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url')
      .not('user_id', 'in', `(${participants.map(p => p.user_id).join(',')})`)
      .limit(50);
    setAvailableUsers(data || []);
  };

  const handleAddPeople = () => {
    loadAvailableUsers();
    setShowInviteDialog(true);
  };

  // Render call event bubble
  const renderCallEvent = (msg: Message) => {
    try {
      const data = JSON.parse(msg.content || '{}');
      return (
        <CallEventBubble
          eventType={data.event_type as CallEventType}
          status={data.status as CallStatus}
          duration={data.duration}
          timestamp={new Date(msg.created_at)}
          participantCount={data.participant_count}
          isOwn={msg.sender_id === user?.id}
          onClick={() => {
            // Redial on click
            if (data.event_type?.includes('video')) {
              handleVideoCall();
            } else {
              handleVoiceCall();
            }
          }}
        />
      );
    } catch {
      return null;
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Transforms during calls */}
      <AnimatePresence mode="wait">
        {isCallActive && !isCallMinimized ? (
          <motion.div
            key="call-bar"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ActiveCallBar
              callType={callType}
              callStartTime={callStartTime}
              participantCount={participants.length}
              participantName={displayName}
              participantAvatar={otherParticipant?.profiles?.avatar_url}
              isAudioMuted={isAudioMuted}
              isVideoMuted={isVideoMuted}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onAddPeople={handleAddPeople}
              onEndCall={handleEndCall}
              onToggleMinimize={() => setIsCallMinimized(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ConversationHeader
              roomName={roomInfo?.name}
              roomType={roomInfo?.room_type === 'direct' ? 'direct' : 'group'}
              participants={participants}
              currentUserId={user.id}
              isCallActive={isCallActive}
              onBack={onBack}
              onVoiceCall={handleVoiceCall}
              onVideoCall={handleVideoCall}
              onInvite={handleAddPeople}
              onViewProfile={() => {
                toast({ title: 'View Profile', description: `Viewing ${displayName}'s profile` });
              }}
              onMute={() => {
                toast({ title: 'Muted', description: 'Notifications muted for this conversation' });
              }}
              onDelete={async () => {
                if (!confirm('Delete this conversation? This cannot be undone.')) return;
                try {
                  await supabase.from('chat_messages').delete().eq('room_id', roomId);
                  await supabase.from('chat_participants').delete().eq('room_id', roomId);
                  await supabase.from('chat_rooms').delete().eq('id', roomId);
                  toast({ title: 'Deleted', description: 'Conversation has been deleted' });
                  onBack();
                } catch (error) {
                  toast({ title: 'Error', description: 'Failed to delete conversation', variant: 'destructive' });
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Call Banner */}
      <AnimatePresence>
        {isCallActive && isCallMinimized && (
          <ActiveCallBar
            callType={callType}
            callStartTime={callStartTime}
            participantCount={participants.length}
            participantName={displayName}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            isMinimized
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onAddPeople={handleAddPeople}
            onEndCall={handleEndCall}
            onToggleMinimize={() => setIsCallMinimized(false)}
          />
        )}
      </AnimatePresence>

      {/* Embedded Call (when active and not minimized) */}
      <AnimatePresence>
        {isCallActive && jitsiRoomName && !isCallMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: callType === 'video' ? 300 : 80, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden border-b"
          >
            <JitsiRoom
              roomName={jitsiRoomName}
              displayName={user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}
              onLeave={handleEndCall}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-2">
        {/* Typing Indicator */}
        {usersTyping.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded-lg"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 bg-primary rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <span>typing...</span>
          </motion.div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user.id;

            // Render call events specially
            if (msg.message_type === 'call_event') {
              return <div key={msg.id}>{renderCallEvent(msg)}</div>;
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <ChatMessage
                  message={msg}
                  isOwn={isOwn}
                  onReply={() => setReplyingTo(msg)}
                />
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Message Input - Always visible, even during calls */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendVoice={handleSendVoice}
        onSendFile={handleFileUpload}
        onTyping={handleTyping}
        replyingTo={replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.sender_profile?.display_name || 'User',
        } : null}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add People {isCallActive ? 'to Call' : 'to Chat'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No users available</p>
            ) : (
              <div className="space-y-2">
                {availableUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => {
                      if (selectedInvitees.includes(u.user_id)) {
                        setSelectedInvitees(prev => prev.filter(id => id !== u.user_id));
                      } else {
                        setSelectedInvitees(prev => [...prev, u.user_id]);
                      }
                    }}
                  >
                    <Checkbox checked={selectedInvitees.includes(u.user_id)} />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>
                        {(u.display_name || u.first_name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button disabled={selectedInvitees.length === 0}>
              {isCallActive ? 'Add to Call' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
