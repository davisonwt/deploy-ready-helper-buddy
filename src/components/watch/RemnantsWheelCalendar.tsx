'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';

const LEADERS = [
  { name: "malkiel", meaning: "lion", face: "1", season: "hilu'yaseph", color: "#f59e0b" },
  { name: "nar'el", meaning: "eagle", face: "4", season: "", color: "#3b82f6" },
  { name: "meleyal", meaning: "ox", face: "3", season: "asfa'el", color: "#ef4444" },
  { name: "hemel melek", meaning: "man", face: "2", season: "", color: "#10b981" },
];

interface RemnantsWheelCalendarProps {
  size?: number;
}

export default function RemnantsWheelCalendar({ size = 900 }: RemnantsWheelCalendarProps) {
  const c = size / 2;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = calculateCreatorDate(now);
  const time = getCreatorTime(now);
  const dayOfYear = date.dayOfYear ?? 1;
  const progress = ((time.part - 1) * 80 + (time.minute - 1)) / 1440;
  const totalDays = dayOfYear - 1 + progress;

  // Create curved text path arcs
  const createArcPath = (radius: number, startAngle: number, endAngle: number, clockwise: boolean = true) => {
    const start = (startAngle - 90) * Math.PI / 180;
    const end = (endAngle - 90) * Math.PI / 180;
    const x1 = c + radius * Math.cos(start);
    const y1 = c + radius * Math.sin(start);
    const x2 = c + radius * Math.cos(end);
    const y2 = c + radius * Math.sin(end);
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    const sweep = clockwise ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  };

  // Outer sun ring radius
  const sunRadius = size * 0.47;
  const leaderRadius = size * 0.40;
  const numberRadius = size * 0.33;
  const moonRadius = size * 0.22;
  const weekRadius = size * 0.27;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        <defs>
          <radialGradient id="spaceGrad">
            <stop offset="0%" stopColor="#0f0722"/>
            <stop offset="100%" stopColor="#000"/>
          </radialGradient>
          
          {/* Outer sun text paths - 4 arcs around the circle */}
          <path id="sunPathTop" d={createArcPath(sunRadius, -45, 45)} fill="none" />
          <path id="sunPathRight" d={createArcPath(sunRadius, 45, 135)} fill="none" />
          <path id="sunPathBottom" d={createArcPath(sunRadius, 135, 225)} fill="none" />
          <path id="sunPathLeft" d={createArcPath(sunRadius, 225, 315)} fill="none" />
          
          {/* Leader section arcs */}
          <path id="leaderPath1" d={createArcPath(leaderRadius, -45, 45)} fill="none" />
          <path id="leaderPath2" d={createArcPath(leaderRadius, 45, 135)} fill="none" />
          <path id="leaderPath3" d={createArcPath(leaderRadius, 135, 225)} fill="none" />
          <path id="leaderPath4" d={createArcPath(leaderRadius, 225, 315)} fill="none" />
          
          {/* Moon ring text paths */}
          <path id="moonPathTop" d={createArcPath(moonRadius, -45, 45)} fill="none" />
          <path id="moonPathRight" d={createArcPath(moonRadius, 45, 135)} fill="none" />
          <path id="moonPathBottom" d={createArcPath(moonRadius, 135, 225)} fill="none" />
          <path id="moonPathLeft" d={createArcPath(moonRadius, 225, 315)} fill="none" />
          
          {/* Full circle paths for numbers */}
          <path id="numberCircle" d={`M ${c} ${c - numberRadius} A ${numberRadius} ${numberRadius} 0 1 1 ${c - 0.01} ${c - numberRadius}`} fill="none" />
          <path id="weekCircle" d={`M ${c} ${c - weekRadius} A ${weekRadius} ${weekRadius} 0 1 1 ${c - 0.01} ${c - weekRadius}`} fill="none" />
        </defs>

        {/* Background */}
        <circle cx={c} cy={c} r={size * 0.5} fill="url(#spaceGrad)" />

        {/* Grid lines for reference (subtle) */}
        <line x1={c} y1={0} x2={c} y2={size} stroke="#333" strokeWidth="0.5" />
        <line x1={0} y1={c} x2={size} y2={c} stroke="#333" strokeWidth="0.5" />
        <line x1={c - size*0.35} y1={c - size*0.35} x2={c + size*0.35} y2={c + size*0.35} stroke="#333" strokeWidth="0.5" />
        <line x1={c + size*0.35} y1={c - size*0.35} x2={c - size*0.35} y2={c + size*0.35} stroke="#333" strokeWidth="0.5" />

        {/* Outer Sun Ring (366 days) - Orange */}
        <circle cx={c} cy={c} r={sunRadius} fill="none" stroke="#f97316" strokeWidth={size * 0.03} />
        
        {/* Sun ring labels - "366 sun 365" curving around */}
        <text fill="#f97316" fontSize={size * 0.028} fontWeight="bold">
          <textPath href="#sunPathTop" startOffset="25%" textAnchor="middle">
            hilu'yaseph 366 sun 365
          </textPath>
        </text>
        <text fill="#f97316" fontSize={size * 0.028} fontWeight="bold">
          <textPath href="#sunPathRight" startOffset="50%" textAnchor="middle">
            366 sun 365
          </textPath>
        </text>
        <text fill="#f97316" fontSize={size * 0.028} fontWeight="bold">
          <textPath href="#sunPathBottom" startOffset="50%" textAnchor="middle">
            asfa'el 366 sun 365
          </textPath>
        </text>
        <text fill="#f97316" fontSize={size * 0.028} fontWeight="bold">
          <textPath href="#sunPathLeft" startOffset="50%" textAnchor="middle">
            366 sun 365
          </textPath>
        </text>

        {/* 4 Leader Sections with curved text */}
        {/* Leader 1: malkiel (top) - Yellow */}
        <path d={createArcPath(leaderRadius - size*0.02, -45, 45)} fill="none" stroke="#fbbf24" strokeWidth={size * 0.04} />
        <text fill="#fbbf24" fontSize={size * 0.032} fontWeight="bold">
          <textPath href="#leaderPath1" startOffset="50%" textAnchor="middle">
            lion malkiel 1
          </textPath>
        </text>
        
        {/* Leader 2: nar'el (right) - Yellow */}
        <path d={createArcPath(leaderRadius - size*0.02, 45, 135)} fill="none" stroke="#fbbf24" strokeWidth={size * 0.04} />
        <text fill="#fbbf24" fontSize={size * 0.032} fontWeight="bold">
          <textPath href="#leaderPath2" startOffset="50%" textAnchor="middle">
            eagle nar'el 4
          </textPath>
        </text>
        
        {/* Leader 3: meleyal (bottom) - Yellow */}
        <path d={createArcPath(leaderRadius - size*0.02, 135, 225)} fill="none" stroke="#fbbf24" strokeWidth={size * 0.04} />
        <text fill="#fbbf24" fontSize={size * 0.032} fontWeight="bold">
          <textPath href="#leaderPath3" startOffset="50%" textAnchor="middle">
            ox meleyal 3
          </textPath>
        </text>
        
        {/* Leader 4: hemel melek (left) - Yellow */}
        <path d={createArcPath(leaderRadius - size*0.02, 225, 315)} fill="none" stroke="#fbbf24" strokeWidth={size * 0.04} />
        <text fill="#fbbf24" fontSize={size * 0.032} fontWeight="bold">
          <textPath href="#leaderPath4" startOffset="50%" textAnchor="middle">
            man hemel melek 2
          </textPath>
        </text>

        {/* Week numbers ring (52 weeks) - Green */}
        <circle cx={c} cy={c} r={weekRadius} fill="none" stroke="#22c55e" strokeWidth={size * 0.025} />
        
        {/* Week numbers curving around - show every 4 weeks */}
        {Array.from({ length: 52 }, (_, i) => {
          const weekNum = i + 1;
          const angle = (i / 52) * 360 - 90;
          const rad = angle * Math.PI / 180;
          const x = c + weekRadius * Math.cos(rad);
          const y = c + weekRadius * Math.sin(rad);
          // Rotate text to follow curve
          const rotation = angle + 90;
          
          return (
            <text
              key={i}
              x={x}
              y={y}
              fill="#22c55e"
              fontSize={size * 0.018}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${rotation} ${x} ${y})`}
            >
              {weekNum}
            </text>
          );
        })}

        {/* Moon Ring (354 days) - Magenta */}
        <circle cx={c} cy={c} r={moonRadius} fill="none" stroke="#d946ef" strokeWidth={size * 0.025} />
        
        {/* Moon tick marks */}
        {Array.from({ length: 354 }, (_, i) => {
          const angle = (i / 354) * 360 - 90;
          const rad = angle * Math.PI / 180;
          const r1 = moonRadius - size * 0.015;
          const r2 = moonRadius + size * 0.015;
          return (
            <line
              key={i}
              x1={c + r1 * Math.cos(rad)}
              y1={c + r1 * Math.sin(rad)}
              x2={c + r2 * Math.cos(rad)}
              y2={c + r2 * Math.sin(rad)}
              stroke="#d946ef"
              strokeWidth={i % 30 === 0 ? 2 : 0.5}
              opacity={0.7}
            />
          );
        })}
        
        {/* Moon labels curving */}
        <text fill="#d946ef" fontSize={size * 0.024} fontWeight="bold">
          <textPath href="#moonPathTop" startOffset="50%" textAnchor="middle">
            354 moon 354
          </textPath>
        </text>
        <text fill="#d946ef" fontSize={size * 0.024} fontWeight="bold">
          <textPath href="#moonPathRight" startOffset="50%" textAnchor="middle">
            354 moon 354
          </textPath>
        </text>
        <text fill="#d946ef" fontSize={size * 0.024} fontWeight="bold">
          <textPath href="#moonPathBottom" startOffset="50%" textAnchor="middle">
            354 moon 354
          </textPath>
        </text>
        <text fill="#d946ef" fontSize={size * 0.024} fontWeight="bold">
          <textPath href="#moonPathLeft" startOffset="50%" textAnchor="middle">
            354 moon 354
          </textPath>
        </text>

        {/* Inner information area */}
        <circle cx={c} cy={c} r={size * 0.15} fill="#0a0a15" stroke="#444" strokeWidth={1} />
        
        {/* Center labels */}
        <text x={c} y={c - size * 0.08} textAnchor="middle" fill="#888" fontSize={size * 0.016}>
          solstice "el anak" beginning 7th month, civil...
        </text>
        <text x={c} y={c - size * 0.05} textAnchor="middle" fill="#888" fontSize={size * 0.016}>
          8" leap year yearly / every year is
        </text>
        <text x={c} y={c - size * 0.02} textAnchor="middle" fill="#888" fontSize={size * 0.016}>
          364d / 52w of 7d cycle of creation
        </text>
        <text x={c} y={c + size * 0.02} textAnchor="middle" fill="#888" fontSize={size * 0.016}>
          12 months of 30d = 360 + 4 = 364
        </text>
        <text x={c} y={c + size * 0.05} textAnchor="middle" fill="#888" fontSize={size * 0.016}>
          4 season/quadrants 91d each 7x13
        </text>
        <text x={c} y={c + size * 0.08} textAnchor="middle" fill="#888" fontSize={size * 0.016}>
          zodiac = 12 months + sign / tribe
        </text>

        {/* Current day marker */}
        {(() => {
          const angle = (totalDays / 366) * 360 - 90;
          const rad = angle * Math.PI / 180;
          return (
            <circle
              cx={c + sunRadius * Math.cos(rad)}
              cy={c + sunRadius * Math.sin(rad)}
              r={size * 0.015}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
            />
          );
        })()}

        {/* Corner labels for zodiac/tribes */}
        <text x={c} y={size * 0.06} textAnchor="middle" fill="#f97316" fontSize={size * 0.018}>aries / yehudah</text>
        <text x={size * 0.94} y={c} textAnchor="end" fill="#f97316" fontSize={size * 0.018}>cancer / ephraim</text>
        <text x={c} y={size * 0.95} textAnchor="middle" fill="#f97316" fontSize={size * 0.018}>libra / scorpio</text>
        <text x={size * 0.06} y={c} textAnchor="start" fill="#f97316" fontSize={size * 0.018}>capricorn / aquarius</text>

        {/* 12 Raphael markers at top */}
        <text x={c + size * 0.15} y={size * 0.12} textAnchor="middle" fill="#f59e0b" fontSize={size * 0.016}>12 raphael</text>
      </svg>
    </div>
  );
}
