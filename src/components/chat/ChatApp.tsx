/**
 * ChatApp - Unified WhatsApp-style communication hub
 * Combines Circles, Chats (1-on-1 & Groups), and Community in one interface
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, CircleDot, Search, Plus, Phone, Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallManager } from '@/hooks/useCallManager';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { UnifiedConversation } from './UnifiedConversation';
import { RelationshipLayerChatApp } from './RelationshipLayerChatApp';
import { CommunityForums } from './CommunityForums';
import { cn } from '@/lib/utils';

interface ChatConversation {
  id: string;
  name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_group: boolean;
  participants?: {
    id: string;
    avatar_url: string | null;
    display_name: string | null;
  }[];
  status?: 'online' | 'offline';
}

export const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCall } = useCallManager();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'chats' | 'circles' | 'community'>('chats');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  // New chat dialog
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [creatingChat, setCreatingChat] = useState(false);

  // Handle room parameter from URL
  useEffect(() => {
    const roomId = searchParams.get('room');
    if (roomId && !selectedRoomId) {
      setSelectedRoomId(roomId);
      setSearchParams({});
    }
  }, [searchParams, selectedRoomId, setSearchParams]);

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Filter conversations based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(c => c.name.toLowerCase().includes(query))
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          room_type,
          created_at,
          chat_participants!inner(
            user_id,
            is_active,
            profiles(display_name, avatar_url, first_name, last_name)
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const conversationPromises = (rooms || []).map(async (room) => {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('content, created_at, sender_id')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestMessage = messages?.[0];

        const { data: allParticipants } = await supabase
          .from('chat_participants')
          .select(`
            user_id,
            profiles(id, display_name, avatar_url, first_name, last_name)
          `)
          .eq('room_id', room.id)
          .eq('is_active', true)
          .neq('user_id', user.id);

        const isGroup = room.room_type === 'group';
        let conversationName = room.name || 'Chat';
        let avatarUrl = null;

        if (!isGroup && allParticipants && allParticipants.length > 0) {
          const otherProfile = allParticipants[0].profiles;
          conversationName = otherProfile?.display_name || 
                           `${otherProfile?.first_name || ''} ${otherProfile?.last_name || ''}`.trim() ||
                           'Unknown User';
          avatarUrl = otherProfile?.avatar_url || null;
        }

        return {
          id: room.id,
          name: conversationName,
          avatar_url: avatarUrl,
          last_message: latestMessage?.content || 'No messages yet',
          last_message_time: latestMessage?.created_at || room.created_at,
          unread_count: 0,
          is_group: isGroup,
          participants: allParticipants?.map(p => ({
            id: p.profiles?.id || '',
            avatar_url: p.profiles?.avatar_url || null,
            display_name: p.profiles?.display_name || 
                         `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim() ||
                         'Unknown'
          })),
          status: 'offline' as const
        };
      });

      const processedConversations = await Promise.all(conversationPromises);
      setConversations(processedConversations);
      setFilteredConversations(processedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!user) return;
    
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name')
        .neq('user_id', user.id)
        .limit(50);

      if (error) throw error;
      setAvailableUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const createNewChat = async (otherUserId: string) => {
    if (!user) return;
    
    setCreatingChat(true);
    try {
      // Use the secure RPC that handles both room creation and participant insertion
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: otherUserId,
      });

      if (error) throw error;

      setSelectedRoomId(roomId);
      setShowNewChatDialog(false);
      await loadConversations();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
    } finally {
      setCreatingChat(false);
    }
  };

  const createGroupChat = async () => {
    if (!user || selectedUsers.length < 2 || !groupName.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter a group name and select at least 2 people',
        variant: 'destructive',
      });
      return;
    }

    setCreatingChat(true);
    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'group',
          name: groupName,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const participants = [
        { room_id: newRoom.id, user_id: user.id, is_active: true, is_moderator: true },
        ...selectedUsers.map(userId => ({
          room_id: newRoom.id,
          user_id: userId,
          is_active: true,
          is_moderator: false
        }))
      ];

      await supabase.from('chat_participants').insert(participants);

      toast({
        title: 'Group created!',
        description: `${groupName} has been created with ${selectedUsers.length + 1} members`,
      });

      setSelectedRoomId(newRoom.id);
      setShowNewChatDialog(false);
      setGroupName('');
      setSelectedUsers([]);
      await loadConversations();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ title: 'Error', description: 'Failed to create group chat', variant: 'destructive' });
    } finally {
      setCreatingChat(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // If a conversation is selected, show the unified conversation view
  if (selectedRoomId) {
    return (
      <UnifiedConversation
        roomId={selectedRoomId}
        onBack={() => setSelectedRoomId(null)}
      />
    );
  }

  return (
    <div className="glass-panel rounded-2xl min-h-[500px] max-h-[calc(100vh-220px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">ChatApp</h1>
          <Button 
            size="sm" 
            onClick={() => {
              loadAvailableUsers();
              setShowNewChatDialog(true);
            }}
            className="gap-2"
            style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-border/30"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start px-4 pt-2 bg-transparent border-b border-border/30 rounded-none h-auto gap-1">
          <TabsTrigger 
            value="chats" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-2 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Chats
            {conversations.filter(c => c.unread_count > 0).length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                {conversations.filter(c => c.unread_count > 0).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="circles" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-2 gap-2"
          >
            <CircleDot className="w-4 h-4" />
            Circles
          </TabsTrigger>
          <TabsTrigger 
            value="community" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-2 gap-2"
          >
            <Users className="w-4 h-4" />
            Community
          </TabsTrigger>
        </TabsList>

        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 overflow-y-auto p-4 space-y-2 m-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                  <div className="w-12 h-12 rounded-full bg-muted/30"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted/30 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-muted/20 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Start a new chat to connect with others</p>
              <Button 
                onClick={() => {
                  loadAvailableUsers();
                  setShowNewChatDialog(true);
                }}
                style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className="bg-background/30 border-border/20 hover:bg-background/50 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setSelectedRoomId(conversation.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Avatar */}
                    {conversation.is_group && conversation.participants ? (
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <div className="grid grid-cols-2 gap-0.5">
                          {conversation.participants.slice(0, 4).map((participant, idx) => (
                            <Avatar key={idx} className="w-5 h-5 border border-background">
                              <AvatarImage src={participant.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-foreground text-[10px]">
                                {participant.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage src={conversation.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-foreground">
                            {conversation.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.status === 'online' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-foreground truncate">{conversation.name}</h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">{conversation.last_message}</p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Circles Tab */}
        <TabsContent value="circles" className="flex-1 overflow-y-auto m-0">
          <RelationshipLayerChatApp />
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community" className="flex-1 overflow-y-auto m-0">
          <CommunityForums />
        </TabsContent>
      </Tabs>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          
          <Tabs value={chatType} onValueChange={(v) => setChatType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="direct">Direct Message</TabsTrigger>
              <TabsTrigger value="group">Group Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-3 max-h-80 overflow-y-auto">
              {availableUsers.map((profile) => {
                const userName = profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
                return (
                <Card
                  key={profile.user_id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    creatingChat && "pointer-events-none opacity-50"
                  )}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="w-10 h-10 cursor-pointer" onClick={() => createNewChat(profile.user_id)}>
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="bg-primary/20">
                        {userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span 
                      className="font-medium flex-1 cursor-pointer" 
                      onClick={() => createNewChat(profile.user_id)}
                    >
                      {userName}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCall(profile.user_id, userName, 'audio');
                        }}
                        title="Voice call"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCall(profile.user_id, userName, 'video');
                        }}
                        title="Video call"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="group" className="space-y-4">
              <Input
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <div className="text-sm text-muted-foreground mb-2">
                Select members ({selectedUsers.length} selected)
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableUsers.map((profile) => (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleUserSelection(profile.user_id)}
                  >
                    <Checkbox checked={selectedUsers.includes(profile.user_id)} />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="bg-primary/20 text-sm">
                        {(profile.display_name || profile.first_name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
              <Button 
                onClick={createGroupChat} 
                disabled={creatingChat || selectedUsers.length < 2 || !groupName.trim()}
                className="w-full"
                style={{ backgroundColor: '#17A2B8', color: 'white' }}
              >
                Create Group
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};
