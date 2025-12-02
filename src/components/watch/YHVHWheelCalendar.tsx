import React, { useMemo, useState, useEffect } from 'react';
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
  customRadii?: Partial<{
    sunOuter: number;
    sunInner: number;
    leadersOuter: number;
    leadersInner: number;
    monthDaysOuter: number;
    monthDaysInner: number;
    weeksOuter: number;
    weeksInner: number;
    dayPartsOuter: number;
    dayPartsInner: number;
    daysOuter: number;
    daysInner: number;
    centerHub: number;
  }>;
  ringOffsets?: Partial<{
    sun: { x: number; y: number };
    leaders: { x: number; y: number };
    monthDays: { x: number; y: number };
    weeks: { x: number; y: number };
    dayParts: { x: number; y: number };
    days: { x: number; y: number };
    centerHub: { x: number; y: number };
  }>;
  textOverrides?: Record<string, string>;
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

// Calculate day and night parts based on Enoch calendar (day of year)
// Based on Book of Enoch: day/night lengths vary throughout the year
// Total: 18 parts per day (dayParts + nightParts = 18)
// Equinox: day = 9, night = 9
// Longest day: day = 12, night = 6
// Shortest day: day = 6, night = 12
const calculateDayNightParts = (dayOfYear: number): { dayParts: number; nightParts: number } => {
  // Creator year has 364 days
  // Use sinusoidal function to approximate the gradual change
  // Day 91 (end of first quarter) = longest day
  // Day 273 (end of third quarter) = shortest day
  // Day 182 (middle) = equinox
  
  const normalizedDay = ((dayOfYear - 91) / 182) * Math.PI * 2; // Normalize to 0-2π
  const variation = Math.sin(normalizedDay); // -1 to 1
  
  // Base: 9 parts each, variation: ±3 parts
  const dayParts = Math.round(9 + variation * 3);
  const nightParts = 18 - dayParts;
  
  return { dayParts, nightParts };
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
  customRadii,
  ringOffsets,
  textOverrides,
}) => {
  const center = size / 2;
  
  // Editor mode detection - passed via props or context
  // We'll use a simpler approach: check if textOverrides is provided (indicates editor mode)
  const isEditorMode = !!textOverrides;
  
  // Handler for text element clicks - will be set by editable wrapper
  const handleTextClick = (elementId: string, e: React.MouseEvent<SVGTextElement>) => {
    if (!isEditorMode) return;
    e.stopPropagation();
    // Dispatch custom event that editable wrapper can listen to
    window.dispatchEvent(new CustomEvent('visual-editor-select', { detail: { elementId } }));
  };
  const sunOffset = ringOffsets?.sun || { x: 0, y: 0 };
  const leadersOffset = ringOffsets?.leaders || { x: 0, y: 0 };
  const monthDaysOffset = ringOffsets?.monthDays || { x: 0, y: 0 };
  const weeksOffset = ringOffsets?.weeks || { x: 0, y: 0 };
  const dayPartsOffset = ringOffsets?.dayParts || { x: 0, y: 0 };
  const daysOffset = ringOffsets?.days || { x: 0, y: 0 };
  const centerHubOffset = ringOffsets?.centerHub || { x: 0, y: 0 };
  
  // Calculate radii for each wheel (outer to inner)
  const baseRadii = {
    sunOuter: size * 0.48,
    sunInner: size * 0.44,
    leadersOuter: size * 0.43,
    leadersInner: size * 0.36,
    monthDaysOuter: size * 0.35,
    monthDaysInner: size * 0.28,
    weeksOuter: size * 0.27, // Yellow wheel (364 dots)
    weeksInner: size * 0.22,
    dayPartsOuter: size * 0.21, // 18-part wheel (moved above 7-day week)
    dayPartsInner: size * 0.17,
    daysOuter: size * 0.16, // 7-day week (moved down)
    daysInner: size * 0.11,
    centerHub: size * 0.08, // Center hub
  };
  
  const radii = useMemo(() => ({
    ...baseRadii,
    ...customRadii,
  }), [size, customRadii]);

  // Current leader index (0-3)
  const currentLeaderIndex = getCurrentLeader(dayOfYear);
  
  // Calculate day/night parts for current day
  const { dayParts, nightParts } = calculateDayNightParts(dayOfYear);
  
  // Calculate smooth rotation for outer wheel based on day progress
  // Each day moves the wheel by 1/366th of a full rotation
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for smooth animation
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate progress through current day (0 to 1)
  // Using Creator time system: 18 parts × 80 minutes = 1440 minutes = 24 hours
  const creatorTime = getCreatorTime(currentTime);
  const progressThroughDay = ((creatorTime.part - 1) * 80 + (creatorTime.minute - 1)) / 1440; // 0 to 1
  
  // Rotation angles
  // Outer wheel: rotates based on dayOfYear + progress through current day
  // Each day = 360/366 degrees, so progress adds (360/366) * progressThroughDay
  const sunRotation = -((dayOfYear - 1 + progressThroughDay) / 366) * 360;
  const leaderRotation = -(currentLeaderIndex * 90);
  const weeksRotation = -(dayOfYear / 364) * 360;
  const daysRotation = -((dayOfWeek - 1) / 7) * 360;
  const dayPartsRotation = -((partOfDay - 1) / 18) * 360;

  // Generate 366 tick marks for sun circle
  const sunTicks = useMemo(() => {
    // Calculate weekday for each day
    // Starting weekday for Year 6028 Month 1 Day 1 = Day 4 (from dashboardCalendar.ts)
    const STARTING_WEEKDAY_YEAR_6028 = 4;
    
    // Month structure: [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31] = 364 days
    const daysPerMonth = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
    
    // Calculate first day of each month
    const firstDaysOfMonths: number[] = [];
    let cumulativeDays = 0;
    for (let m = 0; m < 12; m++) {
      firstDaysOfMonths.push(cumulativeDays + 1);
      cumulativeDays += daysPerMonth[m];
    }
    
    return Array.from({ length: 366 }, (_, i) => {
      const dayNumber = i + 1;
      const angle = (i / 366) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const isCurrentDay = dayNumber === dayOfYear;
      
      // Calculate weekday for this day (1-7, where 7 is Shabbat)
      // Day 1 of year = Day 4 of week, so we need to calculate from day of year
      const weekday = ((dayNumber - 1 + STARTING_WEEKDAY_YEAR_6028 - 1) % 7) + 1;
      
      // Calculate which month and day of month this is
      let month = 1;
      let dayInMonth = dayNumber;
      for (let m = 0; m < 12; m++) {
        if (dayInMonth <= daysPerMonth[m]) {
          month = m + 1;
          break;
        }
        dayInMonth -= daysPerMonth[m];
      }
      
      // Identify special days
      const isFirstDayOfMonth = firstDaysOfMonths.includes(dayNumber);
      const isShabbat = weekday === 7; // Yellow - Shabbat
      
      // Calculate which Sabbath number this is (if it's a Sabbath)
      // Day 1 = weekday 4, so Day 4 = weekday 7 (1st Sabbath)
      // 52nd Sabbath = 4 + (52-1)*7 = 4 + 357 = 361
      // Verify: Day 361 weekday = ((361-1+4-1)%7)+1 = (363%7)+1 = 6+1 = 7 ✓ (Sabbath)
      // So Day 361 is the 52nd Sabbath, and Days 362-363 are the two days after it (Days Out of Time)
      const isDaysOutOfTime = dayNumber === 362 || dayNumber === 363; // Dark purple - Days out of time (doot) after 52nd Sabbath
      const isIntercalaryDay = dayNumber === 366; // Pink - Intercalary day (Day 366 only, Day 365 is default color)
      const isTequvah = dayNumber === 1; // Day 1 of year = Day 4 of week = Tequvah (equinox) - White
      
      // Month 1 specific feast days
      const isMonth1FeastDay = month === 1 && (
        dayInMonth === 10 || // Day 10: Pick the lamb
        dayInMonth === 14 || // Day 14: Slaughter the lamb (evening)
        (dayInMonth >= 15 && dayInMonth <= 21) // Days 15-21: Feast of Unleavened Bread
      );
      
      // Month 2 specific feast days (darker blue for Unleavened Bread)
      const isMonth2FeastDay = month === 2 && (
        dayInMonth === 10 || // Day 10: Pick lamb (for those who missed Month 1)
        dayInMonth === 14 || // Day 14: Pesach
        (dayInMonth >= 15 && dayInMonth <= 21) // Days 15-21: Unleavened Bread (darker blue)
      );
      const isMonth2UnleavenedBread = month === 2 && (dayInMonth >= 15 && dayInMonth <= 21);
      
      // Month 3 specific feast days
      const isMonth3FeastDay = month === 3 && dayInMonth === 15; // Day 15: Shavuot
      const isMonth3Day31 = month === 3 && dayInMonth === 31; // Day 31: Special intercalary-like day
      
      // Month 5 specific feast days
      const isMonth5FeastDay = month === 5 && dayInMonth === 3; // Day 3: Feast of New Wine
      
      // Month 6 specific feast days
      const isMonth6FeastDay = month === 6 && dayInMonth === 22; // Day 22: Feast of New Oil
      const isMonth6WoodGathering = month === 6 && (dayInMonth >= 23 && dayInMonth <= 27); // Days 23-27: Wood Gathering Days
      const isMonth6Day31 = month === 6 && dayInMonth === 31; // Day 31: Intercalary day
      
      // Month 7 specific feast days
      const isMonth7FeastDay = month === 7 && (
        dayInMonth === 1 || // Day 1: Yowm Teruah
        (dayInMonth >= 9 && dayInMonth <= 10) || // Days 9-10: Yowm Kippur (evening to evening)
        (dayInMonth >= 15 && dayInMonth <= 22) // Days 15-22: Sukkot
      );
      
      // General feast days (1st and 15th of other months)
      const isGeneralFeastDay = month !== 1 && month !== 2 && month !== 3 && month !== 5 && month !== 6 && month !== 7 && (dayInMonth === 1 || dayInMonth === 15);
      
      // Combine feast days (but Shabbat overrides)
      const isFeastDay = isMonth1FeastDay || isMonth2FeastDay || isMonth3FeastDay || isMonth5FeastDay || isMonth6FeastDay || isMonth7FeastDay || isGeneralFeastDay;
      
      return {
        x1: center + Math.cos(rad) * radii.sunInner,
        y1: center + Math.sin(rad) * radii.sunInner,
        x2: center + Math.cos(rad) * radii.sunOuter,
        y2: center + Math.sin(rad) * radii.sunOuter,
        isCurrentDay,
        isFirstDayOfMonth,
        isShabbat,
        isTequvah,
        isDaysOutOfTime,
        isFeastDay,
        isMonth2UnleavenedBread,
        isMonth3Day31,
        isMonth6WoodGathering,
        isMonth6Day31,
        isIntercalaryDay,
        weekday,
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
    <div className="flex items-center justify-center w-full relative">
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
        <g transform={`translate(${sunOffset.x}, ${sunOffset.y})`}>
          <motion.g
            animate={{ rotate: sunRotation }}
            transition={{ duration: 1, ease: 'linear' }}
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
          {sunTicks.map((tick, i) => {
            // Determine stroke color based on day type (priority order matters)
            // Day 4 of week (weekday === 4) should be gray by default, blue if feast day, never yellow
            let strokeColor = '#4b5563'; // Default gray
            let strokeWidth = 1;
            let filter = undefined;
            
            if (tick.isCurrentDay) {
              strokeColor = '#ef4444'; // Red for current day
              strokeWidth = 3;
              filter = 'url(#glow)';
            } else if (tick.isTequvah) {
              strokeColor = '#ffffff'; // White for Tequvah (Day 1 of year = Day 4 of week = equinox)
              strokeWidth = 2;
            } else if (tick.isDaysOutOfTime) {
              strokeColor = '#6b21a8'; // Dark purple for days out of time (doot) - days 365, 366
              strokeWidth = 2;
            } else if (tick.isIntercalaryDay) {
              strokeColor = '#ec4899'; // Pink for intercalary days (no longer used for 365-366)
              strokeWidth = 2;
            } else if (tick.isMonth3Day31 || tick.isMonth6Day31) {
              strokeColor = '#ec4899'; // Pink for Month 3 Day 31 and Month 6 Day 31 (intercalary days)
              strokeWidth = 2;
            } else if (tick.isShabbat) {
              // Only Shabbat (weekday === 7) gets yellow, not day 4 of week
              strokeColor = '#fbbf24'; // Yellow for Shabbat (day 7) - overrides other colors
              strokeWidth = 2;
            } else if (tick.isFirstDayOfMonth) {
              strokeColor = '#86efac'; // Light green for first day of month
              strokeWidth = 2;
            } else if (tick.isMonth6WoodGathering) {
              strokeColor = '#92400e'; // Brown for Month 6 Wood Gathering Days (days 23-27)
              strokeWidth = 2;
            } else if (tick.isMonth2UnleavenedBread) {
              strokeColor = '#3b82f6'; // Darker blue for Month 2 Unleavened Bread (days 15-21)
              strokeWidth = 2;
            } else if (tick.isFeastDay) {
              // Feast days get blue (including day 4 of week if it's a feast day)
              strokeColor = '#93c5fd'; // Light blue for feast days
              strokeWidth = 2;
            }
            // Day 4 of week (weekday === 4) that is not a feast day or Tequvah will remain gray (default)
            
            return (
              <line
                key={i}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={filter}
              />
            );
          })}
          </motion.g>
        </g>

        {/* ====== CIRCLE 2: LEADERS CIRCLE (4 quadrants) ====== */}
        <g transform={`translate(${leadersOffset.x}, ${leadersOffset.y})`}>
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
                  onClick={(e) => handleTextClick(`leader-name-${i}`, e)}
                  style={{ cursor: isEditorMode ? 'pointer' : 'default' }}
                >
                  {textOverrides?.[`leader-name-${i}`] ?? leader.name}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* ====== CIRCLE 3: MONTH DAYS (1-31 in 4 sections) ====== */}
        <g transform={`translate(${monthDaysOffset.x}, ${monthDaysOffset.y})`}>
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
        <g transform={`translate(${weeksOffset.x}, ${weeksOffset.y})`}>
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
        </g>

        {/* ====== CIRCLE 5: 18 PARTS OF DAY (above 7-day week) ====== */}
        <g transform={`translate(${dayPartsOffset.x}, ${dayPartsOffset.y})`}>
          <motion.g
            animate={{ rotate: dayPartsRotation }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          >
          {Array.from({ length: 18 }, (_, i) => {
            const partNumber = i + 1;
            const startAngle = (i * (360 / 18) - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * (360 / 18) - 90) * (Math.PI / 180);
            const midAngle = ((i + 0.5) * (360 / 18) - 90) * (Math.PI / 180);
            
            const x1 = center + Math.cos(startAngle) * radii.dayPartsOuter;
            const y1 = center + Math.sin(startAngle) * radii.dayPartsOuter;
            const x2 = center + Math.cos(endAngle) * radii.dayPartsOuter;
            const y2 = center + Math.sin(endAngle) * radii.dayPartsOuter;
            const x3 = center + Math.cos(endAngle) * radii.dayPartsInner;
            const y3 = center + Math.sin(endAngle) * radii.dayPartsInner;
            const x4 = center + Math.cos(startAngle) * radii.dayPartsInner;
            const y4 = center + Math.sin(startAngle) * radii.dayPartsInner;
            
            const isActive = partNumber === partOfDay;
            
            // Determine color based on which part of day (Day, Evening, Night, Morning)
            let partColor = '#9ca3af';
            if (partNumber <= dayParts) {
              partColor = '#fbbf24'; // Day - golden
            } else if (partNumber <= dayParts + 1) {
              partColor = '#f97316'; // Evening - orange
            } else if (partNumber <= dayParts + 1 + nightParts) {
              partColor = '#1e3a5f'; // Night - dark blue
            } else {
              partColor = '#60a5fa'; // Morning - light blue
            }
            
            return (
              <g key={i}>
                <path
                  d={`
                    M ${x1} ${y1}
                    A ${radii.dayPartsOuter} ${radii.dayPartsOuter} 0 0 1 ${x2} ${y2}
                    L ${x3} ${y3}
                    A ${radii.dayPartsInner} ${radii.dayPartsInner} 0 0 0 ${x4} ${y4}
                    Z
                  `}
                  fill={isActive ? partColor + 'CC' : partColor + '40'}
                  stroke={partColor}
                  strokeWidth={isActive ? 2 : 1}
                />
                
                {/* Show part number for active part or every 3rd part */}
                {(isActive || partNumber % 3 === 0) && (
                  <text
                    x={center + Math.cos(midAngle) * ((radii.dayPartsOuter + radii.dayPartsInner) / 2)}
                    y={center + Math.sin(midAngle) * ((radii.dayPartsOuter + radii.dayPartsInner) / 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isActive ? '#fff' : partColor}
                    fontSize={size * 0.01}
                    fontWeight={isActive ? 'bold' : 'normal'}
                    transform={`rotate(${midAngle * 180 / Math.PI + 90}, ${center + Math.cos(midAngle) * ((radii.dayPartsOuter + radii.dayPartsInner) / 2)}, ${center + Math.sin(midAngle) * ((radii.dayPartsOuter + radii.dayPartsInner) / 2)})`}
                  >
                    {partNumber}
                  </text>
                )}
              </g>
            );
          })}
        </motion.g>

        {/* ====== CIRCLE 6: 7 DAYS OF WEEK (moved down) ====== */}
        <g transform={`translate(${daysOffset.x}, ${daysOffset.y})`}>
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
          
          {/* 7 day segments with 4 sections each (Day, Evening, Night, Morning) */}
          {['1', '2', '3', '4', '5', '6', 'שבת'].map((day, i) => {
            const dayNumber = i + 1;
            const daySegmentAngle = (360 / 7) * (Math.PI / 180);
            const startAngle = (i * (360 / 7) - 90) * (Math.PI / 180);
            const isCurrentDay = dayNumber === dayOfWeek;
            const isSabbath = dayNumber === 7 && dayOfWeek === 7;
            
            // Calculate proportions for the 4 sections based on day/night parts
            // Day: dayParts, Evening: 1 part, Night: nightParts, Morning: 1 part
            // Total: dayParts + 1 + nightParts + 1 = 18 + 2 = 20 (we'll normalize to 18)
            const eveningParts = 1;
            const morningParts = 1;
            const totalParts = dayParts + eveningParts + nightParts + morningParts;
            
            // Normalize to fit within the day segment
            const dayProportion = dayParts / totalParts;
            const eveningProportion = eveningParts / totalParts;
            const nightProportion = nightParts / totalParts;
            const morningProportion = morningParts / totalParts;
            
            // Calculate section angles
            const dayAngle = daySegmentAngle * dayProportion;
            const eveningAngle = daySegmentAngle * eveningProportion;
            const nightAngle = daySegmentAngle * nightProportion;
            const morningAngle = daySegmentAngle * morningProportion;
            
            // Calculate cumulative angles for each section
            const dayStartAngle = startAngle;
            const dayEndAngle = startAngle + dayAngle;
            const eveningStartAngle = dayEndAngle;
            const eveningEndAngle = eveningStartAngle + eveningAngle;
            const nightStartAngle = eveningEndAngle;
            const nightEndAngle = nightStartAngle + nightAngle;
            const morningStartAngle = nightEndAngle;
            const morningEndAngle = morningStartAngle + morningAngle;
            
            // Section colors
            const dayColor = '#fbbf24'; // Golden/yellow for day
            const eveningColor = '#f97316'; // Orange for evening
            const nightColor = '#1e3a5f'; // Dark blue for night
            const morningColor = '#60a5fa'; // Light blue for morning
            
            return (
              <g key={i}>
                {/* Pie slice lines extending from 7-day week to yellow wheel (weeks circle) */}
                <line
                  x1={center + Math.cos(startAngle) * radii.daysOuter}
                  y1={center + Math.sin(startAngle) * radii.daysOuter}
                  x2={center + Math.cos(startAngle) * radii.weeksOuter}
                  y2={center + Math.sin(startAngle) * radii.weeksOuter}
                  stroke={isCurrentDay ? '#ef4444' : isSabbath ? '#fbbf24' : '#374151'}
                  strokeWidth={1}
                  opacity={0.3}
                />
                {/* Additional line at end of day segment */}
                <line
                  x1={center + Math.cos(startAngle + daySegmentAngle) * radii.daysOuter}
                  y1={center + Math.sin(startAngle + daySegmentAngle) * radii.daysOuter}
                  x2={center + Math.cos(startAngle + daySegmentAngle) * radii.weeksOuter}
                  y2={center + Math.sin(startAngle + daySegmentAngle) * radii.weeksOuter}
                  stroke={isCurrentDay ? '#ef4444' : isSabbath ? '#fbbf24' : '#374151'}
                  strokeWidth={1}
                  opacity={0.3}
                />
                
                {/* Day section */}
                <path
                  d={`
                    M ${center + Math.cos(dayStartAngle) * radii.daysOuter} ${center + Math.sin(dayStartAngle) * radii.daysOuter}
                    A ${radii.daysOuter} ${radii.daysOuter} 0 ${dayAngle > Math.PI ? 1 : 0} 1 ${center + Math.cos(dayEndAngle) * radii.daysOuter} ${center + Math.sin(dayEndAngle) * radii.daysOuter}
                    L ${center + Math.cos(dayEndAngle) * radii.daysInner} ${center + Math.sin(dayEndAngle) * radii.daysInner}
                    A ${radii.daysInner} ${radii.daysInner} 0 ${dayAngle > Math.PI ? 1 : 0} 0 ${center + Math.cos(dayStartAngle) * radii.daysInner} ${center + Math.sin(dayStartAngle) * radii.daysInner}
                    Z
                  `}
                  fill={dayColor}
                  fillOpacity={isCurrentDay ? 0.8 : 0.4}
                  stroke={dayColor}
                  strokeWidth={isCurrentDay ? 2 : 1}
                />
                {(() => {
                  const sectionMidAngle = dayStartAngle + dayAngle / 2;
                  const labelRadius = (radii.daysOuter + radii.daysInner) / 2;
                  const labelX = center + Math.cos(sectionMidAngle) * labelRadius;
                  const labelY = center + Math.sin(sectionMidAngle) * labelRadius;
                  return (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isCurrentDay ? '#fff' : '#9ca3af'}
                      fontSize={size * 0.012}
                      fontWeight={isCurrentDay ? 'bold' : 'normal'}
                      transform={`rotate(${sectionMidAngle * 180 / Math.PI + 90}, ${labelX}, ${labelY})`}
                      onClick={(e) => handleTextClick(`day-part-day-${i}`, e)}
                      style={{ cursor: isEditorMode ? 'pointer' : 'default' }}
                    >
                      {textOverrides?.[`day-part-day-${i}`] ?? 'Day'}
                    </text>
                  );
                })()}
                
                {/* Evening section */}
                <path
                  d={`
                    M ${center + Math.cos(eveningStartAngle) * radii.daysOuter} ${center + Math.sin(eveningStartAngle) * radii.daysOuter}
                    A ${radii.daysOuter} ${radii.daysOuter} 0 ${eveningAngle > Math.PI ? 1 : 0} 1 ${center + Math.cos(eveningEndAngle) * radii.daysOuter} ${center + Math.sin(eveningEndAngle) * radii.daysOuter}
                    L ${center + Math.cos(eveningEndAngle) * radii.daysInner} ${center + Math.sin(eveningEndAngle) * radii.daysInner}
                    A ${radii.daysInner} ${radii.daysInner} 0 ${eveningAngle > Math.PI ? 1 : 0} 0 ${center + Math.cos(eveningStartAngle) * radii.daysInner} ${center + Math.sin(eveningStartAngle) * radii.daysInner}
                    Z
                  `}
                  fill={eveningColor}
                  fillOpacity={isCurrentDay ? 0.8 : 0.4}
                  stroke={eveningColor}
                  strokeWidth={isCurrentDay ? 2 : 1}
                />
                
                {/* Night section */}
                <path
                  d={`
                    M ${center + Math.cos(nightStartAngle) * radii.daysOuter} ${center + Math.sin(nightStartAngle) * radii.daysOuter}
                    A ${radii.daysOuter} ${radii.daysOuter} 0 ${nightAngle > Math.PI ? 1 : 0} 1 ${center + Math.cos(nightEndAngle) * radii.daysOuter} ${center + Math.sin(nightEndAngle) * radii.daysOuter}
                    L ${center + Math.cos(nightEndAngle) * radii.daysInner} ${center + Math.sin(nightEndAngle) * radii.daysInner}
                    A ${radii.daysInner} ${radii.daysInner} 0 ${nightAngle > Math.PI ? 1 : 0} 0 ${center + Math.cos(nightStartAngle) * radii.daysInner} ${center + Math.sin(nightStartAngle) * radii.daysInner}
                    Z
                  `}
                  fill={nightColor}
                  fillOpacity={isCurrentDay ? 0.8 : 0.4}
                  stroke={nightColor}
                  strokeWidth={isCurrentDay ? 2 : 1}
                />
                {(() => {
                  const sectionMidAngle = nightStartAngle + nightAngle / 2;
                  const labelRadius = (radii.daysOuter + radii.daysInner) / 2;
                  const labelX = center + Math.cos(sectionMidAngle) * labelRadius;
                  const labelY = center + Math.sin(sectionMidAngle) * labelRadius;
                  return (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isCurrentDay ? '#fff' : '#9ca3af'}
                      fontSize={size * 0.012}
                      fontWeight={isCurrentDay ? 'bold' : 'normal'}
                      transform={`rotate(${sectionMidAngle * 180 / Math.PI + 90}, ${labelX}, ${labelY})`}
                      onClick={(e) => handleTextClick(`day-part-night-${i}`, e)}
                      style={{ cursor: isEditorMode ? 'pointer' : 'default' }}
                    >
                      {textOverrides?.[`day-part-night-${i}`] ?? 'Night'}
                    </text>
                  );
                })()}
                
                {/* Morning section */}
                <path
                  d={`
                    M ${center + Math.cos(morningStartAngle) * radii.daysOuter} ${center + Math.sin(morningStartAngle) * radii.daysOuter}
                    A ${radii.daysOuter} ${radii.daysOuter} 0 ${morningAngle > Math.PI ? 1 : 0} 1 ${center + Math.cos(morningEndAngle) * radii.daysOuter} ${center + Math.sin(morningEndAngle) * radii.daysOuter}
                    L ${center + Math.cos(morningEndAngle) * radii.daysInner} ${center + Math.sin(morningEndAngle) * radii.daysInner}
                    A ${radii.daysInner} ${radii.daysInner} 0 ${morningAngle > Math.PI ? 1 : 0} 0 ${center + Math.cos(morningStartAngle) * radii.daysInner} ${center + Math.sin(morningStartAngle) * radii.daysInner}
                    Z
                  `}
                  fill={morningColor}
                  fillOpacity={isCurrentDay ? 0.8 : 0.4}
                  stroke={morningColor}
                  strokeWidth={isCurrentDay ? 2 : 1}
                />
                {(() => {
                  const sectionMidAngle = morningStartAngle + morningAngle / 2;
                  const labelRadius = (radii.daysOuter + radii.daysInner) / 2;
                  const labelX = center + Math.cos(sectionMidAngle) * labelRadius;
                  const labelY = center + Math.sin(sectionMidAngle) * labelRadius;
                  return (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isCurrentDay ? '#fff' : '#9ca3af'}
                      fontSize={size * 0.012}
                      fontWeight={isCurrentDay ? 'bold' : 'normal'}
                      transform={`rotate(${sectionMidAngle * 180 / Math.PI + 90}, ${labelX}, ${labelY})`}
                      onClick={(e) => handleTextClick(`day-part-morning-${i}`, e)}
                      style={{ cursor: isEditorMode ? 'pointer' : 'default' }}
                    >
                      {textOverrides?.[`day-part-morning-${i}`] ?? 'Morning'}
                    </text>
                  );
                })()}
                
                {/* Day number label - centered in the day segment */}
                {(() => {
                  const daySegmentMidAngle = startAngle + daySegmentAngle / 2;
                  const textRadius = (radii.daysOuter + radii.daysInner) / 2;
                  const x = center + Math.cos(daySegmentMidAngle) * textRadius;
                  const y = center + Math.sin(daySegmentMidAngle) * textRadius;
                  const textRotation = (daySegmentMidAngle * 180 / Math.PI) + 90;
                  
                  return dayNumber === 7 ? (
                    // Shabbat: Show both Hebrew and English
                    <g transform={`rotate(${textRotation}, ${x}, ${y})`}>
                      <text
                        x={x}
                        y={y - size * 0.01}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isCurrentDay ? '#fff' : isSabbath ? '#fbbf24' : '#9ca3af'}
                        fontSize={size * 0.018}
                        fontWeight={isCurrentDay || isSabbath ? 'bold' : 'normal'}
                      >
                        שבת
                      </text>
                      <text
                        x={x}
                        y={y + size * 0.01}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isCurrentDay ? '#fff' : isSabbath ? '#fbbf24' : '#9ca3af'}
                        fontSize={size * 0.018}
                        fontWeight={isCurrentDay || isSabbath ? 'bold' : 'normal'}
                      >
                        Shabbat
                      </text>
                    </g>
                  ) : (
                    // Regular days: Show number centered
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isCurrentDay ? '#fff' : '#9ca3af'}
                      fontSize={size * 0.025}
                      fontWeight={isCurrentDay ? 'bold' : 'normal'}
                      transform={`rotate(${textRotation}, ${x}, ${y})`}
                    >
                      {day}
                    </text>
                  );
                })()}
              </g>
            );
          })}
          </motion.g>
        </g>

        {/* Center hub */}
        <g transform={`translate(${centerHubOffset.x}, ${centerHubOffset.y})`}>
          <circle
            cx={center}
            cy={center}
          r={radii.daysInner - 5}
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
            {textOverrides?.['center-text'] ?? 'יהוה'}
          </text>
        </g>

        {/* Small upside-down triangle at top, touching outer rim at 12 o'clock */}
        {(() => {
          const topAngle = -90 * (Math.PI / 180); // Top of wheel (12 o'clock)
          const triangleBaseWidth = size * 0.015; // Small triangle base width
          const triangleHeight = size * 0.02; // Triangle height
          
          // Triangle point touches the outer rim at 12 o'clock
          const trianglePointX = center + Math.cos(topAngle) * radii.sunOuter;
          const trianglePointY = center + Math.sin(topAngle) * radii.sunOuter;
          
          // Triangle base is above the point (outside the wheel)
          const triangleBaseY = trianglePointY - triangleHeight;
          const triangleBaseLeftX = trianglePointX - triangleBaseWidth / 2;
          const triangleBaseRightX = trianglePointX + triangleBaseWidth / 2;
          
          // Current day position on sun circle
          // Account for the rotation of the sun circle: the tick mark is at a fixed position
          // on the rotating circle, so we need to add the rotation to get the fixed position
          const currentDayAngle = ((dayOfYear - 1) / 366) * 360 - 90 + sunRotation;
          const currentDayRad = (currentDayAngle * Math.PI) / 180;
          const currentDayX = center + Math.cos(currentDayRad) * radii.sunOuter;
          const currentDayY = center + Math.sin(currentDayRad) * radii.sunOuter;
          
          return (
            <g>
              {/* Small upside-down triangle - base at top, point touching wheel rim */}
              <polygon
                points={`${triangleBaseLeftX},${triangleBaseY} ${triangleBaseRightX},${triangleBaseY} ${trianglePointX},${trianglePointY}`}
                fill="#fbbf24"
                stroke="#d97706"
                strokeWidth={1}
                opacity={0.9}
              />
              
              {/* Day number label above triangle base */}
              <text
                x={trianglePointX}
                y={triangleBaseY - size * 0.01}
                textAnchor="middle"
                dominantBaseline="bottom"
                fill="#fbbf24"
                fontSize={size * 0.012}
                fontWeight="bold"
              >
                Day {dayOfYear}
              </text>
              
              {/* Line from triangle point down to current day position */}
              <line
                x1={trianglePointX}
                y1={trianglePointY}
                x2={currentDayX}
                y2={currentDayY}
                stroke="#fbbf24"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.5}
              />
              
              {/* Current day indicator dot */}
              <circle
                cx={currentDayX}
                cy={currentDayY}
                r={size * 0.006}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={1}
              />
            </g>
          );
        })()}
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

  // Use editable version if editor mode is available
  try {
    // Dynamically import to avoid circular dependencies
    const { useVisualEditor } = require('@/contexts/VisualEditorContext');
    const { isEditorMode } = useVisualEditor();
    if (isEditorMode) {
      const { YHVHWheelCalendarEditable } = require('./YHVHWheelCalendarEditable');
      return <YHVHWheelCalendarEditable {...calendarData} size={size} />;
    }
  } catch (e) {
    // Editor context not available, use regular version
  }
  
  return <YHVHWheelCalendar {...calendarData} size={size} />;
};

export default YHVHWheelCalendarLive;
