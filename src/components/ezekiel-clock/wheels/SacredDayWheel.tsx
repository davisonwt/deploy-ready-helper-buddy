'use client';

import { motion } from 'framer-motion';

const PART_NAMES = [
  '',
  'Reuben - Firstborn',
  'Simeon - Hearing',
  'Levi - Joined',
  'Judah - Praise',
  'Dan - Judgment',
  'Naphtali - Struggle',
  'Gad - Troop',
  'Asher - Happy',
  'Issachar - Reward',
  'Zebulun - Dwelling',
  'Joseph - Increase',
  'Benjamin - Son of Right Hand',
  'Kohath - Assembly',
  'Gershon - Exile',
  'Merari - Bitter',
  'Night Watch',
  'Deep Night',
  'Gate of Dawn',
];

interface SacredDayWheelProps {
  sacredPart: number;
  isDaytime: boolean;
  onPartClick: (part: number) => void;
}

/**
 * Sacred Day Wheel - 18 parts representing the sacred day
 * Parts 1-12: Daytime (tribes of Israel)
 * Parts 13-18: Nighttime (Levitical watches)
 */
export const SacredDayWheel = ({ sacredPart, isDaytime, onPartClick }: SacredDayWheelProps) => {
  const segments = 18;
  const radius = 140;
  const innerRadius = 100;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
      {Array.from({ length: segments }, (_, i) => {
        const partNum = i + 1;
        const angle = (i * 360) / segments - 90;
        const nextAngle = ((i + 1) * 360) / segments - 90;
        const isActive = partNum === sacredPart;
        const isDaySegment = i < 12;

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
            fill={isDaySegment ? (isDaytime ? '#fdae1a' : '#334155') : '#1e293b'}
            stroke={isActive ? '#fbbf24' : '#475569'}
            strokeWidth={isActive ? 6 : 2}
            className="cursor-pointer"
            whileHover={{ opacity: 0.8, scale: 1.02 }}
            onClick={() => onPartClick(partNum)}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: isActive ? 1 : 0.7 }}
            transition={{ duration: 0.3 }}
            title={PART_NAMES[partNum] || `Part ${partNum}`}
          />
        );
      })}

      {/* Part numbers */}
      {Array.from({ length: segments }, (_, i) => {
        const partNum = i + 1;
        const angle = (i * 360) / segments - 90;
        const labelRadius = (innerRadius + radius) / 2;
        const x = 160 + labelRadius * Math.cos(angle * Math.PI / 180);
        const y = 160 + labelRadius * Math.sin(angle * Math.PI / 180);

        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={partNum === sacredPart ? '#fbbf24' : '#94a3b8'}
            fontSize="12"
            fontWeight={partNum === sacredPart ? 'bold' : 'normal'}
            className="pointer-events-none select-none"
          >
            {partNum}
          </text>
        );
      })}
    </svg>
  );
};

