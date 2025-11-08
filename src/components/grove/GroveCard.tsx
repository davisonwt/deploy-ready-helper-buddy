import { motion } from 'framer-motion';
import { Users, User, BookOpen, Radio, Play, Download, Lock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Grove } from '@/hooks/useGroveFeed';
import { cn } from '@/lib/utils';

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

export function GroveCard({ grove, onEngage, onHarvest }: GroveCardProps) {
  const config = typeConfig[grove.type];
  const TypeIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="w-full"
    >
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

          {/* Fruits (Files/Content Preview) */}
          {grove.files_count > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {grove.files_count} ripe {grove.files_count === 1 ? 'fruit' : 'fruits'} ready
              </span>
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
        <div className="border-t border-border/50 p-3 bg-muted/30 flex items-center gap-2">
          <Button
            onClick={() => onEngage(grove)}
            className="flex-1"
            variant={grove.is_live ? "default" : "outline"}
          >
            {grove.is_live ? 'Join Live' : 'Explore Grove'}
          </Button>
          
          {!grove.is_free && grove.bestow_amount && (
            <Button
              onClick={() => onHarvest?.(grove, false)}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {grove.bestow_amount} SOL
            </Button>
          )}
          
          {grove.is_free && grove.files_count > 0 && (
            <Button
              onClick={() => onHarvest?.(grove, true)}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Free
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
