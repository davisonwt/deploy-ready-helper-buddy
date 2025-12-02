'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';

const LEADERS = [
  { name: "Malki'el", image: 'Lion', representative: 'Moses & Aaron', months: '1,2,3', color: '#fbbf24' },
  { name: 'Hemel-melek', image: 'Man', representative: 'Kohath', months: '4,5,6', color: '#22c55e' },
  { name: "Mel'eyal", image: 'Ox', representative: 'Gershon', months: '7,8,9', color: '#f97316' },
  { name: "Nar'el", image: 'Eagle', representative: 'Moses & Merari', months: '10,11,12', color: '#3b82f6' },
];

export const YHVHWheelCalendarLive = ({ size = 800 }: { size?: number }) => {
  const center = size / 2;

  // Live real-time data
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const creatorDate = calculateCreatorDate(now);
  const creatorTime = getCreatorTime(now);

  const dayOfYear = creatorDate.dayOfYear ?? 1;
  const partOfDay = creatorTime.part ?? 1;
  const minute = creatorTime.minute ?? 1;

  const progressThroughDay = ((partOfDay - 1) * 80 + (minute - 1)) / 1440;
  const totalDays = dayOfYear - 1 + progressThroughDay;

  // Continuous smooth rotations — NO jumps, NO drift
  const sunRotation      = -(totalDays / 366) * 360;
  const weeksRotation    = -(totalDays / 364) * 360;
  const daysRotation     = -(totalDays * (360 / 7));
  const dayPartsRotation = -(progressThroughDay * 360);
  const leaderRotation   = -Math.floor((dayOfYear - 1) / 91) * 90;

  const radii = {
    sunOuter: size * 0.48,
    sunInner: size * 0.44,
    leadersOuter: size * 0.43,
    leadersInner: size * 0.36,
    monthDaysOuter: size * 0.35,
    monthDaysInner: size * 0.28,
    weeksOuter: size * 0.27,
    weeksInner: size * 0.22,
    dayPartsOuter: size * 0.21,
    dayPartsInner: size * 0.17,
    daysOuter: size * 0.16,
    daysInner: size * 0.11,
    centerHub: size * 0.08,
  };

  return (
    <div className="flex items-center justify-center w-full bg-black">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="bg">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0a0a15" />
          </radialGradient>
          <linearGradient id="gold">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={size * 0.49} fill="url(#bg)" />

        {/* SUN TICKS (366 days) */}
        <g>
          <motion.g
            animate={{ rotate: sunRotation }}
            transition={{ ease: "linear", duration: 1 }}
            style={{ transformOrigin: "50% 50%" }}
          >
            {Array.from({ length: 366 }, (_, i) => {
              const angle = (i / 366) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const isCurrent = i + 1 === dayOfYear;
              return (
                <line
                  key={i}
                  x1={center + Math.cos(rad) * radii.sunInner}
                  y1={center + Math.sin(rad) * radii.sunInner}
                  x2={center + Math.cos(rad) * radii.sunOuter}
                  y2={center + Math.sin(rad) * radii.sunOuter}
                  stroke={isCurrent ? "#ef4444" : "#4b5563"}
                  strokeWidth={isCurrent ? 3 : 1}
                />
              );
            })}
          </motion.g>
        </g>

        {/* 7-DAY WHEEL – GUARANTEED PERFECT */}
        <g>
          <motion.g
            animate={{ rotate: daysRotation }}
            transition={{ ease: "linear", duration: 0.8 }}
            style={{ transformOrigin: "50% 50%" }}
          >
            {['1', '2', '3', '4', '5', '6', 'שבת'].map((label, i) => {
              const angle = (i * 360 / 7 - 90) * (Math.PI / 180);
              const x = center + Math.cos(angle) * (radii.daysOuter + radii.daysInner) / 2;
              const y = center + Math.sin(angle) * (radii.daysOuter + radii.daysInner) / 2;
              const isShabbat = i === 6;
              return (
                <text
                  key={i}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isShabbat ? "#fbbf24" : "#e5e7eb"}
                  fontSize={size * (isShabbat ? 0.05 : 0.04)}
                  fontWeight="bold"
                  transform={`rotate(${i * 360 / 7 + 90} ${x} ${y})`}
                >
                  {isShabbat ? "שבת" : label}
                </text>
              );
            })}
          </motion.g>
        </g>

        {/* CENTER HUB – PERFECT */}
        <g>
          <circle cx={center} cy={center} r={radii.centerHub} fill="url(#gold)" stroke="#d97706" strokeWidth={3} />
          <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" fill="#1a1a2e" fontSize={size * 0.06} fontWeight="bold">
            יהוה
          </text>
        </g>

        {/* Current day red dot on outer rim */}
        <circle
          cx={center + Math.cos(((dayOfYear - 1 + progressThroughDay) / 366 * 360 - 90) * Math.PI / 180) * radii.sunOuter}
          cy={center + Math.sin(((dayOfYear - 1 + progressThroughDay) / 366 * 360 - 90) * Math.PI / 180) * radii.sunOuter}
          r={8}
          fill="#ef4444"
        />
      </svg>
    </div>
  );
};

export default YHVHWheelCalendarLive;
