import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TribalAudio } from '@/hooks/useTribalHeartsAudio';

interface BondingAnimationProps {
  open: boolean;
  otherName?: string;
  highCompatibility?: boolean; // adds rainbow shimmer when >85%
  onComplete?: () => void;
}

/**
 * The signature 4.5s cinematic Bonding Animation.
 * Two glowing hearts drift toward each other, merge in a warm light-bloom,
 * and a unified Tribal Heart pulses while the celebration text appears.
 */
export const BondingAnimation: React.FC<BondingAnimationProps> = ({
  open,
  otherName,
  highCompatibility,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      return;
    }
    setPhase('playing');
    TribalAudio.playBondingSequence();
    // Haptic heartbeats
    if (navigator.vibrate) {
      navigator.vibrate([0, 60, 200, 80, 1500, 50, 30, 50, 500, 50, 30, 50]);
    }
    const t = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 4600);
    return () => clearTimeout(t);
  }, [open, onComplete]);

  // 30 floating embers, deterministic positions per mount
  const embers = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 5,
        delay: Math.random() * 2,
        dur: 4 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    [open]
  );

  return (
    <AnimatePresence>
      {open && phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            background:
              'radial-gradient(circle at center, hsl(15 35% 12%) 0%, hsl(20 25% 6%) 60%, hsl(0 0% 3%) 100%)',
          }}
          aria-live="polite"
          aria-label="A new bond has been formed"
        >
          {/* Floating embers */}
          {embers.map((e, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 rounded-full"
              style={{
                left: `${e.left}%`,
                width: e.size,
                height: e.size,
                background:
                  'radial-gradient(circle, hsl(30 95% 65%) 0%, hsl(15 90% 50% / 0.6) 60%, transparent 100%)',
                boxShadow: '0 0 8px hsl(25 95% 60% / 0.8)',
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: -window.innerHeight - 50,
                opacity: [0, e.opacity, e.opacity, 0],
                x: [0, 20, -20, 10, 0],
              }}
              transition={{
                duration: e.dur,
                delay: e.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}

          {/* LEFT heart — drifts to center */}
          <motion.div
            className="absolute"
            initial={{ x: '-30vw', y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: ['-30vw', '-30vw', '0vw', '0vw'],
              y: 0,
              scale: [0, 0.85, 1.0, 1.0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              times: [0, 0.13, 0.58, 0.78],
              duration: 4.6,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          >
            <TribalHeart color="warm" size={140} pulse />
          </motion.div>

          {/* RIGHT heart — drifts to center */}
          <motion.div
            className="absolute"
            initial={{ x: '30vw', y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: ['30vw', '30vw', '0vw', '0vw'],
              y: 0,
              scale: [0, 0.85, 1.0, 1.0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              times: [0, 0.13, 0.58, 0.78],
              duration: 4.6,
              ease: [0.45, 0.05, 0.55, 0.95],
              delay: 0.04,
            }}
          >
            <TribalHeart color="sage" size={140} pulse />
          </motion.div>

          {/* MERGED heart — appears at merge moment */}
          <motion.div
            className="absolute flex flex-col items-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 0, 1.2, 1.0, 1.0, 0.85],
              opacity: [0, 0, 1, 1, 1, 0],
            }}
            transition={{
              times: [0, 0.55, 0.7, 0.78, 0.92, 1],
              duration: 4.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            <TribalHeart
              color={highCompatibility ? 'rainbow' : 'unified'}
              size={220}
              pulse
              strong
            />

            {/* Light bloom burst */}
            <motion.div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: 400,
                height: 400,
                background:
                  'radial-gradient(circle, hsl(38 100% 70% / 0.6) 0%, hsl(15 90% 55% / 0.3) 40%, transparent 70%)',
                filter: 'blur(20px)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 0, 1.4, 1.0], opacity: [0, 0, 0.9, 0] }}
              transition={{ times: [0, 0.55, 0.65, 0.95], duration: 4.6 }}
            />

            {/* Particle burst */}
            <ParticleBurst startAt={2.7} />
          </motion.div>

          {/* Celebration text */}
          <motion.div
            className="absolute bottom-[18%] text-center px-8"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{
              opacity: [0, 0, 0, 1, 1, 0],
              y: [20, 20, 20, 0, 0, -10],
              scale: [0.9, 0.9, 0.9, 1, 1, 0.95],
            }}
            transition={{
              times: [0, 0.55, 0.78, 0.85, 0.95, 1],
              duration: 4.6,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <h1
              className="text-3xl md:text-5xl font-serif italic"
              style={{
                color: 'hsl(38 95% 75%)',
                textShadow:
                  '0 0 30px hsl(25 100% 55% / 0.6), 0 0 60px hsl(15 90% 45% / 0.4)',
                letterSpacing: '0.02em',
              }}
            >
              A new bond has been formed
            </h1>
            {otherName && (
              <p
                className="mt-3 text-base md:text-lg"
                style={{ color: 'hsl(38 60% 80% / 0.85)' }}
              >
                You and {otherName} are now connected ✨
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ---------- Tribal Heart SVG ---------- */

interface TribalHeartProps {
  size?: number;
  color?: 'warm' | 'sage' | 'unified' | 'rainbow';
  pulse?: boolean;
  strong?: boolean;
}

export const TribalHeart: React.FC<TribalHeartProps> = ({
  size = 80,
  color = 'warm',
  pulse,
  strong,
}) => {
  const palette = {
    warm: { fill: 'hsl(15 80% 55%)', glow: 'hsl(25 100% 60%)' },
    sage: { fill: 'hsl(75 35% 55%)', glow: 'hsl(45 90% 65%)' },
    unified: { fill: 'hsl(20 85% 58%)', glow: 'hsl(38 100% 65%)' },
    rainbow: { fill: 'hsl(20 85% 58%)', glow: 'hsl(38 100% 65%)' },
  }[color];

  return (
    <motion.div
      style={{ width: size, height: size, position: 'relative' }}
      animate={
        pulse
          ? {
              scale: strong ? [1, 1.12, 1] : [1, 1.06, 1],
            }
          : undefined
      }
      transition={
        pulse
          ? {
              duration: strong ? 1 : 1.8,
              repeat: Infinity,
              ease: [0.445, 0.05, 0.55, 0.95],
            }
          : undefined
      }
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${palette.glow} 0%, transparent 65%)`,
          filter: 'blur(12px)',
          opacity: strong ? 0.95 : 0.7,
        }}
      />
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'relative' }}>
        <defs>
          {color === 'rainbow' && (
            <linearGradient id="rainbow-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(15 90% 60%)" />
              <stop offset="33%" stopColor="hsl(38 95% 65%)" />
              <stop offset="66%" stopColor="hsl(75 50% 60%)" />
              <stop offset="100%" stopColor="hsl(280 60% 65%)" />
              <animate
                attributeName="x1"
                values="0;1;0"
                dur="3s"
                repeatCount="indefinite"
              />
            </linearGradient>
          )}
        </defs>
        <path
          d="M50,86 C20,66 8,46 8,30 C8,18 18,10 28,10 C38,10 46,16 50,24 C54,16 62,10 72,10 C82,10 92,18 92,30 C92,46 80,66 50,86 Z"
          fill={color === 'rainbow' ? 'url(#rainbow-grad)' : palette.fill}
          stroke={palette.glow}
          strokeWidth="1.5"
        />
        {/* Tribal pattern lines */}
        <g
          stroke={palette.glow}
          strokeWidth="0.8"
          fill="none"
          opacity="0.55"
        >
          <path d="M30,35 Q50,28 70,35" />
          <path d="M28,48 Q50,42 72,48" />
          <path d="M32,60 Q50,55 68,60" />
          <circle cx="40" cy="40" r="1.5" fill={palette.glow} />
          <circle cx="60" cy="40" r="1.5" fill={palette.glow} />
          <circle cx="50" cy="55" r="1.2" fill={palette.glow} />
        </g>
      </svg>
    </motion.div>
  );
};

/* ---------- Particle Burst ---------- */

const ParticleBurst: React.FC<{ startAt: number }> = ({ startAt }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 180 + Math.random() * 120;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 4 + Math.random() * 6,
          delay: startAt + Math.random() * 0.15,
        };
      }),
    [startAt]
  );

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            background:
              'radial-gradient(circle, hsl(38 100% 75%) 0%, hsl(15 90% 55%) 60%, transparent 100%)',
            boxShadow: '0 0 10px hsl(25 100% 60%)',
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: [0, p.x],
            y: [0, p.y],
            opacity: [0, 1, 0],
            scale: [0, 1, 0.3],
          }}
          transition={{
            duration: 1.0,
            delay: p.delay,
            ease: [0.175, 0.885, 0.32, 1.275],
          }}
        />
      ))}
    </>
  );
};
