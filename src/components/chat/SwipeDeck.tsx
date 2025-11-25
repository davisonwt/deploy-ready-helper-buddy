import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Sparkles } from 'lucide-react';
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
  in_circles?: string[];
}

interface SwipeDeckProps {
  onSwipeRight: (profile: Profile, circleId: string) => void;
  onComplete: () => void;
  initialCircleId?: string;
  refreshKey?: number;
}

const BATCH_SIZE = 8; // Load 8 profiles at a time

export function SwipeDeck({ onSwipeRight, onComplete, initialCircleId, refreshKey }: SwipeDeckProps) {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchIndex, setBatchIndex] = useState(0);
  const [selectedCircle, setSelectedCircle] = useState<string>(initialCircleId || '');
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set()); // Track only added users
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [circles, setCircles] = useState<Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
  }>>([]);

  useEffect(() => {
    loadCircles();
    loadProfiles();
  }, [refreshKey, selectedCircle]);

  useEffect(() => {
    // Load next batch when needed
    if (allProfiles.length > 0 && currentBatch.length === 0) {
      loadNextBatch();
    }
  }, [allProfiles, currentBatch]);

  const loadCircles = async () => {
    try {
      const { data: circlesData, error } = await supabase
        .from('circles')
        .select('id, name, emoji, color')
        .order('created_at');

      if (error) {
        console.error('Error loading circles:', error);
        return;
      }

      if (circlesData && circlesData.length > 0) {
        setCircles(circlesData);
        if (!selectedCircle) {
          setSelectedCircle(circlesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading circles:', error);
    }
  };

  const loadNextBatch = () => {
    const start = batchIndex * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const nextBatch = allProfiles.slice(start, end);
    
    if (nextBatch.length > 0) {
      setCurrentBatch(nextBatch);
      setCurrentIndex(0);
      setBatchIndex(prev => prev + 1);
    } else {
      // Reset to beginning - endless loop through all profiles
      setBatchIndex(0);
      setCurrentBatch([]);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔍 Loading ALL registered users except current user');

      // Fetch existing members in the SELECTED circle only
      const { data: existingMembers } = await supabase
        .from('circle_members')
        .select('user_id')
        .eq('circle_id', selectedCircle);
      
      const existingMemberIds = new Set(
        (existingMembers || []).map((m: any) => m.user_id)
      );

      console.log('📋 Users already in THIS circle:', existingMemberIds.size);

      // Fetch ALL profiles except current user
      const { data: allProfilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, bio, display_name, first_name, last_name')
        .neq('user_id', user.id);

      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        setLoading(false);
        return;
      }

      console.log('✅ Loaded ALL profiles:', allProfilesData?.length || 0);

      // Fetch sowers data for enrichment
      const { data: sowersData } = await supabase
        .from('sowers')
        .select('user_id, display_name, logo_url, bio');

      // Fetch bestowers
      const { data: bestowalsData } = await supabase
        .from('product_bestowals')
        .select('bestower_id');

      // Fetch gosat users
      const { data: gosatRolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gosat');

      const bestowerIds = new Set(
        (bestowalsData || []).map((b: any) => b.bestower_id).filter(Boolean)
      );
      const gosatIds = new Set(
        (gosatRolesData || []).map((r: any) => r.user_id).filter(Boolean)
      );
      const sowerIds = new Set(
        (sowersData || []).map((s: any) => s.user_id).filter(Boolean)
      );

      // Create sowers map for enrichment
      const sowersMap = new Map<string, any>();
      (sowersData || []).forEach((sower: any) => {
        if (sower.user_id) {
          sowersMap.set(sower.user_id, sower);
        }
      });

      // Fetch ALL circle memberships to show which circles each person is in
      const { data: allCircleMemberships } = await supabase
        .from('circle_members')
        .select('user_id, circle_id');

      const userCirclesMap = new Map<string, string[]>();
      (allCircleMemberships || []).forEach((membership: any) => {
        const existing = userCirclesMap.get(membership.user_id) || [];
        existing.push(membership.circle_id);
        userCirclesMap.set(membership.user_id, existing);
      });

      // Process all profiles and filter out those already in THIS circle
      const profilesWithTags = (allProfilesData || [])
        .filter((profile: any) => !existingMemberIds.has(profile.user_id))
        .map((profile: any) => {
          const sowerData = sowersMap.get(profile.user_id);
          
          const tags: string[] = [];
          if (sowerIds.has(profile.user_id)) tags.push('Sower');
          if (bestowerIds.has(profile.user_id)) tags.push('Bestower');
          if (gosatIds.has(profile.user_id)) tags.push('Gosat');

          // Add info about which circles they're already in
          const inCircles = userCirclesMap.get(profile.user_id) || [];

          return {
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
            tags: tags.length > 0 ? tags : ['Member'],
            in_circles: inCircles,
          };
        });

      console.log('✅ Available profiles (excluding THIS circle members):', profilesWithTags.length);

      setAllProfiles(profilesWithTags);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setLoading(false);
    }
  };

  const handleAddToCircle = async (profile: Profile) => {
    if (!selectedCircle) {
      toast({
        title: 'Select a circle',
        description: 'Please select a circle first',
        variant: 'destructive',
      });
      return;
    }

    const profileId = profile.user_id || profile.id;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Confetti burst
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    // Add to circle
    const profileToAdd = {
      ...profile,
      id: profileId,
    };
    
    await onSwipeRight(profileToAdd, selectedCircle);
    
    // Don't remove from allProfiles since they can be in multiple circles
    // Just remove from current batch and reload to update circle membership
    setCurrentBatch(prev => prev.filter(p => (p.user_id || p.id) !== profileId));

    toast({
      title: 'Added!',
      description: `${profile.full_name || profile.username} added to ${circles.find(c => c.id === selectedCircle)?.name}`,
    });

    // Reload profiles to update circle membership info
    loadProfiles();

    // Move to next profile
    if (currentIndex >= currentBatch.length - 1) {
      // Load next batch
      setCurrentBatch([]);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    // Just move to next, don't track skipped users
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < currentBatch.length - 1) {
      // More profiles in current batch
      setCurrentIndex(prev => prev + 1);
    } else {
      // Load next batch
      setCurrentBatch([]);
    }
  };

  const currentProfile = currentBatch[currentIndex];
  const progress = ((batchIndex - 1) * BATCH_SIZE + currentIndex + 1);
  const total = allProfiles.length;

  if (loading || circles.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (allProfiles.length === 0 && !loading) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">All set!</h3>
          <p className="text-muted-foreground mb-4">
            All registered users have been added to circles.
          </p>
          <Button onClick={onComplete}>Done</Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      {/* Progress indicator */}
      <div className="mb-4 text-center">
        <p className="text-sm text-muted-foreground">
          Profile {progress} of {total}
        </p>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(progress / total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Circle Selector - More Prominent */}
      <div className="mb-8 glass-panel border-2 border-primary/30 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
            Choose a Circle
          </h3>
          <p className="text-sm text-foreground/90">
            Click a circle below to select where you want to place{' '}
            <span className="font-semibold text-white">
              {currentProfile?.full_name || 'this person'}
            </span>
          </p>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          {circles.map((circle) => (
            <motion.button
              key={circle.id}
              onClick={() => setSelectedCircle(circle.id)}
              className={`
                relative flex flex-col items-center justify-center gap-2
                w-28 h-28 rounded-full border-4 transition-all cursor-pointer
                ${selectedCircle === circle.id 
                  ? `${circle.color} border-white shadow-[0_0_30px_rgba(255,255,255,0.5)] scale-110` 
                  : 'bg-muted/50 border-border hover:border-primary/50 hover:scale-105 hover:shadow-lg'
                }
              `}
              whileHover={{ scale: selectedCircle === circle.id ? 1.1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`
                absolute inset-0 rounded-full
                ${selectedCircle === circle.id ? 'animate-pulse bg-white/10' : ''}
              `} />
              
              <span className="text-3xl relative z-10 drop-shadow-lg">
                {circle.emoji}
              </span>
              
              <span className={`
                text-xs relative z-10 font-bold px-2 py-1 rounded-full text-center leading-tight
                ${selectedCircle === circle.id 
                  ? 'text-white bg-white/20' 
                  : 'text-foreground bg-black/20'
                }
              `}>
                {circle.name}
              </span>
              
              {selectedCircle === circle.id && (
                <motion.div
                  className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
        
        {!selectedCircle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-sm text-amber-500 font-medium"
          >
            ⚠️ Please select a circle before adding
          </motion.div>
        )}
      </div>

      {/* Single Profile Card */}
      <motion.div
        key={currentProfile.user_id || currentProfile.id}
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -100, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Card className="max-w-md mx-auto overflow-hidden glass-card border-2 border-primary/30 hover:border-primary/50 transition-all bg-transparent">
          <CardContent className="p-8 flex flex-col items-center">
            {/* Avatar with glow */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Avatar className="h-24 w-24 border-4 border-primary/20 relative z-10">
                <AvatarImage src={currentProfile.avatar_url} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/50">
                  {(currentProfile.full_name || currentProfile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name with gradient */}
            <h3 className="text-2xl font-bold text-center mb-2 text-white drop-shadow-lg">
              {currentProfile.full_name || currentProfile.username || 'User'}
            </h3>

            {/* Bio */}
            {currentProfile.bio && (
              <p className="text-sm text-foreground/90 text-center mb-4 line-clamp-3">
                {currentProfile.bio}
              </p>
            )}

            {/* Tags/Roles */}
            {currentProfile.tags && currentProfile.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {currentProfile.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Already in circles */}
            {currentProfile.in_circles && currentProfile.in_circles.length > 0 && (
              <div className="mb-4 p-3 glass-panel border border-primary/20 rounded-lg w-full">
                <p className="text-xs text-foreground/80 text-center mb-2">
                  Already in circles:
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {currentProfile.in_circles.map((circleId) => {
                    const circle = circles.find(c => c.id === circleId);
                    return circle ? (
                      <Badge key={circleId} variant="outline" className="text-xs">
                        {circle.emoji} {circle.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={handleSkip}
              >
                Skip
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => handleAddToCircle(currentProfile)}
                disabled={!selectedCircle}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Add to Circle
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

