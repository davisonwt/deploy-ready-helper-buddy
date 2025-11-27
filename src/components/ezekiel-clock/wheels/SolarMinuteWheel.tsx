'use client';

import { motion } from 'framer-motion';

interface SolarMinuteWheelProps {
  minutesToday: number;
  isDaytime: boolean;
}

/**
 * Solar Minute Wheel - 1440-minute solar ring
 * Shows minutes of the day (0-1440), divided into 18 parts
 */
export const SolarMinuteWheel = ({ minutesToday, isDaytime }: SolarMinuteWheelProps) => {
  const radius = 90;
  const innerRadius = 70;
  const segments = 18;
  const minutesPerSegment = 1440 / segments;
  
  const currentSegment = Math.floor(minutesToday / minutesPerSegment);
  const rotationAngle = (minutesToday / 1440) * 360;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
      {/* 18 segments for minutes */}
      {Array.from({ length: segments }, (_, i) => {
        const angle = (i * 360) / segments - 90;
        const nextAngle = ((i + 1) * 360) / segments - 90;
        const isActive = i === currentSegment;

        const pathD = `
          M 160,160
          L ${160 + innerRadius * Math.cos(angle * Math.PI / 180)}, ${160 + innerRadius * Math.sin(angle * Math.PI / 180)}
          A ${innerRadius} ${innerRadius} 0 0 1 ${160 + innerRadius * Math.cos(nextAngle * Math.PI / 180)}, ${160 + innerRadius * Math.sin(nextAngle * Math.PI / 180)}
          L ${160 + radius * Math.cos(nextAngle * Math.PI / 180)}, ${160 + radius * Math.sin(nextAngle * Math.PI / 180)}
          A ${radius} ${radius} 0 0 0 ${160 + radius * Math.cos(angle * Math.PI / 180)}, ${160 + radius * Math.sin(angle * Math.PI / 180)}
          L 160,160
          Z
        `;

        return (
          <motion.path
            key={i}
            d={pathD}
            fill={isDaytime ? (isActive ? '#fdae1a' : 'rgba(253, 174, 26, 0.3)') : (isActive ? '#334155' : 'rgba(51, 65, 85, 0.2)')}
            stroke={isActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}
            strokeWidth={isActive ? 2 : 1}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: isActive ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
          />
        );
      })}

      {/* Minute indicator */}
      <motion.line
        x1="160"
        y1="160"
        x2="160"
        y2={160 - radius}
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transformOrigin: '160px 160px',
          transform: `rotate(${rotationAngle}deg)`,
        }}
        animate={{ rotate: rotationAngle }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
      />
    </svg>
  );
};

