'use client';
// Wheels in Itself - Cursor-following tooltips, day starts at sunrise
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Rotation calculations - all wheels rotate to show current position at TOP (12 o'clock)
  // IMPORTANT: Day starts at SUNRISE, not midnight!
  const rotations = useMemo(() => {
    // Get sunrise time for today (hardcoded ~6:00 AM as baseline, adjusted by season)
    const { sunTimes } = calendarData;
    const sunriseHour = sunTimes.sunrise; // e.g., 6.0 for 6:00 AM
    
    // Calculate current time as hours since SUNRISE (not midnight!)
    const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    
    // Hours since sunrise (can be negative if before sunrise = previous day)
    let hoursSinceSunrise = currentHour - sunriseHour;
    if (hoursSinceSunrise < 0) {
      hoursSinceSunrise += 24; // Wrap around - we're in the previous calendar day
    }
    
    // Day fraction based on sunrise (0 = sunrise, 0.5 = ~12 hours after sunrise, 1 = next sunrise)
    const dayFractionFromSunrise = hoursSinceSunrise / 24;
    
    // For 18-part wheel: each part is 24/18 = 1.333 hours
    const partDuration = 24 / 18;
    const part18Precise = hoursSinceSunrise / partDuration;
    
    // For 4-part wheel: calculate angle based on time since sunrise
    // Sunrise is at angle 0 (top), progresses clockwise through the day
    const currentAngle = dayFractionFromSunrise * 360;
    
    // Calculate day within current month for monthly leaders
    const dayInMonth = calendarData.dayOfMonth;
    const daysInCurrentMonth = MONTH_DAYS[calendarData.month - 1];
    
    // Calculate day within current week (1-7)
    const dayInWeek = calendarData.weekDay;
    
    return {
      wheel1: -((calendarData.dayOfYear - 1) / 364) * 360, // Man's Count - by day
      wheel2: -((calendarData.dayOfYear - 1) / 364) * 360, // Month Days - by day
      wheel3: -((calendarData.lunarDay - 1) / 354) * 360,  // Moon Days - by lunar day
      wheel4: -(((calendarData.week - 1) * 7 + (dayInWeek - 1)) / 364) * 360, // 52 Weeks - by day within year
      wheel5: -(((calendarData.month - 1) + (dayInMonth - 1) / daysInCurrentMonth) / 12) * 360, // Monthly Leaders
      wheel6: -((calendarData.dayOfYear - 1) / 364) * 360, // 4 Seasonal Leaders - by day
      wheel7: -(part18Precise / 18) * 360, // 18 Parts - based on time since SUNRISE
      wheel8: -currentAngle, // 4 Parts - rotate based on time since SUNRISE
    };
  }, [calendarData, currentTime]);

  // Handle hover - track mouse position for cursor-following tooltip
  const handleHover = useCallback((type: string, data: any, e?: React.MouseEvent) => {
    setHoveredElement({ type, data });
    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (hoveredElement && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [hoveredElement]);

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

  // Render Wheel 1: Man's Count (1-361 + 2 dot days + 3 additional days = 366 total slots) - OUTERMOST
  const renderWheel1MansCount = () => {
    // Man's count: 361 regular days + 2 dot days + 3 additional days (362-364) = 366 total slots
    const totalSlots = 366;
    const allDays = Array.from({ length: 361 }, (_, i) => ({
      dayOfYear: i + 1,
      mansCount: i + 1, // Man's count is 1-361
    }));

    return (
      <motion.g
        animate={{ rotate: rotations.wheel1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {/* Regular 361 days */}
        {allDays.map(({ dayOfYear, mansCount }) => {
          const startAngle = ((dayOfYear - 1) / totalSlots) * 360;
          const endAngle = (dayOfYear / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const { month, day: dayOfMonth } = getMonthAndDay(dayOfYear);
          const dayType = getDayType(month, dayOfMonth);
          const color = getDayColor(dayType);
          const isCurrent = calendarData.dayOfYear === dayOfYear;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);

          // Show numbers more frequently for visibility
          const showNumber = mansCount <= 4 || mansCount % 30 === 0 || mansCount === 361 || isCurrent;

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
        
        {/* Dot 1: Helo-Yaseph (after day 361) */}
        {(() => {
          const dotIndex = 361; // Position after day 361
          const startAngle = (dotIndex / totalSlots) * 360;
          const endAngle = ((dotIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);
          
          return (
            <g 
              key="mans-dot1-helo-yaseph"
              onMouseEnter={() => handleHover('dotDay', { name: 'Helo-Yaseph', description: "The 6th month's name - Day out of time 1", dotNumber: 1, wheel: "Man's Count" })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill="hsl(45, 90%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(45, 80%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="hsl(45, 20%, 15%)"
                fontSize="5"
                fontWeight="bold"
              >
                •1
              </text>
            </g>
          );
        })()}
        
        {/* Dot 2: Asfa'el (after Helo-Yaseph) */}
        {(() => {
          const dotIndex = 362; // Position after dot 1
          const startAngle = (dotIndex / totalSlots) * 360;
          const endAngle = ((dotIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);
          
          return (
            <g 
              key="mans-dot2-asfael"
              onMouseEnter={() => handleHover('dotDay', { name: "Asfa'el", description: "Day out of time 2 - Added if tequvah appears on 3rd day of 7th month", dotNumber: 2, wheel: "Man's Count" })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill="hsl(280, 70%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(280, 60%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="5"
                fontWeight="bold"
              >
                •2
              </text>
            </g>
          );
        })()}

        {/* Day 362: YHVH's Day 1, Week Day 1 */}
        {(() => {
          const dayIndex = 363; // Position after dot 2
          const startAngle = (dayIndex / totalSlots) * 360;
          const endAngle = ((dayIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);
          
          return (
            <g 
              key="mans-day-362"
              onMouseEnter={() => handleHover('specialDay', { 
                mansDay: 362, 
                yhvhDay: 1, 
                weekDay: 1, 
                description: "Day 362 of Man's count - YHVH's Day 1 of His year count - Day 1 of the new week cycle" 
              })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill="hsl(200, 80%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(200, 70%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="5"
                fontWeight="bold"
              >
                362
              </text>
            </g>
          );
        })()}

        {/* Day 363: YHVH's Day 2, Week Day 2 */}
        {(() => {
          const dayIndex = 364; // Position after day 362
          const startAngle = (dayIndex / totalSlots) * 360;
          const endAngle = ((dayIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);
          
          return (
            <g 
              key="mans-day-363"
              onMouseEnter={() => handleHover('specialDay', { 
                mansDay: 363, 
                yhvhDay: 2, 
                weekDay: 2, 
                description: "Day 363 of Man's count - YHVH's Day 2 of His year count - Day 2 of the new week cycle" 
              })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill="hsl(200, 80%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(200, 70%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="5"
                fontWeight="bold"
              >
                363
              </text>
            </g>
          );
        })()}

        {/* Day 364: YHVH's Day 3, Week Day 3 */}
        {(() => {
          const dayIndex = 365; // Position after day 363
          const startAngle = (dayIndex / totalSlots) * 360;
          const endAngle = ((dayIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel1Outer + radii.wheel1Inner) / 2, midAngle);
          
          return (
            <g 
              key="mans-day-364"
              onMouseEnter={() => handleHover('specialDay', { 
                mansDay: 364, 
                yhvhDay: 3, 
                weekDay: 3, 
                description: "Day 364 of Man's count - YHVH's Day 3 of His year count - Day 3 of the new week cycle" 
              })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel1Inner, radii.wheel1Outer, startAngle, endAngle)}
                fill="hsl(200, 80%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(200, 70%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="5"
                fontWeight="bold"
              >
                364
              </text>
            </g>
          );
        })()}
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

  // Render Wheel 3: YHVH's Count (364 days + 2 dot days)
  const renderWheel3YHVHCount = () => {
    // YHVH's count goes from 1-364, plus 2 special dot days (Helo-Yaseph and Asfa'el)
    const totalSlots = 366; // 364 regular days + 2 dot days
    const yhvhDays = Array.from({ length: 364 }, (_, i) => i + 1);

    return (
      <motion.g
        animate={{ rotate: rotations.wheel3 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {/* Regular 364 days */}
        {yhvhDays.map((day) => {
          const startAngle = ((day - 1) / totalSlots) * 360;
          const endAngle = (day / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const isCurrent = calendarData.dayOfYear === day;
          const isDay364 = day === 364;
          const textPos = polarToCartesian(cx, cy, (radii.wheel3Outer + radii.wheel3Inner) / 2, midAngle);

          // Show more numbers for better visibility
          const showNumber = day === 1 || day % 30 === 0 || day === 364 || isCurrent;

          // Add hover for YHVH count
          const handleYHVHHover = () => handleHover('yhvhCount', { day, isCurrent, isDay364 });

          return (
            <g key={`yhvh-${day}`} onMouseEnter={handleYHVHHover} onMouseLeave={handleHoverEnd} style={{ cursor: 'pointer' }}>
              <path
                d={describeWedge(cx, cy, radii.wheel3Inner, radii.wheel3Outer, startAngle, endAngle)}
                fill={isDay364 ? 'hsl(280, 60%, 50%)' : isCurrent ? COLORS.CURRENT_HIGHLIGHT : 'hsl(280, 30%, 20%)'}
                fillOpacity={isCurrent || isDay364 ? 0.9 : 0.4}
                stroke="hsl(280, 20%, 30%)"
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
                  fontWeight={isCurrent || isDay364 ? 'bold' : 'normal'}
                >
                  {day}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Dot 1: Helo-Yaseph (after day 364) */}
        {(() => {
          const dotIndex = 364; // Position after day 364
          const startAngle = (dotIndex / totalSlots) * 360;
          const endAngle = ((dotIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel3Outer + radii.wheel3Inner) / 2, midAngle);
          
          return (
            <g 
              key="yhvh-dot1-helo-yaseph"
              onMouseEnter={() => handleHover('dotDay', { name: 'Helo-Yaseph', description: "The 6th month's name - Day out of time 1", dotNumber: 1, wheel: 'YHVH' })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel3Inner, radii.wheel3Outer, startAngle, endAngle)}
                fill="hsl(45, 90%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(45, 80%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="hsl(45, 20%, 15%)"
                fontSize="4"
                fontWeight="bold"
              >
                •1
              </text>
            </g>
          );
        })()}
        
        {/* Dot 2: Asfa'el (after Helo-Yaseph) */}
        {(() => {
          const dotIndex = 365; // Position after dot 1
          const startAngle = (dotIndex / totalSlots) * 360;
          const endAngle = ((dotIndex + 1) / totalSlots) * 360;
          const midAngle = (startAngle + endAngle) / 2;
          const textPos = polarToCartesian(cx, cy, (radii.wheel3Outer + radii.wheel3Inner) / 2, midAngle);
          
          return (
            <g 
              key="yhvh-dot2-asfael"
              onMouseEnter={() => handleHover('dotDay', { name: "Asfa'el", description: "Day out of time 2 - Added if tequvah appears on 3rd day of 7th month", dotNumber: 2, wheel: 'YHVH' })}
              onMouseLeave={handleHoverEnd}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={describeWedge(cx, cy, radii.wheel3Inner, radii.wheel3Outer, startAngle, endAngle)}
                fill="hsl(280, 70%, 50%)"
                fillOpacity={0.9}
                stroke="hsl(280, 60%, 40%)"
                strokeWidth="0.5"
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="4"
                fontWeight="bold"
              >
                •2
              </text>
            </g>
          );
        })()}
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
    const textRadius = (radii.wheel6Outer + radii.wheel6Inner) / 2;
    
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
          const isCurrent = calendarData.season === i + 1;
          const pathId = `season-path-${i}`;
          const namePathId = `season-name-path-${i}`;
          const repPathId = `season-rep-path-${i}`;

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
              {/* Curved text paths */}
              <defs>
                <path
                  id={pathId}
                  d={describeArc(cx, cy, textRadius - 12, startAngle + 5, endAngle - 5)}
                  fill="none"
                />
                <path
                  id={namePathId}
                  d={describeArc(cx, cy, textRadius, startAngle + 5, endAngle - 5)}
                  fill="none"
                />
                <path
                  id={repPathId}
                  d={describeArc(cx, cy, textRadius + 12, startAngle + 5, endAngle - 5)}
                  fill="none"
                />
              </defs>
              {/* Creature name (curved) */}
              <text
                fill="white"
                fontSize="10"
                fontWeight="bold"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                  {leader.creature}
                </textPath>
              </text>
              {/* Leader name (curved) */}
              <text
                fill="white"
                fontSize="8"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                <textPath href={`#${namePathId}`} startOffset="50%" textAnchor="middle">
                  {leader.name}
                </textPath>
              </text>
              {/* Representative (curved) */}
              <text
                fill="hsl(220, 20%, 80%)"
                fontSize="6"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                <textPath href={`#${repPathId}`} startOffset="50%" textAnchor="middle">
                  {leader.representative}
                </textPath>
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

    const textRadius = (radii.wheel8Outer + radii.wheel8Inner) / 2;

    return (
      <motion.g
        animate={{ rotate: rotations.wheel8 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {parts.map((part, i) => {
          const startAngle = part.startAngle;
          const endAngle = startAngle + part.angle;
          const isCurrent = calendarData.part4 === part.index;
          const pathId = `part4-path-${part.name}`;
          
          // Only show text if the segment is large enough (angle > 15 degrees)
          const showText = part.angle > 15;

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
              {showText && (
                <>
                  <defs>
                    <path
                      id={pathId}
                      d={describeArc(cx, cy, textRadius, startAngle + 2, endAngle - 2)}
                      fill="none"
                    />
                  </defs>
                  <text
                    fill="white"
                    fontSize="8"
                    fontWeight="bold"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                      {part.name}
                    </textPath>
                  </text>
                </>
              )}
            </g>
          );
        })}
      </motion.g>
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

  // Render Shadow Line on Month 1 Day 1 (NOT on month 9)
  const renderShadowLine = () => {
    // Shadow line only appears on Month 1 Day 1 (day of year 1)
    // Calculate angle for day 1 of month 1
    const dayOfYearForShadow = 1; // Month 1, Day 1
    const shadowAngle = ((dayOfYearForShadow - 1) / 364) * 360 + rotations.wheel2;
    
    const startPoint = polarToCartesian(cx, cy, radii.outerText - 10, shadowAngle);
    const endPoint = polarToCartesian(cx, cy, radii.wheel4Outer, shadowAngle);

    return (
      <motion.g>
        {/* Shadow line with special glow effect */}
        <motion.line
          x1={startPoint.x}
          y1={startPoint.y}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke="hsl(220, 60%, 40%)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#shadowGlow)"
          initial={{ opacity: 0.5 }}
          animate={{ 
            opacity: [0.5, 1, 0.5],
            strokeWidth: [4, 6, 4]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* Inner bright line */}
        <motion.line
          x1={startPoint.x}
          y1={startPoint.y}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke="hsl(220, 80%, 70%)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ opacity: 0.8 }}
          animate={{ 
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.g>
    );
  };

  // Render special effect for 1st Sabbath (day 7)
  const renderFirstSabbathEffect = () => {
    // 1st Sabbath is day 7 of month 1
    const firstSabbathDay = 7;
    const sabbathAngle = ((firstSabbathDay - 1) / 364) * 360 + rotations.wheel2;
    
    const outerPoint = polarToCartesian(cx, cy, radii.wheel1Outer + 5, sabbathAngle);
    const innerPoint = polarToCartesian(cx, cy, radii.wheel2Inner - 5, sabbathAngle);

    return (
      <motion.g>
        {/* Pulsing golden ring around 1st Sabbath */}
        <motion.circle
          cx={(outerPoint.x + innerPoint.x) / 2}
          cy={(outerPoint.y + innerPoint.y) / 2}
          r="15"
          fill="none"
          stroke={COLORS.SABBATH}
          strokeWidth="2"
          filter="url(#sabbathGlow)"
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ 
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* Inner star burst effect */}
        <motion.circle
          cx={(outerPoint.x + innerPoint.x) / 2}
          cy={(outerPoint.y + innerPoint.y) / 2}
          r="8"
          fill={COLORS.SABBATH}
          fillOpacity="0.3"
          initial={{ scale: 1 }}
          animate={{ 
            scale: [1, 1.5, 1],
            fillOpacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.g>
    );
  };

  const seasonLeader = SEASONAL_LEADERS[calendarData.season - 1];
  const monthLeader = MONTHLY_LEADERS[calendarData.month - 1];

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center">
        {/* Main Wheel */}
        <div 
          ref={containerRef}
          className="relative" 
          style={{ width: size, height: size }}
          onMouseMove={handleMouseMove}
        >
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
              <filter id="shadowGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feFlood floodColor="hsl(220, 70%, 60%)" floodOpacity="0.7" result="glowColor" />
                <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                <feMerge>
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="sabbathGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feFlood floodColor={COLORS.SABBATH} floodOpacity="0.8" result="glowColor" />
                <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                <feMerge>
                  <feMergeNode in="softGlow" />
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
            {renderWheel1MansCount()}      {/* Man's Count (1-361 + 2 dot days) */}
            {renderWheel2MonthDays()}       {/* Month Days (30/30/31 pattern) */}
            {renderWheel3YHVHCount()}       {/* YHVH's Count (1-364 + 2 dot days) */}
            {renderWheel4Weeks()}           {/* 52 Weeks with numbers */}
            {renderWheel5MonthlyLeaders()}  {/* 12 Monthly Leaders */}
            {renderWheel6SeasonalLeaders()} {/* 4 Seasonal Leaders */}
            {renderWheel7Parts18()}         {/* 18 Parts of Day */}
            {renderWheel8Parts4Variable()}  {/* 4 Parts of Day (VARIABLE) */}
            {renderCenter()}
            {renderDaysOutOfTime()}
            {renderShadowLine()}            {/* Shadow line on Month 1 Day 1 */}
            {renderFirstSabbathEffect()}    {/* Special effect on 1st Sabbath */}

            {/* Current position indicator at top - pointing DOWN toward wheel */}
            <polygon
              points={`${cx},${padding + 25} ${cx - 8},${padding + 10} ${cx + 8},${padding + 10}`}
              fill={COLORS.CURRENT_HIGHLIGHT}
              filter="url(#glow)"
            />
          </svg>

          {/* Cursor-following Hover Tooltip */}
          <AnimatePresence>
            {hoveredElement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl max-w-xs pointer-events-none"
                style={{
                  left: Math.min(mousePosition.x + 15, size - 200),
                  top: Math.min(mousePosition.y + 15, size - 100),
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
                {hoveredElement.type === 'yhvhCount' && (
                  <div>
                    <h4 className="font-bold text-primary">YHVH's Count: {hoveredElement.data.day}</h4>
                    {hoveredElement.data.isDay364 && <p className="text-sm text-purple-400">Special Day 364</p>}
                    {hoveredElement.data.isCurrent && <p className="text-sm text-amber-400">Current Day</p>}
                  </div>
                )}
                {hoveredElement.type === 'dotDay' && (
                  <div>
                    <h4 className="font-bold text-primary">{hoveredElement.data.name}</h4>
                    <p className="text-sm text-purple-300">Dot {hoveredElement.data.dotNumber}</p>
                    <p className="text-sm text-muted-foreground">{hoveredElement.data.description}</p>
                    <p className="text-xs text-muted-foreground">Wheel: {hoveredElement.data.wheel}</p>
                  </div>
                )}
                {hoveredElement.type === 'specialDay' && (
                  <div>
                    <h4 className="font-bold text-primary">Man's Day {hoveredElement.data.mansDay}</h4>
                    <p className="text-sm text-blue-300">YHVH's Day {hoveredElement.data.yhvhDay}</p>
                    <p className="text-sm text-green-300">Week Day {hoveredElement.data.weekDay}</p>
                    <p className="text-sm text-muted-foreground">{hoveredElement.data.description}</p>
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
            <span>Man's Count: {calendarData.mansCount} / 361</span>
            <span>•</span>
            <span>YHVH's Count: {calendarData.dayOfYear} / 364</span>
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
