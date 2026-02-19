import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface GoLiveCountdownProps {
  onComplete: () => void;
  onCancel: () => void;
  djName?: string;
}

export const GoLiveCountdown: React.FC<GoLiveCountdownProps> = ({ onComplete, onCancel, djName }) => {
  const [count, setCount] = useState(3);

  const playBeep = useCallback((freq: number, duration: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {}
  }, []);

  useEffect(() => {
    if (count > 0) {
      playBeep(count === 1 ? 880 : 440, 200);
      const timer = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Final high beep + confetti
      playBeep(1320, 400);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete, playBeep]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <div className="text-center space-y-6">
        {djName && (
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl text-white/70 font-medium"
          >
            {djName} is going live...
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {count > 0 ? (
            <motion.div
              key={count}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-[12rem] font-black leading-none"
              style={{
                background: 'linear-gradient(135deg, hsl(25, 95%, 55%), hsl(45, 100%, 55%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 40px hsl(35 100% 50% / 0.5))',
              }}
            >
              {count}
            </motion.div>
          ) : (
            <motion.div
              key="live"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="space-y-2"
            >
              <div className="text-7xl font-black text-red-500 tracking-wider animate-pulse">
                🔴 LIVE
              </div>
              <p className="text-white/60 text-lg">Broadcasting to AOD Frequencies</p>
            </motion.div>
          )}
        </AnimatePresence>

        {count > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onCancel}
            className="text-white/40 hover:text-white/70 text-sm underline transition-colors"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
