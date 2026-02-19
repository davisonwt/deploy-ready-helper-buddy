import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Radio } from 'lucide-react';

interface NowPlayingWidgetProps {
  trackTitle?: string;
  artistName?: string;
  isPlaying: boolean;
  coverUrl?: string;
}

const EqualizerBar: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    className="w-1 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full"
    animate={{
      height: ['8px', '20px', '12px', '24px', '8px'],
    }}
    transition={{
      duration: 1.2,
      repeat: Infinity,
      delay,
      ease: 'easeInOut',
    }}
  />
);

export const NowPlayingWidget: React.FC<NowPlayingWidgetProps> = ({
  trackTitle, artistName, isPlaying, coverUrl
}) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-900/30 via-orange-900/20 to-green-900/20 border border-amber-500/20 backdrop-blur-sm">
      {/* Album art / placeholder */}
      <div className="relative shrink-0">
        <motion.div
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-500/40 shadow-lg"
          style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
        >
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-600 to-green-700 flex items-center justify-center">
              <Music className="h-6 w-6 text-white/80" />
            </div>
          )}
        </motion.div>
        {/* Vinyl hole */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-background border border-amber-500/30" />
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Radio className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold">
            Now Playing
          </span>
        </div>
        <p className="font-semibold text-sm truncate text-foreground">
          {trackTitle || 'AOD Station Radio'}
        </p>
        {artistName && (
          <p className="text-xs text-muted-foreground truncate">
            {artistName}
          </p>
        )}
      </div>

      {/* Equalizer bars */}
      {isPlaying && (
        <div className="flex items-end gap-0.5 h-6 shrink-0">
          {[0, 0.15, 0.3, 0.1, 0.25].map((d, i) => (
            <EqualizerBar key={i} delay={d} />
          ))}
        </div>
      )}
    </div>
  );
};
