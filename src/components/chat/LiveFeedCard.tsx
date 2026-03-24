import React from 'react';
import { motion } from 'framer-motion';
import { Users, Headphones, BookOpen, GraduationCap, Dumbbell, MessageSquare, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LiveBadge, ReplayBadge, UpcomingBadge, PriceBadge, AnimatedWaveform, CherryReactionButton } from './SparkleEffects';
import { cn } from '@/lib/utils';

export type FeedItemType = 'radio' | 'classroom' | 'skilldrop' | 'training' | 'community';
export type FeedItemStatus = 'live' | 'replay' | 'upcoming' | 'active';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  status: FeedItemStatus;
  title: string;
  description?: string;
  hostName: string;
  hostAvatar?: string | null;
  participantCount: number;
  thumbnailUrl?: string | null;
  nowPlayingTrack?: string;
  price?: number | null;
  isFree?: boolean;
  scheduledAt?: string;
  roomId?: string;
  hostIsPresent?: boolean;
}

const typeConfig: Record<FeedItemType, { icon: React.ReactNode; gradient: string; label: string }> = {
  radio: { icon: <Headphones className="w-4 h-4" />, gradient: 'from-harvest/20 to-harvest/5', label: 'Radio 364YHVH fm' },
  classroom: { icon: <BookOpen className="w-4 h-4" />, gradient: 'from-success/20 to-success/5', label: 'Classroom' },
  skilldrop: { icon: <GraduationCap className="w-4 h-4" />, gradient: 'from-info/20 to-info/5', label: 'SkillDrop' },
  training: { icon: <Dumbbell className="w-4 h-4" />, gradient: 'from-warning/20 to-warning/5', label: 'Training' },
  community: { icon: <MessageSquare className="w-4 h-4" />, gradient: 'from-primary/20 to-primary/5', label: 'Community' },
};

interface LiveFeedCardProps {
  item: FeedItem;
  index: number;
  onJoin: (item: FeedItem) => void;
  onBestow?: (item: FeedItem) => void;
  immersive?: boolean;
}

export const LiveFeedCard: React.FC<LiveFeedCardProps> = ({ item, index, onJoin, onBestow, immersive = false }) => {
  const config = typeConfig[item.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 200, damping: 25 }}
      className={cn(
        'relative rounded-2xl overflow-hidden border border-border/20',
        'bg-gradient-to-br backdrop-blur-sm',
        config.gradient,
        'hover:border-primary/40 transition-all duration-300',
        immersive && 'min-h-[60vh] flex flex-col'
      )}
      style={{ backgroundColor: 'hsl(212 49% 24% / 0.85)' }}
    >
      {/* Host is Present glow */}
      {item.hostIsPresent && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-10">
          <div className="absolute inset-0 rounded-2xl animate-pulse opacity-20" style={{ boxShadow: '0 0 30px 10px hsl(var(--primary))' }} />
        </div>
      )}

      {/* Header Row: Host + Badge */}
      <div className="flex items-center justify-between p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="w-9 h-9 border-2 border-primary/30">
              <AvatarImage src={item.hostAvatar || undefined} />
              <AvatarFallback className="bg-primary/20 text-foreground text-xs">
                {item.hostName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {item.hostIsPresent && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-success-foreground animate-pulse" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground truncate">{item.hostName}</p>
              {item.hostIsPresent && (
                <span className="px-1.5 py-0.5 rounded-full bg-success/20 text-success text-[9px] font-bold border border-success/30 animate-pulse whitespace-nowrap">
                  Host Present
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
              {config.icon}
              <span>{config.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item.status === 'live' && <LiveBadge count={item.participantCount} />}
          {item.status === 'replay' && <ReplayBadge />}
          {item.status === 'upcoming' && <UpcomingBadge />}
          {item.status === 'active' && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3 h-3" /> {item.participantCount}
            </span>
          )}
        </div>
      </div>

      {/* Visual Area */}
      <div className={cn('px-3 py-3', immersive && 'flex-1 flex items-center justify-center')}>
        {item.type === 'radio' ? (
          <div className="rounded-xl p-4 flex flex-col items-center gap-2" style={{ backgroundColor: 'hsl(210 67% 12% / 0.6)' }}>
            <AnimatedWaveform className={immersive ? 'h-16' : undefined} />
            {item.nowPlayingTrack && (
              <p className="text-xs text-foreground/80 text-center truncate w-full">
                🎵 Now Playing: <span className="font-medium text-foreground">{item.nowPlayingTrack}</span>
              </p>
            )}
          </div>
        ) : item.thumbnailUrl ? (
          <div className={cn('rounded-xl overflow-hidden relative', immersive ? 'aspect-[4/3]' : 'aspect-video')}>
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
            {item.status === 'replay' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                <Play className="w-10 h-10 text-foreground/80" />
              </div>
            )}
          </div>
        ) : (
          <div className={cn('rounded-xl flex items-center justify-center', immersive ? 'aspect-[4/3]' : 'aspect-[16/9]')} style={{ backgroundColor: 'hsl(210 67% 12% / 0.6)' }}>
            <div className="text-center">
              <div className={cn('mb-1', immersive ? 'text-5xl' : 'text-3xl')}>{item.type === 'community' ? '💬' : '🎓'}</div>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
        )}
      </div>

      {/* Title + Description */}
      <div className="px-3 pb-2">
        <h3 className={cn('font-bold text-foreground leading-tight truncate', immersive ? 'text-lg' : 'text-base')}>{item.title}</h3>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-3 pb-3 gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Button
            size="sm"
            onClick={() => onJoin(item)}
            className="flex-1 gap-1.5 text-xs font-bold rounded-full"
            style={{
              backgroundColor: item.status === 'live' ? 'hsl(0 84% 60%)' : 'hsl(188 78% 41%)',
              color: 'white',
              border: 'none',
            }}
          >
            {item.status === 'live' ? '🔴 Join Live' : item.status === 'replay' ? '▶ Listen' : item.status === 'upcoming' ? '🔔 Remind Me' : '💬 Enter'}
          </Button>

          {item.price !== undefined && item.price !== null && (
            <PriceBadge price={item.price} isFree={item.isFree} />
          )}
        </div>

        <div className="flex items-center gap-1">
          {onBestow && item.type !== 'community' && (
            <button
              onClick={() => onBestow(item)}
              className="p-1.5 rounded-full hover:bg-card/50 transition-colors text-xs"
              title="Bestow"
            >
              🌱
            </button>
          )}
          <CherryReactionButton />
        </div>
      </div>
    </motion.div>
  );
};
