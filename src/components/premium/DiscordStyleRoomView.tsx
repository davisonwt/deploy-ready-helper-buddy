import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, Mic, Video, Phone, PhoneOff, Paperclip, 
  Users, Music, FileText, Image as ImageIcon,
  Settings, Crown, Smile, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import ChatMessage from '@/components/chat/ChatMessage';
import { useCallManager } from '@/hooks/useCallManager';
import { PremiumRoomMedia } from './PremiumRoomMedia';

interface DiscordStyleRoomViewProps {
  room: any;
  hasAccess: boolean;
  isCreator: boolean;
}

export const DiscordStyleRoomView: React.FC<DiscordStyleRoomViewProps> = ({ 
  room, 
  hasAccess, 
  isCreator 
}) => {
  const { user } = useAuth();
  const { toast: toastHook } = { toast };
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'media'>('chat');
  const [callActive, setCallActive] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for this room
  useEffect(() => {
    if (!hasAccess) return;
    
    const fetchMessages = async () => {
      try {
        // Fetch messages without the join first
        const { data: msgData, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        // Fetch sender profiles separately
        if (msgData && msgData.length > 0) {
          const senderIds = [...new Set(msgData.map(m => m.sender_id).filter(Boolean))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', senderIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          const messagesWithProfiles = msgData.map(msg => ({
            ...msg,
            sender_profile: msg.sender_id ? profileMap.get(msg.sender_id) : null
          }));
          setMessages(messagesWithProfiles);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`premium-room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', payload.new.sender_id)
            .single();

          setMessages(prev => [...prev, { 
            ...payload.new, 
            sender_profile: profile 
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, hasAccess]);

  // Fetch participants
  useEffect(() => {
    if (!hasAccess) return;

    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_participants')
          .select(`
            user_id,
            profiles(user_id, display_name, avatar_url)
          `)
          .eq('room_id', room.id)
          .eq('is_active', true);

        if (error) throw error;
        setParticipants(data || []);
      } catch (error) {
        console.error('Error fetching participants:', error);
      }
    };

    fetchParticipants();
  }, [room.id, hasAccess]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !hasAccess) return;

    try {
      setSending(true);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: room.id,
          sender_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };


  const toggleCall = () => {
    setCallActive(!callActive);
    if (!callActive) {
      toast.success('Call started');
    } else {
      toast.info('Call ended');
    }
  };

  const toggleVideo = () => {
    setVideoOn(!videoOn);
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Required</h2>
          <p className="text-muted-foreground mb-4">
            You need to purchase access to this premium room
          </p>
          <Button>Purchase Access</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Participants */}
      <div className="w-60 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-bold text-lg truncate">{room.title}</h2>
            {isCreator && <Crown className="h-4 w-4 text-primary" />}
          </div>
          <Badge variant="secondary" className="text-xs">{room.room_type}</Badge>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="h-3 w-3" />
                PARTICIPANTS — {participants.length}
              </h3>
              <div className="space-y-1">
                {participants.map((participant: any) => (
                  <div 
                    key={participant.user_id} 
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.profiles?.avatar_url} />
                      <AvatarFallback>
                        {participant.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">
                      {participant.profiles?.display_name || 'Unknown User'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - Chat */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar with Tabs */}
        <div className="border-b border-border">
          <div className="h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold">general-chat</h1>
              <Separator orientation="vertical" className="h-6" />
              <p className="text-sm text-muted-foreground truncate max-w-md">
                {room.description}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={callActive ? "destructive" : "ghost"}
                size="sm"
                onClick={toggleCall}
              >
                {callActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              </Button>
              <Button
                variant={videoOn ? "default" : "ghost"}
                size="sm"
                onClick={toggleVideo}
                disabled={!callActive}
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-t border-border">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-muted text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'media'
                  ? 'bg-muted text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Music className="h-4 w-4" />
              Media
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'chat' ? (
          <>
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      onDelete={isOwn ? async (id) => {
                        await supabase.from('chat_messages').delete().eq('id', id);
                        setMessages(prev => prev.filter(m => m.id !== id));
                        toast.success('Message deleted');
                      } : undefined}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <PremiumRoomMedia 
              roomId={room.id} 
              isCreator={isCreator}
              userId={user?.id}
            />
          </div>
        )}
      </div>

      {/* Right Sidebar - Participants Info */}
      <div className="w-80 border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm mb-3">About</h3>
          <p className="text-sm text-muted-foreground">{room.description}</p>
        </div>
        <Separator />
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-3">Room Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(room.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Participants</span>
              <span>{room.max_participants}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{room.room_type}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
