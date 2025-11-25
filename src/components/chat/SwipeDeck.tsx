import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Heart, UserPlus, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Confetti from 'react-confetti';

interface Profile {
  id: string;
  user_id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  tags?: string[];
  is_sower?: boolean;
  is_bestower?: boolean;
  is_gosat?: boolean;
}

interface SwipeDeckProps {
  onSwipeRight: (profile: Profile, circleId: string) => void;
  onComplete: () => void;
  initialCircleId?: string;
}

export function SwipeDeck({ onSwipeRight, onComplete, initialCircleId }: SwipeDeckProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCircle, setSelectedCircle] = useState<string>(initialCircleId || 'friends');
  const [swipeCount, setSwipeCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const circles = [
    { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500' },
    { id: 'whisperers', name: 'S2G-Whisperers', emoji: '🟡', color: 'bg-yellow-500' },
    { id: 'family-364', name: '364yhvh-Family', emoji: '🟢', color: 'bg-green-500' },
    { id: 'family', name: 'Family', emoji: '🔵', color: 'bg-blue-500' },
    { id: 'friends', name: 'Friends', emoji: '🟣', color: 'bg-purple-500' },
  ];

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔍 Starting to load profiles for user:', user.id);

      // Fetch all registered sowers (just get user_ids - no join needed)
      const { data: sowersData, error: sowersError } = await supabase
        .from('sowers')
        .select('user_id, display_name, logo_url, bio')
        .neq('user_id', user.id);

      if (sowersError) {
        console.error('❌ Error loading sowers:', sowersError);
      }

      console.log('📊 Loaded sowers:', sowersData?.length || 0, sowersData);

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

      // Get unique sower user IDs
      const sowerIds = new Set(
        (sowersData || []).map((s: any) => s.user_id).filter(Boolean)
      );

      console.log('📋 User ID sets:', {
        sowers: sowerIds.size,
        bestowers: bestowerIds.size,
        gosat: gosatIds.size,
      });

      // Collect ALL unique user IDs we need profiles for
      const allUserIds = new Set<string>();
      sowerIds.forEach(id => allUserIds.add(id));
      bestowerIds.forEach(id => allUserIds.add(id));
      gosatIds.forEach(id => allUserIds.add(id));

      console.log('👥 Total unique user IDs to fetch:', allUserIds.size);

      // Fetch ALL profiles for these users in one query
      let allProfilesData: any[] = [];
      if (allUserIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, username, full_name, avatar_url, bio, display_name, first_name, last_name')
          .in('user_id', Array.from(allUserIds))
          .neq('user_id', user.id);

        if (profilesError) {
          console.error('❌ Error loading profiles:', profilesError);
        } else {
          allProfilesData = profilesData || [];
          console.log('✅ Loaded profiles:', allProfilesData.length);
        }
      }

      // Create a map of sower data by user_id for quick lookup
      const sowersMap = new Map<string, any>();
      (sowersData || []).forEach((sower: any) => {
        if (sower.user_id) {
          sowersMap.set(sower.user_id, sower);
        }
      });

      // Combine all profiles and mark their roles
      const allProfilesMap = new Map<string, any>();

      allProfilesData.forEach((profile: any) => {
        if (!profile.user_id) return;

        const sowerData = sowersMap.get(profile.user_id);
        
        allProfilesMap.set(profile.user_id, {
          id: profile.id,
          user_id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name || profile.display_name || 
                     `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                     sowerData?.display_name || 
                     'User',
          avatar_url: profile.avatar_url || sowerData?.logo_url,
          bio: profile.bio || sowerData?.bio,
          is_sower: sowerIds.has(profile.user_id),
          is_bestower: bestowerIds.has(profile.user_id),
          is_gosat: gosatIds.has(profile.user_id),
        });
      });

      // Also add sowers that might not have profiles yet
      sowersData?.forEach((sower: any) => {
        if (sower.user_id && !allProfilesMap.has(sower.user_id)) {
          allProfilesMap.set(sower.user_id, {
            id: sower.user_id, // Use user_id as id if no profile
            user_id: sower.user_id,
            username: null,
            full_name: sower.display_name || 'Sower',
            avatar_url: sower.logo_url,
            bio: sower.bio,
            is_sower: true,
            is_bestower: bestowerIds.has(sower.user_id),
            is_gosat: gosatIds.has(sower.user_id),
          });
        }
      });

      // Convert map to array and add tags
      const profilesWithTags = Array.from(allProfilesMap.values()).map(profile => {
        const tags: string[] = [];
        if (profile.is_sower) tags.push('Sower');
        if (profile.is_bestower) tags.push('Bestower');
        if (profile.is_gosat) tags.push('Gosat');
        
        return {
          ...profile,
          tags: tags.length > 0 ? tags : ['Member'],
        };
      });


      console.log('✅ Total profiles loaded:', profilesWithTags.length);
      console.log('📋 Profiles breakdown:', {
        sowers: profilesWithTags.filter(p => p.is_sower).length,
        bestowers: profilesWithTags.filter(p => p.is_bestower).length,
        gosat: profilesWithTags.filter(p => p.is_gosat).length,
      });

      setProfiles(profilesWithTags);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setLoading(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right', info?: PanInfo) => {
    if (currentIndex >= profiles.length) return;

    const currentProfile = profiles[currentIndex];

    if (direction === 'right') {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Confetti burst
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      // Add to circle - use user_id if available, otherwise use id
      const profileToAdd = {
        ...currentProfile,
        id: currentProfile.user_id || currentProfile.id,
      };
      onSwipeRight(profileToAdd, selectedCircle);
      setSwipeCount(prev => prev + 1);

      toast({
        title: 'Added!',
        description: `${currentProfile.full_name || currentProfile.username} added to ${circles.find(c => c.id === selectedCircle)?.name}`,
      });
    }

    // Move to next card
    setCurrentIndex(prev => prev + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < profiles.length) {
      handleSwipe('left');
    }
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
          <p className="text-muted-foreground mb-4">
            You've seen everyone. Check back later for new people.
          </p>
          <Button onClick={onComplete}>Done</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto h-[600px]">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      {/* Visual Circle Selector with actual circles */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-4 text-center font-medium">
          Choose a circle to add this person to:
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          {circles.map((circle) => (
            <motion.button
              key={circle.id}
              onClick={() => setSelectedCircle(circle.id)}
              className={`
                relative flex flex-col items-center justify-center
                w-24 h-24 rounded-full border-4 transition-all
                ${selectedCircle === circle.id 
                  ? `${circle.color} border-white shadow-2xl scale-110` 
                  : 'bg-muted/50 border-muted-foreground/30 hover:scale-105 hover:border-muted-foreground/50'
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Glow effect */}
              {selectedCircle === circle.id && (
                <motion.div
                  className={`absolute inset-0 rounded-full ${circle.color} blur-xl opacity-50`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              
              {/* Emoji */}
              <span className="text-3xl relative z-10 mb-1">{circle.emoji}</span>
              
              {/* Circle name */}
              <span className={`
                text-xs font-bold relative z-10 text-center px-2
                ${selectedCircle === circle.id ? 'text-white drop-shadow-lg' : 'text-muted-foreground'}
              `}>
                {circle.name.split('-')[0]}
              </span>
              
              {/* Selected indicator */}
              {selectedCircle === circle.id && (
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Swipe cards */}
      <div className="relative h-full">
        {profiles.slice(currentIndex, currentIndex + 3).map((profile, stackIndex) => {
          const isTop = stackIndex === 0;
          const zIndex = 3 - stackIndex;
          const scale = 1 - stackIndex * 0.05;
          const yOffset = stackIndex * 10;

          return (
            <motion.div
              key={profile.id}
              className="absolute inset-0"
              style={{ zIndex }}
              initial={{ scale, y: yOffset, opacity: isTop ? 1 : 0.7 }}
              animate={{ scale, y: yOffset, opacity: isTop ? 1 : 0.7 }}
              drag={isTop ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (!isTop) return;
                const threshold = 100;
                if (info.offset.x > threshold) {
                  handleSwipe('right', info);
                } else if (info.offset.x < -threshold) {
                  handleSwipe('left', info);
                }
              }}
            >
              <Card className="h-full cursor-grab active:cursor-grabbing">
                <CardContent className="p-8 h-full flex flex-col bg-gradient-to-br from-card/80 to-card/40 backdrop-blur">
                  {/* Avatar with glow */}
                  <div className="flex justify-center mb-6 relative">
                    <motion.div
                      className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <Avatar className="h-40 w-40 ring-4 ring-primary/30 shadow-2xl relative z-10">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/30 to-primary/10">
                        {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name */}
                  <h3 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                    {profile.full_name || profile.username || 'Anonymous'}
                  </h3>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-muted-foreground text-center mb-6 text-sm leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  {/* Tags */}
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mb-8">
                      {profile.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-6 justify-center mt-auto">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full h-16 w-16 p-0 border-2"
                        onClick={() => handleSwipe('left')}
                      >
                        <X className="h-7 w-7" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        size="lg"
                        className="rounded-full h-20 w-20 p-0 bg-gradient-to-r from-primary to-primary/80 shadow-xl shadow-primary/50"
                        onClick={() => handleSwipe('right')}
                      >
                        <Heart className="h-8 w-8" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="rounded-full w-16 h-16 p-0"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">{currentIndex + 1} / {profiles.length}</p>
          <p className="text-xs text-muted-foreground">Swipe or use buttons</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={handleNext}
          disabled={currentIndex >= profiles.length - 1}
          className="rounded-full w-16 h-16 p-0"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

