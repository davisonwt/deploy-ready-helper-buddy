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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import { DonateModal } from './DonateModal';
import Peer from 'peerjs';

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

  useEffect(() => {
    if (roomId && user) {
      fetchRoomInfo();
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [roomId, user]);

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

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: roomId,
          sender_id: user.id,
          sender_profile_id: null,
          content: message.trim(),
          message_type: 'text'
        }]);

      if (error) throw error;
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
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

      // Send file message
      await supabase.from('chat_messages').insert([{
        room_id: roomId,
        sender_id: user.id,
        sender_profile_id: null,
        message_type: 'file',
        file_url: publicUrl,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size
      }]);
      
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
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === user.id}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DonateModal
        isOpen={showDonate}
        onClose={() => setShowDonate(false)}
        hostWallet={roomInfo?.created_by}
        hostName={roomInfo?.name}
      />
    </div>
  );
};
