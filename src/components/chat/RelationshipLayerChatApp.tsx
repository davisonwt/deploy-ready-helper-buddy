import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CirclesBubbleRail, Circle } from './CirclesBubbleRail';
import { SwipeDeck } from './SwipeDeck';
import { GroupChatRoomEnhanced } from './GroupChatRoomEnhanced';
import { BestowalCoin } from './BestowalCoin';
import { AnimatedGradientBackground } from './AnimatedGradientBackground';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface RelationshipLayerChatAppProps {
  onCompleteOnboarding?: () => void;
}

export function RelationshipLayerChatApp({ onCompleteOnboarding }: RelationshipLayerChatAppProps) {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [hueRotation, setHueRotation] = useState(0);
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
        setCircles(defaultCircles);
        return;
      }

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
        // No circles yet, show default ones
        const defaultCircles: Circle[] = [
          { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500', unreadCount: 0 },
          { id: 'whisperers', name: 'S2G-Whisperers', emoji: '🟡', color: 'bg-yellow-500', unreadCount: 0 },
          { id: 'family-364', name: '364yhvh-Family', emoji: '🟢', color: 'bg-green-500', unreadCount: 0 },
          { id: 'family', name: 'Family', emoji: '🔵', color: 'bg-blue-500', unreadCount: 0 },
          { id: 'friends', name: 'Friends', emoji: '🟣', color: 'bg-purple-500', unreadCount: 0 },
        ];
        setCircles(defaultCircles);
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

    // Add person to circle
    const { error } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circleId,
        user_id: profile.id,
        added_by: user.id,
      });

    if (error) {
      console.error('Error adding to circle:', error);
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadCircles();
    onCompleteOnboarding?.();
  };

  const handleCircleSelect = (circleId: string) => {
    setActiveCircleId(circleId);
    // Load rooms for this circle
  };

  // Onboarding flow
  if (showOnboarding) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <AnimatedGradientBackground />
        <Card className="w-full max-w-md relative z-10 bg-background/95 backdrop-blur">
          <CardContent className="p-6">
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
    <div className="relative min-h-screen">
      <AnimatedGradientBackground />
      
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with streak badge */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/95 backdrop-blur">
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

        {/* Chat Room or Empty State */}
        <div className="flex-1 overflow-hidden">
          {selectedRoomId ? (
            <GroupChatRoomEnhanced
              roomId={selectedRoomId}
              roomName="Room Name"
              participants={[]}
              onBack={() => setSelectedRoomId(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Select a circle to see conversations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

