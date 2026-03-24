import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Cherry 🍒 burst reaction */
export const CherryBurst: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const emojis = ['🍒', '✨', '🌿', '💚', '🍒'];
  return (
    <AnimatePresence>
      {emojis.map((emoji, i) => (
        <motion.span
          key={i}
          className="absolute text-lg pointer-events-none z-50"
          initial={{ opacity: 1, y: 0, x: (i - 2) * 12, scale: 0.5 }}
          animate={{ opacity: 0, y: -60 - Math.random() * 40, x: (i - 2) * 20 + (Math.random() - 0.5) * 30, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 + Math.random() * 0.4, delay: i * 0.05 }}
          onAnimationComplete={i === emojis.length - 1 ? onComplete : undefined}
        >
          {emoji}
        </motion.span>
      ))}
    </AnimatePresence>
  );
};

/** Sparkle entrance for new feed items */
export const SparkleEntrance: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    className="relative"
  >
    <motion.div
      className="absolute -top-1 -right-1 text-sm pointer-events-none"
      initial={{ opacity: 1, scale: 0 }}
      animate={{ opacity: 0, scale: 1.5 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      ✨
    </motion.div>
    {children}
  </motion.div>
);

/** LIVE badge with pulse glow */
export const LiveBadge: React.FC<{ count?: number; label?: string }> = ({ count, label = 'LIVE' }) => (
  <div className="flex items-center gap-1.5">
    <span className="relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider">
      <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-30" />
      <span className="relative w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
      <span className="relative">{label}</span>
    </span>
    {count !== undefined && (
      <span className="text-[10px] text-muted-foreground font-medium">{count} listening</span>
    )}
  </div>
);

/** Replay badge */
export const ReplayBadge: React.FC = () => (
  <span className="px-2 py-0.5 rounded-full bg-info/20 text-info text-[10px] font-bold uppercase tracking-wider border border-info/30">
    Replay
  </span>
);

/** Upcoming badge */
export const UpcomingBadge: React.FC = () => (
  <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-bold uppercase tracking-wider border border-warning/30">
    Upcoming
  </span>
);

/** Price badge overlay */
export const PriceBadge: React.FC<{ price: number; currency?: string; isFree?: boolean }> = ({ price, currency = 'S2G', isFree }) => {
  if (isFree) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-bold border border-success/30">
        Free
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-bold border border-warning/30">
      {currency} {price.toFixed(2)}
    </span>
  );
};

/** Animated waveform bars for radio */
export const AnimatedWaveform: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-end gap-[2px] h-8 ${className}`}>
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="w-[3px] rounded-full bg-primary"
        animate={{ height: [4, 12 + Math.random() * 20, 6, 16 + Math.random() * 16, 4] }}
        transition={{ duration: 1.2 + Math.random() * 0.8, repeat: Infinity, delay: i * 0.05 }}
      />
    ))}
  </div>
);

/** Cherry reaction button with burst */
export const CherryReactionButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [bursts, setBursts] = useState<number[]>([]);

  const handleClick = useCallback(() => {
    const id = Date.now();
    setBursts(prev => [...prev, id]);
    onClick?.();
    setTimeout(() => setBursts(prev => prev.filter(b => b !== id)), 1200);
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-full hover:bg-card/50 transition-colors active:scale-90"
    >
      <span className="text-lg">🍒</span>
      {bursts.map(id => (
        <div key={id} className="absolute inset-0 flex items-center justify-center">
          <CherryBurst />
        </div>
      ))}
    </button>
  );
};
