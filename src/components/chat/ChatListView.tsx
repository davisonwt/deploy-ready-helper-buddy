import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Users, Phone, Video, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ChatRoom } from './ChatRoom';
import { useToast } from '@/hooks/use-toast';

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

export const ChatListView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [creatingChat, setCreatingChat] = useState(false);
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    loadConversations();
    if (showNewChatDialog) {
      loadAvailableUsers();
    }
  }, [user, showNewChatDialog]);

  const loadAvailableUsers = async () => {
    if (!user) return;
    
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, first_name, last_name')
        .neq('id', user.id)
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
      // Check if a direct chat already exists
      const { data: existingRooms } = await supabase
        .from('chat_participants')
        .select('room_id, chat_rooms!inner(room_type)')
        .eq('user_id', user.id);

      for (const room of existingRooms || []) {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', room.room_id);

        if (participants?.length === 2 && participants.some(p => p.user_id === otherUserId)) {
          setSelectedRoomId(room.room_id);
          setShowNewChatDialog(false);
          setCreatingChat(false);
          return;
        }
      }

      // Create new direct room
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'direct',
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add both participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { room_id: newRoom.id, user_id: user.id, is_active: true },
          { room_id: newRoom.id, user_id: otherUserId, is_active: true }
        ]);

      if (participantsError) throw participantsError;

      setSelectedRoomId(newRoom.id);
      setShowNewChatDialog(false);
      await loadConversations();
    } catch (error) {
      console.error('Error creating chat:', error);
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
      // Create new group room
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

      // Add all participants including creator
      const participants = [
        { room_id: newRoom.id, user_id: user.id, is_active: true, is_moderator: true },
        ...selectedUsers.map(userId => ({
          room_id: newRoom.id,
          user_id: userId,
          is_active: true,
          is_moderator: false
        }))
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: 'Group created!',
        description: `${groupName} has been created with ${selectedUsers.length} members`,
      });

      setSelectedRoomId(newRoom.id);
      setShowNewChatDialog(false);
      setGroupName('');
      setSelectedUsers([]);
      await loadConversations();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group chat',
        variant: 'destructive',
      });
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

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Load user's chat rooms with participants and latest messages
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
            profile_id,
            profiles(display_name, avatar_url, first_name, last_name)
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Process rooms into conversations
      const conversationPromises = (rooms || []).map(async (room) => {
        // Get latest message for this room
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('content, created_at, sender_id')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestMessage = messages?.[0];

        // Get all participants for group display
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

        // For direct chats, use the other participant's name
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
          unread_count: 0, // TODO: Implement unread count tracking
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
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (conversationId: string) => {
    setSelectedRoomId(conversationId);
  };

  const closeChat = () => {
    setSelectedRoomId(null);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    
    try {
      // Delete all messages in the room
      await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', conversationId);

      // Delete all participants
      await supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', conversationId);

      // Delete the room
      await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', conversationId);

      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed',
      });

      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const handleMuteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: 'Muted',
      description: 'Conversation has been muted',
    });
  };

  const handleArchiveConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await supabase
        .from('chat_rooms')
        .update({ is_active: false })
        .eq('id', conversationId);

      toast({
        title: 'Archived',
        description: 'Conversation has been archived',
      });

      loadConversations();
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive conversation',
        variant: 'destructive',
      });
    }
  };

  // If a chat is selected, show the actual chat room messaging interface
  if (selectedRoomId) {
    return <ChatRoom roomId={selectedRoomId} onBack={closeChat} />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card bg-transparent border border-primary/20">
            <CardContent className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/30"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted/30 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted/20 rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Messages</h2>
          <p className="text-white/70 text-sm">Your recent conversations</p>
        </div>
        <Button 
          size="sm" 
          className="gap-2" 
          onClick={() => setShowNewChatDialog(true)}
          style={{ backgroundColor: '#17A2B8', color: 'white' }}
        >
          <MessageCircle className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="space-y-3">
        {conversations.map((conversation, index) => (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => openChat(conversation.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar or Group Avatars */}
                  {conversation.is_group && conversation.participants ? (
                    <div className="relative w-14 h-14 flex-shrink-0">
                      {/* Group avatar cluster */}
                      <div className="grid grid-cols-2 gap-0.5">
                        {conversation.participants.slice(0, 4).map((participant, idx) => (
                          <Avatar 
                            key={participant.id} 
                            className="w-6 h-6 border border-background"
                          >
                            <AvatarImage src={participant.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-white text-xs">
                              {participant.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {conversation.unread_count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center p-0 text-xs"
                        >
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-14 h-14 border-2 border-primary/30">
                        <AvatarImage src={conversation.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-white text-lg">
                          {conversation.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-background"></div>
                      )}
                      {conversation.unread_count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center p-0 text-xs"
                        >
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-white truncate">
                        {conversation.name}
                      </h3>
                      <span className="text-xs text-white/60 flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conversation.last_message_time), { 
                          addSuffix: false 
                        }).replace('about ', '')}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-white font-medium' : 'text-white/70'}`}>
                      {conversation.last_message}
                    </p>
                  </div>

                  {/* Action Buttons (show on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(conversation.id);
                        toast({
                          title: 'Voice call',
                          description: 'Open the chat to start a voice call',
                        });
                      }}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(conversation.id);
                        toast({
                          title: 'Video call',
                          description: 'Open the chat to start a video call',
                        });
                      }}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-panel">
                        <DropdownMenuItem onClick={(e) => handleMuteConversation(conversation.id, e)}>
                          Mute notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleArchiveConversation(conversation.id, e)}>
                          Archive conversation
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {conversations.length === 0 && (
        <Card className="glass-card bg-transparent border border-primary/20">
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-primary/50" />
            <h3 className="text-xl font-semibold text-white mb-2">No conversations yet</h3>
            <p className="text-white/70 mb-4">Start chatting with sowers and bestowers</p>
            <Button onClick={() => setShowNewChatDialog(true)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Start New Chat</DialogTitle>
          </DialogHeader>
          
          <Tabs value={chatType} onValueChange={(v) => setChatType(v as 'direct' | 'group')} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">Direct Chat</TabsTrigger>
              <TabsTrigger value="group">Group Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="direct" className="space-y-4">
              <Input 
                placeholder="Search users..." 
                className="bg-background/50 border-primary/20 text-white"
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableUsers.map((profile) => (
                  <Card 
                    key={profile.id}
                    className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
                    onClick={() => !creatingChat && createNewChat(profile.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-primary/30">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-white">
                            {profile.display_name?.charAt(0) || profile.first_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="group" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-white">Group Name</label>
                <Input 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..." 
                  className="bg-background/50 border-primary/20 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-white">
                  Select Members ({selectedUsers.length} selected)
                </label>
                <Input 
                  placeholder="Search users..." 
                  className="bg-background/50 border-primary/20 text-white mb-3"
                />
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {availableUsers.map((profile) => (
                    <Card 
                      key={profile.id}
                      className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => toggleUserSelection(profile.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedUsers.includes(profile.id)}
                            onCheckedChange={() => toggleUserSelection(profile.id)}
                            className="border-primary/30"
                          />
                          <Avatar className="w-10 h-10 border-2 border-primary/30">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-white">
                              {profile.display_name?.charAt(0) || profile.first_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-white">
                              {profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={createGroupChat} 
                disabled={creatingChat || selectedUsers.length < 2 || !groupName.trim()}
                className="w-full"
              >
                {creatingChat ? 'Creating...' : 'Create Group Chat'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};
