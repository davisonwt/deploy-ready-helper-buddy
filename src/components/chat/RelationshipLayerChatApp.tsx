import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CirclesBubbleRail, Circle } from './CirclesBubbleRail';
import { SwipeDeck } from './SwipeDeck';
import { GroupChatRoomEnhanced } from './GroupChatRoomEnhanced';
import { BestowalCoin } from './BestowalCoin';
import { CircleMembersList } from './CircleMembersList';
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
  const [swipeDeckRefreshKey, setSwipeDeckRefreshKey] = useState(0);
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
      // Load circles from database
      const { data: circlesData, error: circlesError } = await supabase
        .from('circles')
        .select('id, name, emoji, color')
        .order('name');

      if (circlesError) {
        console.error('Error loading circles:', circlesError);
        return;
      }

      if (!circlesData || circlesData.length === 0) {
        console.warn('No circles found in database');
        return;
      }

      // Fetch member counts for all circles
      const circleIds = circlesData.map(c => c.id);
      const { data: memberCounts } = await supabase
        .from('circle_members')
        .select('circle_id')
        .in('circle_id', circleIds);

      // Count members per circle
      const counts = new Map<string, number>();
      (memberCounts || []).forEach((m: any) => {
        counts.set(m.circle_id, (counts.get(m.circle_id) || 0) + 1);
      });

      // Format circles with member counts
      const formattedCircles: Circle[] = circlesData.map((circle: any) => ({
        id: circle.id,
        name: circle.name,
        emoji: circle.emoji,
        color: circle.color,
        unreadCount: 0,
        isLive: false,
        memberCount: counts.get(circle.id) || 0,
      }));

      console.log('✅ Loaded circles with counts:', formattedCircles);
      setCircles(formattedCircles);
    } catch (error) {
      console.error('Error loading circles:', error);
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
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', userIdToAdd)
      .maybeSingle();

    if (existing) {
      console.log('User already in circle');
      return;
    }

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
      await loadCircles();
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
      console.log('🔍 Loading members for circle:', circleId);
      
      // Load circle members
      const { data: membersData, error: membersError } = await supabase
        .from('circle_members')
        .select('user_id')
        .eq('circle_id', circleId);

      if (membersError) {
        console.error('❌ Error loading circle members:', membersError);
        setCircleMembers([]);
        setLoadingMembers(false);
        return;
      }

      const userIds = (membersData || []).map((m: any) => m.user_id).filter(Boolean);
      
      console.log('📋 Found user IDs in circle:', userIds.length);
      
      if (userIds.length === 0) {
        setCircleMembers([]);
        setLoadingMembers(false);
        return;
      }

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, full_name, avatar_url, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        setCircleMembers([]);
        setLoadingMembers(false);
        return;
      }

      console.log('✅ Loaded profiles:', profilesData?.length || 0);

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
      const members: CircleMember[] = (profilesData || []).map((profile: any) => ({
        id: profile.id,
        user_id: profile.user_id,
        display_name: profile.display_name,
        full_name: profile.full_name || profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
        avatar_url: profile.avatar_url,
        is_sower: sowerIds.has(profile.user_id),
        is_bestower: bestowerIds.has(profile.user_id),
        is_gosat: gosatIds.has(profile.user_id),
      }));

      console.log('✅ Formatted members:', members.length);
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

  const handleMemberRemoved = () => {
    setSwipeDeckRefreshKey(prev => prev + 1);
    loadCircles();
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
              refreshKey={swipeDeckRefreshKey}
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
              <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    {circles.find(c => c.id === activeCircleId)?.name || 'Circle'}
                  </h2>
                </div>

                <CircleMembersList
                  circleId={activeCircleId}
                  onStartChat={(userId) => {
                    // TODO: Implement chat functionality
                    console.log('Start chat with:', userId);
                  }}
                  circles={circles}
                  onMemberRemoved={handleMemberRemoved}
                />
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

