import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, Filter, TrendingUp, Loader2, Flame, Award, Zap } from 'lucide-react';
import { useGroveFeed, Grove, GroveType } from '@/hooks/useGroveFeed';
import { GroveCard } from './GroveCard';
import { PlantModal } from './PlantModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';

export function GroveFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [filter, setFilter] = useState<GroveType | 'all'>('all');
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('grove_streak');
    return saved ? parseInt(saved) : 0;
  });
  const observerTarget = useRef<HTMLDivElement>(null);
  const { width, height } = useWindowSize();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGroveFeed(
    filter === 'all' ? undefined : { type: filter }
  );

  const allGroves = data?.pages.flatMap(page => page.data) || [];

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEngage = (grove: Grove) => {
    switch (grove.type) {
      case 'chat_1on1':
      case 'community':
        navigate('/chatapp', { state: { roomId: grove.id } });
        break;
      case 'premium_room':
        navigate(`/premium-room/${grove.id}`);
        break;
      case 'radio':
        navigate('/grove-station', { state: { sessionId: grove.id } });
        break;
    }
  };

  const handleHarvest = (grove: Grove, isFree: boolean) => {
    if (isFree) {
      // Update streak
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('grove_streak', newStreak.toString());
      localStorage.setItem('last_harvest', new Date().toISOString());

      // Show confetti celebration
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);

      toast.success(
        `🎉 Free harvest unlocked! Streak: ${newStreak} ${newStreak >= 3 ? '🔥' : ''}`,
        {
          description: newStreak >= 3 
            ? 'Amazing streak! Sower tips unlocked in Gosat chat.'
            : 'Keep harvesting to unlock bonuses!'
        }
      );

      // Forward to Gosat bot for download link (simulated)
      setTimeout(() => {
        toast.info('📬 Check your Gosat chat for download link!', {
          action: {
            label: 'Open Chat',
            onClick: () => navigate('/chatapp')
          }
        });
      }, 1500);

      handleEngage(grove);
    } else {
      // Paid bestow flow
      toast.info(`💰 Ready to bestow ${grove.bestow_amount} SOL`, {
        description: 'Opening payment modal...'
      });
      
      // Trigger confetti on successful payment (simulated)
      setTimeout(() => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        
        toast.success('✨ Bestow successful! Full access granted!', {
          description: `Sower receives ${(grove.bestow_amount || 0) * 0.8} SOL (80%)`,
          action: {
            label: 'Access Content',
            onClick: () => handleEngage(grove)
          }
        });
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={300}
            colors={['#22c55e', '#10b981', '#84cc16', '#eab308', '#f59e0b']}
          />
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sprout className="h-6 w-6 text-primary animate-pulse" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Grove Feed
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as GroveType | 'all')}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groves</SelectItem>
                  <SelectItem value="chat_1on1">1-1 Chats</SelectItem>
                  <SelectItem value="community">Communities</SelectItem>
                  <SelectItem value="premium_room">Premium Rooms</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sower Dashboard Banner */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 grid grid-cols-3 gap-2"
            >
              {/* Earnings */}
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Today's Yield</div>
                    <div className="text-lg font-bold text-primary">+0 SOL</div>
                  </div>
                </div>
              </div>

              {/* Streak */}
              <div className="p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Harvest Streak</div>
                    <div className="text-lg font-bold text-accent">{streak} 🔥</div>
                  </div>
                </div>
              </div>

              {/* Level/Badge */}
              <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-lg border border-secondary/20">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-secondary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Level</div>
                    <div className="text-lg font-bold text-secondary">Seedling</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Daily Nudge */}
          {user && streak >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 p-2 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-lg border border-primary/20"
            >
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span className="font-medium">🎯 Daily Quest:</span>
                <span className="text-muted-foreground">Sow 5 replies for visibility boost!</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Feed */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allGroves.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Sprout className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Groves Yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to plant something amazing!</p>
            <Button onClick={() => setPlantModalOpen(true)} size="lg">
              <Sprout className="mr-2 h-5 w-5" />
              Plant Your First Grove
            </Button>
          </motion.div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence mode="popLayout">
              {allGroves.map((grove) => (
                <GroveCard
                  key={grove.id}
                  grove={grove}
                  onEngage={handleEngage}
                  onHarvest={handleHarvest}
                />
              ))}
            </AnimatePresence>

            {/* Loading indicator for pagination */}
            <div ref={observerTarget} className="py-4">
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading more groves...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Plant Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setPlantModalOpen(true)}
          size="lg"
          className={cn(
            'h-16 w-16 rounded-full shadow-2xl',
            'bg-gradient-to-br from-primary to-primary/80',
            'hover:scale-110 transition-transform',
            'hover:shadow-primary/50'
          )}
        >
          <Sprout className="h-8 w-8" />
        </Button>
      </motion.div>

      {/* Plant Modal */}
      <PlantModal open={plantModalOpen} onOpenChange={setPlantModalOpen} />
    </div>
  );
}
