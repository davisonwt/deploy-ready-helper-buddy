'use client';

import { motion } from 'framer-motion';

interface YearWheelProps {
  dayOfYear: number;
  creature: 'Lion' | 'Ox' | 'Man' | 'Eagle';
}

const CREATURE_EMOJIS = {
  Lion: '🦁',
  Ox: '🐂',
  Man: '👤',
  Eagle: '🦅',
};

const CREATURE_COLORS = {
  Lion: '#f59e0b',
  Ox: '#84cc16',
  Man: '#3b82f6',
  Eagle: '#8b5cf6',
};

/**
 * Year Wheel - Outermost ring showing Enochian year progress
 * 364 days per year, divided into 4 seasons (creatures)
 */
export const YearWheel = ({ dayOfYear, creature }: YearWheelProps) => {
  const radius = 160;
  const innerRadius = 145;
  const segments = 4; // 4 seasons
  const daysPerSegment = 364 / segments;
  
  const currentSegment = Math.floor((dayOfYear - 1) / daysPerSegment);
  const progressInYear = (dayOfYear - 1) / 364;
  const rotationAngle = progressInYear * 360;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
      {/* 4 season segments */}
      {Array.from({ length: segments }, (_, i) => {
        const angle = (i * 360) / segments - 90;
        const nextAngle = ((i + 1) * 360) / segments - 90;
        const isActive = i === currentSegment;
        const seasonCreatures: Array<'Lion' | 'Ox' | 'Man' | 'Eagle'> = ['Lion', 'Ox', 'Man', 'Eagle'];
        const segmentCreature = seasonCreatures[i];

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
            fill={isActive ? CREATURE_COLORS[segmentCreature] : 'rgba(255, 255, 255, 0.1)'}
            stroke={isActive ? CREATURE_COLORS[segmentCreature] : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth={isActive ? 3 : 1}
            opacity={isActive ? 0.8 : 0.3}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: isActive ? 0.8 : 0.3 }}
            transition={{ duration: 0.5 }}
          />
        );
      })}

      {/* Year indicator - centered at (160, 160) */}
      <g>
        <motion.line
          x1="160"
          y1="160"
          x2={160 + radius * Math.cos((rotationAngle - 90) * Math.PI / 180)}
          y2={160 + radius * Math.sin((rotationAngle - 90) * Math.PI / 180)}
          stroke={CREATURE_COLORS[creature]}
          strokeWidth="3"
          strokeLinecap="round"
          animate={{
            x2: 160 + radius * Math.cos((rotationAngle - 90) * Math.PI / 180),
            y2: 160 + radius * Math.sin((rotationAngle - 90) * Math.PI / 180),
          }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        />
        {/* Creature emoji at indicator tip */}
        <motion.text
          x={160 + radius * Math.cos((rotationAngle - 90) * Math.PI / 180)}
          y={160 + radius * Math.sin((rotationAngle - 90) * Math.PI / 180)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          className="pointer-events-none select-none"
          animate={{
            x: 160 + radius * Math.cos((rotationAngle - 90) * Math.PI / 180),
            y: 160 + radius * Math.sin((rotationAngle - 90) * Math.PI / 180),
          }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        >
          {CREATURE_EMOJIS[creature]}
        </motion.text>
      </g>
    </svg>
  );
};

