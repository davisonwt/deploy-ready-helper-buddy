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
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  tags?: string[];
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

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .neq('user_id', user.id)
        .limit(50);

      if (error) throw error;

      // Add mock tags for now (you can add tags column to profiles table)
      const profilesWithTags = (data || []).map(profile => ({
        ...profile,
        tags: ['Creator', 'Musician', 'Artist'].slice(0, Math.floor(Math.random() * 3) + 1),
      }));

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

      // Add to circle
      onSwipeRight(currentProfile, selectedCircle);
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

      {/* Circle selector */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {circles.map((circle) => (
          <Button
            key={circle.id}
            onClick={() => setSelectedCircle(circle.id)}
            variant={selectedCircle === circle.id ? 'default' : 'outline'}
            size="sm"
            className={`${selectedCircle === circle.id ? circle.color : ''} flex-shrink-0`}
          >
            <span className="mr-1">{circle.emoji}</span>
            {circle.name}
          </Button>
        ))}
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

