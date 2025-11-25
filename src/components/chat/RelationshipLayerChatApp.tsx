import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CirclesBubbleRail, Circle } from './CirclesBubbleRail';
import { SwipeDeck } from './SwipeDeck';
import { GroupChatRoomEnhanced } from './GroupChatRoomEnhanced';
import { BestowalCoin } from './BestowalCoin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, UserPlus, Users, ArrowLeft, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RelationshipLayerChatAppProps {
  onCompleteOnboarding?: () => void;
}

interface CircleMember {
  id: string;
  user_id: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  is_sower?: boolean;
  is_bestower?: boolean;
  is_gosat?: boolean;
}

export function RelationshipLayerChatApp({ onCompleteOnboarding }: RelationshipLayerChatAppProps) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [hueRotation, setHueRotation] = useState(0);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const backgroundRef = useRef<HTMLDivElement>(null);

  // Animated gradient background
  useEffect(() => {
    const interval = setInterval(() => {
      setHueRotation(prev => (prev + 1) % 360);
    }, 30000); // Change every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Check if user needs onboarding
  useEffect(() => {
    checkOnboardingStatus();
    loadCircles();
    checkStreak();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_circles')
        .select('circle_id')
        .eq('user_id', user.id)
        .limit(1);

      // If table doesn't exist or no circles, show onboarding
      if (error || !data || data.length === 0) {
        setShowOnboarding(true);
      }
    } catch (error) {
      // Table might not exist yet, show onboarding
      console.warn('Onboarding check failed:', error);
      setShowOnboarding(true);
    }
  };

  const loadCircles = async () => {
    if (!user) return;

    try {
      // Load user's circles
      const { data, error } = await supabase
        .from('user_circles')
        .select(`
          circle_id,
          circles (
            id,
            name,
            emoji,
            color,
            unread_count,
            is_live,
            member_count
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        // Table might not exist yet, use default circles
        console.warn('Circles table not available:', error);
        const defaultCircles: Circle[] = [
          { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500', unreadCount: 0 },
          { id: 'whisperers', name: 'S2G-Whisperers', emoji: '🟡', color: 'bg-yellow-500', unreadCount: 0 },
          { id: 'family-364', name: '364yhvh-Family', emoji: '🟢', color: 'bg-green-500', unreadCount: 0 },
          { id: 'family', name: 'Family', emoji: '🔵', color: 'bg-blue-500', unreadCount: 0 },
          { id: 'friends', name: 'Friends', emoji: '🟣', color: 'bg-purple-500', unreadCount: 0 },
        ];
        
        // Fetch member counts for default circles
        const circleIds = defaultCircles.map(c => c.id);
        const { data: memberCounts } = await supabase
          .from('circle_members')
          .select('circle_id')
          .in('circle_id', circleIds);

        const counts = new Map<string, number>();
        (memberCounts || []).forEach((m: any) => {
          counts.set(m.circle_id, (counts.get(m.circle_id) || 0) + 1);
        });

        const circlesWithCounts = defaultCircles.map(circle => ({
          ...circle,
          memberCount: counts.get(circle.id) || 0,
        }));

        setCircles(circlesWithCounts);
        return;
      }

      // Default circles
      const defaultCircles: Circle[] = [
        { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500', unreadCount: 0 },
        { id: 'whisperers', name: 'S2G-Whisperers', emoji: '🟡', color: 'bg-yellow-500', unreadCount: 0 },
        { id: 'family-364', name: '364yhvh-Family', emoji: '🟢', color: 'bg-green-500', unreadCount: 0 },
        { id: 'family', name: 'Family', emoji: '🔵', color: 'bg-blue-500', unreadCount: 0 },
        { id: 'friends', name: 'Friends', emoji: '🟣', color: 'bg-purple-500', unreadCount: 0 },
      ];

      if (data && data.length > 0) {
        const formattedCircles: Circle[] = data.map((uc: any) => ({
          id: uc.circle_id,
          name: uc.circles?.name || '',
          emoji: uc.circles?.emoji || '👥',
          color: uc.circles?.color || 'bg-gray-500',
          unreadCount: uc.circles?.unread_count || 0,
          isLive: uc.circles?.is_live || false,
          memberCount: uc.circles?.member_count || 0,
        }));
        setCircles(formattedCircles);
      } else {
        // No circles in database, use defaults and fetch member counts
        const circleIds = defaultCircles.map(c => c.id);
        const { data: memberCounts } = await supabase
          .from('circle_members')
          .select('circle_id')
          .in('circle_id', circleIds);

        // Count members per circle
        const counts = new Map<string, number>();
        (memberCounts || []).forEach((m: any) => {
          counts.set(m.circle_id, (counts.get(m.circle_id) || 0) + 1);
        });

        // Update default circles with member counts
        const circlesWithCounts = defaultCircles.map(circle => ({
          ...circle,
          memberCount: counts.get(circle.id) || 0,
        }));

        setCircles(circlesWithCounts);
      }
    } catch (error) {
      console.error('Error loading circles:', error);
      // Fallback to default circles
      const defaultCircles: Circle[] = [
        { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500', unreadCount: 0 },
        { id: 'whisperers', name: 'S2G-Whisperers', emoji: '🟡', color: 'bg-yellow-500', unreadCount: 0 },
        { id: 'family-364', name: '364yhvh-Family', emoji: '🟢', color: 'bg-green-500', unreadCount: 0 },
        { id: 'family', name: 'Family', emoji: '🔵', color: 'bg-blue-500', unreadCount: 0 },
        { id: 'friends', name: 'Friends', emoji: '🟣', color: 'bg-purple-500', unreadCount: 0 },
      ];
      setCircles(defaultCircles);
    }
  };

  const checkStreak = async () => {
    if (!user) return;

    // Check consecutive days with messages
    try {
      const { data } = await supabase
        .rpc('get_message_streak', { user_id_param: user.id });
      setStreakDays(data || 0);
    } catch (error) {
      // Function might not exist yet, default to 0
      console.warn('Streak function not available:', error);
      setStreakDays(0);
    }
  };

  const handleSwipeRight = async (profile: any, circleId: string) => {
    if (!user) return;

    // Add person to circle - use user_id if available, otherwise use id
    const userIdToAdd = profile.user_id || profile.id;
    
    const { error } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circleId,
        user_id: userIdToAdd,
        added_by: user.id,
      });

    if (error) {
      console.error('Error adding to circle:', error);
    } else {
      // Reload circle members if this circle is active
      if (activeCircleId === circleId) {
        loadCircleMembers(circleId);
      }
      // Update circle member count
      loadCircles();
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  };

  const loadCircleMembers = async (circleId: string) => {
    if (!user) return;
    
    setLoadingMembers(true);
    try {
      // Load circle members with their profile data
      const { data, error } = await supabase
        .from('circle_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            user_id,
            display_name,
            full_name,
            avatar_url,
            first_name,
            last_name
          )
        `)
        .eq('circle_id', circleId);

      if (error) {
        console.error('Error loading circle members:', error);
        setCircleMembers([]);
        return;
      }

      // Also check if members are sowers, bestowers, or gosat
      const userIds = (data || []).map((m: any) => m.user_id).filter(Boolean);
      
      if (userIds.length === 0) {
        setCircleMembers([]);
        setLoadingMembers(false);
        return;
      }

      // Fetch sowers
      const { data: sowersData } = await supabase
        .from('sowers')
        .select('user_id')
        .in('user_id', userIds);

      // Fetch bestowers
      const { data: bestowalsData } = await supabase
        .from('product_bestowals')
        .select('bestower_id')
        .in('bestower_id', userIds);

      // Fetch gosat users
      const { data: gosatData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gosat')
        .in('user_id', userIds);

      const sowerIds = new Set((sowersData || []).map((s: any) => s.user_id));
      const bestowerIds = new Set((bestowalsData || []).map((b: any) => b.bestower_id));
      const gosatIds = new Set((gosatData || []).map((g: any) => g.user_id));

      // Format members with role flags
      const members: CircleMember[] = (data || []).map((member: any) => {
        const profile = member.profiles || {};
        return {
          id: profile.id || member.user_id,
          user_id: member.user_id,
          display_name: profile.display_name,
          full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          avatar_url: profile.avatar_url,
          is_sower: sowerIds.has(member.user_id),
          is_bestower: bestowerIds.has(member.user_id),
          is_gosat: gosatIds.has(member.user_id),
        };
      });

      setCircleMembers(members);
    } catch (error) {
      console.error('Error loading circle members:', error);
      setCircleMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadCircles();
    onCompleteOnboarding?.();
  };

  const handleCircleSelect = (circleId: string) => {
    setActiveCircleId(circleId);
    loadCircleMembers(circleId);
  };

  // Onboarding flow
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-start justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Card className="w-full max-w-5xl mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => setShowOnboarding(false)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOnboarding(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Welcome to Your Circles</h2>
              <p className="text-muted-foreground">
                Add people to your circles to get started
              </p>
            </div>

            <SwipeDeck
              onSwipeRight={handleSwipeRight}
              onComplete={handleOnboardingComplete}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main chat interface
  return (
    <div
      ref={backgroundRef}
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `linear-gradient(${hueRotation}deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))`,
        transition: 'background 30s ease',
      }}
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with streak badge */}
        <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">ChatApp</h1>
            {streakDays > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                {streakDays} day{streakDays !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOnboarding(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add People
          </Button>
        </div>

        {/* Circles Bubble Rail */}
        <div className="p-4 bg-background/80 backdrop-blur-sm border-b">
          <CirclesBubbleRail
            circles={circles}
            activeCircleId={activeCircleId || undefined}
            onCircleSelect={handleCircleSelect}
            onCircleReorder={(newCircles) => setCircles(newCircles)}
            onCircleHide={(circleId) => {
              setCircles(circles.filter(c => c.id !== circleId));
            }}
          />
        </div>

        {/* Chat Room or Circle Members View */}
        <div className="flex-1 overflow-hidden">
          {selectedRoomId ? (
            <GroupChatRoomEnhanced
              roomId={selectedRoomId}
              roomName="Room Name"
              participants={[]}
              onBack={() => setSelectedRoomId(null)}
            />
          ) : activeCircleId ? (
            <ScrollArea className="h-full p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    {circles.find(c => c.id === activeCircleId)?.name || 'Circle'}
                  </h2>
                  <p className="text-muted-foreground">
                    {circleMembers.length} member{circleMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {loadingMembers ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                  </div>
                ) : circleMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Users className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">
                      No members in this circle yet
                    </p>
                    <Button onClick={() => setShowOnboarding(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add People
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {circleMembers.map((member) => (
                      <Card key={member.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 flex flex-col items-center">
                          <Avatar className="h-16 w-16 mb-3">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>
                              {(member.display_name || member.full_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold text-sm text-center mb-2 line-clamp-1">
                            {member.display_name || member.full_name || 'User'}
                          </h3>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {member.is_sower && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">Sower</Badge>
                            )}
                            {member.is_bestower && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">Bestower</Badge>
                            )}
                            {member.is_gosat && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-500 text-white">Gosat</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Select a circle to see members
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

