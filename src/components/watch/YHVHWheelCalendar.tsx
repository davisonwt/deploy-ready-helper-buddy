'use client';

import React from 'react';
import { useSacredNow } from '@/hooks/useSacredNow';

const ringColors = ['#fbbf24', '#22c55e', '#38bdf8', '#94a3b8', '#ef4444', '#fb923c'];

export const YHVHWheelCalendar = ({ size = 720 }: { size?: number }) => {
  const sacred = useSacredNow();
  const safeSize = Math.max(320, Math.min(size, 760));
  const center = safeSize / 2;
  const dayAngle = ((sacred.dayOfYear - 1) / 364) * 360 - 90;
  const weekAngle = ((sacred.weekDay - 1) / 7) * 360 - 90;
  const partAngle = (((sacred.partOfDay || 1) - 1) / 18) * 360 - 90;
  const polar = (radius: number, angle: number) => ({
    x: center + radius * Math.cos((angle * Math.PI) / 180),
    y: center + radius * Math.sin((angle * Math.PI) / 180),
  });

  return (
    <div className="relative mx-auto" style={{ width: safeSize, maxWidth: '100%', aspectRatio: '1 / 1' }}>
      <svg viewBox={`0 0 ${safeSize} ${safeSize}`} className="h-full w-full drop-shadow-[0_0_30px_rgba(251,191,36,0.18)]" role="img" aria-label="YHVH wheel in wheels calendar">
        <defs>
          <radialGradient id="yhvhCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="42%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        <rect width={safeSize} height={safeSize} rx="28" fill="#020617" />
        {[0.47, 0.4, 0.32, 0.25, 0.18, 0.1].map((r, i) => (
          <circle key={r} cx={center} cy={center} r={safeSize * r} fill="none" stroke={ringColors[i]} strokeWidth={i === 0 ? 3 : 2} opacity={i === 0 ? 0.95 : 0.7} />
        ))}
        {Array.from({ length: 52 }).map((_, i) => {
          const p = polar(safeSize * 0.245, (i / 52) * 360 - 90);
          return <circle key={i} cx={p.x} cy={p.y} r={i % 13 === 0 ? 4 : 2.1} fill={i % 13 === 0 ? '#22c55e' : '#94a3b8'} opacity="0.85" />;
        })}
        {Array.from({ length: 12 }).map((_, i) => {
          const p = polar(safeSize * 0.355, (i / 12) * 360 - 75);
          return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#fef3c7" fontSize={safeSize * 0.028} fontWeight="800">{i + 1}</text>;
        })}
        {[dayAngle, weekAngle, partAngle].map((angle, i) => {
          const p = polar([safeSize * 0.46, safeSize * 0.155, safeSize * 0.09][i], angle);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke={['#fbbf24', '#ef4444', '#fb923c'][i]} strokeWidth={i === 0 ? 4 : 3} strokeLinecap="round" />;
        })}
        <circle cx={center} cy={center} r={safeSize * 0.075} fill="url(#yhvhCore)" stroke="#fef3c7" strokeWidth="2" />
        <text x={center} y={center - safeSize * 0.008} textAnchor="middle" dominantBaseline="middle" fill="#020617" fontSize={safeSize * 0.035} fontWeight="900">יהוה</text>
        <text x={center} y={safeSize - 28} textAnchor="middle" fill="#fef3c7" fontSize={safeSize * 0.026} fontWeight="800">
          Year {sacred.date.year} • Month {sacred.date.month} • Day {sacred.date.day} • Day {sacred.dayOfYear}/364
        </text>
      </svg>
    </div>
  );
};

export const YHVHWheelCalendarLive = ({ size = 800 }: { size?: number }) => <YHVHWheelCalendar size={size} />;

export default YHVHWheelCalendarLive;
