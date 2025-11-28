/**
 * Sacred Calendar Wheel Component
 * Based on AutoCAD design with multi-layered rings
 */

import { useState, useEffect } from 'react';
import { getCreatorDate } from '@/utils/customCalendar';
import { getCreatorTime } from '@/utils/customTime';

interface SacredCalendarWheelProps {
  size?: number;
  className?: string;
}

export default function SacredCalendarWheel({ 
  size = 300, 
  className = '' 
}: SacredCalendarWheelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 10;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const creatorDate = getCreatorDate(currentDate);
  const creatorTime = getCreatorTime(currentDate);

  // Calculate day of year
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let dayOfYear = 0;
  for (let i = 0; i < creatorDate.month - 1; i++) {
    dayOfYear += monthDays[i];
  }
  dayOfYear += creatorDate.day;

  // Ring radii (from outer to inner)
  const r1 = maxRadius; // Outermost orange ring (366 sun 365)
  const r2 = maxRadius * 0.92; // Cyan separator
  const r3 = maxRadius * 0.88; // Green & Magenta week ring (52 weeks)
  const r4 = maxRadius * 0.84; // Thin green/magenta separator
  const r5 = maxRadius * 0.78; // Inner numbered segments (days/parts)
  const r6 = maxRadius * 0.50; // White moon ring (354 moon 354)
  const r7 = maxRadius * 0.20; // Center area

  // 52-week segments - alternating green and magenta
  const weekSegments = Array.from({ length: 52 }).map((_, i) => ({
    week: 52 - i, // Count down from 52 to 1
    color: i % 2 === 0 ? '#22c55e' : '#ec4899', // Alternating green and magenta
    angle: (i / 52) * 360 - 90
  }));

  return (
    <div className={`sacred-calendar-wheel ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Gradients */}
          <radialGradient id="center-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={size} height={size} fill="#000000" />

        {/* Crosshair */}
        <line x1={centerX} y1={0} x2={centerX} y2={size} stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
        <line x1={0} y1={centerY} x2={size} y2={centerY} stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />

        {/* Ring 1: Outermost Orange Ring - 366 sun 365 */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={r1}
            fill="none"
            stroke="#f97316"
            strokeWidth={maxRadius * 0.12}
            opacity="0.95"
          />
          {/* 366 segments */}
          {Array.from({ length: 366 }).map((_, i) => {
            const angle = (i / 366) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + r1 * Math.cos(rad);
            const y1 = centerY + r1 * Math.sin(rad);
            const x2 = centerX + (r1 - maxRadius * 0.12) * Math.cos(rad);
            const y2 = centerY + (r1 - maxRadius * 0.12) * Math.sin(rad);
            return (
              <line
                key={`sun-seg-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#f97316"
                strokeWidth="0.5"
                opacity="0.7"
              />
            );
          })}
          {/* Labels - rotated to be readable */}
          {['366 sun 365'].map((label, idx) => {
            const angle = (idx * 180) * Math.PI / 180;
            const labelRadius = r1 * 0.75;
            return (
              <text
                key={`label-${idx}`}
                x={centerX + labelRadius * Math.cos(angle)}
                y={centerY + labelRadius * Math.sin(angle)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#f97316"
                fontSize="10"
                fontWeight="bold"
                transform={`rotate(${angle * 180 / Math.PI + 90} ${centerX + labelRadius * Math.cos(angle)} ${centerY + labelRadius * Math.sin(angle)})`}
              >
                {label}
              </text>
            );
          })}
        </g>

        {/* Ring 2: Cyan Separator */}
        <circle
          cx={centerX}
          cy={centerY}
          r={r2}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Ring 3: Green & Magenta Week Ring (52 weeks) - Alternating segments */}
        {weekSegments.map((segment, i) => {
          const segmentAngle = 360 / 52;
          const startAngle = segment.angle;
          const rad = (startAngle * Math.PI) / 180;
          const nextRad = ((startAngle + segmentAngle) * Math.PI) / 180;
          
          return (
            <g key={`week-${segment.week}`}>
              {/* Background segment */}
              <path
                d={`M ${centerX} ${centerY} L ${centerX + r3 * Math.cos(rad)} ${centerY + r3 * Math.sin(rad)} A ${r3} ${r3} 0 0 1 ${centerX + r3 * Math.cos(nextRad)} ${centerY + r3 * Math.sin(nextRad)} Z`}
                fill={segment.color}
                opacity="0.4"
              />
              {/* Week number - rotated to be readable */}
              <text
                x={centerX + r3 * 0.7 * Math.cos(rad + segmentAngle / 2 * Math.PI / 180)}
                y={centerY + r3 * 0.7 * Math.sin(rad + segmentAngle / 2 * Math.PI / 180)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                transform={`rotate(${startAngle + segmentAngle / 2 + 90} ${centerX + r3 * 0.7 * Math.cos(rad + segmentAngle / 2 * Math.PI / 180)} ${centerY + r3 * 0.7 * Math.sin(rad + segmentAngle / 2 * Math.PI / 180)})`}
              >
                {segment.week}
              </text>
            </g>
          );
        })}

        {/* Ring 4: Thin Green & Magenta Separator */}
        {weekSegments.map((segment, i) => {
          if (i % 2 === 0) return null; // Only draw for alternating segments
          const segmentAngle = 360 / 52;
          const startAngle = segment.angle;
          const rad = (startAngle * Math.PI) / 180;
          const nextRad = ((startAngle + segmentAngle) * Math.PI) / 180;
          
          return (
            <path
              key={`sep-${i}`}
              d={`M ${centerX + r4 * Math.cos(rad)} ${centerY + r4 * Math.sin(rad)} A ${r4} ${r4} 0 0 1 ${centerX + r4 * Math.cos(nextRad)} ${centerY + r4 * Math.sin(nextRad)}`}
              fill="none"
              stroke={segment.color}
              strokeWidth="1"
              opacity="0.5"
            />
          );
        })}

        {/* Ring 5: Inner Numbered Segments (Days/Parts) - White tick marks with orange numbers */}
        <g>
          {/* White tick marks */}
          {Array.from({ length: 31 }).map((_, i) => {
            const dayNum = 31 - i; // Count down from 31 to 1
            const angle = (i / 31) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const tickLength = maxRadius * 0.03;
            return (
              <g key={`day-${dayNum}`}>
                {/* White tick mark */}
                <line
                  x1={centerX + r5 * Math.cos(rad)}
                  y1={centerY + r5 * Math.sin(rad)}
                  x2={centerX + (r5 + tickLength) * Math.cos(rad)}
                  y2={centerY + (r5 + tickLength) * Math.sin(rad)}
                  stroke="#ffffff"
                  strokeWidth="1"
                  opacity="0.8"
                />
                {/* Orange number - rotated to be readable */}
                <text
                  x={centerX + (r5 + tickLength * 1.5) * Math.cos(rad)}
                  y={centerY + (r5 + tickLength * 1.5) * Math.sin(rad)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#f97316"
                  fontSize="6"
                  fontWeight="bold"
                  transform={`rotate(${angle * 180 / Math.PI + 90} ${centerX + (r5 + tickLength * 1.5) * Math.cos(rad)} ${centerY + (r5 + tickLength * 1.5) * Math.sin(rad)})`}
                >
                  {dayNum}
                </text>
              </g>
            );
          })}
        </g>

        {/* Ring 6: White Moon Ring - 354 moon 354 */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={r6}
            fill="none"
            stroke="#ffffff"
            strokeWidth={maxRadius * 0.10}
            opacity="0.9"
          />
          {/* 354 segments */}
          {Array.from({ length: 354 }).map((_, i) => {
            const angle = (i / 354) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + r6 * Math.cos(rad);
            const y1 = centerY + r6 * Math.sin(rad);
            const x2 = centerX + (r6 - maxRadius * 0.10) * Math.cos(rad);
            const y2 = centerY + (r6 - maxRadius * 0.10) * Math.sin(rad);
            return (
              <line
                key={`moon-seg-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ffffff"
                strokeWidth="0.4"
                opacity="0.6"
              />
            );
          })}
          {/* Labels - rotated to be readable */}
          {['354 moon 354'].map((label, idx) => {
            const angle = (idx * 180) * Math.PI / 180;
            const labelRadius = r6 * 0.75;
            return (
              <text
                key={`moon-label-${idx}`}
                x={centerX + labelRadius * Math.cos(angle)}
                y={centerY + labelRadius * Math.sin(angle)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
                transform={`rotate(${angle * 180 / Math.PI + 90} ${centerX + labelRadius * Math.cos(angle)} ${centerY + labelRadius * Math.sin(angle)})`}
              >
                {label}
              </text>
            );
          })}
        </g>

        {/* Center area */}
        <g>
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={r7}
            fill="url(#center-glow)"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.2"
          />
          {/* Current day indicator */}
          <circle
            cx={centerX}
            cy={centerY}
            r={r7 * 0.4}
            fill="#f97316"
            opacity="0.8"
          />
        </g>

        {/* Current position indicators */}
        <g>
          {/* Day of year indicator on outer ring */}
          {(() => {
            const dayAngle = ((dayOfYear - 1) / 366) * 360 - 90;
            const rad = (dayAngle * Math.PI) / 180;
            return (
              <circle
                cx={centerX + r1 * 0.95 * Math.cos(rad)}
                cy={centerY + r1 * 0.95 * Math.sin(rad)}
                r={3}
                fill="#ffd700"
                stroke="#ffffff"
                strokeWidth="1"
              />
            );
          })()}
          {/* Part indicator on inner ring */}
          {(() => {
            const partAngle = ((creatorTime.part - 1) / 18) * 360 - 90;
            const rad = (partAngle * Math.PI) / 180;
            return (
              <circle
                cx={centerX + r5 * 0.9 * Math.cos(rad)}
                cy={centerY + r5 * 0.9 * Math.sin(rad)}
                r={2}
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="0.5"
              />
            );
          })()}
        </g>
      </svg>
    </div>
  );
}

