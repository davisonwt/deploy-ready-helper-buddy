import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, Filter, TrendingUp, Loader2 } from 'lucide-react';
import { useGroveFeed, Grove, GroveType } from '@/hooks/useGroveFeed';
import { GroveCard } from './GroveCard';
import { PlantModal } from './PlantModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function GroveFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [filter, setFilter] = useState<GroveType | 'all'>('all');
  const observerTarget = useRef<HTMLDivElement>(null);

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
      toast.success('🌟 Free harvest unlocked! Check your downloads.');
      // Navigate to the grove to access content
      handleEngage(grove);
    } else {
      // Open payment modal
      toast.info(`Ready to bestow ${grove.bestow_amount} SOL for full access`);
      handleEngage(grove);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
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

          {/* Sower Earnings Banner */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20"
            >
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-semibold">Your Yield Today:</span>
                <span className="text-primary font-bold">+0 SOL</span>
                <span className="text-xs text-muted-foreground ml-auto">Keep sowing! 🌱</span>
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
