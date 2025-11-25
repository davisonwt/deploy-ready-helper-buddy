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

      // Fetch all registered sowers - use left join to get all sowers even without profiles
      const { data: sowersData, error: sowersError } = await supabase
        .from('sowers')
        .select(`
          user_id,
          display_name,
          logo_url,
          bio,
          profiles (
            id,
            user_id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .neq('user_id', user.id);

      if (sowersError) {
        console.error('Error loading sowers:', sowersError);
      }

      console.log('📊 Loaded sowers:', sowersData?.length || 0);

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
          .select('id, user_id, username, full_name, avatar_url, bio')
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
          .select('id, user_id, username, full_name, avatar_url, bio')
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
      const allProfilesMap = new Map<string, any>();

      // Add sowers - handle both cases: with and without profiles
      (sowersData || []).forEach((sower: any) => {
        if (sower.user_id) {
          const profile = sower.profiles || {};
          allProfilesMap.set(sower.user_id, {
            id: profile.id || sower.user_id,
            user_id: sower.user_id,
            username: profile.username,
            full_name: profile.full_name || sower.display_name || 'Sower',
            avatar_url: profile.avatar_url || sower.logo_url,
            bio: profile.bio || sower.bio,
            is_sower: true,
            is_bestower: bestowerIds.has(sower.user_id),
            is_gosat: gosatIds.has(sower.user_id),
          });
        }
      });

      // Add bestowers (if not already added as sowers)
      bestowerProfiles.forEach((profile: any) => {
        if (!allProfilesMap.has(profile.user_id)) {
          allProfilesMap.set(profile.user_id, {
            ...profile,
            is_bestower: true,
            is_sower: false,
            is_gosat: gosatIds.has(profile.user_id),
          });
        } else {
          // Update existing profile to mark as bestower too
          const existing = allProfilesMap.get(profile.user_id);
          if (existing) {
            existing.is_bestower = true;
            existing.is_gosat = gosatIds.has(profile.user_id) || existing.is_gosat;
          }
        }
      });

      // Add gosat users (if not already added)
      gosatProfiles.forEach((profile: any) => {
        if (!allProfilesMap.has(profile.user_id)) {
          allProfilesMap.set(profile.user_id, {
            ...profile,
            is_gosat: true,
            is_sower: false,
            is_bestower: bestowerIds.has(profile.user_id),
          });
        } else {
          // Update existing profile to mark as gosat too
          const existing = allProfilesMap.get(profile.user_id);
          if (existing) {
            existing.is_gosat = true;
          }
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

      // If no profiles found, try fetching all profiles directly as fallback
      if (profilesWithTags.length === 0) {
        console.log('⚠️ No profiles from joins, trying direct fetch...');
        
        // Collect all user IDs we want
        const allUserIds = new Set<string>();
        (sowersData || []).forEach((s: any) => s.user_id && allUserIds.add(s.user_id));
        bestowerIds.forEach(id => allUserIds.add(id));
        gosatIds.forEach(id => allUserIds.add(id));
        
        if (allUserIds.size > 0) {
          const { data: directProfiles, error: directError } = await supabase
            .from('profiles')
            .select('id, user_id, username, full_name, avatar_url, bio')
            .in('user_id', Array.from(allUserIds))
            .neq('user_id', user.id);
          
          if (!directError && directProfiles) {
            directProfiles.forEach((profile: any) => {
              const tags: string[] = [];
              if (sowersData?.some((s: any) => s.user_id === profile.user_id)) tags.push('Sower');
              if (bestowerIds.has(profile.user_id)) tags.push('Bestower');
              if (gosatIds.has(profile.user_id)) tags.push('Gosat');
              
              profilesWithTags.push({
                ...profile,
                tags: tags.length > 0 ? tags : ['Member'],
                is_sower: tags.includes('Sower'),
                is_bestower: tags.includes('Bestower'),
                is_gosat: tags.includes('Gosat'),
              });
            });
            console.log('✅ Loaded profiles via direct fetch:', profilesWithTags.length);
          }
        }
      }

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

      // After 3 swipes, show group creation prompt
      if (swipeCount + 1 >= 3) {
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }

    // Move to next card
    setCurrentIndex(prev => prev + 1);
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
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-3 text-center">
          Select a circle to add people to:
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {circles.map((circle) => (
            <motion.button
              key={circle.id}
              onClick={() => setSelectedCircle(circle.id)}
              className={`
                relative flex flex-col items-center justify-center
                w-20 h-20 rounded-full border-4 transition-all
                ${selectedCircle === circle.id 
                  ? `${circle.color} border-white shadow-2xl scale-110` 
                  : 'bg-muted border-muted-foreground/30 hover:scale-105'
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Circle visual */}
              <div className={`
                absolute inset-0 rounded-full
                ${selectedCircle === circle.id ? 'animate-pulse' : ''}
              `} style={{
                background: selectedCircle === circle.id 
                  ? `radial-gradient(circle, ${circle.color.replace('bg-', '')} 0%, transparent 70%)`
                  : 'transparent'
              }} />
              
              {/* Emoji */}
              <span className="text-2xl relative z-10">{circle.emoji}</span>
              
              {/* Circle name */}
              <span className={`
                text-xs mt-1 relative z-10 font-medium
                ${selectedCircle === circle.id ? 'text-white' : 'text-muted-foreground'}
              `}>
                {circle.name.split('-')[0]}
              </span>
              
              {/* Selected indicator */}
              {selectedCircle === circle.id && (
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
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
              whileDrag={{ rotate: info => (info.offset.x / 10) }}
            >
              <Card className="h-full cursor-grab active:cursor-grabbing">
                <CardContent className="p-6 h-full flex flex-col">
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name */}
                  <h3 className="text-2xl font-bold text-center mb-2">
                    {profile.full_name || profile.username || 'Anonymous'}
                  </h3>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-muted-foreground text-center mb-4 text-sm">
                      {profile.bio}
                    </p>
                  )}

                  {/* Tags */}
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {profile.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-4 justify-center mt-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full h-14 w-14 p-0"
                      onClick={() => handleSwipe('left')}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full h-14 w-14 p-0 bg-primary"
                      onClick={() => handleSwipe('right')}
                    >
                      <Heart className="h-6 w-6" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Instructions */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Swipe right to add • Swipe left to skip
      </p>
    </div>
  );
}

