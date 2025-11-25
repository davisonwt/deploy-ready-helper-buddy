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
}

interface SwipeDeckProps {
  onSwipeRight: (profile: Profile, circleId: string) => void;
  onComplete: () => void;
  initialCircleId?: string;
}

const USERS_PER_PAGE = 21;

export function SwipeDeck({ onSwipeRight, onComplete, initialCircleId }: SwipeDeckProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCircle, setSelectedCircle] = useState<string>(initialCircleId || 'friends');
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());
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

  const handleAddToCircle = async (profile: Profile) => {
    const profileId = profile.user_id || profile.id;
    
    // Check if already added
    if (addedUsers.has(profileId)) {
      toast({
        title: 'Already added',
        description: `${profile.full_name || profile.username} is already in ${circles.find(c => c.id === selectedCircle)?.name}`,
      });
      return;
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Confetti burst
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    // Add to circle - use user_id if available, otherwise use id
    const profileToAdd = {
      ...profile,
      id: profileId,
    };
    
    await onSwipeRight(profileToAdd, selectedCircle);
    
    // Mark as added
    setAddedUsers(prev => new Set(prev).add(profileId));

    toast({
      title: 'Added!',
      description: `${profile.full_name || profile.username} added to ${circles.find(c => c.id === selectedCircle)?.name}`,
    });
  };

  // Get current page of users (21 at a time)
  const startIndex = currentPage * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const currentPageProfiles = profiles.slice(startIndex, endIndex);
  const hasMore = endIndex < profiles.length;
  const hasPrevious = currentPage > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (profiles.length === 0 && !loading) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">No users found</h3>
          <p className="text-muted-foreground mb-4">
            There are no registered sowers, bestowers, or gosat users to add yet.
          </p>
          <Button onClick={onComplete}>Done</Button>
        </CardContent>
      </Card>
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

      {/* Users Grid - 21 at a time */}
      <div className="mb-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {currentPageProfiles.map((profile) => {
            const profileId = profile.user_id || profile.id;
            const isAdded = addedUsers.has(profileId);
            
            return (
              <motion.div
                key={profileId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <Card className={`
                  cursor-pointer transition-all hover:shadow-lg
                  ${isAdded ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : ''}
                `}>
                  <CardContent className="p-3 flex flex-col items-center">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16 mb-2">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <h4 className="text-xs font-semibold text-center mb-1 line-clamp-1">
                      {profile.full_name || profile.username || 'User'}
                    </h4>

                    {/* Tags */}
                    {profile.tags && profile.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mb-2">
                        {profile.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Add Button */}
                    {!isAdded ? (
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleAddToCircle(profile)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                        ✓ Added
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 gap-4">
        <Button
          variant="outline"
          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
          disabled={!hasPrevious}
          className={hasPrevious ? '' : 'opacity-50 cursor-not-allowed'}
        >
          ← Previous
        </Button>
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-foreground">
            Page {currentPage + 1} of {Math.ceil(profiles.length / USERS_PER_PAGE) || 1}
          </span>
          <span className="text-xs text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, profiles.length)} of {profiles.length} users
          </span>
        </div>
        
        <div className="flex gap-2">
          {hasMore ? (
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next 21 →
            </Button>
          ) : (
            <Button onClick={onComplete}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

