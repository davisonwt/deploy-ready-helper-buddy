import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, Users, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AnimatedWaveform, LiveBadge } from '@/components/chat/SparkleEffects';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  track_title: string;
  artist_name: string | null;
}

interface StickyRadioPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number[];
  onTogglePlay: () => void;
  onVolumeChange: (value: number[]) => void;
  listenerCount?: number;
  isLive?: boolean;
  onJoinConversation?: () => void;
  hostName?: string;
  hostAvatar?: string | null;
}

export const StickyRadioPlayer: React.FC<StickyRadioPlayerProps> = ({
  currentTrack,
  isPlaying,
  volume,
  onTogglePlay,
  onVolumeChange,
  listenerCount = 0,
  isLive = false,
  onJoinConversation,
  hostName,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'sticky top-0 z-30 rounded-2xl overflow-hidden border border-border/20',
        'backdrop-blur-xl'
      )}
      style={{ backgroundColor: 'hsl(210 67% 10% / 0.95)' }}
    >
      {/* Blurred background glow */}
      <div
        className="absolute inset-0 opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle at 30% 50%, hsl(var(--primary) / 0.4), transparent 70%)' }}
      />

      <div className="relative p-4">
        {/* Top row: Status + Listeners */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Radio 364YHVH fm</span>
          </div>
          <div className="flex items-center gap-3">
            {isLive && <LiveBadge count={listenerCount} />}
            {!isLive && listenerCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" /> {listenerCount}
              </span>
            )}
          </div>
        </div>

        {/* Main player area */}
        <div className="flex items-center gap-4">
          {/* Play/Pause button */}
          <Button
            onClick={onTogglePlay}
            size="icon"
            className="rounded-full w-12 h-12 shrink-0 bg-primary hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>

          {/* Track info + waveform */}
          <div className="flex-1 min-w-0">
            {currentTrack ? (
              <>
                <h3 className="text-sm font-bold text-foreground truncate">
                  {currentTrack.track_title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack.artist_name || hostName || 'Unknown Artist'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No track playing</p>
            )}
            {isPlaying && (
              <div className="mt-1">
                <AnimatedWaveform className="h-5" />
              </div>
            )}
          </div>

          {/* Volume slider (compact) */}
          <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
            <Slider value={volume} onValueChange={onVolumeChange} max={100} step={1} className="flex-1" />
          </div>
        </div>

        {/* Join Conversation button */}
        {onJoinConversation && (
          <Button
            onClick={onJoinConversation}
            size="sm"
            className="w-full mt-3 gap-2 rounded-full text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            🎙️ Join Conversation
          </Button>
        )}
      </div>
    </motion.div>
  );
};
