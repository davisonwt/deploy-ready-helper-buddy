import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Search,
  Plus,
  LogIn,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChatList } from '@/components/chat/ChatList';
import SafeUserSelector from '@/components/chat/SafeUserSelector';
import { ChatRoom } from '@/components/chat/ChatRoom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCallManager } from '@/hooks/useCallManager';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ChatApp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'one' | 'circle'>('one');
  
  // User selection states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Navigation control flags
  const autoOpenRanRef = useRef(false);
  const prevRoomRef = useRef<string | null>(null);

  // Get current room from URL
  const currentRoomId = searchParams.get('room');

  // Persist last opened room and auto-open it on login
  useEffect(() => {
    if (currentRoomId) {
      try {
        localStorage.setItem('lastChatRoomId', currentRoomId);
      } catch {}
    }
  }, [currentRoomId]);

  useEffect(() => {
    // Only auto-open once per session and never if the user explicitly prefers list view
    const autoOpen = async () => {
      try {
        if (!user || currentRoomId) return;
        if (autoOpenRanRef.current) return;
        const listPref = (() => { try { return sessionStorage.getItem('chat:listPref'); } catch { return null; } })();
        if (listPref === 'list') return;

        // Try last opened from local storage first
        const last = (() => {
          try { return localStorage.getItem('lastChatRoomId'); } catch { return null; }
        })();
        if (last) {
          console.info('💬 ChatApp: Auto-opening last room from storage', last);
          autoOpenRanRef.current = true;
          setSearchParams({ room: last }, { replace: true });
          return;
        }

        console.info('💬 ChatApp: No room param, opening most recent active room');
        const { data: parts, error: partsError } = await supabase
          .from('chat_participants')
          .select('room_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (partsError) throw partsError;
        const roomIds = Array.from(new Set((parts || []).map((p: any) => p.room_id)));
        if (roomIds.length === 0) { autoOpenRanRef.current = true; return; }
        const { data: rooms, error: roomsError } = await supabase
          .from('chat_rooms')
          .select('id, updated_at')
          .in('id', roomIds)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (roomsError) throw roomsError;
        if (rooms && rooms.length > 0) {
          autoOpenRanRef.current = true;
          setSearchParams({ room: rooms[0].id }, { replace: true });
        } else {
          autoOpenRanRef.current = true;
        }
      } catch (err) {
        console.error('💥 ChatApp auto-open failed:', err);
      }
    };

    autoOpen();
  }, [user?.id, currentRoomId, setSearchParams]);

  // Track transitions to list view (including browser back) to suppress re-open in this session
  useEffect(() => {
    const prev = prevRoomRef.current;
    if (currentRoomId) {
      try { sessionStorage.removeItem('chat:listPref'); } catch {}
    } else if (!currentRoomId && prev) {
      try { sessionStorage.setItem('chat:listPref', 'list'); } catch {}
    }
    prevRoomRef.current = currentRoomId;
  }, [currentRoomId]);

  const { startCall } = useCallManager();

  const handleStartDirectChat = async (otherUserId) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: otherUserId,
      });
      if (error) throw error;
      const roomId = data;
      setSearchParams({ room: roomId }, { replace: true });
    } catch (error) {
      console.error('Error starting direct chat:', error);
      toast({ title: 'Error', description: 'Could not open direct chat', variant: 'destructive' });
    }
  };

  const handleStartCall = async (otherUserId, callType) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, avatar_url')
        .eq('user_id', otherUserId)
        .single();
      if (error) throw error;
      const receiverName = userProfile.display_name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Unknown User';
      await startCall(otherUserId, receiverName, callType, null);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({ title: 'Error', description: 'Failed to start call', variant: 'destructive' });
    }
  };

  // Fetch users when search term changes
  useEffect(() => {
    if (!isCreateDialogOpen) return;
    
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        
        let query = supabase
          .from('profiles')
          .select('id, user_id, display_name, avatar_url, first_name, last_name')
          .neq('user_id', user.id)
          .limit(20);

        if (userSearchTerm.trim()) {
          query = query.or(`display_name.ilike.%${userSearchTerm}%,first_name.ilike.%${userSearchTerm}%,last_name.ilike.%${userSearchTerm}%`);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setAvailableUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [userSearchTerm, isCreateDialogOpen, user?.id]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getUserDisplayName = (userData) => {
    return userData.display_name || 
           `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
           'Unknown User';
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim()) {
      toast({
        title: 'Chat name required',
        description: 'Please enter a name for your chat room.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      
      // Create new chat room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: newChatName.trim(),
          room_type: 'group',
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as participant
      const participants = [
        {
          room_id: room.id,
          user_id: user.id,
          is_moderator: true,
          is_active: true,
        },
        // Add selected users
        ...selectedUsers.map(userId => ({
          room_id: room.id,
          user_id: userId,
          is_moderator: false,
          is_active: true,
        }))
      ];

      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantError) throw participantError;

      // Send notifications to invited users
      if (selectedUsers.length > 0) {
        const notifications = selectedUsers.map(userId => ({
          user_id: userId,
          type: 'chat_invite',
          title: 'Chat Room Invitation',
          message: `You've been invited to join "${newChatName}"`,
          action_url: '/chatapp'
        }));

        await supabase
          .from('user_notifications')
          .insert(notifications);
      }

      toast({
        title: 'Chat created!',
        description: selectedUsers.length > 0 
          ? `${newChatName} created with ${selectedUsers.length} member(s).`
          : `${newChatName} has been created successfully.`,
      });

      setNewChatName('');
      setSelectedUsers([]);
      setUserSearchTerm('');
      setIsCreateDialogOpen(false);
      
      // Navigate to the new chat room
      setSearchParams({ room: room.id }, { replace: true });
      setIsCreateDialogOpen(false);
      setNewChatName('');
      setSelectedUsers([]);
      setUserSearchTerm('');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: 'Failed to create chat',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToList = () => {
    try { sessionStorage.setItem('chat:listPref', 'list'); } catch {}
    setSearchParams({}, { replace: true });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">
                Welcome to ChatApp
              </h2>
              <p className="text-muted-foreground">
                Please log in to access chats.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl h-[calc(100vh-2rem)] pb-28">
      {currentRoomId ? (
        <ChatRoom roomId={currentRoomId} onBack={handleBackToList} />
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Chats</h1>
                <p className="text-sm text-muted-foreground">
                  Connect and collaborate with others
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs for One-on-Ones vs Grove Circles */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'one' | 'circle')}>
            <TabsList className="mb-4">
              <TabsTrigger value="one">One-on-Ones</TabsTrigger>
              <TabsTrigger value="circle">Grove Circles</TabsTrigger>
            </TabsList>

            <TabsContent value="one" className="space-y-4">
              {/* One-on-Ones: s2g sowers and bestowers */}
              <SafeUserSelector
                onStartDirectChat={handleStartDirectChat}
                onStartCall={handleStartCall}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Your One-on-Ones</h2>
                </div>
                <ScrollArea className="h-[calc(100vh-300px)] pr-2">
                  <div className="pb-72 sm:pb-80 md:pb-[calc(env(safe-area-inset-bottom)+18rem)]">
                    <ChatList searchQuery={searchQuery} roomType="direct" hideFilterControls />
                    <div aria-hidden className="h-24 sm:h-28 md:h-32" />
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="circle" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Grove Circles</h2>
                {/* Create New Chat/Circle */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-lov-name="NewChatButton">
                      <Plus className="h-4 w-4 mr-2" />
                      New Chat
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-background z-50">
                <DialogHeader>
                  <DialogTitle>Create New Chat</DialogTitle>
                  <DialogDescription>
                    Create a new group chat and invite others to join.
                  </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="chatName">Chat Name *</Label>
                      <Input
                        id="chatName"
                        placeholder="Enter chat name..."
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isCreating) {
                            handleCreateChat();
                          }
                        }}
                      />
                    </div>

                    {/* User Search */}
                    <div className="space-y-2">
                      <Label>Invite Users (Optional)</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users by name..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Selected ({selectedUsers.length}):</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map(userId => {
                            const userData = availableUsers.find(u => u.user_id === userId);
                            return (
                              <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                                {userData ? getUserDisplayName(userData) : 'User'}
                                <button
                                  onClick={() => handleUserToggle(userId)}
                                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Users List */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Available Users:</div>
                      <ScrollArea className="h-48 border rounded-md p-2 bg-background">
                        {loadingUsers ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">Searching users...</p>
                          </div>
                        ) : availableUsers.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                              {userSearchTerm ? 'No users found' : 'Start typing to search for users'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {availableUsers.map((userData) => (
                              <div 
                                key={userData.user_id}
                                className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                                onClick={() => handleUserToggle(userData.user_id)}
                              >
                                <Checkbox 
                                  checked={selectedUsers.includes(userData.user_id)}
                                  onCheckedChange={() => handleUserToggle(userData.user_id)}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={userData.avatar_url} />
                                  <AvatarFallback>
                                    {getUserDisplayName(userData).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {getUserDisplayName(userData)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewChatName('');
                        setSelectedUsers([]);
                        setUserSearchTerm('');
                      }}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateChat} disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Chat'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>

              <ScrollArea className="h-[calc(100vh-300px)] pr-2">
                <div className="pb-72 sm:pb-80 md:pb-[calc(env(safe-area-inset-bottom)+18rem)]">
                  <ChatList searchQuery={searchQuery} roomType="group" hideFilterControls />
                  <div aria-hidden className="h-24 sm:h-28 md:h-32" />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ChatApp;
