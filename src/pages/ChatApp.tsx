import React, { useState, useEffect, useRef } from 'react';

// Module-level diagnostics for React instance detection
interface WindowWithReact extends Window {
  React?: typeof React;
}

console.log('🎯 CHATAPP_MODULE_LOADED');
console.log('ChatApp - React version:', React.version);
if (typeof window !== 'undefined') {
  const w = window as WindowWithReact;
  if (w.React) {
    console.log('🚨 MULTIPLE REACT INSTANCES IN CHATAPP!');
    console.log('Window React version:', w.React.version);
  }
}
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Search,
  Plus,
  LogIn,
  X,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatList } from '@/components/chat/ChatList';
import SafeUserSelector from '@/components/chat/SafeUserSelector';
import { ChatRoom } from '@/components/chat/ChatRoom';

import { ChatAppVerificationBanner } from '@/components/chat/ChatAppVerificationBanner';
import { RelationshipLayerChatApp } from '@/components/chat/RelationshipLayerChatApp';
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
// REMOVED: React call flow - using direct Jitsi links instead
// import { useCallManager } from '@/hooks/useCallManager';
// import JitsiAudioCall from '@/components/jitsi/JitsiAudioCall';
// import JitsiVideoCall from '@/components/jitsi/JitsiVideoCall';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
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
  const [isStartingDirect, setIsStartingDirect] = useState(false);
  const [activeTab, setActiveTab] = useState<'one' | 'circle' | 'relationship'>('one');
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [useRelationshipLayer, setUseRelationshipLayer] = useState(false);
  
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

  // Check if user wants relationship layer (check localStorage preference)
  useEffect(() => {
    const preference = localStorage.getItem('chatapp:relationship-layer');
    if (preference === 'enabled') {
      setUseRelationshipLayer(true);
    }
  }, []);

  // Persist last opened room and auto-open it on login
  useEffect(() => {
    if (currentRoomId) {
      try {
        localStorage.setItem('lastChatRoomId', currentRoomId);
      } catch {
        // Ignore localStorage errors in private browsing
      }
    }
  }, [currentRoomId]);

  useEffect(() => {
    // Intentionally disable auto-open: always land on the chat list unless URL already has ?room=
    // This prevents unexpected navigation to a previous or most recent room.
    autoOpenRanRef.current = true;
  }, [user?.id]);

  // URL param guard previously used sessionStorage gating. Simplified to avoid blocking opens.
  // We now rely on server-side membership/creator checks inside ChatRoom and list visibility.
  useEffect(() => {
    try { 
      sessionStorage.removeItem('chat:allowOpen'); 
    } catch {
      // Ignore sessionStorage errors in private browsing
    }
  }, [currentRoomId]);

   // Track transitions to list view (including browser back) to suppress re-open in this session
  useEffect(() => {
    const prev = prevRoomRef.current;
    if (currentRoomId) {
      try { 
        sessionStorage.removeItem('chat:listPref'); 
      } catch {
        // Ignore sessionStorage errors
      }
    } else if (!currentRoomId && prev) {
      try { 
        sessionStorage.setItem('chat:listPref', 'list'); 
      } catch {
        // Ignore sessionStorage errors
      }
    }
    prevRoomRef.current = currentRoomId;
  }, [currentRoomId]);

  // REMOVED: React call flow - using direct Jitsi links instead
  // const { 
  //   startCall, 
  //   currentCall, 
  //   incomingCall, 
  //   outgoingCall,
  //   answerCall,
  //   declineCall,
  //   endCall
  // } = useCallManager();

  const handleStartDirectChat = async (otherUserId) => {
    if (!user?.id || !otherUserId) return;
    if (isStartingDirect) return;
    setIsStartingDirect(true);
    try {
      if (isStartingDirect) return; // inner race-guard
      // 1) Find existing direct room containing both users
      const { data: rows, error: findErr } = await supabase
        .from('chat_participants')
        .select('room_id, user_id, chat_rooms!inner(id, room_type, is_active)')
        .eq('chat_rooms.room_type', 'direct')
        .eq('chat_rooms.is_active', true)
        .in('user_id', [user.id, otherUserId]);
      if (findErr) throw findErr;

      interface ParticipantRow {
        room_id: string;
        user_id: string;
      }

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

      // 2) If none exists, create a new direct room and upsert participants
      if (!roomId) {
        const { data: room, error: roomErr } = await supabase
          .from('chat_rooms')
          .insert({ name: 'Direct Chat', room_type: 'direct', created_by: user.id, is_active: true })
          .select('id')
          .single();
        if (roomErr) throw roomErr;
        roomId = room.id as string;

        const { error: partErr } = await supabase
          .from('chat_participants')
          .upsert([
            { room_id: roomId, user_id: user.id, is_active: true },
            { room_id: roomId, user_id: otherUserId, is_active: true },
          ], { onConflict: 'room_id,user_id', ignoreDuplicates: false });

        if (partErr) {
          // If conflict, verify both participants exist before failing
          const { data: check, error: checkErr } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', roomId)
            .in('user_id', [user.id, otherUserId]);
          if (checkErr || (check?.length || 0) < 2) throw partErr;
        }
      } else {
        // Ensure both participants are active for existing room
        await supabase
          .from('chat_participants')
          .upsert([
            { room_id: roomId, user_id: user.id, is_active: true },
            { room_id: roomId, user_id: otherUserId, is_active: true },
          ], { onConflict: 'room_id,user_id', ignoreDuplicates: false });
      }

      setSearchParams({ room: roomId! }, { replace: true });
    } catch (error) {
      console.error('Error starting direct chat:', error);
      toast({ title: 'Error', description: 'Could not open direct chat', variant: 'destructive' });
    } finally {
      setIsStartingDirect(false);
    }
  };

  // Embedded Jitsi call state
  const [showJitsi, setShowJitsi] = useState(false);
  
  const handleStartCall = async (otherUserId, callType) => {
    // Start embedded Jitsi call
    setShowJitsi(true);
  };

  // Fetch users when search term changes - prioritize sowers and bestowers
  useEffect(() => {
    if (!isCreateDialogOpen) return;

    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);

        // Fetch all registered sowers
        const { data: sowersData, error: sowersError } = await supabase
          .from('sowers')
          .select(`
            user_id,
            display_name,
            logo_url,
            bio,
            profiles!inner (
              id,
              user_id,
              display_name,
              avatar_url,
              first_name,
              last_name
            )
          `)
          .neq('user_id', user.id);

        if (sowersError) {
          console.error('Error loading sowers:', sowersError);
        }

        // Fetch all registered bestowers (users who have made bestowals)
        const { data: bestowalsData, error: bestowalsError } = await supabase
          .from('product_bestowals')
          .select('bestower_id')
          .neq('bestower_id', user.id);

        if (bestowalsError) {
          console.error('Error loading bestowals:', bestowalsError);
        }

        // Fetch all gosat users
        const { data: gosatRolesData, error: gosatError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'gosat')
          .neq('user_id', user.id);

        if (gosatError) {
          console.error('Error loading gosat users:', gosatError);
        }

        // Get unique bestower IDs
        const bestowerIds = new Set(
          (bestowalsData || []).map((b: any) => b.bestower_id).filter(Boolean)
        );

        // Get unique gosat user IDs
        const gosatIds = new Set(
          (gosatRolesData || []).map((r: any) => r.user_id).filter(Boolean)
        );

        // Fetch profiles for bestowers
        let bestowerProfiles: any[] = [];
        if (bestowerIds.size > 0) {
          const { data: bestowerProfilesData, error: bestowerProfilesError } = await supabase
            .from('profiles')
            .select('id, user_id, display_name, avatar_url, first_name, last_name')
            .in('user_id', Array.from(bestowerIds))
            .neq('user_id', user.id);

          if (!bestowerProfilesError && bestowerProfilesData) {
            bestowerProfiles = bestowerProfilesData.map((p: any) => ({
              ...p,
              is_bestower: true,
            }));
          }
        }

        // Fetch profiles for gosat users
        let gosatProfiles: any[] = [];
        if (gosatIds.size > 0) {
          const { data: gosatProfilesData, error: gosatProfilesError } = await supabase
            .from('profiles')
            .select('id, user_id, display_name, avatar_url, first_name, last_name')
            .in('user_id', Array.from(gosatIds))
            .neq('user_id', user.id);

          if (!gosatProfilesError && gosatProfilesData) {
            gosatProfiles = gosatProfilesData.map((p: any) => ({
              ...p,
              is_gosat: true,
            }));
          }
        }

        // Combine sowers and bestowers, deduplicate by user_id
        const allUsersMap = new Map<string, any>();

        // Add sowers
        (sowersData || []).forEach((sower: any) => {
          if (sower.profiles && sower.user_id) {
            const profile = sower.profiles;
            allUsersMap.set(sower.user_id, {
              id: profile.id,
              user_id: profile.user_id || sower.user_id,
              display_name: profile.display_name || sower.display_name,
              avatar_url: profile.avatar_url || sower.logo_url,
              first_name: profile.first_name,
              last_name: profile.last_name,
              is_sower: true,
              is_bestower: bestowerIds.has(sower.user_id),
              is_gosat: gosatIds.has(sower.user_id),
            });
          }
        });

        // Add bestowers (if not already added as sowers)
        bestowerProfiles.forEach((profile: any) => {
          if (!allUsersMap.has(profile.user_id)) {
            allUsersMap.set(profile.user_id, {
              ...profile,
              is_bestower: true,
              is_sower: false,
              is_gosat: gosatIds.has(profile.user_id),
            });
          } else {
            // Update existing profile to mark as bestower too
            const existing = allUsersMap.get(profile.user_id);
            if (existing) {
              existing.is_bestower = true;
              existing.is_gosat = gosatIds.has(profile.user_id) || existing.is_gosat;
            }
          }
        });

        // Add gosat users (if not already added)
        gosatProfiles.forEach((profile: any) => {
          if (!allUsersMap.has(profile.user_id)) {
            allUsersMap.set(profile.user_id, {
              ...profile,
              is_gosat: true,
              is_sower: false,
              is_bestower: bestowerIds.has(profile.user_id),
            });
          } else {
            // Update existing profile to mark as gosat too
            const existing = allUsersMap.get(profile.user_id);
            if (existing) {
              existing.is_gosat = true;
            }
          }
        });

        // Convert map to array
        let allUsers = Array.from(allUsersMap.values());

        // Apply search filter if provided
        if (userSearchTerm.trim()) {
          const searchLower = userSearchTerm.toLowerCase();
          allUsers = allUsers.filter((u: any) => {
            const displayName = (u.display_name || '').toLowerCase();
            const firstName = (u.first_name || '').toLowerCase();
            const lastName = (u.last_name || '').toLowerCase();
            return displayName.includes(searchLower) || 
                   firstName.includes(searchLower) || 
                   lastName.includes(searchLower);
          });
        }

        // Limit to 50 results (prioritizing sowers and bestowers)
        setAvailableUsers(allUsers.slice(0, 50));
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Error fetching users:', e);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();

    return () => controller.abort();
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
    if (isCreating) return; // guard against double submission
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

      // Idempotent: reuse existing active circle by same name created by this user if present
      const { data: existing, error: findErr } = await supabase
        .from('chat_rooms')
        .select('id, created_at')
        .eq('created_by', user.id)
        .eq('room_type', 'group')
        .eq('is_active', true)
        .ilike('name', name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr && (findErr as Error & { code?: string })?.code !== 'PGRST116') throw findErr; // ignore "no rows"

      let roomId: string;
      if (existing?.id) {
        roomId = existing.id as string;
      } else {
        // Create new chat room
        const { data: room, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            name,
            room_type: 'group',
            created_by: user.id,
            is_active: true,
          })
          .select('id')
          .single();
        if (roomError) throw roomError;
        roomId = room.id as string;
      }

      // Upsert creator + invitees as active participants (idempotent)
      const uniqueIds = Array.from(new Set([user.id, ...selectedUsers]));
      const participants = uniqueIds.map(uid => ({
        room_id: roomId,
        user_id: uid,
        is_moderator: uid === user.id,
        is_active: true,
      }));

      const { error: participantError } = await supabase
        .from('chat_participants')
        .upsert(participants, { onConflict: 'room_id,user_id', ignoreDuplicates: false });
      if (participantError) throw participantError;

      // Send notifications to invited users (best-effort)
      if (selectedUsers.length > 0) {
        const notifications = selectedUsers.map(userId => ({
          user_id: userId,
          type: 'chat_invite',
          title: 'Chat Room Invitation',
          message: `You've been invited to join "${name}"`,
          action_url: '/chatapp'
        }));
        try { 
          await supabase.from('user_notifications').insert(notifications); 
        } catch {
          // Best-effort notification, ignore errors
        }
      }

      toast({
        title: 'Chat ready!',
        description: selectedUsers.length > 0 
          ? `${name} ready with ${selectedUsers.length} member(s).`
          : `${name} has been created successfully.`,
      });

      // Reset and close
      setNewChatName('');
      setSelectedUsers([]);
      setUserSearchTerm('');
      setIsCreateDialogOpen(false);

      // Navigate to the room
      setSearchParams({ room: roomId }, { replace: true });
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: 'Failed to create chat',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToList = () => {
    try { 
      sessionStorage.setItem('chat:listPref', 'list'); 
    } catch {
      // Ignore sessionStorage errors
    }
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

  // REMOVED: React call flow - using direct Jitsi links instead
  // Call interface removed - users open Jitsi Meet directly
  // const activeCall = currentCall || outgoingCall;
  // if (activeCall) {
  //   const CallComponent = activeCall?.type === 'video' ? JitsiVideoCall : JitsiAudioCall;
  //   return (
  //     <CallComponent
  //       callSession={activeCall}
  //       currentUserId={user?.id || ''}
  //       callerInfo={{
  //         display_name: activeCall?.caller_name || activeCall?.receiver_name || 'Unknown',
  //         avatar_url: null
  //       }}
  //       onEndCall={() => activeCall && endCall(activeCall.id, 'ended')}
  //     />
  //   );
  // }

  return (
    <div className="container mx-auto p-4 max-w-7xl h-[calc(100vh-2rem)] pb-28">
      {/* Jitsi Call */}
      {showJitsi && (
        <div className="mb-4 p-4 border rounded-lg">
          <JitsiRoom
            roomName={crypto.randomUUID().slice(0, 12)}
            onLeave={() => setShowJitsi(false)}
          />
        </div>
      )}

      {currentRoomId ? (
        <ChatRoom roomId={currentRoomId} onBack={handleBackToList} />
      ) : useRelationshipLayer ? (
        // Relationship Layer Mode
        <RelationshipLayerChatApp 
          onCompleteOnboarding={() => {
            // Keep relationship layer enabled after onboarding
            localStorage.setItem('chatapp:relationship-layer', 'enabled');
          }}
        />
      ) : (
        <>
          {/* Verification Banner */}
          {isVerified === false && <ChatAppVerificationBanner />}
          
          {/* Header */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Chats</h1>
                <p className="text-sm text-muted-foreground">
                  Click on a chat below to send messages, voice notes, make calls & more
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseRelationshipLayer(true);
                    localStorage.setItem('chatapp:relationship-layer', 'enabled');
                  }}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Try Circles
                </Button>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
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
              <TabsTrigger value="circle">Community</TabsTrigger>
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
                <h2 className="text-xl font-semibold">Community</h2>
                {/* Create New Chat/Circle */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
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
                                {userData?.is_sower && (
                                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 px-1">
                                    S
                                  </Badge>
                                )}
                                {userData?.is_bestower && (
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1">
                                    B
                                  </Badge>
                                )}
                                {userData?.is_gosat && (
                                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 px-1">
                                    G
                                  </Badge>
                                )}
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
                                    <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium truncate">
                                      {getUserDisplayName(userData)}
                                    </div>
                                    <div className="flex gap-1">
                                      {userData.is_sower && (
                                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 dark:text-red-400">
                                          Sower
                                        </Badge>
                                      )}
                                      {userData.is_bestower && (
                                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                          Bestower
                                        </Badge>
                                      )}
                                      {userData.is_gosat && (
                                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                          Gosat
                                        </Badge>
                                      )}
                                    </div>
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
