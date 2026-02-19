import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

interface Segment {
  title: string;
  duration: number; // minutes
  emoji?: string;
  color?: string;
}

interface SegmentTimerProps {
  segments: Segment[];
  showStartTime: Date;
  isLive: boolean;
}

export const SegmentTimer: React.FC<SegmentTimerProps> = ({ segments, showStartTime, isLive }) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const bellRef = useRef<AudioContext | null>(null);

  const playBell = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isLive || segments.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - showStartTime.getTime()) / 1000; // seconds

      let cumulative = 0;
      let activeIndex = 0;
      for (let i = 0; i < segments.length; i++) {
        cumulative += segments[i].duration * 60;
        if (elapsed < cumulative) {
          activeIndex = i;
          break;
        }
        if (i === segments.length - 1) activeIndex = segments.length - 1;
      }

      const segStart = segments.slice(0, activeIndex).reduce((s, seg) => s + seg.duration * 60, 0);
      const segEnd = segStart + segments[activeIndex].duration * 60;
      const remaining = Math.max(0, Math.floor(segEnd - elapsed));

      if (activeIndex !== currentSegmentIndex) {
        setIsTransitioning(true);
        playBell();
        setTimeout(() => setIsTransitioning(false), 2000);
      }

      setCurrentSegmentIndex(activeIndex);
      setTimeLeft(remaining);

      // Warning bell at 30 seconds
      if (remaining === 30) playBell();
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, segments, showStartTime, currentSegmentIndex, playBell]);

  if (!isLive || segments.length === 0) return null;

  const seg = segments[currentSegmentIndex];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isWarning = timeLeft <= 30;
  const progress = seg ? 1 - timeLeft / (seg.duration * 60) : 0;

  return (
    <div className="relative">
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-10"
          >
            <Badge className="bg-amber-500 text-white text-sm px-4 py-1 animate-bounce shadow-lg">
              🔔 Next Segment!
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-center gap-3 p-3 rounded-xl border-2 transition-colors"
        style={{
          borderColor: isWarning ? 'hsl(0 80% 55%)' : (seg?.color || 'hsl(var(--border))'),
          background: isWarning
            ? 'hsl(0 80% 55% / 0.08)'
            : `${seg?.color || 'hsl(var(--muted))'}15`,
        }}
      >
        {/* Segment info */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{seg?.emoji || '🎙️'}</span>
          <div>
            <p className="text-sm font-semibold">{seg?.title || 'Segment'}</p>
            <p className="text-[10px] text-muted-foreground">
              {currentSegmentIndex + 1} of {segments.length}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          {isWarning && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
          <div
            className={`font-mono text-2xl font-bold tabular-nums ${
              isWarning ? 'text-red-500 animate-pulse' : 'text-foreground'
            }`}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden">
          <motion.div
            className="h-full"
            style={{
              background: isWarning
                ? 'hsl(0 80% 55%)'
                : `linear-gradient(90deg, ${seg?.color || 'hsl(var(--primary))'}, ${seg?.color || 'hsl(var(--primary))'}88)`,
              width: `${progress * 100}%`,
            }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>
    </div>
  );
};
