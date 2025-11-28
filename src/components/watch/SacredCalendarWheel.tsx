/**
 * Sacred Calendar Wheel Component
 * Based on AutoCAD design with multi-layered rings
 */

import { useState, useEffect, useRef } from 'react';
import { getCreatorDate } from '@/utils/customCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { getSunriseSunset, getCurrentDayBySunrise } from '@/utils/sunrise';

interface SacredCalendarWheelProps {
  size?: number;
  className?: string;
  userLat?: number;
  userLon?: number;
}

export default function SacredCalendarWheel({ 
  size = 300, 
  className = '',
  userLat = -26.2, // Default: South Africa
  userLon = 28.0
}: SacredCalendarWheelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDayOfYear, setCurrentDayOfYear] = useState(1);
  const [sunriseData, setSunriseData] = useState<{ sunrise: Date; sunset: Date } | null>(null);
  const sunriseCache = useRef(new Map<string, any>());
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 10;

  // Update current date and check for sunrise-based day change
  useEffect(() => {
    const updateDate = async () => {
      const now = new Date();
      setCurrentDate(now);
      
      // Get sunrise data for today
      const todayStr = now.toISOString().split('T')[0];
      let todaySunrise = sunriseCache.current.get(todayStr);
      
      if (!todaySunrise) {
        todaySunrise = await getSunriseSunset(now, userLat, userLon);
        sunriseCache.current.set(todayStr, todaySunrise);
      }
      
      setSunriseData(todaySunrise);
      
      // Determine current day based on sunrise
      // If current time is before sunrise, we're still on previous day
      const effectiveDate = now < todaySunrise.sunrise 
        ? new Date(now.getTime() - 86400000) // Yesterday
        : now;
      
      const creatorDate = getCreatorDate(effectiveDate);
      const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
      let dayOfYear = 0;
      for (let i = 0; i < creatorDate.month - 1; i++) {
        dayOfYear += monthDays[i];
      }
      dayOfYear += creatorDate.day;
      setCurrentDayOfYear(dayOfYear);
    };
    
    updateDate();
    const interval = setInterval(updateDate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [userLat, userLon]);

  const creatorDate = getCreatorDate(currentDate);
  const creatorTime = getCreatorTime(currentDate, userLat, userLon);
  const dayOfYear = currentDayOfYear;

  // Ring radii (from outer to inner)
  const r1 = maxRadius; // Outermost orange ring
  const r1Inner = r1 - (maxRadius * 0.08); // Inner edge of orange ring (where black weekday ring starts)
  const r1Weekday = r1Inner - (maxRadius * 0.06); // Black weekday ring outer radius
  const r1WeekdayInner = r1Weekday - (maxRadius * 0.05); // Black weekday ring inner radius
  const r2 = maxRadius * 0.85; // Multi-colored segments ring
  const r3 = maxRadius * 0.70; // White moon ring
  const r4 = maxRadius * 0.55; // Inner numbered ring
  const r5 = maxRadius * 0.40; // Fine divisions ring
  const r6 = maxRadius * 0.15; // Center area

  // 52-week segments with labels
  const weekSegments = [
    // Green quadrant (1-13)
    { start: 1, end: 13, color: '#22c55e', labels: ['hilu\'yaseph', 'lion 1 yehudah', 'malki\'el moshe & a\'aron', 'donkey / taurus yissaskar', 'ship / gemini 3 zebulun'] },
    // Red quadrant (14-26)
    { start: 14, end: 26, color: '#ef4444', labels: ['man / cancer reuben', 'kohath', 'sword / virgo 5 simeon', 'campfire / libra gad'] },
    // Orange quadrant (27-39)
    { start: 27, end: 39, color: '#f97316', labels: ['asfa\'el', 'ox / scorpio 7 ephraim', 'meleyal gershon', 'unicorn / sagittarius', '8 manasseh', 'wolf / capricorn 9 benyamin', '10 dan'] },
    // Purple quadrant (40-52)
    { start: 40, end: 52, color: '#a855f7', labels: ['nar\'el merari', 'eagle / pisces', 'olive tree / aquarius', '11 asher', '12 naphtali', 'deer / aries'] },
  ];

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
            strokeWidth={maxRadius * 0.08}
            opacity="0.9"
          />
          {/* 366 lines around the outer orange circle - black by default, white for today */}
          {Array.from({ length: 366 }).map((_, i) => {
            // Anti-clockwise: day 1 starts at top (angle -90), counting backwards
            // Day 1 = index 0, Day 366 = index 365
            // Current day is dayOfYear (1-366)
            const dayNumber = i + 1;
            const isToday = dayNumber === dayOfYear;
            
            // Anti-clockwise: angle decreases as we go around
            const angle = -((i / 366) * 360) - 90; // Negative for anti-clockwise
            const rad = (angle * Math.PI) / 180;
            
            // Orange circle stroke width
            const orangeStrokeWidth = maxRadius * 0.08;
            
            // Lines should be WITHIN the orange circle stroke area
            // Orange circle is drawn at radius r1 with strokeWidth, so:
            // - Outer edge of orange stroke: r1 + (orangeStrokeWidth / 2)
            // - Inner edge of orange stroke: r1 - (orangeStrokeWidth / 2)
            // Lines should span within this stroke area, not extend beyond it
            const lineStartRadius = r1 + (orangeStrokeWidth / 2); // Outer edge of orange stroke
            const lineEndRadius = r1 - (orangeStrokeWidth / 2); // Inner edge of orange stroke
            
            // Calculate line endpoints
            const x1 = centerX + lineStartRadius * Math.cos(rad);
            const y1 = centerY + lineStartRadius * Math.sin(rad);
            const x2 = centerX + lineEndRadius * Math.cos(rad);
            const y2 = centerY + lineEndRadius * Math.sin(rad);
            
            // Thicker lines that can touch but not overlap
            const lineLength = lineStartRadius - lineEndRadius;
            const lineWidth = Math.max(2, (lineLength * 0.15)); // Thicker lines, ~15% of line length
            
            return (
              <line
                key={`sun-line-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isToday ? "#ffffff" : "#000000"}
                strokeWidth={lineWidth}
                opacity={isToday ? "1" : "0.9"}
                strokeLinecap="round"
              />
            );
          })}
          {/* 366 segments */}
          {Array.from({ length: 366 }).map((_, i) => {
            const angle = (i / 366) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + r1 * Math.cos(rad);
            const y1 = centerY + r1 * Math.sin(rad);
            const x2 = centerX + (r1 - maxRadius * 0.08) * Math.cos(rad);
            const y2 = centerY + (r1 - maxRadius * 0.08) * Math.sin(rad);
            return (
              <line
                key={`sun-seg-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#f97316"
                strokeWidth="0.5"
                opacity="0.6"
              />
            );
          })}
          {/* Labels */}
          <text x={centerX} y={r1 * 0.7} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">
            366 sun 365
          </text>
          <text x={centerX} y={size - r1 * 0.7} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">
            366 sun 365
          </text>
        </g>

        {/* Black Weekday Ring - Just inside orange circle */}
        <g>
          {/* Black circle ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={r1Weekday}
            fill="#000000"
            stroke="#000000"
            strokeWidth="1"
          />
          
          {/* Weekday numbers (1-7 repeating) starting at day 1's position */}
          {Array.from({ length: 366 }).map((_, i) => {
            // Day 1 starts at top (angle -90), anti-clockwise
            const angle = -((i / 366) * 360) - 90;
            const rad = (angle * Math.PI) / 180;
            
            // Weekday number: 1-7 repeating (day 1 = weekday 1, day 2 = weekday 2, etc.)
            const weekdayNumber = (i % 7) + 1;
            
            // Position number at the center of the weekday ring
            const textRadius = (r1Weekday + r1WeekdayInner) / 2;
            const x = centerX + textRadius * Math.cos(rad);
            const y = centerY + textRadius * Math.sin(rad);
            
            // Rotate text to be readable (upright)
            const textAngle = angle + 90; // Add 90 to make text upright
            
            return (
              <text
                key={`weekday-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                transform={`rotate(${textAngle}, ${x}, ${y})`}
              >
                {weekdayNumber}
              </text>
            );
          })}
        </g>

        {/* Ring 2: Multi-colored segments (1-52 weeks) */}
        {weekSegments.map((segment, segIdx) => {
          const segmentAngle = 360 / 4; // 4 quadrants
          const startAngle = segIdx * segmentAngle - 90;
          const weeksInSegment = segment.end - segment.start + 1;
          const weekAngle = segmentAngle / weeksInSegment;

          return (
            <g key={`segment-${segIdx}`}>
              {/* Background segment */}
              <path
                d={`M ${centerX} ${centerY} L ${centerX + r2 * Math.cos((startAngle * Math.PI) / 180)} ${centerY + r2 * Math.sin((startAngle * Math.PI) / 180)} A ${r2} ${r2} 0 0 1 ${centerX + r2 * Math.cos(((startAngle + segmentAngle) * Math.PI) / 180)} ${centerY + r2 * Math.sin(((startAngle + segmentAngle) * Math.PI) / 180)} Z`}
                fill={segment.color}
                opacity="0.3"
              />
              {/* Week numbers */}
              {Array.from({ length: weeksInSegment }).map((_, weekIdx) => {
                const weekNum = segment.start + weekIdx;
                const angle = startAngle + (weekIdx + 0.5) * weekAngle;
                const rad = (angle * Math.PI) / 180;
                const radius = r2 * 0.7;
                return (
                  <text
                    key={`week-${weekNum}`}
                    x={centerX + radius * Math.cos(rad)}
                    y={centerY + radius * Math.sin(rad)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="6"
                    fontWeight="bold"
                  >
                    {weekNum}
                  </text>
                );
              })}
            </g>
          );
        })}

        {/* Ring 3: White Moon Ring - 354 moon 354 */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={r3}
            fill="none"
            stroke="#ffffff"
            strokeWidth={maxRadius * 0.06}
            opacity="0.8"
          />
          {/* 354 segments */}
          {Array.from({ length: 354 }).map((_, i) => {
            const angle = (i / 354) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + r3 * Math.cos(rad);
            const y1 = centerY + r3 * Math.sin(rad);
            const x2 = centerX + (r3 - maxRadius * 0.06) * Math.cos(rad);
            const y2 = centerY + (r3 - maxRadius * 0.06) * Math.sin(rad);
            return (
              <line
                key={`moon-seg-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ffffff"
                strokeWidth="0.3"
                opacity="0.5"
              />
            );
          })}
          {/* Labels */}
          <text x={centerX} y={r3 * 0.85} textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
            354 moon 354
          </text>
        </g>

        {/* Ring 4: Inner numbered ring */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={r4}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.4"
          />
          {/* Fine divisions */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i / 72) * 360;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + r4 * Math.cos(rad);
            const y1 = centerY + r4 * Math.sin(rad);
            const x2 = centerX + r5 * Math.cos(rad);
            const y2 = centerY + r5 * Math.sin(rad);
            return (
              <line
                key={`div-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ffffff"
                strokeWidth="0.2"
                opacity="0.3"
              />
            );
          })}
        </g>

        {/* Center area with solstice lines */}
        <g>
          {/* Purple solstice line */}
          <line
            x1={centerX}
            y1={centerY - r6}
            x2={centerX}
            y2={centerY + r6}
            stroke="#a855f7"
            strokeWidth="1"
            opacity="0.6"
          />
          {/* Red solstice line */}
          <line
            x1={centerX - r6}
            y1={centerY}
            x2={centerX + r6}
            y2={centerY}
            stroke="#ef4444"
            strokeWidth="1"
            opacity="0.6"
          />
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={r6}
            fill="url(#center-glow)"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.2"
          />
          {/* Current day indicator */}
          <circle
            cx={centerX}
            cy={centerY}
            r={r6 * 0.3}
            fill="#f97316"
            opacity="0.8"
          />
          {/* Labels */}
          <text x={centerX} y={centerY - r6 * 1.5} textAnchor="middle" fill="#a855f7" fontSize="5" opacity="0.7">
            solstice end 6th & beginning 7th month
          </text>
          <text x={centerX + r6 * 1.5} y={centerY} textAnchor="middle" fill="#ef4444" fontSize="5" opacity="0.7">
            solstice end 12th & beginning 1st month
          </text>
          <text x={centerX} y={centerY + r6 * 1.5} textAnchor="middle" fill="#ffffff" fontSize="4" opacity="0.6">
            explanation of the will
          </text>
          <text x={centerX} y={centerY + r6 * 2} textAnchor="middle" fill="#ffffff" fontSize="4" opacity="0.6">
            4th day of the new year
          </text>
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
