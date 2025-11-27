'use client';

import { motion } from 'framer-motion';

interface BreathWheelProps {
  secondsToday: number;
}

/**
 * Breath of Life Wheel - Innermost ring showing seconds (0-86400)
 * Represents the breath of life, completing one full rotation per day
 */
export const BreathWheel = ({ secondsToday }: BreathWheelProps) => {
  const radius = 60;
  const segments = 18; // 18 parts for the day
  const secondsPerSegment = 86400 / segments;
  
  // Calculate which segment we're in
  const currentSegment = Math.floor(secondsToday / secondsPerSegment);
  const progressInSegment = (secondsToday % secondsPerSegment) / secondsPerSegment;
  
  // Rotation angle for the breath indicator
  const rotationAngle = (secondsToday / 86400) * 360;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="breathGradient">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.3" />
        </radialGradient>
      </defs>

      {/* 18 segments */}
      {Array.from({ length: segments }, (_, i) => {
        const angle = (i * 360) / segments - 90;
        const nextAngle = ((i + 1) * 360) / segments - 90;
        const isActive = i === currentSegment;

        const pathD = `
          M 160,160
          L ${160 + radius * 0.7 * Math.cos(angle * Math.PI / 180)}, ${160 + radius * 0.7 * Math.sin(angle * Math.PI / 180)}
          A ${radius * 0.7} ${radius * 0.7} 0 0 1 ${160 + radius * 0.7 * Math.cos(nextAngle * Math.PI / 180)}, ${160 + radius * 0.7 * Math.sin(nextAngle * Math.PI / 180)}
          L 160,160
          Z
        `;

        return (
          <motion.path
            key={i}
            d={pathD}
            fill={isActive ? '#ffd700' : 'rgba(255, 255, 255, 0.1)'}
            stroke={isActive ? '#ffed4e' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth={isActive ? 2 : 1}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: isActive ? 0.8 : 0.3 }}
            transition={{ duration: 0.3 }}
          />
        );
      })}

      {/* Breath indicator line - centered at (160, 160) */}
      <motion.g
        transform={`rotate(${rotationAngle} 160 160)`}
        animate={{ 
          transform: `rotate(${rotationAngle} 160 160)`
        }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
      >
        <line
          x1="160"
          y1="160"
          x2="160"
          y2={160 - radius * 0.7}
          stroke="#ffd700"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </motion.g>
    </svg>
  );
};

