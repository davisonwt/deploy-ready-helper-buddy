import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Users, Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string | null;
  sender_id: string | null;
  created_at: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  sender_profile?: {
    display_name: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

const CommunityChatPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get or create community room
  useEffect(() => {
    if (!user?.id) return;
    const init = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_or_create_community_room');
        if (error) throw error;
        setRoomId(data);
      } catch (err: any) {
        console.error('Error initializing community room:', err);
        toast({ title: 'Error', description: 'Failed to load community chat', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.id]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;

      const senderIds = [...new Set((msgs || []).map(m => m.sender_id).filter(Boolean))];
      let profiles: any[] = [];
      if (senderIds.length > 0) {
        const { data: p } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, first_name, last_name')
          .in('user_id', senderIds);
        profiles = p || [];
      }

      const enriched = (msgs || []).map(m => ({
        ...m,
        sender_profile: profiles.find(p => p.user_id === m.sender_id) || {
          display_name: 'Unknown', first_name: 'Unknown', last_name: '', avatar_url: null,
        },
      }));
      setMessages(enriched);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [roomId]);

  // Fetch participant count
  useEffect(() => {
    if (!roomId) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('chat_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('is_active', true);
      setParticipantCount(count || 0);
    };
    fetchCount();
  }, [roomId]);

  // Load messages and subscribe to realtime
  useEffect(() => {
    if (!roomId) return;
    fetchMessages();

    const channel = supabase
      .channel(`community-chat-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchMessages();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchMessages]);

  // Delete message
  const handleDelete = async (msgId: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId)
        .eq('sender_id', user?.id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  // Edit message

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.content || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content: editText.trim(), is_edited: true })
        .eq('id', editingId)
        .eq('sender_id', user?.id);
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: editText.trim(), is_edited: true } : m));
      cancelEdit();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to edit', variant: 'destructive' });
    }
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !roomId || !user?.id) return;
    try {
      setSending(true);
      const { error } = await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: newMessage.trim(),
        p_message_type: 'text',
        p_file_url: null,
        p_file_name: null,
        p_file_type: null,
        p_file_size: null,
      });
      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
        <div className="text-center text-white">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3" />
          <p>Loading Community Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b" style={{ backgroundColor: 'rgba(15,32,39,0.9)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">S2G Community Chat</h1>
            <p className="text-xs text-white/60 flex items-center gap-1">
              <Users className="h-3 w-3" /> {participantCount} members • Share, market & chat with the community
            </p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            <Users className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center text-white/50 mt-20">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">Welcome to the S2G Community!</p>
            <p className="text-sm mt-2">Be the first to share something with the community.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const isOwn = msg.sender_id === user?.id;
              const name = msg.sender_profile?.display_name || 
                `${msg.sender_profile?.first_name || ''} ${msg.sender_profile?.last_name || ''}`.trim() || 'Unknown';
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1">
                        {msg.sender_profile?.avatar_url ? (
                          <img src={msg.sender_profile.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white font-bold">
                            {name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-white/70 font-medium">{name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {isOwn && editingId !== msg.id && (
                        <>
                          <button
                            onClick={() => startEdit(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/20"
                            title="Edit message"
                          >
                            <Pencil className="h-3.5 w-3.5 text-white/60 hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/20"
                            title="Delete message"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-white/60 hover:text-red-400" />
                          </button>
                        </>
                      )}
                      {editingId === msg.id ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            className="flex-1 bg-white/20 text-white rounded-full px-3 py-1.5 text-sm border border-white/20 focus:outline-none focus:border-orange-500/50"
                            autoFocus
                          />
                          <button onClick={handleEdit} className="p-1 rounded-full hover:bg-white/20" title="Save">
                            <Check className="h-4 w-4 text-green-400" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 rounded-full hover:bg-white/20" title="Cancel">
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="rounded-2xl px-4 py-2 text-sm"
                          style={{
                            backgroundColor: isOwn ? 'rgba(249,115,22,0.85)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                          }}
                        >
                          {msg.content}
                          {(msg as any).is_edited && <span className="text-[10px] text-white/50 ml-1">(edited)</span>}
                          {msg.file_url && (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs underline text-blue-300">
                              📎 {msg.file_name || 'Attachment'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="sticky bottom-0 backdrop-blur-xl border-t" style={{ backgroundColor: 'rgba(15,32,39,0.95)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the community..."
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2.5 text-sm border border-white/10 focus:outline-none focus:border-orange-500/50"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="rounded-full h-10 w-10 p-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunityChatPage;
