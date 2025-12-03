'use client';
// Wheels in Itself - Stationary tooltips, day starts at sunrise
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SEASONAL_LEADERS,
  MONTHLY_LEADERS,
  INFINITY_LEADER,
  COLORS,
  MONTH_DAYS,
  PARTS_OF_DAY,
  EIGHTEEN_PARTS,
  getDayType,
  getDayColor,
  getFeastName,
  getDayOfYear,
  getMonthAndDay,
  getWeekdayName,
  getMansCount,
  getCurrentSeason,
  getCurrentWeek,
  getLunarDay,
  get18PartOfDay,
  get4PartOfDay,
  calculate4PartAngles,
  getSeasonalSunTimes,
} from '@/utils/wheelsInItselfData';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RemnantsWheelCalendarProps {
  size?: number;
}

// SVG helper functions
const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const describeWedge = (cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) => {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  
  return `
    M ${outerStart.x} ${outerStart.y}
    A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}
    L ${innerEnd.x} ${innerEnd.y}
    A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}
    Z
  `;
};

export function RemnantsWheelCalendar({ size = 900 }: RemnantsWheelCalendarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredElement, setHoveredElement] = useState<{ type: string; data: any } | null>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate current calendar values
  const calendarData = useMemo(() => {
    const creatorDate = calculateCreatorDate(currentTime);
    const dayOfYear = creatorDate.dayOfYear;
    const month = creatorDate.month;
    const dayOfMonth = creatorDate.day;
    const weekDay = creatorDate.weekDay;
    const year = creatorDate.year;
    const week = getCurrentWeek(dayOfYear);
    const season = getCurrentSeason(dayOfYear);
    const lunarDay = getLunarDay(dayOfYear, year);
    const part18 = get18PartOfDay(currentTime.getHours(), currentTime.getMinutes());
    const part4 = get4PartOfDay(currentTime.getHours(), currentTime.getMinutes());
    const mansCount = getMansCount(dayOfYear);
    const dayType = getDayType(month, dayOfMonth);
    const feastName = getFeastName(month, dayOfMonth);
    
    // Get seasonal sun times for variable 4-part day
    const sunTimes = getSeasonalSunTimes(dayOfYear);
    const part4Angles = calculate4PartAngles(sunTimes.sunrise, sunTimes.sunset, sunTimes.solarNoon);

    return {
      dayOfYear,
      month,
      dayOfMonth,
      weekDay,
      year,
      week,
      season,
      lunarDay,
      part18,
      part4,
      mansCount,
      dayType,
      feastName,
      part4Angles,
      sunTimes,
    };
  }, [currentTime]);

  // SVG dimensions
  const cx = size / 2;
  const cy = size / 2;
  const padding = 20;

  // NEW Wheel radii (outside to inside) - REORGANIZED
  // Outer: Man's Count, Month Days, Moon Days (number-heavy wheels)
  // Inner: 52 Weeks, 12 Monthly Leaders, 4 Seasonal Leaders, 18 Parts, 4 Parts
  const radii = {
    outerText: size / 2 - padding,
    // Wheel 1: Man's Count (OUTERMOST) - wider for number visibility
    wheel1Outer: size / 2 - padding - 25,
    wheel1Inner: size / 2 - padding - 60,
    // Wheel 2: Month Days
    wheel2Outer: size / 2 - padding - 65,
    wheel2Inner: size / 2 - padding - 100,
    // Wheel 3: Moon Days (354)
    wheel3Outer: size / 2 - padding - 105,
    wheel3Inner: size / 2 - padding - 140,
    // Wheel 4: 52 Weeks with numbers
    wheel4Outer: size / 2 - padding - 145,
    wheel4Inner: size / 2 - padding - 180,
    // Wheel 5: 12 Monthly Leaders
    wheel5Outer: size / 2 - padding - 185,
    wheel5Inner: size / 2 - padding - 225,
    // Wheel 6: 4 Seasonal Leaders
    wheel6Outer: size / 2 - padding - 230,
    wheel6Inner: size / 2 - padding - 280,
    // Wheel 7: 18 Parts of Day
    wheel7Outer: size / 2 - padding - 285,
    wheel7Inner: size / 2 - padding - 315,
    // Wheel 8: 4 Parts of Day (VARIABLE SIZE)
    wheel8Outer: size / 2 - padding - 320,
    wheel8Inner: size / 2 - padding - 355,
    center: size / 2 - padding - 360,
  };

  // Rotation calculations (all wheels rotate to show current position at top)
  const rotations = {
    wheel1: -((calendarData.dayOfYear - 1) / 364) * 360, // Man's Count
    wheel2: -((calendarData.dayOfYear - 1) / 364) * 360, // Month Days
    wheel3: -((calendarData.lunarDay - 1) / 354) * 360,  // Moon Days
    wheel4: -((calendarData.week - 1) / 52) * 360,       // 52 Weeks
    wheel5: -(calendarData.month - 1) * 30,              // 12 Monthly Leaders
    wheel6: -(calendarData.season - 1) * 90,             // 4 Seasonal Leaders
    wheel7: -(calendarData.part18 - 1) * 20,             // 18 Parts
    wheel8: 0, // 4 Parts - no rotation, variable sizing handles position
  };

  // Handle hover - STATIONARY TOOLTIP (no position tracking)
  const handleHover = useCallback((type: string, data: any) => {
    setHoveredElement({ type, data });
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoveredElement(null);
  }, []);

  // Render outer text (curved along the edge)
  const renderOuterText = () => {
    const text = "YHVH THE HIDDEN LIGHT WITHIN THE INFINITE DARKNESS THAT ALWAYS EXISTED";
    const textRadius = radii.outerText + 5;
    const pathId = "outerTextPath";
    
    return (
      <g>
        <defs>
          <path
            id={pathId}
            d={describeArc(cx, cy, textRadius, 0, 359.99)}
            fill="none"
          />
        </defs>
        <text
          fill={COLORS.OUTER_TEXT}
          fontSize="11"
          fontFamily="serif"
          letterSpacing="3"
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </g>
    );
  };

  // Render Wheel 1: Man's Count (1,2,3,4 then 1-360) - OUTERMOST
  const renderWheel1MansCount = () => {
    const allDays = Array.from({ length: 364 }, (_, i) => ({
      dayOfYear: i + 1,
      mansCount: getMansCount(i + 1),
    }));

    return (
      <motion.g
        animate={{ rotate: rotations.wheel1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {allDays.map(({ dayOfYear, mansCount }) => {
          const startAngle = ((dayOfYear - 1) / 364) * 360;
          const endAngle = (dayOfYear / 364) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const { month, day: dayOfMonth } = getMonthAndDay(dayOfYear);
          const dayType = getDayType(month, dayOfMonth);
          const color = getDayColor(dayType);
          const isCurrent = calendarData.dayOfYear === dayOfYear;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);

          // Show numbers more frequently for visibility
          const showNumber = mansCount <= 4 || mansCount % 10 === 0 || isCurrent;

          return (
            <g
              key={`mans-${dayOfYear}`}
              onMouseEnter={() => handleHover('mansCount', { dayOfYear, mansCount, dayType })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill={color}
                fillOpacity={isCurrent ? 1 : 0.6}
                stroke="hsl(220, 20%, 20%)"
                strokeWidth="0.2"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              {showNumber && (
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="6"
                  fontWeight={isCurrent ? 'bold' : 'normal'}
                >
                  {mansCount}
                </text>
              )}
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 2: Month Days (1-30, 1-30, 1-31 pattern)
  const renderWheel2MonthDays = () => {
    const allDays: { dayOfYear: number; month: number; dayOfMonth: number }[] = [];
    let dayCounter = 1;
    
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= MONTH_DAYS[m]; d++) {
        allDays.push({ dayOfYear: dayCounter, month: m + 1, dayOfMonth: d });
        dayCounter++;
      }
    }

    return (
      <motion.g
        animate={{ rotate: rotations.wheel2 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {allDays.map(({ dayOfYear, month, dayOfMonth }) => {
          const startAngle = ((dayOfYear - 1) / 364) * 360;
          const endAngle = (dayOfYear / 364) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const dayType = getDayType(month, dayOfMonth);
          const color = getDayColor(dayType);
          const isCurrent = calendarData.dayOfYear === dayOfYear;
          const textPos = polarToCartesian(cx, cy, (radii.wheel2Outer + radii.wheel2Inner) / 2, midAngle);

          // Show day numbers: 1, 5, 10, 15, 20, 25, 30/31, and special days
          const showNumber = dayOfMonth === 1 || dayOfMonth % 5 === 0 || dayType !== 'normal' || isCurrent;

          return (
            <g
              key={`monthday-${dayOfYear}`}
              onMouseEnter={() => handleHover('day', { dayOfYear, month, dayOfMonth, dayType })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel2Inner, radii.wheel2Outer, startAngle, endAngle)}
                fill={color}
                fillOpacity={isCurrent ? 1 : 0.6}
                stroke="hsl(220, 20%, 20%)"
                strokeWidth="0.2"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel2Inner, radii.wheel2Outer, startAngle, endAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              {showNumber && (
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="5"
                  fontWeight={dayType !== 'normal' ? 'bold' : 'normal'}
                >
                  {dayOfMonth}
                </text>
              )}
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 3: 354 Lunar/Moon Days
  const renderWheel3MoonDays = () => {
    const lunarDays = Array.from({ length: 354 }, (_, i) => i + 1);

    return (
      <motion.g
        animate={{ rotate: rotations.wheel3 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {lunarDays.map((day) => {
          const startAngle = ((day - 1) / 354) * 360;
          const endAngle = (day / 354) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const isCurrent = calendarData.lunarDay === day;
          const isDay354 = day === 354;
          const textPos = polarToCartesian(cx, cy, (radii.wheel3Outer + radii.wheel3Inner) / 2, midAngle);

          // Show more numbers for better visibility
          const showNumber = day === 1 || day % 15 === 0 || day === 354 || isCurrent;

          // Add hover for moon days too
          const handleMoonHover = () => handleHover('moon', { day, isCurrent, isDay354 });

          return (
            <g key={`lunar-${day}`} onMouseEnter={handleMoonHover} onMouseLeave={handleHoverEnd} style={{ cursor: 'pointer' }}>
              <path
                d={describeWedge(cx, cy, radii.wheel3Inner, radii.wheel3Outer, startAngle, endAngle)}
                fill={isDay354 ? COLORS.MOON_354 : isCurrent ? COLORS.CURRENT_HIGHLIGHT : 'hsl(260, 30%, 20%)'}
                fillOpacity={isCurrent || isDay354 ? 0.9 : 0.4}
                stroke="hsl(260, 20%, 30%)"
                strokeWidth="0.2"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel3Inner, radii.wheel3Outer, startAngle, endAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              {showNumber && (
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="5"
                  fontWeight={isCurrent || isDay354 ? 'bold' : 'normal'}
                >
                  {day}
                </text>
              )}
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 4: 52 Weeks with Week Numbers 1-52
  const renderWheel4Weeks = () => {
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    
    return (
      <motion.g
        animate={{ rotate: rotations.wheel4 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {weeks.map((week) => {
          const weekStartAngle = ((week - 1) / 52) * 360;
          const weekEndAngle = (week / 52) * 360;
          const midAngle = (weekStartAngle + weekEndAngle) / 2;
          const isCurrent = calendarData.week === week;
          const textPos = polarToCartesian(cx, cy, (radii.wheel4Outer + radii.wheel4Inner) / 2, midAngle);

          return (
            <g key={`week-${week}`}>
              <path
                d={describeWedge(cx, cy, radii.wheel4Inner, radii.wheel4Outer, weekStartAngle, weekEndAngle)}
                fill={isCurrent ? COLORS.CURRENT_HIGHLIGHT : 'hsl(220, 20%, 15%)'}
                fillOpacity={isCurrent ? 0.8 : 0.5}
                stroke="hsl(220, 20%, 30%)"
                strokeWidth="0.3"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel4Inner, radii.wheel4Outer, weekStartAngle, weekEndAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              {/* Week number */}
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="7"
                fontWeight={isCurrent ? 'bold' : 'normal'}
              >
                {week}
              </text>
              {/* 7 tick marks for each day of the week */}
              {Array.from({ length: 7 }, (_, d) => {
                const dayAngle = weekStartAngle + (d / 7) * (weekEndAngle - weekStartAngle);
                const dayOfYear = (week - 1) * 7 + d + 1;
                if (dayOfYear > 364) return null;
                
                const { month, day } = getMonthAndDay(dayOfYear);
                const dayType = getDayType(month, day);
                const tickColor = getDayColor(dayType);
                const innerPoint = polarToCartesian(cx, cy, radii.wheel4Inner, dayAngle);
                const outerPoint = polarToCartesian(cx, cy, radii.wheel4Inner + 4, dayAngle);

                return (
                  <line
                    key={`tick-${week}-${d}`}
                    x1={innerPoint.x}
                    y1={innerPoint.y}
                    x2={outerPoint.x}
                    y2={outerPoint.y}
                    stroke={tickColor}
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 5: 12 Monthly Leaders
  const renderWheel5MonthlyLeaders = () => {
    return (
      <motion.g
        animate={{ rotate: rotations.wheel5 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {MONTHLY_LEADERS.map((leader, i) => {
          const startAngle = i * 30;
          const endAngle = (i + 1) * 30;
          const midAngle = startAngle + 15;
          const textPos = polarToCartesian(cx, cy, (radii.wheel5Outer + radii.wheel5Inner) / 2, midAngle);
          const isCurrent = calendarData.month === leader.month;
          const seasonColor = SEASONAL_LEADERS[leader.seasonIndex].color;

          return (
            <g
              key={`month-${leader.month}`}
              onMouseEnter={() => handleHover('month', leader)}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel5Inner, radii.wheel5Outer, startAngle, endAngle)}
                fill={seasonColor}
                fillOpacity={isCurrent ? 0.9 : 0.4}
                stroke="hsl(220, 20%, 25%)"
                strokeWidth="0.5"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel5Inner, radii.wheel5Outer, startAngle, endAngle)}
                  fill="none"
                  stroke={COLORS.CURRENT_HIGHLIGHT}
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              <text
                x={textPos.x}
                y={textPos.y - 5}
                textAnchor="middle"
                fill="white"
                fontSize="7"
                fontWeight="bold"
                transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
              >
                {leader.name.slice(0, 8)}
              </text>
              <text
                x={textPos.x}
                y={textPos.y + 7}
                textAnchor="middle"
                fill="hsl(220, 20%, 85%)"
                fontSize="6"
                transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
              >
                {leader.tribe}
              </text>
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 6: 4 Seasonal Leaders
  const renderWheel6SeasonalLeaders = () => {
    return (
      <motion.g
        animate={{ rotate: rotations.wheel6 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {SEASONAL_LEADERS.map((leader, i) => {
          const startAngle = i * 90;
          const endAngle = (i + 1) * 90;
          const midAngle = startAngle + 45;
          const textPos = polarToCartesian(cx, cy, (radii.wheel6Outer + radii.wheel6Inner) / 2, midAngle);
          const isCurrent = calendarData.season === i + 1;

          return (
            <g
              key={leader.name}
              onMouseEnter={() => handleHover('season', leader)}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel6Inner, radii.wheel6Outer, startAngle, endAngle)}
                fill={leader.color}
                fillOpacity={isCurrent ? 1 : 0.6}
                stroke="hsl(220, 20%, 20%)"
                strokeWidth="1"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel6Inner, radii.wheel6Outer, startAngle, endAngle)}
                  fill="none"
                  stroke={COLORS.CURRENT_HIGHLIGHT}
                  strokeWidth="3"
                  filter="url(#glow)"
                />
              )}
              <text
                x={textPos.x}
                y={textPos.y - 10}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {leader.creature}
              </text>
              <text
                x={textPos.x}
                y={textPos.y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="8"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {leader.name}
              </text>
              <text
                x={textPos.x}
                y={textPos.y + 18}
                textAnchor="middle"
                fill="hsl(220, 20%, 80%)"
                fontSize="6"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {leader.representative}
              </text>
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 7: 18 Parts of Day
  const renderWheel7Parts18 = () => {
    return (
      <motion.g
        animate={{ rotate: rotations.wheel7 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {EIGHTEEN_PARTS.map((part) => {
          const startAngle = ((part - 1) / 18) * 360;
          const endAngle = (part / 18) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel7Outer + radii.wheel7Inner) / 2, midAngle);
          const isCurrent = calendarData.part18 === part;

          return (
            <g key={`part18-${part}`}>
              <path
                d={describeWedge(cx, cy, radii.wheel7Inner, radii.wheel7Outer, startAngle, endAngle)}
                fill={isCurrent ? COLORS.CURRENT_HIGHLIGHT : 'hsl(200, 30%, 20%)'}
                fillOpacity={isCurrent ? 0.9 : 0.5}
                stroke="hsl(200, 20%, 40%)"
                strokeWidth="0.5"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel7Inner, radii.wheel7Outer, startAngle, endAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="7"
                fontWeight={isCurrent ? 'bold' : 'normal'}
              >
                {part}
              </text>
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 8: 4 Parts of Day (VARIABLE SIZE based on sunrise/sunset)
  const renderWheel8Parts4Variable = () => {
    const { part4Angles } = calendarData;
    const partNames = ['Morning', 'Day', 'Evening', 'Night'];
    const colors = [
      'hsl(200, 60%, 60%)',  // Morning - Light Blue
      'hsl(45, 80%, 50%)',   // Day - Golden
      'hsl(25, 70%, 40%)',   // Evening - Orange
      'hsl(240, 50%, 20%)',  // Night - Dark Blue
    ];

    // Parts in order: Morning (0), Day (1), Evening (2), Night (3)
    const parts = [
      { name: 'Morning', angle: part4Angles.morning, startAngle: part4Angles.startAngles.morning, color: colors[0], index: 4 },
      { name: 'Day', angle: part4Angles.day, startAngle: part4Angles.startAngles.day, color: colors[1], index: 1 },
      { name: 'Evening', angle: part4Angles.evening, startAngle: part4Angles.startAngles.evening, color: colors[2], index: 2 },
      { name: 'Night', angle: part4Angles.night, startAngle: part4Angles.startAngles.night, color: colors[3], index: 3 },
    ];

    return (
      <g>
        {parts.map((part, i) => {
          const startAngle = part.startAngle;
          const endAngle = startAngle + part.angle;
          const midAngle = startAngle + part.angle / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel8Outer + radii.wheel8Inner) / 2, midAngle);
          const isCurrent = calendarData.part4 === part.index;

          return (
            <g key={`part4-${part.name}`}>
              <path
                d={describeWedge(cx, cy, radii.wheel8Inner, radii.wheel8Outer, startAngle, endAngle)}
                fill={part.color}
                fillOpacity={isCurrent ? 1 : 0.5}
                stroke="hsl(220, 20%, 30%)"
                strokeWidth="0.5"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel8Inner, radii.wheel8Outer, startAngle, endAngle)}
                  fill="none"
                  stroke={COLORS.CURRENT_HIGHLIGHT}
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="8"
                fontWeight="bold"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {part.name}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // Render Center (simplified - just feast/sabbath name)
  const renderCenter = () => {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={radii.center}
          fill="hsl(220, 30%, 8%)"
          stroke="hsl(220, 20%, 30%)"
          strokeWidth="2"
        />
        {calendarData.feastName && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={getDayColor(calendarData.dayType)}
            fontSize="10"
            fontWeight="bold"
          >
            {calendarData.feastName}
          </text>
        )}
        {!calendarData.feastName && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(220, 20%, 60%)"
            fontSize="9"
          >
            {getWeekdayName(calendarData.weekDay)}
          </text>
        )}
      </g>
    );
  };

  // Render Days Out of Time animation (after 52nd Sabbath)
  const renderDaysOutOfTime = () => {
    if (calendarData.dayOfYear < 364) return null;

    const angle = 0;
    const startPoint = polarToCartesian(cx, cy, radii.outerText + 20, angle);
    const endPoint = polarToCartesian(cx, cy, radii.wheel4Outer, angle);

    return (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <motion.line
          x1={startPoint.x}
          y1={startPoint.y}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke={COLORS.DAY_OUT_OF_TIME}
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          filter="url(#purpleGlow)"
        />
        <text
          x={startPoint.x + 10}
          y={startPoint.y}
          fill={COLORS.DAY_OUT_OF_TIME}
          fontSize="10"
          fontWeight="bold"
        >
          {INFINITY_LEADER.name}
        </text>
        <text
          x={startPoint.x + 10}
          y={startPoint.y + 12}
          fill="hsl(263, 50%, 70%)"
          fontSize="8"
        >
          Day Out of Time
        </text>
      </motion.g>
    );
  };

  const seasonLeader = SEASONAL_LEADERS[calendarData.season - 1];
  const monthLeader = MONTHLY_LEADERS[calendarData.month - 1];

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center">
        {/* Main Wheel */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            {/* Definitions for filters */}
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="purpleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feFlood floodColor={COLORS.DAY_OUT_OF_TIME} floodOpacity="0.5" result="glowColor" />
                <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                <feMerge>
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(220, 30%, 15%)" />
                <stop offset="100%" stopColor="hsl(220, 30%, 5%)" />
              </radialGradient>
            </defs>

            {/* Background */}
            <circle cx={cx} cy={cy} r={size / 2} fill="hsl(220, 30%, 5%)" />

            {/* Render all wheels (NEW ORDER - outside to inside) */}
            {renderOuterText()}
            {renderWheel1MansCount()}      {/* Man's Count (1-4, 1-360) */}
            {renderWheel2MonthDays()}       {/* Month Days (30/30/31 pattern) */}
            {renderWheel3MoonDays()}        {/* Moon Days (1-354) */}
            {renderWheel4Weeks()}           {/* 52 Weeks with numbers */}
            {renderWheel5MonthlyLeaders()}  {/* 12 Monthly Leaders */}
            {renderWheel6SeasonalLeaders()} {/* 4 Seasonal Leaders */}
            {renderWheel7Parts18()}         {/* 18 Parts of Day */}
            {renderWheel8Parts4Variable()}  {/* 4 Parts of Day (VARIABLE) */}
            {renderCenter()}
            {renderDaysOutOfTime()}

            {/* Current position indicator at top - pointing DOWN toward wheel */}
            <polygon
              points={`${cx},${padding + 25} ${cx - 8},${padding + 10} ${cx + 8},${padding + 10}`}
              fill={COLORS.CURRENT_HIGHLIGHT}
              filter="url(#glow)"
            />
          </svg>

          {/* Stationary Hover Tooltip - positioned at bottom-left of wheel */}
          <AnimatePresence>
            {hoveredElement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl max-w-xs"
                style={{
                  left: 20,
                  bottom: 20,
                }}
              >
                {hoveredElement.type === 'season' && (
                  <div>
                    <h4 className="font-bold text-primary">{hoveredElement.data.name}</h4>
                    <p className="text-sm text-muted-foreground">{hoveredElement.data.ezekielVision}</p>
                    <p className="text-sm">Representative: {hoveredElement.data.representative}</p>
                    <p className="text-xs text-muted-foreground">Months {hoveredElement.data.months.join(', ')} • 91 days</p>
                  </div>
                )}
                {hoveredElement.type === 'month' && (
                  <div>
                    <h4 className="font-bold text-primary">Month {hoveredElement.data.month}</h4>
                    <p className="text-sm">Leader: {hoveredElement.data.name}</p>
                    <p className="text-sm">Tribe: {hoveredElement.data.tribe}</p>
                  </div>
                )}
                {hoveredElement.type === 'day' && (
                  <div>
                    <h4 className="font-bold text-primary">Day {hoveredElement.data.dayOfYear}</h4>
                    <p className="text-sm">Month {hoveredElement.data.month}, Day {hoveredElement.data.dayOfMonth}</p>
                    <p className="text-xs capitalize" style={{ color: getDayColor(hoveredElement.data.dayType) }}>
                      {hoveredElement.data.dayType}
                    </p>
                  </div>
                )}
                {hoveredElement.type === 'mansCount' && (
                  <div>
                    <h4 className="font-bold text-primary">Man's Count: {hoveredElement.data.mansCount}</h4>
                    <p className="text-sm">Day of Year: {hoveredElement.data.dayOfYear}</p>
                    <p className="text-xs capitalize" style={{ color: getDayColor(hoveredElement.data.dayType) }}>
                      {hoveredElement.data.dayType}
                    </p>
                  </div>
                )}
                {hoveredElement.type === 'moon' && (
                  <div>
                    <h4 className="font-bold text-primary">Moon Day: {hoveredElement.data.day}</h4>
                    {hoveredElement.data.isDay354 && <p className="text-sm text-pink-400">Special Day 354</p>}
                    {hoveredElement.data.isCurrent && <p className="text-sm text-amber-400">Current Day</p>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Date Info Panel (BELOW the wheels) */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xl font-bold text-primary">Year {calendarData.year}</p>
          <p className="text-lg font-semibold" style={{ color: COLORS.CURRENT_HIGHLIGHT }}>
            Month {calendarData.month} Day {calendarData.dayOfMonth}
          </p>
          <p className="text-muted-foreground">
            {getWeekdayName(calendarData.weekDay)} ({monthLeader.tribe})
          </p>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <span>Man's Count: {calendarData.mansCount}</span>
            <span>•</span>
            <span>Moon Day: {calendarData.lunarDay}</span>
            <span>•</span>
            <span>Week: {calendarData.week}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {seasonLeader.creature} Season • Sunrise: {calendarData.sunTimes.sunrise.toFixed(1)}h | Sunset: {calendarData.sunTimes.sunset.toFixed(1)}h
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default RemnantsWheelCalendar;
