import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Plus, Search, Phone, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallManager } from '@/hooks/useCallManager';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { UnifiedConversation } from './UnifiedConversation';
import { cn } from '@/lib/utils';

interface ChatConversation {
  id: string;
  name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_group: boolean;
}

interface PrivateChatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivateChatsDrawer: React.FC<PrivateChatsDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCall } = useCallManager();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    if (user && isOpen) loadConversations();
  }, [user, isOpen]);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select(`id, name, room_type, created_at, chat_participants!inner(user_id, is_active)`)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .in('room_type', ['direct', 'group'])
        .order('created_at', { ascending: false })
        .limit(30);

      const items: ChatConversation[] = [];
      for (const room of rooms || []) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('content, created_at')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: others } = await supabase
          .from('chat_participants')
          .select('profiles(display_name, avatar_url, first_name, last_name)')
          .eq('room_id', room.id)
          .eq('is_active', true)
          .neq('user_id', user.id)
          .limit(1);

        const otherProfile = (others?.[0] as any)?.profiles;
        const isGroup = room.room_type === 'group';
        items.push({
          id: room.id,
          name: isGroup ? (room.name || 'Group') : (otherProfile?.display_name || `${otherProfile?.first_name || ''} ${otherProfile?.last_name || ''}`.trim() || 'Unknown'),
          avatar_url: isGroup ? null : (otherProfile?.avatar_url || null),
          last_message: msgs?.[0]?.content || 'No messages yet',
          last_message_time: msgs?.[0]?.created_at || room.created_at,
          unread_count: 0,
          is_group: isGroup,
        });
      }
      setConversations(items);
    } catch (e) {
      console.error('Error loading chats:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, avatar_url, first_name, last_name')
      .neq('user_id', user.id)
      .limit(50);
    console.log('📋 loadAvailableUsers result:', { count: data?.length, error });
    setAvailableUsers(data || []);
  };

  const createNewChat = async (otherUserId: string) => {
    if (!user) return;
    setCreatingChat(true);
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id, user2_id: otherUserId,
      });
      if (error) throw error;
      setSelectedRoomId(roomId);
      setShowNewChatDialog(false);
      await loadConversations();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
    } finally {
      setCreatingChat(false);
    }
  };

  const createGroupChat = async () => {
    if (!user || selectedUsers.length < 2 || !groupName.trim()) return;
    setCreatingChat(true);
    try {
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({ room_type: 'group', name: groupName, created_by: user.id, is_active: true })
        .select().single();
      if (error) throw error;
      await supabase.from('chat_participants').insert({ room_id: newRoom.id, user_id: user.id, is_active: true, is_moderator: true });
      await supabase.rpc('add_room_participants', { _room_id: newRoom.id, _user_ids: selectedUsers });
      setSelectedRoomId(newRoom.id);
      setShowNewChatDialog(false);
      setGroupName('');
      setSelectedUsers([]);
      await loadConversations();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create group', variant: 'destructive' });
    } finally {
      setCreatingChat(false);
    }
  };

  const filtered = searchQuery.trim()
    ? conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  // If viewing a conversation, show it full-screen
  if (selectedRoomId) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-background"
          >
            <UnifiedConversation roomId={selectedRoomId} onBack={() => setSelectedRoomId(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border/30 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" /> My Chats
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { loadAvailableUsers(); setShowNewChatDialog(true); }}
                  style={{ backgroundColor: 'hsl(188 78% 41%)', color: 'white', border: 'none' }}>
                  <Plus className="w-4 h-4" />
                </Button>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-background/30">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/30 border-border/30 h-9 text-sm"
                />
              </div>
            </div>

            {/* Chat list */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-muted/30" />
                      <div className="flex-1">
                        <div className="h-3 bg-muted/30 rounded w-1/3 mb-1.5" />
                        <div className="h-2.5 bg-muted/20 rounded w-2/3" />
                      </div>
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No conversations</p>
                  </div>
                ) : (
                  filtered.map(chat => (
                    <motion.div
                      key={chat.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRoomId(chat.id)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-background/30 transition-colors"
                    >
                      <Avatar className="w-10 h-10 border border-primary/20">
                        <AvatarImage src={chat.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-foreground text-xs">
                          {chat.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground truncate">{chat.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                            {formatDistanceToNow(new Date(chat.last_message_time), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{chat.last_message}</p>
                      </div>
                      {chat.unread_count > 0 && (
                        <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">{chat.unread_count}</Badge>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* New Chat Dialog */}
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
                <Tabs value={chatType} onValueChange={v => setChatType(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="direct">Direct Message</TabsTrigger>
                    <TabsTrigger value="group">Group Chat</TabsTrigger>
                  </TabsList>
                  <TabsContent value="direct" className="space-y-2 max-h-60 overflow-y-auto">
                    {availableUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 text-sm">No users available. Try refreshing.</p>
                    ) : availableUsers.map(p => {
                      const name = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
                      return (
                        <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => createNewChat(p.user_id)}>
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={p.avatar_url} />
                            <AvatarFallback className="bg-primary/20 text-xs">{name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium flex-1">{name}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); startCall(p.user_id, name, 'audio'); }}>
                            <Phone className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); startCall(p.user_id, name, 'video'); }}>
                            <Video className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </TabsContent>
                  <TabsContent value="group" className="space-y-3">
                    <Input placeholder="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} />
                    <div className="text-xs text-muted-foreground">Select members ({selectedUsers.length})</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableUsers.map(p => (
                        <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedUsers(prev => prev.includes(p.user_id) ? prev.filter(id => id !== p.user_id) : [...prev, p.user_id])}>
                          <Checkbox checked={selectedUsers.includes(p.user_id)} />
                          <Avatar className="w-7 h-7"><AvatarImage src={p.avatar_url} /><AvatarFallback className="bg-primary/20 text-[10px]">{(p.display_name || 'U').charAt(0)}</AvatarFallback></Avatar>
                          <span className="text-xs">{p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={createGroupChat} disabled={creatingChat || selectedUsers.length < 2 || !groupName.trim()} className="w-full" style={{ backgroundColor: 'hsl(188 78% 41%)', color: 'white' }}>
                      Create Group
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
