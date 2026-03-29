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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [creatingChat, setCreatingChat] = useState(false);
  const [backendDegraded, setBackendDegraded] = useState(false);

  const getErrorStatus = (error: any) => {
    const rawStatus = error?.status ?? error?.code ?? error?.statusCode;
    const parsed = Number(rawStatus);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const isBillingOrQuotaError = (error: any) => {
    const status = getErrorStatus(error);
    const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return status === 402 || message.includes('billing') || message.includes('quota') || message.includes('payment');
  };

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setConversations([]);
      setLoading(false);
      return;
    }

    loadConversations();
  }, [user?.id, isOpen]);

  const loadConversations = async () => {
    if (!user?.id) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`id, name, room_type, created_at, chat_participants!inner(user_id, is_active)`)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .in('room_type', ['direct', 'group'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (roomsError) {
        if (isBillingOrQuotaError(roomsError)) {
          setBackendDegraded(true);
          setConversations([]);
          return;
        }
        throw roomsError;
      }

      const roomList = rooms || [];
      if (roomList.length === 0) {
        setConversations([]);
        return;
      }

      const roomIds = roomList.map((room: any) => room.id);

      const [messagesResult, participantsResult] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('room_id, content, created_at')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
          .limit(Math.max(roomIds.length * 4, 80)),
        supabase
          .from('chat_participants')
          .select('room_id, user_id, profiles(display_name, avatar_url, first_name, last_name)')
          .in('room_id', roomIds)
          .eq('is_active', true)
          .neq('user_id', user.id),
      ]);

      if (messagesResult.error) {
        if (isBillingOrQuotaError(messagesResult.error)) {
          setBackendDegraded(true);
          setConversations([]);
          return;
        }
        throw messagesResult.error;
      }

      if (participantsResult.error) {
        if (isBillingOrQuotaError(participantsResult.error)) {
          setBackendDegraded(true);
          setConversations([]);
          return;
        }
        throw participantsResult.error;
      }

      const latestMessageByRoom = new Map<string, { content: string | null; created_at: string }>();
      (messagesResult.data || []).forEach((msg: any) => {
        if (!latestMessageByRoom.has(msg.room_id)) {
          latestMessageByRoom.set(msg.room_id, msg);
        }
      });

      const otherProfileByRoom = new Map<string, any>();
      (participantsResult.data || []).forEach((participant: any) => {
        if (!otherProfileByRoom.has(participant.room_id)) {
          otherProfileByRoom.set(participant.room_id, participant.profiles);
        }
      });

      const items: ChatConversation[] = roomList.map((room: any) => {
        const latestMessage = latestMessageByRoom.get(room.id);
        const otherProfile = otherProfileByRoom.get(room.id);
        const isGroup = room.room_type === 'group';

        return {
          id: room.id,
          name: isGroup
            ? (room.name || 'Group')
            : (otherProfile?.display_name || `${otherProfile?.first_name || ''} ${otherProfile?.last_name || ''}`.trim() || 'Unknown'),
          avatar_url: isGroup ? null : (otherProfile?.avatar_url || null),
          last_message: latestMessage?.content || 'No messages yet',
          last_message_time: latestMessage?.created_at || room.created_at,
          unread_count: 0,
          is_group: isGroup,
        };
      });

      setBackendDegraded(false);
      setConversations(items);
    } catch (e) {
      console.error('Error loading chats:', e);
      if (isBillingOrQuotaError(e)) {
        setBackendDegraded(true);
        toast({ title: 'Backend paused', description: 'Chat is temporarily unavailable due to Supabase billing/quota.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to load chats', variant: 'destructive' });
      }
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!user?.id) {
      setAvailableUsers([]);
      return;
    }

    setLoadingUsers(true);

    try {
      const { data: allProfiles, error: allProfilesError } = await supabase.rpc('get_all_user_profiles');

      if (allProfilesError && isBillingOrQuotaError(allProfilesError)) {
        setBackendDegraded(true);
        setAvailableUsers([]);
        return;
      }

      if (!allProfilesError && Array.isArray(allProfiles)) {
        const normalized = allProfiles.filter((profile: any) => profile?.user_id && profile.user_id !== user.id);
        setBackendDegraded(false);
        setAvailableUsers(normalized);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name')
        .neq('user_id', user.id)
        .limit(50);

      if (error) {
        if (isBillingOrQuotaError(error)) {
          setBackendDegraded(true);
          setAvailableUsers([]);
          return;
        }
        throw error;
      }

      setBackendDegraded(false);
      setAvailableUsers((data || []).filter((profile: any) => profile.user_id && profile.user_id !== user.id));
    } catch (error) {
      console.error('Error loading available users:', error);
      if (isBillingOrQuotaError(error)) {
        setBackendDegraded(true);
        toast({ title: 'Backend paused', description: 'Cannot load users while Supabase billing/quota is paused.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
      }
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openNewChatDialog = async () => {
    if (backendDegraded) {
      toast({ title: 'Backend paused', description: 'New chats are unavailable until Supabase billing/quota is restored.', variant: 'destructive' });
      return;
    }
    setChatType('direct');
    setShowNewChatDialog(true);
    await loadAvailableUsers();
  };

  const createNewChat = async (otherUserId: string) => {
    if (!user) return;
    setCreatingChat(true);
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: otherUserId,
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
        .select()
        .single();
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

  if (selectedRoomId) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {!showNewChatDialog && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border/30 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" /> My Chats
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={openNewChatDialog}
                  disabled={loadingUsers || backendDegraded}
                  style={{ backgroundColor: 'hsl(188 78% 41%)', color: 'white', border: 'none' }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-background/30">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

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
                    <p className="text-sm text-muted-foreground">
                      {backendDegraded ? 'Chat temporarily unavailable (Supabase billing/quota paused).' : 'No conversations'}
                    </p>
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
                        <AvatarFallback className="bg-primary/20 text-foreground text-xs">{chat.name.charAt(0)}</AvatarFallback>
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
                      {chat.unread_count > 0 && <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">{chat.unread_count}</Badge>}
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>

          </motion.div>
          )}

          <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog} modal={true}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-primary/20 bg-card z-[60]">
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="text-xl font-bold text-foreground">New Conversation</DialogTitle>
              </DialogHeader>
              <Tabs value={chatType} onValueChange={v => setChatType(v as any)} className="w-full" data-deadlink-watch-ignore="true">
                <div className="px-5 pb-3">
                  <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-muted/40 p-1" data-deadlink-watch-ignore="true">
                    <TabsTrigger value="direct" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-deadlink-watch-ignore="true">Direct Message</TabsTrigger>
                    <TabsTrigger value="group" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all" data-deadlink-watch-ignore="true">Group Chat</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="direct" className="mt-0">
                  <ScrollArea className="max-h-[360px]">
                    <div className="px-3 pb-4 space-y-1">
                      {loadingUsers ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <p className="text-sm text-muted-foreground">Loading keepers...</p>
                        </div>
                      ) : backendDegraded ? (
                        <p className="text-center text-muted-foreground py-10 text-sm">Cannot load users while backend is paused.</p>
                      ) : availableUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10 text-sm">No users available. Try refreshing.</p>
                      ) : (
                        availableUsers.map(p => {
                          const name = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
                          return (
                            <motion.div
                              key={p.user_id}
                              whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors"
                              onClick={() => createNewChat(p.user_id)}
                            >
                              <Avatar className="w-11 h-11 ring-2 ring-primary/15 ring-offset-1 ring-offset-card">
                                <AvatarImage src={p.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-primary/20 text-foreground font-semibold text-sm">{name.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-semibold text-foreground flex-1 truncate">{name}</span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 rounded-full border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
                                  onClick={e => { e.stopPropagation(); startCall(p.user_id, name, 'audio'); }}
                                >
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 rounded-full border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
                                  onClick={e => { e.stopPropagation(); startCall(p.user_id, name, 'video'); }}
                                >
                                  <Video className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="group" className="mt-0 px-5 pb-5 space-y-3">
                  <Input placeholder="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} className="h-10 bg-muted/20 border-border/30 rounded-lg" />
                  <div className="text-xs text-muted-foreground font-medium">Select members ({selectedUsers.length})</div>
                  <ScrollArea className="max-h-[240px]">
                    <div className="space-y-1 pr-2">
                      {loadingUsers ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <p className="text-xs text-muted-foreground">Loading keepers...</p>
                        </div>
                      ) : backendDegraded ? (
                        <p className="text-center text-muted-foreground py-6 text-xs">Cannot load users while backend is paused.</p>
                      ) : availableUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-xs">No users available.</p>
                      ) : (
                        availableUsers.map(p => {
                          const name = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
                          const isSelected = selectedUsers.includes(p.user_id);
                          return (
                            <motion.div
                              key={p.user_id}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                                isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/20"
                              )}
                              onClick={() => setSelectedUsers(prev => prev.includes(p.user_id) ? prev.filter(id => id !== p.user_id) : [...prev, p.user_id])}
                            >
                              <Checkbox checked={isSelected} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                              <Avatar className="w-9 h-9 ring-1 ring-primary/10">
                                <AvatarImage src={p.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-primary/20 text-foreground text-xs font-semibold">{name.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground truncate">{name}</span>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  <Button
                    onClick={createGroupChat}
                    disabled={creatingChat || selectedUsers.length < 2 || !groupName.trim()}
                    className="w-full h-10 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
                  >
                    Create Group
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  );
};
