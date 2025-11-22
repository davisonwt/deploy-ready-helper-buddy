import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  Radio, 
  GraduationCap, 
  Sparkles,
  Search,
  Plus,
  Mic,
  LogIn
} from 'lucide-react';
import { ChatList } from '@/components/chat/ChatList';
import { LiveRadioTab } from '@/components/chat/LiveRadioTab';
import { PremiumRoomsTab } from '@/components/chat/PremiumRoomsTab';
import { PublicLiveSessionsBrowser } from '@/components/live/PublicLiveSessionsBrowser';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SafeUserSelector from '@/components/chat/SafeUserSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatAppVerificationBanner } from '@/components/chat/ChatAppVerificationBanner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import RadioListenerInterface from '@/components/radio/RadioListenerInterface';

type ProfileSummary = {
  id?: string;
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type ParticipantRow = {
  room_id: string;
};

const CommunicationsHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL hash or localStorage
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (['chats', 'radio', 'premium', 'discover'].includes(hash)) {
      return hash;
    }
    return localStorage.getItem('communications-hub-tab') || 'chats';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isStartingDirect, setIsStartingDirect] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [chatType, setChatType] = useState<'one' | 'circle'>('one');
  
  // User selection states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<ProfileSummary[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Get current room from URL
  const currentRoomId = searchParams.get('room');

  // Check verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('is_chatapp_verified')
        .eq('user_id', user.id)
        .single();
        
      setIsVerified(data?.is_chatapp_verified ?? false);
    };
    
    checkVerification();
  }, [user?.id]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('communications-hub-tab', activeTab);
    window.location.hash = activeTab;
  }, [activeTab]);

  // Fetch users when search term changes
  useEffect(() => {
    if (!isCreateDialogOpen) return;

    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);

        let query = supabase
          .from('profiles')
          .select('id, user_id, display_name, avatar_url, first_name, last_name')
          .neq('user_id', user?.id)
          .limit(20);

        if (userSearchTerm.trim()) {
          query = query.or(
            `display_name.ilike.%${userSearchTerm}%,first_name.ilike.%${userSearchTerm}%,last_name.ilike.%${userSearchTerm}%`
          );
        }

        const { data, error } = await query.abortSignal(controller.signal);

        if (error) throw error;
        setAvailableUsers(data || []);
      } catch (e: unknown) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Error fetching users:', e);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();

    return () => controller.abort();
  }, [userSearchTerm, isCreateDialogOpen, user?.id]);

  const handleStartDirectChat = async (otherUserId: string) => {
    if (!user?.id || !otherUserId) return;
    if (isStartingDirect) return;
    setIsStartingDirect(true);
    try {
      // Find existing direct room containing both users
      const { data: rows, error: findErr } = await supabase
        .from('chat_participants')
        .select('room_id, user_id, chat_rooms!inner(id, room_type, is_active)')
        .eq('chat_rooms.room_type', 'direct')
        .eq('chat_rooms.is_active', true)
        .in('user_id', [user.id, otherUserId]);
      if (findErr) throw findErr;

      let existingRoomId: string | null = null;
      if (rows && rows.length) {
        const counts: Record<string, number> = {};
        for (const r of rows as ParticipantRow[]) {
          if (!r || !r.room_id) continue;
          counts[r.room_id] = (counts[r.room_id] || 0) + 1;
        }
        existingRoomId = Object.entries(counts).find(([, c]) => c >= 2)?.[0] || null;
      }

      let roomId = existingRoomId;

      // If none exists, create a new direct room
      if (!roomId) {
        const { data: room, error: roomErr } = await supabase
          .from('chat_rooms')
          .insert({ name: 'Direct Chat', room_type: 'direct', created_by: user.id, is_active: true })
          .select('id')
          .single();
        if (roomErr) throw roomErr;
        roomId = room.id as string;

        await supabase
          .from('chat_participants')
          .upsert([
            { room_id: roomId, user_id: user.id, is_active: true },
            { room_id: roomId, user_id: otherUserId, is_active: true },
          ], { onConflict: 'room_id,user_id' });
      } else {
        // Ensure both participants are active for existing room
        await supabase
          .from('chat_participants')
          .upsert([
            { room_id: roomId, user_id: user.id, is_active: true },
            { room_id: roomId, user_id: otherUserId, is_active: true },
          ], { onConflict: 'room_id,user_id' });
      }

      setSearchParams({ room: roomId! }, { replace: true });
    } catch (error) {
      console.error('Error starting direct chat:', error);
      toast({ title: 'Error', description: 'Could not open direct chat', variant: 'destructive' });
    } finally {
      setIsStartingDirect(false);
    }
  };

  const handleStartCall = async (otherUserId: string, callType: 'audio' | 'video') => {
    // This would integrate with your existing call manager
    toast({ title: 'Call feature', description: 'Starting call...', });
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getUserDisplayName = (userData: ProfileSummary) => {
    return userData.display_name || 
           `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
           'Unknown User';
  };

  const handleCreateChat = async () => {
    if (isCreating) return;
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
      const name = newChatName.trim();

      // Create new chat room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          room_type: 'group',
          created_by: user?.id,
          is_active: true,
        })
        .select('id')
        .single();
      if (roomError) throw roomError;
      const roomId = room.id as string;

      // Upsert creator + invitees as active participants
      const uniqueIds = Array.from(new Set([user?.id, ...selectedUsers]));
      const participants = uniqueIds.map(uid => ({
        room_id: roomId,
        user_id: uid,
        is_moderator: uid === user?.id,
        is_active: true,
      }));

      await supabase
        .from('chat_participants')
        .upsert(participants, { onConflict: 'room_id,user_id' });

      // Send notifications to invited users
      if (selectedUsers.length > 0) {
        const notifications = selectedUsers.map(userId => ({
          user_id: userId,
          type: 'chat_invite',
          title: 'Chat Room Invitation',
          message: `You've been invited to join "${name}"`,
          action_url: '/communications-hub'
        }));
        await supabase.from('user_notifications').insert(notifications);
      }

      toast({
        title: 'Chat ready!',
        description: selectedUsers.length > 0 
          ? `${name} ready with ${selectedUsers.length} member(s).`
          : `${name} has been created successfully.`,
      });

      setNewChatName('');
      setSelectedUsers([]);
      setUserSearchTerm('');
      setIsCreateDialogOpen(false);
      setSearchParams({ room: roomId }, { replace: true });
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: 'Failed to create chat',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToList = () => {
    setSearchParams({}, { replace: true });
  };

  const handleJoinSession = (sessionId: string) => {
    // Navigate to the live session
    navigate(`/live-rooms?session=${sessionId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Welcome to Communications Hub</h2>
              <p className="text-muted-foreground">
                Please log in to access chats, radio, and premium rooms.
              </p>
              <Button 
                onClick={() => navigate('/login')}
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

  // If viewing a specific chat room
  if (currentRoomId) {
    return (
      <div className="container mx-auto p-4 max-w-7xl h-[calc(100vh-2rem)] pb-28">
        <ChatRoom roomId={currentRoomId} onBack={handleBackToList} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="container mx-auto p-4 max-w-7xl space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 p-8 border border-border/50 backdrop-blur-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">Communications Hub</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              All your conversations, radio shows, and premium content in one place
            </p>
          </div>
        </div>

        {/* Verification Banner */}
        {activeTab === 'chats' && isVerified === false && <ChatAppVerificationBanner />}

        {/* Main Tabs Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-2 gap-3">
            <TabsTrigger 
              value="chats" 
              className="flex flex-col gap-2 py-3 rounded-2xl data-[state=active]:bg-teal-500/30 data-[state=active]:text-white data-[state=inactive]:bg-teal-500/10 data-[state=inactive]:text-teal-300"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-semibold">Chats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="radio"
              className="flex flex-col gap-2 py-3 rounded-2xl data-[state=active]:bg-teal-500/30 data-[state=active]:text-white data-[state=inactive]:bg-teal-500/10 data-[state=inactive]:text-teal-300"
            >
              <Radio className="h-5 w-5" />
              <span className="text-sm font-semibold">Live Radio</span>
            </TabsTrigger>
            <TabsTrigger 
              value="premium"
              className="flex flex-col gap-2 py-3 rounded-2xl data-[state=active]:bg-teal-500/30 data-[state=active]:text-white data-[state=inactive]:bg-teal-500/10 data-[state=inactive]:text-teal-300"
            >
              <GraduationCap className="h-5 w-5" />
              <span className="text-sm font-semibold">Premium Rooms</span>
            </TabsTrigger>
            <TabsTrigger 
              value="discover"
              className="flex flex-col gap-2 py-3 rounded-2xl data-[state=active]:bg-teal-500/30 data-[state=active]:text-white data-[state=inactive]:bg-teal-500/10 data-[state=inactive]:text-teal-300"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">Discover</span>
            </TabsTrigger>
          </TabsList>

          {/* Chats Tab */}
          <TabsContent value="chats" className="space-y-6">
            <div className="space-y-4">
              {/* Search and Create */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-2xl"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>

              {/* Chat Type Tabs */}
              <Tabs value={chatType} onValueChange={(v) => setChatType(v as 'one' | 'circle')}>
                <TabsList className="gap-4">
                  <TabsTrigger value="one" className="rounded-2xl">One-on-Ones</TabsTrigger>
                  <TabsTrigger value="circle" className="rounded-2xl">Community</TabsTrigger>
                </TabsList>

                <TabsContent value="one" className="space-y-4 mt-4">
                  <SafeUserSelector
                    onStartDirectChat={handleStartDirectChat}
                    onStartCall={handleStartCall}
                  />
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Your One-on-Ones</h3>
                    <ScrollArea className="h-[calc(100vh-500px)]">
                      <ChatList searchQuery={searchQuery} roomType="direct" hideFilterControls />
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="circle" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Your Community Chats</h3>
                    <ScrollArea className="h-[calc(100vh-500px)]">
                      <ChatList searchQuery={searchQuery} roomType="group" hideFilterControls />
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Live Radio Tab */}
          <TabsContent value="radio" className="space-y-6">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Radio className="h-6 w-6" />
                  Grove Station Live
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioListenerInterface />
                
                <div className="pt-6 border-t">
                  <LiveRadioTab searchQuery={searchQuery} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium Rooms Tab */}
          <TabsContent value="premium" className="space-y-6">
            <PremiumRoomsTab searchQuery={searchQuery} />
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Sparkles className="h-6 w-6" />
                  Discover Live Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PublicLiveSessionsBrowser onJoinSession={handleJoinSession} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Chat Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Chat</DialogTitle>
              <DialogDescription>
                Start a group conversation with multiple people
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="chat-name">Chat Name</Label>
                <Input
                  id="chat-name"
                  placeholder="Enter chat name..."
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                />
              </div>

              <div>
                <Label>Invite Members</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-4">
                {loadingUsers ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  <div className="space-y-2">
                    {availableUsers.map((userData: ProfileSummary) => (
                      <div key={userData.user_id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg">
                        <Checkbox
                          id={userData.user_id}
                          checked={selectedUsers.includes(userData.user_id)}
                          onCheckedChange={() => handleUserToggle(userData.user_id)}
                        />
                        <Label
                          htmlFor={userData.user_id}
                          className="flex-1 cursor-pointer flex items-center gap-2"
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {getUserDisplayName(userData).charAt(0).toUpperCase()}
                          </div>
                          <span>{getUserDisplayName(userData)}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedUsers.length} member(s) selected
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateChat} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Chat'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CommunicationsHub;
