import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CirclesBubbleRail, Circle } from './CirclesBubbleRail';
import { SwipeDeck } from './SwipeDeck';
import { GroupChatRoomEnhanced } from './GroupChatRoomEnhanced';
import { BestowalCoin } from './BestowalCoin';
import { GlassmorphismDashboard } from './GlassmorphismDashboard';
import { CircleMembersList } from './CircleMembersList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [hueRotation, setHueRotation] = useState(0);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [swipeDeckRefreshKey, setSwipeDeckRefreshKey] = useState(0);
  const backgroundRef = useRef<HTMLDivElement>(null);

  // Animated gradient background
  useEffect(() => {
    const interval = setInterval(() => {
      setHueRotation(prev => (prev + 1) % 360);
    }, 30000); // Change every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Load circles and check streak (skip onboarding check)
  useEffect(() => {
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

  const handleStartChat = async (userId: string) => {
    if (!user) return;
    
    try {
      // Create or get direct room
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: userId,
      });

      if (error) throw error;

      // Navigate to chat app with the room
      navigate(`/chatapp?room=${roomId}`);
      
      toast({
        title: 'Chat opened',
        description: 'Direct message room is ready',
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  const handleStartCall = async (userId: string, callType: 'audio' | 'video') => {
    if (!user) return;
    
    try {
      // Generate unique room name for Jitsi
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let roomName = '';
      for (let i = 0; i < 12; i++) {
        roomName += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const jitsiDomain = import.meta.env.VITE_JITSI_DOMAIN || '197.245.26.199';
      const jitsiUrl = `https://${jitsiDomain}/${roomName}${callType === 'audio' ? '?config.startAudioOnly=true' : ''}`;
      
      // Open Jitsi in new window
      window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
      
      toast({
        title: `${callType === 'audio' ? 'Voice' : 'Video'} call started`,
        description: 'Call window opened in new tab',
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive',
      });
    }
  };

  // Show glassmorphism dashboard
  if (showDashboard && !showOnboarding) {
    return (
      <GlassmorphismDashboard 
        circles={circles}
        activeCircleId={activeCircleId || undefined}
        circleMembers={activeCircleId ? circleMembers : undefined}
        loadingMembers={loadingMembers}
        onCircleSelect={(circleId) => {
          setActiveCircleId(circleId);
          loadCircleMembers(circleId);
        }}
        onCircleDeselect={() => {
          setActiveCircleId(null);
          setCircleMembers([]);
        }}
        onStartChat={handleStartChat}
        onStartCall={handleStartCall}
        onAddPeople={() => setShowOnboarding(true)}
        onNavigate={(mode) => {
          setShowDashboard(false);
          // Handle navigation to specific mode
        }}
        onMemberRemoved={handleMemberRemoved}
      />
    );
  }

  // Main Circles Interface
  return (
    <div className="w-full">
      <div className="p-4 md:p-6">
        {/* Circles Bubble Rail */}
        <div className="mb-6">
          <CirclesBubbleRail
            circles={circles}
            activeCircleId={activeCircleId || undefined}
            onCircleSelect={handleCircleSelect}
            onCircleReorder={() => {}}
            onCircleHide={() => {}}
          />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          {activeCircleId ? (
            <div className="space-y-6">
              {/* Circle Members List */}
              <Card className="glass-card border border-primary/20 bg-transparent">
                <CardContent className="p-6">
                  <CircleMembersList
                    circleId={activeCircleId}
                    circles={circles}
                    onStartChat={handleStartChat}
                    onStartCall={handleStartCall}
                    onMemberRemoved={handleMemberRemoved}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass-card border border-primary/20 bg-transparent">
              <CardContent className="p-6 text-center">
                <p className="text-foreground/80">
                  Select a circle above to view members or add new people
                </p>
              </CardContent>
            </Card>
          )}

          {/* Swipe Deck - Always Available */}
          <Card className="mt-6 glass-card border border-primary/20 bg-transparent">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Add People to Circles
              </h2>
              <SwipeDeck
                onSwipeRight={handleSwipeRight}
                onComplete={() => {
                  loadCircles();
                }}
                initialCircleId={activeCircleId || undefined}
                refreshKey={swipeDeckRefreshKey}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

