import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, Phone, Video, ArrowLeft, Shield, Wallet, 
  Users, Paperclip, Mic
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

interface Message {
  id: string;
  content: string | null;
  sender_id: string | null;
  created_at: string;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  sender_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface Participant {
  user_id: string;
  profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export default function GoSatChatPage() {
  const { user } = useAuth();
  const { isGosat, loading: rolesLoading } = useRoles();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
  const [orgWalletBalance, setOrgWalletBalance] = useState<string | null>(null);

  // Initialize room
  useEffect(() => {
    if (!user || rolesLoading) return;
    if (!isGosat) {
      navigate('/dashboard');
      return;
    }
    initRoom();
  }, [user, isGosat, rolesLoading]);

  const initRoom = async () => {
    try {
      setLoading(true);
      const { data: rid, error } = await supabase.rpc('get_or_create_gosat_room');
      if (error) throw error;
      setRoomId(rid);
      await Promise.all([loadMessages(rid), loadParticipants(rid), loadOrgBalance()]);
    } catch (err: any) {
      console.error('GoSat room init error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (rid: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, content, sender_id, created_at, message_type, file_url, file_name, sender_profile_id')
      .eq('room_id', rid)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;

    // Fetch sender profiles
    const senderIds = [...new Set((data || []).map(m => m.sender_id).filter(Boolean))];
    let profileMap: Record<string, any> = {};
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', senderIds);
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
    }

    setMessages((data || []).map(m => ({
      ...m,
      sender_profile: m.sender_id ? profileMap[m.sender_id] : undefined,
    })));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const loadParticipants = async (rid: string) => {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', rid)
      .eq('is_active', true);
    if (error) return;

    const userIds = (data || []).map(p => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url')
      .in('user_id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

    setParticipants(userIds.map(uid => ({ user_id: uid, profile: profileMap[uid] })));
  };

  const loadOrgBalance = async () => {
    try {
      const { data } = await supabase
        .from('organization_wallets')
        .select('wallet_name, wallet_address')
        .eq('is_active', true);
      if (data && data.length > 0) {
        setOrgWalletBalance(data[0].wallet_address || 'Not configured');
      }
    } catch { /* ignore */ }
  };

  // Real-time subscription
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`gosat-chat-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const msg = payload.new as any;
        let sender_profile;
        if (msg.sender_id) {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', msg.sender_id)
            .single();
          sender_profile = data;
        }
        setMessages(prev => [...prev, { ...msg, sender_profile }]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text',
      });
      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId || !user) return;

    try {
      const path = `gosat-chat/${roomId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);

      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: `📎 ${file.name}`,
        message_type: 'file',
        file_url: urlData.publicUrl,
        file_name: file.name,
      });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getSenderName = (msg: Message) => {
    if (!msg.sender_profile) return 'Unknown';
    return msg.sender_profile.display_name || 
      `${msg.sender_profile.first_name || ''} ${msg.sender_profile.last_name || ''}`.trim() || 
      'Unknown';
  };

  if (rolesLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <Shield className="h-8 w-8 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Loading GoSat HQ...</p>
        </div>
      </div>
    );
  }

  if (!isGosat) return null;

  // Active call overlay
  if (activeCall && roomId) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <JitsiRoom
          roomName={`gosat_hq_${activeCall}`}
          displayName={user?.user_metadata?.first_name || 'GoSat'}
          onLeave={() => setActiveCall(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">GoSat HQ</h1>
            <p className="text-xs text-muted-foreground">{participants.length} members</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setActiveCall('voice')}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setActiveCall('video')}>
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* S2G Balance Banner */}
      <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">S2G Organization Wallet</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {orgWalletBalance || 'Loading...'}
        </Badge>
      </div>

      {/* Members row */}
      <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto">
        <Users className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
        {participants.map(p => (
          <Avatar key={p.user_id} className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={p.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {(p.profile?.display_name || p.profile?.first_name || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Welcome to GoSat HQ</p>
              <p className="text-sm">Your private admin group chat. Start messaging!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                    {!isMe && (
                      <p className="text-xs font-medium text-primary mb-1 px-1">{getSenderName(msg)}</p>
                    )}
                    <div className={`rounded-2xl px-4 py-2 ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-muted rounded-bl-md'
                    }`}>
                      {msg.file_url ? (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="underline text-sm">
                          {msg.content || msg.file_name}
                        </a>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Message GoSat HQ..."
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
