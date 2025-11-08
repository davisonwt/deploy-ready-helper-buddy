import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, BookOpen, Radio, Play, Download, Lock, Sparkles, Leaf, Apple, FileText, Music, Image as ImageIcon, Video, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Grove } from '@/hooks/useGroveFeed';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface GroveCardProps {
  grove: Grove;
  onEngage: (grove: Grove) => void;
  onHarvest?: (grove: Grove, isFree: boolean) => void;
}

const typeConfig = {
  chat_1on1: { icon: User, label: '1-1 Chat', color: 'text-blue-500' },
  community: { icon: Users, label: 'Community', color: 'text-green-500' },
  premium_room: { icon: BookOpen, label: 'Premium Room', color: 'text-purple-500' },
  radio: { icon: Radio, label: 'Radio', color: 'text-orange-500' }
};

// Fruit type icons mapping
const fruitIcons = {
  doc: Leaf,
  image: Apple,
  video: Play,
  audio: Music,
  file: FileText
};

export function GroveCard({ grove, onEngage, onHarvest }: GroveCardProps) {
  const config = typeConfig[grove.type];
  const TypeIcon = config.icon;
  const [showFruits, setShowFruits] = useState(false);

  // Bloom animation for card entrance
  const bloomVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    },
    hover: { 
      scale: 1.03,
      boxShadow: '0 10px 40px -10px rgba(34, 197, 94, 0.3)',
      transition: { duration: 0.2 }
    }
  };

  // Leaf particle animation
  const leafVariants = {
    initial: { opacity: 0, y: -20, rotate: 0 },
    animate: { 
      opacity: [0, 1, 0], 
      y: [0, 20, 40],
      rotate: [0, 180, 360],
      transition: { duration: 2, repeat: Infinity, repeatDelay: 3 }
    }
  };

  return (
    <motion.div
      variants={bloomVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="w-full relative"
    >
      {/* Floating leaf particles for live groves */}
      {grove.is_live && (
        <motion.div
          variants={leafVariants}
          initial="initial"
          animate="animate"
          className="absolute -top-4 right-4 z-10"
        >
          <Leaf className="h-6 w-6 text-primary/40" />
        </motion.div>
      )}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-card/50 backdrop-blur border-border/50">
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={grove.creator_avatar} />
                <AvatarFallback>{grove.creator_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <TypeIcon className={cn('h-4 w-4', config.color)} />
                  <Badge variant="secondary" className="text-xs">
                    {config.label}
                  </Badge>
                  {grove.is_live && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      🔴 LIVE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  @{grove.creator_name || 'Anonymous'}
                </p>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 mb-1">{grove.title}</h3>
            {grove.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{grove.description}</p>
            )}
          </div>

          {/* Fruits (Files/Content Preview) - Interactive */}
          {grove.files_count > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFruits(!showFruits)}
                className="w-full justify-between hover:bg-primary/10"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-xs font-medium">
                    {grove.files_count} ripe {grove.files_count === 1 ? 'fruit' : 'fruits'} 🍎
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {grove.is_free ? 'Free' : `${grove.bestow_amount} SOL`}
                </Badge>
              </Button>

              <AnimatePresence>
                {showFruits && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-3 gap-2 overflow-hidden"
                  >
                    {/* Mock fruit icons - replace with actual file data when integrated */}
                    {Array.from({ length: Math.min(grove.files_count, 6) }).map((_, i) => {
                      const types = ['doc', 'image', 'audio', 'video'];
                      const type = types[i % types.length] as keyof typeof fruitIcons;
                      const FruitIcon = fruitIcons[type];
                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: i * 0.1, type: 'spring' }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="p-2 bg-primary/5 rounded-lg border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                        >
                          <FruitIcon className="h-5 w-5 text-primary mx-auto" />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {grove.participants_count}
            </div>
            {grove.is_live && grove.live_listeners && (
              <div className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {grove.live_listeners} listening
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="border-t border-border/50 p-3 bg-gradient-to-r from-muted/20 to-primary/5 flex items-center gap-2">
          <Button
            onClick={() => onEngage(grove)}
            className="flex-1 relative overflow-hidden group"
            variant={grove.is_live ? "default" : "outline"}
          >
            <span className="relative z-10">
              {grove.is_live ? '🔴 Join Live' : '🌱 Explore Grove'}
            </span>
            {grove.is_live && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </Button>
          
          {!grove.is_free && grove.bestow_amount && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => onHarvest?.(grove, false)}
                variant="secondary"
                size="sm"
                className="gap-2 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20"
              >
                <Lock className="h-4 w-4" />
                <span className="font-bold">{grove.bestow_amount} SOL</span>
              </Button>
            </motion.div>
          )}
          
          {grove.is_free && grove.files_count > 0 && (
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => onHarvest?.(grove, true)}
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-success/20 hover:text-success"
              >
                <Download className="h-4 w-4" />
                Free 🎁
              </Button>
            </motion.div>
          )}

          {/* Viral Share Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Implement share functionality
                if (navigator.share) {
                  navigator.share({
                    title: grove.title,
                    text: grove.description || 'Check out this grove!',
                    url: window.location.href
                  });
                }
              }}
              className="gap-1 hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
