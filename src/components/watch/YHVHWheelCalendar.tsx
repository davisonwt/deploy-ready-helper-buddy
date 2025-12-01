import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';

interface WheelCalendarProps {
  dayOfYear?: number;
  dayOfMonth?: number;
  month?: number;
  weekOfYear?: number;
  dayOfWeek?: number;
  partOfDay?: number;
  size?: number;
}

// Leader data for the 4 quadrants
const LEADERS = [
  { name: "Malki'el", image: 'Lion', representative: 'Moses & Aaron', months: '1,2,3', color: '#fbbf24' },
  { name: 'Hemel-melek', image: 'Man', representative: 'Kohath', months: '4,5,6', color: '#22c55e' },
  { name: "Mel'eyal", image: 'Ox', representative: 'Gershon', months: '7,8,9', color: '#f97316' },
  { name: "Nar'el", image: 'Eagle', representative: 'Moses & Merari', months: '10,11,12', color: '#3b82f6' },
];

// Day part names
const DAY_PARTS = ['Day', 'Evening', 'Night', 'Morning'];

// Get current leader based on day of year
const getCurrentLeader = (dayOfYear: number) => {
  if (dayOfYear <= 91) return 0; // Malki'el
  if (dayOfYear <= 182) return 1; // Hemel-melek
  if (dayOfYear <= 273) return 2; // Mel'eyal
  return 3; // Nar'el
};

// Get current day part (0-3) based on part of day (1-18)
const getDayPartIndex = (partOfDay: number): number => {
  // Day: parts 1-4, Evening: parts 5-8, Night: parts 9-13, Morning: parts 14-18
  if (partOfDay <= 4) return 0; // Day
  if (partOfDay <= 8) return 1; // Evening
  if (partOfDay <= 13) return 2; // Night
  return 3; // Morning
};

export const YHVHWheelCalendar: React.FC<WheelCalendarProps> = ({
  dayOfYear = 1,
  dayOfMonth = 1,
  month = 1,
  weekOfYear = 1,
  dayOfWeek = 1,
  partOfDay = 1,
  size = 800,
}) => {
  const center = size / 2;
  
  // Calculate radii for each wheel (outer to inner)
  const radii = useMemo(() => ({
    sunOuter: size * 0.48,
    sunInner: size * 0.44,
    leadersOuter: size * 0.43,
    leadersInner: size * 0.36,
    monthDaysOuter: size * 0.35,
    monthDaysInner: size * 0.28,
    weeksOuter: size * 0.27,
    weeksInner: size * 0.22,
    daysOuter: size * 0.21,
    daysInner: size * 0.16,
    partsOuter: size * 0.15,
    partsInner: size * 0.08,
  }), [size]);

  // Current leader index (0-3)
  const currentLeaderIndex = getCurrentLeader(dayOfYear);
  
  // Current day part index (0-3)
  const currentDayPartIndex = getDayPartIndex(partOfDay);
  
  // Rotation angles
  const sunRotation = -(dayOfYear / 366) * 360;
  const leaderRotation = -(currentLeaderIndex * 90);
  const weeksRotation = -(dayOfYear / 364) * 360;
  const daysRotation = -((dayOfWeek - 1) / 7) * 360;
  const partsRotation = -(currentDayPartIndex / 4) * 360;

  // Generate 366 tick marks for sun circle
  const sunTicks = useMemo(() => {
    return Array.from({ length: 366 }, (_, i) => {
      const angle = (i / 366) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const isCurrentDay = i + 1 === dayOfYear;
      // Shabbat is only on day 7 of the week, not based on day of month
      const isSabbath = false; // Sun circle doesn't show Shabbat - only the 7-day wheel does
      
      return {
        x1: center + Math.cos(rad) * radii.sunInner,
        y1: center + Math.sin(rad) * radii.sunInner,
        x2: center + Math.cos(rad) * radii.sunOuter,
        y2: center + Math.sin(rad) * radii.sunOuter,
        isCurrentDay,
        isSabbath,
        angle,
      };
    });
  }, [center, radii, dayOfYear]);

  // Generate 364 dots for weeks circle
  const weekDots = useMemo(() => {
    return Array.from({ length: 364 }, (_, i) => {
      const angle = (i / 364) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const radius = (radii.weeksOuter + radii.weeksInner) / 2;
      const isCurrentDay = i + 1 === dayOfYear;
      const isSabbath = (i + 1) % 7 === 0;
      
      return {
        cx: center + Math.cos(rad) * radius,
        cy: center + Math.sin(rad) * radius,
        isCurrentDay,
        isSabbath,
      };
    });
  }, [center, radii, dayOfYear]);

  return (
    <div className="flex items-center justify-center w-full">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-2xl"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0a0a15" />
          </radialGradient>
          
          {/* Gold gradient for highlights */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main background circle */}
        <circle cx={center} cy={center} r={size * 0.49} fill="url(#wheelBg)" stroke="#333" strokeWidth={2} />

        {/* ====== CIRCLE 1: SUN CIRCLE (366 days) ====== */}
        <motion.g
          animate={{ rotate: sunRotation }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={(radii.sunOuter + radii.sunInner) / 2}
            fill="none"
            stroke="#1f2937"
            strokeWidth={radii.sunOuter - radii.sunInner}
          />
          
          {/* 366 tick marks */}
          {sunTicks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.isCurrentDay ? '#ef4444' : tick.isSabbath ? '#fbbf24' : '#4b5563'}
              strokeWidth={tick.isCurrentDay ? 3 : 1}
              filter={tick.isCurrentDay ? 'url(#glow)' : undefined}
            />
          ))}
        </motion.g>

        {/* ====== CIRCLE 2: LEADERS CIRCLE (4 quadrants) ====== */}
        <motion.g
          animate={{ rotate: leaderRotation }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {LEADERS.map((leader, i) => {
            const startAngle = (i * 90 - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * 90 - 90) * (Math.PI / 180);
            const midAngle = ((i * 90 + 45) - 90) * (Math.PI / 180);
            
            const largeArcFlag = 0;
            
            const x1 = center + Math.cos(startAngle) * radii.leadersOuter;
            const y1 = center + Math.sin(startAngle) * radii.leadersOuter;
            const x2 = center + Math.cos(endAngle) * radii.leadersOuter;
            const y2 = center + Math.sin(endAngle) * radii.leadersOuter;
            const x3 = center + Math.cos(endAngle) * radii.leadersInner;
            const y3 = center + Math.sin(endAngle) * radii.leadersInner;
            const x4 = center + Math.cos(startAngle) * radii.leadersInner;
            const y4 = center + Math.sin(startAngle) * radii.leadersInner;
            
            const textRadius = (radii.leadersOuter + radii.leadersInner) / 2;
            const textX = center + Math.cos(midAngle) * textRadius;
            const textY = center + Math.sin(midAngle) * textRadius;
            
            const isActive = i === currentLeaderIndex;
            
            return (
              <g key={i}>
                {/* Quadrant arc */}
                <path
                  d={`
                    M ${x1} ${y1}
                    A ${radii.leadersOuter} ${radii.leadersOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}
                    L ${x3} ${y3}
                    A ${radii.leadersInner} ${radii.leadersInner} 0 ${largeArcFlag} 0 ${x4} ${y4}
                    Z
                  `}
                  fill={isActive ? leader.color + '40' : leader.color + '20'}
                  stroke={leader.color}
                  strokeWidth={isActive ? 3 : 1}
                  filter={isActive ? 'url(#glow)' : undefined}
                />
                
                {/* Leader symbol - centered and aligned with curve */}
                <text
                  x={textX}
                  y={textY - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={leader.color}
                  fontSize={size * 0.02}
                  fontWeight="bold"
                  transform={`rotate(${midAngle * 180 / Math.PI + 90}, ${textX}, ${textY})`}
                >
                  {leader.image === 'Lion' ? '🦁' : leader.image === 'Man' ? '👤' : leader.image === 'Ox' ? '🐂' : '🦅'}
                </text>
                
                {/* Leader name - centered and aligned with curve */}
                <text
                  x={textX}
                  y={textY + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isActive ? '#fff' : leader.color}
                  fontSize={size * 0.015}
                  fontWeight={isActive ? 'bold' : 'normal'}
                  transform={`rotate(${midAngle * 180 / Math.PI + 90}, ${textX}, ${textY})`}
                >
                  {leader.name}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* ====== CIRCLE 3: MONTH DAYS (1-31 in 4 sections) ====== */}
        <g>
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={(radii.monthDaysOuter + radii.monthDaysInner) / 2}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth={radii.monthDaysOuter - radii.monthDaysInner}
          />
          
          {/* Day numbers around the ring */}
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            const angle = (i / 31) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const textRadius = (radii.monthDaysOuter + radii.monthDaysInner) / 2;
            const x = center + Math.cos(rad) * textRadius;
            const y = center + Math.sin(rad) * textRadius;
            const isCurrentDay = day === dayOfMonth;
            
            return (
              <g key={i}>
                {/* Day box */}
                <rect
                  x={x - 10}
                  y={y - 8}
                  width={20}
                  height={16}
                  fill={isCurrentDay ? '#ef4444' : '#1f2937'}
                  stroke={isCurrentDay ? '#fbbf24' : '#4b5563'}
                  strokeWidth={1}
                  rx={2}
                />
                
                {/* Day number */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isCurrentDay ? '#fff' : '#9ca3af'}
                  fontSize={size * 0.012}
                  fontWeight={isCurrentDay ? 'bold' : 'normal'}
                >
                  {day}
                </text>
              </g>
            );
          })}
        </g>

        {/* ====== CIRCLE 4: 52 WEEKS (364 dots) ====== */}
        <motion.g
          animate={{ rotate: weeksRotation }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={(radii.weeksOuter + radii.weeksInner) / 2}
            fill="none"
            stroke="#111827"
            strokeWidth={radii.weeksOuter - radii.weeksInner}
          />
          
          {/* 364 dots */}
          {weekDots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.isCurrentDay ? 4 : dot.isSabbath ? 3 : 1.5}
              fill={dot.isCurrentDay ? '#ef4444' : dot.isSabbath ? '#fbbf24' : '#6b7280'}
              filter={dot.isCurrentDay ? 'url(#glow)' : undefined}
            />
          ))}
          
          {/* Week markers every 7 days */}
          {Array.from({ length: 52 }, (_, i) => {
            const angle = ((i * 7) / 364) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const isCurrentWeek = i + 1 === weekOfYear;
            
            return (
              <text
                key={i}
                x={center + Math.cos(rad) * radii.weeksOuter * 0.95}
                y={center + Math.sin(rad) * radii.weeksOuter * 0.95}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isCurrentWeek ? '#fbbf24' : '#4b5563'}
                fontSize={size * 0.008}
                fontWeight={isCurrentWeek ? 'bold' : 'normal'}
              >
                {i + 1}
              </text>
            );
          })}
        </motion.g>

        {/* ====== CIRCLE 5: 7 DAYS OF WEEK ====== */}
        <motion.g
          animate={{ rotate: daysRotation }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={(radii.daysOuter + radii.daysInner) / 2}
            fill="none"
            stroke="#0f172a"
            strokeWidth={radii.daysOuter - radii.daysInner}
          />
          
          {/* 7 day segments */}
          {['1', '2', '3', '4', '5', '6', 'שבת'].map((day, i) => {
            const dayNumber = i + 1;
            const startAngle = (i * (360 / 7) - 90) * (Math.PI / 180);
            const midAngle = ((i + 0.5) * (360 / 7) - 90) * (Math.PI / 180);
            const textRadius = (radii.daysOuter + radii.daysInner) / 2;
            const x = center + Math.cos(midAngle) * textRadius;
            const y = center + Math.sin(midAngle) * textRadius;
            const isCurrentDay = dayNumber === dayOfWeek;
            // Shabbat (day 7) should only be yellow when it's the current day
            const isSabbath = dayNumber === 7 && dayOfWeek === 7;
            
            // Calculate text rotation to align with curve
            const textRotation = (midAngle * 180 / Math.PI) + 90;
            
            return (
              <g key={i}>
                {/* Day arc segment */}
                <path
                  d={`
                    M ${center + Math.cos(startAngle) * radii.daysOuter} ${center + Math.sin(startAngle) * radii.daysOuter}
                    A ${radii.daysOuter} ${radii.daysOuter} 0 0 1 ${center + Math.cos(startAngle + (Math.PI * 2 / 7)) * radii.daysOuter} ${center + Math.sin(startAngle + (Math.PI * 2 / 7)) * radii.daysOuter}
                  `}
                  fill="none"
                  stroke={isCurrentDay ? '#ef4444' : isSabbath ? '#fbbf24' : '#374151'}
                  strokeWidth={radii.daysOuter - radii.daysInner}
                  strokeLinecap="butt"
                />
                
                {/* Day label - properly centered and aligned with curve */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isCurrentDay ? '#fff' : isSabbath ? '#fbbf24' : '#9ca3af'}
                  fontSize={size * 0.02}
                  fontWeight={isCurrentDay || isSabbath ? 'bold' : 'normal'}
                  transform={`rotate(${textRotation}, ${x}, ${y})`}
                >
                  {day}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* ====== CIRCLE 6: 4 PARTS OF DAY ====== */}
        <motion.g
          animate={{ rotate: partsRotation }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {DAY_PARTS.map((part, i) => {
            const startAngle = (i * 90 - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * 90 - 90) * (Math.PI / 180);
            const midAngle = ((i * 90 + 45) - 90) * (Math.PI / 180);
            
            const x1 = center + Math.cos(startAngle) * radii.partsOuter;
            const y1 = center + Math.sin(startAngle) * radii.partsOuter;
            const x2 = center + Math.cos(endAngle) * radii.partsOuter;
            const y2 = center + Math.sin(endAngle) * radii.partsOuter;
            const x3 = center + Math.cos(endAngle) * radii.partsInner;
            const y3 = center + Math.sin(endAngle) * radii.partsInner;
            const x4 = center + Math.cos(startAngle) * radii.partsInner;
            const y4 = center + Math.sin(startAngle) * radii.partsInner;
            
            const textRadius = (radii.partsOuter + radii.partsInner) / 2;
            const textX = center + Math.cos(midAngle) * textRadius;
            const textY = center + Math.sin(midAngle) * textRadius;
            
            const isActive = i === currentDayPartIndex;
            
            // Colors for each part of day
            const partColors = ['#fbbf24', '#f97316', '#1e3a5f', '#60a5fa'];
            
            return (
              <g key={i}>
                <path
                  d={`
                    M ${x1} ${y1}
                    A ${radii.partsOuter} ${radii.partsOuter} 0 0 1 ${x2} ${y2}
                    L ${x3} ${y3}
                    A ${radii.partsInner} ${radii.partsInner} 0 0 0 ${x4} ${y4}
                    Z
                  `}
                  fill={isActive ? partColors[i] + '80' : partColors[i] + '30'}
                  stroke={partColors[i]}
                  strokeWidth={isActive ? 2 : 1}
                />
                
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isActive ? '#fff' : partColors[i]}
                  fontSize={size * 0.012}
                  fontWeight={isActive ? 'bold' : 'normal'}
                  transform={`rotate(${midAngle * 180 / Math.PI + 90}, ${textX}, ${textY})`}
                >
                  {part}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* Center hub */}
        <circle
          cx={center}
          cy={center}
          r={radii.partsInner - 5}
          fill="url(#goldGradient)"
          stroke="#d97706"
          strokeWidth={2}
        />
        
        {/* Center text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1a1a2e"
          fontSize={size * 0.02}
          fontWeight="bold"
        >
          יהוה
        </text>
      </svg>
    </div>
  );
};

// Main export that calculates current values
export const YHVHWheelCalendarLive: React.FC<{ size?: number }> = ({ size = 800 }) => {
  const [calendarData, setCalendarData] = React.useState({
    dayOfYear: 1,
    dayOfMonth: 1,
    month: 1,
    weekOfYear: 1,
    dayOfWeek: 1,
    partOfDay: 1,
  });

  React.useEffect(() => {
    const updateCalendar = () => {
      const now = new Date();
      const creatorDate = calculateCreatorDate(now);
      const creatorTime = getCreatorTime(now);
      
      // Calculate day of month from dayOfYear and month
      const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]; // 12 months
      let dayInMonth = creatorDate.dayOfYear || 1;
      let currentMonth = 1;
      for (let i = 0; i < 12; i++) {
        if (dayInMonth <= monthDays[i]) {
          currentMonth = i + 1;
          break;
        }
        dayInMonth -= monthDays[i];
      }
      
      setCalendarData({
        dayOfYear: creatorDate.dayOfYear || 1,
        dayOfMonth: dayInMonth,
        month: currentMonth,
        weekOfYear: Math.ceil((creatorDate.dayOfYear || 1) / 7),
        dayOfWeek: creatorDate.weekDay || 1,
        partOfDay: creatorTime?.part || 1,
      });
    };

    updateCalendar();
    const interval = setInterval(updateCalendar, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  return <YHVHWheelCalendar {...calendarData} size={size} />;
};

export default YHVHWheelCalendarLive;
