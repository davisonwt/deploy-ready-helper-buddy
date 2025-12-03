'use client';

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
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
    };
  }, [currentTime]);

  // SVG dimensions
  const cx = size / 2;
  const cy = size / 2;
  const padding = 20;

  // Wheel radii (outside to inside)
  const radii = {
    outerText: size / 2 - padding,
    wheel1Outer: size / 2 - padding - 30,
    wheel1Inner: size / 2 - padding - 80,
    wheel2Outer: size / 2 - padding - 85,
    wheel2Inner: size / 2 - padding - 125,
    wheel3Outer: size / 2 - padding - 130,
    wheel3Inner: size / 2 - padding - 165,
    wheel4Outer: size / 2 - padding - 170,
    wheel4Inner: size / 2 - padding - 205,
    wheel5Outer: size / 2 - padding - 210,
    wheel5Inner: size / 2 - padding - 250,
    wheel6Outer: size / 2 - padding - 255,
    wheel6Inner: size / 2 - padding - 285,
    wheel7Outer: size / 2 - padding - 290,
    wheel7Inner: size / 2 - padding - 320,
    wheel8Outer: size / 2 - padding - 325,
    wheel8Inner: size / 2 - padding - 355,
    center: size / 2 - padding - 360,
  };

  // Rotation calculations (all wheels rotate to show current position at top)
  const rotations = {
    wheel1: -(calendarData.season - 1) * 90,
    wheel2: -(calendarData.month - 1) * 30,
    wheel3: -((calendarData.dayOfYear - 1) / 364) * 360,
    wheel4: -((calendarData.dayOfYear - 1) / 364) * 360,
    wheel5: -((calendarData.dayOfYear - 1) / 364) * 360,
    wheel6: -((calendarData.lunarDay - 1) / 354) * 360,
    wheel7: -(calendarData.part18 - 1) * 20,
    wheel8: -(calendarData.part4 - 1) * 90,
  };

  // Handle hover
  const handleHover = useCallback((type: string, data: any, event: React.MouseEvent) => {
    setHoveredElement({ type, data });
    setTooltipPosition({ x: event.clientX, y: event.clientY });
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

  // Render Wheel 1: 4 Seasonal Leaders
  const renderWheel1 = () => {
    return (
      <motion.g
        animate={{ rotate: rotations.wheel1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {SEASONAL_LEADERS.map((leader, i) => {
          const startAngle = i * 90;
          const endAngle = (i + 1) * 90;
          const midAngle = startAngle + 45;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);
          const isCurrent = calendarData.season === i + 1;

          return (
            <g
              key={leader.name}
              onMouseEnter={(e) => handleHover('season', leader, e)}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill={leader.color}
                fillOpacity={isCurrent ? 1 : 0.6}
                stroke="hsl(220, 20%, 20%)"
                strokeWidth="1"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
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
                fontSize="9"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {leader.name}
              </text>
              <text
                x={textPos.x}
                y={textPos.y + 18}
                textAnchor="middle"
                fill="hsl(220, 20%, 80%)"
                fontSize="7"
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

  // Render Wheel 2: 12 Monthly Leaders
  const renderWheel2 = () => {
    return (
      <motion.g
        animate={{ rotate: rotations.wheel2 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {MONTHLY_LEADERS.map((leader, i) => {
          const startAngle = i * 30;
          const endAngle = (i + 1) * 30;
          const midAngle = startAngle + 15;
          const textPos = polarToCartesian(cx, cy, (radii.wheel2Outer + radii.wheel2Inner) / 2, midAngle);
          const isCurrent = calendarData.month === leader.month;
          const seasonColor = SEASONAL_LEADERS[leader.seasonIndex].color;

          return (
            <g
              key={`month-${leader.month}`}
              onMouseEnter={(e) => handleHover('month', leader, e)}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel2Inner, radii.wheel2Outer, startAngle, endAngle)}
                fill={seasonColor}
                fillOpacity={isCurrent ? 0.9 : 0.4}
                stroke="hsl(220, 20%, 25%)"
                strokeWidth="0.5"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel2Inner, radii.wheel2Outer, startAngle, endAngle)}
                  fill="none"
                  stroke={COLORS.CURRENT_HIGHLIGHT}
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              <text
                x={textPos.x}
                y={textPos.y - 3}
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
                y={textPos.y + 8}
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

  // Render Wheel 3: 52 Weeks with 7 day markers each
  const renderWheel3 = () => {
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    
    return (
      <motion.g
        animate={{ rotate: rotations.wheel3 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {weeks.map((week) => {
          const weekStartAngle = ((week - 1) / 52) * 360;
          const weekEndAngle = (week / 52) * 360;
          const isCurrent = calendarData.week === week;

          return (
            <g key={`week-${week}`}>
              <path
                d={describeWedge(cx, cy, radii.wheel3Inner, radii.wheel3Outer, weekStartAngle, weekEndAngle)}
                fill={isCurrent ? COLORS.CURRENT_HIGHLIGHT : 'hsl(220, 20%, 15%)'}
                fillOpacity={isCurrent ? 0.8 : 0.5}
                stroke="hsl(220, 20%, 30%)"
                strokeWidth="0.3"
              />
              {/* 7 tick marks for each day of the week */}
              {Array.from({ length: 7 }, (_, d) => {
                const dayAngle = weekStartAngle + (d / 7) * (weekEndAngle - weekStartAngle);
                const dayOfYear = (week - 1) * 7 + d + 1;
                if (dayOfYear > 364) return null;
                
                const { month, day } = getMonthAndDay(dayOfYear);
                const dayType = getDayType(month, day);
                const tickColor = getDayColor(dayType);
                const innerPoint = polarToCartesian(cx, cy, radii.wheel3Inner, dayAngle);
                const outerPoint = polarToCartesian(cx, cy, radii.wheel3Inner + 5, dayAngle);

                return (
                  <line
                    key={`tick-${week}-${d}`}
                    x1={innerPoint.x}
                    y1={innerPoint.y}
                    x2={outerPoint.x}
                    y2={outerPoint.y}
                    stroke={tickColor}
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Wheel 4: Days of Months (364 segments)
  const renderWheel4 = () => {
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
        animate={{ rotate: rotations.wheel4 }}
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
          const textPos = polarToCartesian(cx, cy, (radii.wheel4Outer + radii.wheel4Inner) / 2, midAngle);

          return (
            <g
              key={`day-${dayOfYear}`}
              onMouseEnter={(e) => handleHover('day', { dayOfYear, month, dayOfMonth, dayType }, e)}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel4Inner, radii.wheel4Outer, startAngle, endAngle)}
                fill={color}
                fillOpacity={isCurrent ? 1 : 0.6}
                stroke="hsl(220, 20%, 20%)"
                strokeWidth="0.2"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel4Inner, radii.wheel4Outer, startAngle, endAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              {/* Show day number for every 5th day or special days */}
              {(dayOfMonth % 5 === 0 || dayOfMonth === 1 || dayType !== 'normal') && (
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

  // Render Wheel 5: Day Names & Feasts with Man's Count
  const renderWheel5 = () => {
    const allDays: { dayOfYear: number; weekDay: number; mansCount: number; month: number; dayOfMonth: number }[] = [];
    
    for (let d = 1; d <= 364; d++) {
      const weekDay = ((d - 1) % 7) + 1;
      const { month, day: dayOfMonth } = getMonthAndDay(d);
      allDays.push({
        dayOfYear: d,
        weekDay,
        mansCount: getMansCount(d),
        month,
        dayOfMonth,
      });
    }

    return (
      <motion.g
        animate={{ rotate: rotations.wheel5 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {allDays.map(({ dayOfYear, weekDay, mansCount, month, dayOfMonth }) => {
          const startAngle = ((dayOfYear - 1) / 364) * 360;
          const endAngle = (dayOfYear / 364) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const dayType = getDayType(month, dayOfMonth);
          const color = getDayColor(dayType);
          const isCurrent = calendarData.dayOfYear === dayOfYear;
          const feastName = getFeastName(month, dayOfMonth);
          const textPos = polarToCartesian(cx, cy, (radii.wheel5Outer + radii.wheel5Inner) / 2, midAngle);

          return (
            <g
              key={`dayname-${dayOfYear}`}
              onMouseEnter={(e) => handleHover('dayname', { dayOfYear, weekDay, mansCount, feastName, dayType }, e)}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel5Inner, radii.wheel5Outer, startAngle, endAngle)}
                fill={color}
                fillOpacity={isCurrent ? 1 : 0.5}
                stroke="hsl(220, 20%, 20%)"
                strokeWidth="0.2"
              />
              {isCurrent && (
                <path
                  d={describeWedge(cx, cy, radii.wheel5Inner, radii.wheel5Outer, startAngle, endAngle)}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              )}
              {/* Show weekday for day 1 of each week or sabbaths */}
              {(weekDay === 7 || weekDay === 1) && (
                <text
                  x={textPos.x}
                  y={textPos.y - 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="4"
                  fontWeight="bold"
                >
                  {weekDay === 7 ? 'S' : '1'}
                </text>
              )}
              {/* Man's count every 30 days */}
              {mansCount % 30 === 0 && (
                <text
                  x={textPos.x}
                  y={textPos.y + 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(220, 20%, 80%)"
                  fontSize="4"
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

  // Render Wheel 6: 354 Lunar Days
  const renderWheel6 = () => {
    const lunarDays = Array.from({ length: 354 }, (_, i) => i + 1);

    return (
      <motion.g
        animate={{ rotate: rotations.wheel6 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {lunarDays.map((day) => {
          const startAngle = ((day - 1) / 354) * 360;
          const endAngle = (day / 354) * 360;
          const isCurrent = calendarData.lunarDay === day;
          const isDay354 = day === 354;

          return (
            <g key={`lunar-${day}`}>
              <path
                d={describeWedge(cx, cy, radii.wheel6Inner, radii.wheel6Outer, startAngle, endAngle)}
                fill={isDay354 ? COLORS.MOON_354 : isCurrent ? COLORS.CURRENT_HIGHLIGHT : 'hsl(260, 30%, 20%)'}
                fillOpacity={isCurrent || isDay354 ? 0.9 : 0.4}
                stroke="hsl(260, 20%, 30%)"
                strokeWidth="0.2"
              />
              {(day % 29 === 0 || day === 1 || day === 354) && (
                <text
                  x={polarToCartesian(cx, cy, (radii.wheel6Outer + radii.wheel6Inner) / 2, (startAngle + endAngle) / 2).x}
                  y={polarToCartesian(cx, cy, (radii.wheel6Outer + radii.wheel6Inner) / 2, (startAngle + endAngle) / 2).y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="5"
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

  // Render Wheel 7: 18 Parts of Day
  const renderWheel7 = () => {
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

  // Render Wheel 8: 4 Parts of Day
  const renderWheel8 = () => {
    return (
      <motion.g
        animate={{ rotate: rotations.wheel8 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {PARTS_OF_DAY.map((part, i) => {
          const startAngle = i * 90;
          const endAngle = (i + 1) * 90;
          const midAngle = startAngle + 45;
          const textPos = polarToCartesian(cx, cy, (radii.wheel8Outer + radii.wheel8Inner) / 2, midAngle);
          const isCurrent = calendarData.part4 === i + 1;
          
          const colors = [
            'hsl(45, 80%, 50%)',   // Day - Golden
            'hsl(25, 70%, 40%)',   // Evening - Orange
            'hsl(240, 50%, 20%)',  // Night - Dark Blue
            'hsl(200, 60%, 60%)',  // Morning - Light Blue
          ];

          return (
            <g key={`part4-${part}`}>
              <path
                d={describeWedge(cx, cy, radii.wheel8Inner, radii.wheel8Outer, startAngle, endAngle)}
                fill={colors[i]}
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
                {part}
              </text>
            </g>
          );
        })}
      </motion.g>
    );
  };

  // Render Center Info
  const renderCenter = () => {
    const seasonLeader = SEASONAL_LEADERS[calendarData.season - 1];
    const monthLeader = MONTHLY_LEADERS[calendarData.month - 1];

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
        <text
          x={cx}
          y={cy - 35}
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          Year {calendarData.year}
        </text>
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          fill="hsl(45, 80%, 60%)"
          fontSize="14"
          fontWeight="bold"
        >
          Month {calendarData.month} Day {calendarData.dayOfMonth}
        </text>
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          fill="hsl(220, 20%, 80%)"
          fontSize="10"
        >
          {getWeekdayName(calendarData.weekDay)}
        </text>
        {calendarData.feastName && (
          <text
            x={cx}
            y={cy + 15}
            textAnchor="middle"
            fill={getDayColor(calendarData.dayType)}
            fontSize="9"
            fontWeight="bold"
          >
            {calendarData.feastName}
          </text>
        )}
        <text
          x={cx}
          y={cy + 32}
          textAnchor="middle"
          fill="hsl(220, 20%, 60%)"
          fontSize="8"
        >
          {seasonLeader.creature} • {monthLeader.tribe}
        </text>
        <text
          x={cx}
          y={cy + 45}
          textAnchor="middle"
          fill="hsl(220, 20%, 50%)"
          fontSize="7"
        >
          Man's Count: {calendarData.mansCount}
        </text>
      </g>
    );
  };

  // Render Days Out of Time animation (after 52nd Sabbath)
  const renderDaysOutOfTime = () => {
    // Only show after day 364
    if (calendarData.dayOfYear < 364) return null;

    const angle = 0; // Top position (after 52nd Sabbath)
    const startPoint = polarToCartesian(cx, cy, radii.outerText + 20, angle);
    const endPoint = polarToCartesian(cx, cy, radii.wheel3Outer, angle);

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

  return (
    <TooltipProvider>
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

          {/* Render all wheels (outside to inside) */}
          {renderOuterText()}
          {renderWheel1()}
          {renderWheel2()}
          {renderWheel3()}
          {renderWheel4()}
          {renderWheel5()}
          {renderWheel6()}
          {renderWheel7()}
          {renderWheel8()}
          {renderCenter()}
          {renderDaysOutOfTime()}

          {/* Current position indicator at top */}
          <polygon
            points={`${cx},${padding + 5} ${cx - 8},${padding + 20} ${cx + 8},${padding + 20}`}
            fill={COLORS.CURRENT_HIGHLIGHT}
            filter="url(#glow)"
          />
        </svg>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredElement && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl max-w-xs"
              style={{
                left: Math.min(tooltipPosition.x + 10, window.innerWidth - 250),
                top: tooltipPosition.y + 10,
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
              {hoveredElement.type === 'dayname' && (
                <div>
                  <h4 className="font-bold text-primary">{getWeekdayName(hoveredElement.data.weekDay)}</h4>
                  {hoveredElement.data.feastName && (
                    <p className="text-sm font-semibold" style={{ color: getDayColor(hoveredElement.data.dayType) }}>
                      {hoveredElement.data.feastName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Man's Count: {hoveredElement.data.mansCount}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

export default RemnantsWheelCalendar;
