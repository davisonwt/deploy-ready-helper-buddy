/**
 * CalendarWheel Component - Beautiful Design
 * 
 * Renders eight nested SVG rings representing the sacred calendar system:
 * 1. 366-dot solar orbit (year ring)
 * 2. 52-week Sabbath cycle
 * 3. 12-month gate
 * 4. 7-week omer count
 * 5. 1-week creation cycle
 * 6. 18-part day wheel (with icons)
 * 7. 4-part daily quadrants
 * 8. Center pair of out-of-time days
 * 
 * Each ring rotates anti-clockwise at real-world speed, synced to server timestamp.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCreatorTime } from '@/utils/customTime';
import { getCreatorDate } from '@/utils/customCalendar';
import { getDayInfo } from '@/utils/sacredCalendar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sun, Moon, BookOpen, Settings, MessageSquare, Sprout, Globe, 
  Mountain, TreePine, Leaf, Wrench, User, Clock, Star, Heart,
  Zap, Music, Coffee, Sunset, Sunrise
} from 'lucide-react';
import './CalendarWheel.css';

interface CalendarData {
  timestamp: string;
  year: number;
  dayOfYear: number;
  month: number;
  dayOfMonth: number;
  weekday: number;
  part: number;
  quadrant: number;
  season: string;
}

interface CalendarWheelProps {
  timezone?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: number;
  className?: string;
  onDataUpdate?: (data: CalendarData | null) => void;
}

const API_ENDPOINT = '/api/calendar/now';
const FETCH_THROTTLE_MS = 60000; // 1 minute

// Icons for 18-part day wheel
const DAY_PART_ICONS = [
  Sun,        // Part 1 - Dawn
  Sunrise,    // Part 2 - Morning
  Coffee,     // Part 3 - Breakfast
  BookOpen,   // Part 4 - Study
  Settings,   // Part 5 - Work
  MessageSquare, // Part 6 - Communication
  Sprout,     // Part 7 - Growth
  Globe,      // Part 8 - World
  Mountain,   // Part 9 - Nature
  TreePine,   // Part 10 - Trees
  Leaf,       // Part 11 - Plants
  Wrench,     // Part 12 - Work
  User,       // Part 13 - People
  Clock,      // Part 14 - Time
  Star,       // Part 15 - Stars
  Moon,       // Part 16 - Moon
  Sunset,     // Part 17 - Evening
  Heart       // Part 18 - Rest
];

export default function CalendarWheel({
  timezone = 'Africa/Johannesburg',
  theme = 'auto',
  size = 400,
  className = '',
  onDataUpdate
}: CalendarWheelProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [serverTimestamp, setServerTimestamp] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  
  const animationFrameRef = useRef<number>();
  const lastFetchRef = useRef<number>(0);
  const reducedMotion = useRef<boolean>(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Fetch server timestamp
  const fetchServerTime = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < FETCH_THROTTLE_MS && calendarData) {
      return;
    }

    try {
      // Use Supabase client's invoke method which handles auth automatically
      const { data, error: invokeError } = await supabase.functions.invoke('calendar-now', {
        body: {}
      });
      
      if (invokeError) {
        // If invoke fails, try direct fetch as fallback
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          const url = `${supabaseUrl}/functions/v1/calendar-now`;
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          };
          
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error('Failed to fetch server time');
          const fetchData = await response.json();
          
          setServerTimestamp(new Date(fetchData.timestamp).getTime());
          lastFetchRef.current = now;
          
          // Calculate calendar data from server timestamp
          const serverDate = new Date(fetchData.timestamp);
          const customTime = getCreatorTime(serverDate);
          const creatorDate = getCreatorDate(serverDate);
          
          // Calculate creatorDay (day of year) from month and day
          const MONTHS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
          let creatorDay = 0;
          for (let m = 0; m < creatorDate.month - 1; m++) {
            creatorDay += MONTHS[m];
          }
          creatorDay += creatorDate.day;
          
          const dayInfo = getDayInfo(creatorDay);
          
      const calendarInfo = {
        timestamp: fetchData.timestamp,
        year: creatorDate.year,
        dayOfYear: creatorDay,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: customTime.part,
        quadrant: Math.ceil(customTime.part / 4.5),
        season: getSeason(creatorDate.month)
      };
      
      setCalendarData(calendarInfo);
      if (onDataUpdate) {
        onDataUpdate(calendarInfo);
      }
      
      setIsLoading(false);
      return;
        }
        throw invokeError;
      }
      
      if (!data) throw new Error('No data received from server');
      
      setServerTimestamp(new Date(data.timestamp).getTime());
      lastFetchRef.current = now;
      
      // Calculate calendar data from server timestamp
      const serverDate = new Date(data.timestamp);
      const customTime = getCreatorTime(serverDate);
      const creatorDate = getCreatorDate(serverDate);
      
      // Calculate creatorDay (day of year) from month and day
      const MONTHS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
      let creatorDay = 0;
      for (let m = 0; m < creatorDate.month - 1; m++) {
        creatorDay += MONTHS[m];
      }
      creatorDay += creatorDate.day;
      
      const dayInfo = getDayInfo(creatorDay);
      
      const calendarInfo = {
        timestamp: data.timestamp,
        year: creatorDate.year,
        dayOfYear: creatorDay,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: customTime.part,
        quadrant: Math.ceil(customTime.part / 4.5),
        season: getSeason(creatorDate.month)
      };
      
      setCalendarData(calendarInfo);
      if (onDataUpdate) {
        onDataUpdate(calendarInfo);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching server time:', err);
      // Fallback to client-side calculation
      const now = new Date();
      const customTime = getCreatorTime(now);
      const creatorDate = getCreatorDate(now);
      
      // Calculate creatorDay (day of year) from month and day
      const MONTHS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
      let creatorDay = 0;
      for (let m = 0; m < creatorDate.month - 1; m++) {
        creatorDay += MONTHS[m];
      }
      creatorDay += creatorDate.day;
      
      const calendarInfo = {
        timestamp: now.toISOString(),
        year: creatorDate.year,
        dayOfYear: creatorDay,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: customTime.part,
        quadrant: Math.ceil(customTime.part / 4.5),
        season: getSeason(creatorDate.month)
      };
      
      setCalendarData(calendarInfo);
      if (onDataUpdate) {
        onDataUpdate(calendarInfo);
      }
      
      setIsLoading(false);
    }
  }, [calendarData]);

  // Get season name from month
  const getSeason = (month: number): string => {
    if (month >= 1 && month <= 3) return 'Spring';
    if (month >= 4 && month <= 6) return 'Summer';
    if (month >= 7 && month <= 9) return 'Autumn';
    return 'Winter';
  };

  // Calculate rotation angles for each ring
  const getRotations = useCallback((timestamp: number): Record<string, number> => {
    const date = new Date(timestamp);
    const customTime = getCreatorTime(date);
    const creatorDate = getCreatorDate(date);
    
    // Calculate creatorDay (day of year) from month and day
    const MONTHS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
    let creatorDay = 0;
    for (let m = 0; m < creatorDate.month - 1; m++) {
      creatorDay += MONTHS[m];
    }
    creatorDay += creatorDate.day;
    
    const dayInfo = getDayInfo(creatorDay);
    
    // Year ring: 365 days per rotation (anti-clockwise)
    const dayOfYear = creatorDay;
    const yearRotation = -((dayOfYear - 1) / 365) * 360;
    
    // Week ring: 7 days per rotation
    const weekRotation = -((creatorDate.weekDay - 1) / 7) * 360;
    
    // Month gate: 12 months per rotation
    const monthRotation = -((creatorDate.month - 1) / 12) * 360;
    
    // Omer count: 7 weeks per rotation
    const weekOfYear = Math.ceil(dayOfYear / 7);
    const omerRotation = -((weekOfYear % 7) / 7) * 360;
    
    // Creation cycle: 1 week per rotation
    const creationRotation = weekRotation;
    
    // Day wheel: 18 parts per rotation (24 hours)
    const partRotation = -((customTime.part - 1) / 18) * 360;
    
    // Daily quadrants: 4 parts per rotation
    const quadrantRotation = -((Math.ceil(customTime.part / 4.5) - 1) / 4) * 360;
    
    // Out-of-time days: static (days 365-366)
    const outOfTimeRotation = dayOfYear > 364 ? -((dayOfYear - 364) / 2) * 360 : 0;
    
    return {
      year: yearRotation,
      week: weekRotation,
      month: monthRotation,
      omer: omerRotation,
      creation: creationRotation,
      day: partRotation,
      quadrant: quadrantRotation,
      outOfTime: outOfTimeRotation
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (reducedMotion.current) {
      // For reduced motion, update once per minute
      const interval = setInterval(() => {
        setServerTimestamp(prev => prev + 60000);
      }, 60000);
      return () => clearInterval(interval);
    }

    // Smooth animation with requestAnimationFrame
    const animate = () => {
      setServerTimestamp(prev => prev + 100); // Update every 100ms
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, FETCH_THROTTLE_MS);
    return () => clearInterval(interval);
  }, [fetchServerTime]);

  const rotations = getRotations(serverTimestamp);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  if (isLoading) {
    return (
      <div className={`calendar-wheel-loading ${className}`} style={{ width: size, height: size }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div 
      className={`calendar-wheel ${className}`}
      style={{ 
        width: size, 
        height: size,
        '--calendar-size': `${size}px`,
        '--calendar-theme': theme
      } as React.CSSProperties}
      onMouseLeave={() => setTooltip(null)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Beautiful gradients */}
          <radialGradient id="sun-gradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <stop offset="50%" stopColor="#FFA500" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.6" />
          </radialGradient>
          
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FF8C00" />
          </linearGradient>
          
          <linearGradient id="silver-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8E8E8" />
            <stop offset="50%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#A0A0A0" />
          </linearGradient>
          
          <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="50%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#2F4F4F" />
          </linearGradient>
          
          {/* Glow effects */}
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Portal gradient for timeless days */}
          <radialGradient id="portal-gradient">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Background gradient */}
        <rect width={size} height={size} fill="url(#blue-gradient)" opacity="0.1" rx={size / 10} />

        {/* Ring 1: 366-dot solar orbit (outermost) */}
        <g transform={`rotate(${rotations.year} ${centerX} ${centerY})`}>
          {Array.from({ length: 366 }).map((_, i) => {
            const angle = (i / 366) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.98 * Math.cos(rad);
            const y = centerY + radius * 0.98 * Math.sin(rad);
            const isSabbath = (i + 1) % 7 === 0;
            
            return (
              <circle
                key={`year-${i}`}
                cx={x}
                cy={y}
                r={isSabbath ? 2.5 : 1.5}
                fill={isSabbath ? "#FFD700" : "#FFFFFF"}
                opacity={isSabbath ? 1 : 0.6}
                filter={isSabbath ? "url(#glow-gold)" : undefined}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Day ${i + 1} of Year ${calendarData?.year || 6028}`
                  });
                }}
              />
            );
          })}
          {/* Label */}
          <text x={centerX} y={centerY - radius * 0.88} textAnchor="middle" fill="#FFFFFF" fontSize="10" opacity="0.8" fontWeight="500">
            366-DOT RING DRAGS
          </text>
        </g>

        {/* Ring 2: 52-week Sabbath cycle */}
        <g transform={`rotate(${rotations.week} ${centerX} ${centerY})`}>
          {Array.from({ length: 52 }).map((_, i) => {
            const angle = (i / 52) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.88 * Math.cos(rad);
            const y = centerY + radius * 0.88 * Math.sin(rad);
            
            return (
              <circle
                key={`week-${i}`}
                cx={x}
                cy={y}
                r={3}
                fill="url(#gold-gradient)"
                filter="url(#glow-gold)"
                opacity="0.9"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Sabbath Week ${i + 1}`
                  });
                }}
              />
            );
          })}
          {/* Label */}
          <text x={centerX} y={centerY - radius * 0.78} textAnchor="middle" fill="#FFFFFF" fontSize="9" opacity="0.7">
            52-WEEK RING
          </text>
        </g>

        {/* Ring 3: 12-month gate */}
        <g transform={`rotate(${rotations.month} ${centerX} ${centerY})`}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.78 * Math.cos(rad);
            const y = centerY + radius * 0.78 * Math.sin(rad);
            
            return (
              <g key={`month-${i}`}>
                <rect
                  x={x - 10}
                  y={y - 10}
                  width={20}
                  height={20}
                  fill="url(#silver-gradient)"
                  opacity="0.8"
                  transform={`rotate(${angle} ${x} ${y})`}
                  rx="2"
                  filter="url(#glow-white)"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10,
                      text: `Month ${i + 1} Gate`
                    });
                  }}
                />
              </g>
            );
          })}
          {/* Label with sound wave icon */}
          <text x={centerX} y={centerY - radius * 0.68} textAnchor="middle" fill="#FFFFFF" fontSize="9" opacity="0.7">
            MONTH RING CLICKS
          </text>
        </g>

        {/* Ring 4: 7-week omer count */}
        <g transform={`rotate(${rotations.omer} ${centerX} ${centerY})`}>
          {Array.from({ length: 7 }).map((_, i) => {
            const angle = (i / 7) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.68 * Math.cos(rad);
            const y = centerY + radius * 0.68 * Math.sin(rad);
            
            return (
              <polygon
                key={`omer-${i}`}
                points={`${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}`}
                fill="#8B4513"
                opacity="0.8"
                filter="url(#glow-white)"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Omer Week ${i + 1}`
                  });
                }}
              />
            );
          })}
          {/* Label */}
          <text x={centerX} y={centerY - radius * 0.58} textAnchor="middle" fill="#FFFFFF" fontSize="8" opacity="0.6">
            7-WEEK RING TICKS
          </text>
        </g>

        {/* Ring 5: 1-week creation cycle */}
        <g transform={`rotate(${rotations.creation} ${centerX} ${centerY})`}>
          {Array.from({ length: 7 }).map((_, i) => {
            const angle = (i / 7) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.58 * Math.cos(rad);
            const y = centerY + radius * 0.58 * Math.sin(rad);
            
            return (
              <circle
                key={`creation-${i}`}
                cx={x}
                cy={y}
                r={i === 6 ? 6 : 4}
                fill={i === 6 ? "#FFD700" : "#4A90E2"}
                filter={i === 6 ? "url(#glow-gold)" : "url(#glow-white)"}
                opacity="0.9"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Creation Day ${i + 1}${i === 6 ? ' (Sabbath)' : ''}`
                  });
                }}
              />
            );
          })}
          {/* Label */}
          <text x={centerX} y={centerY - radius * 0.48} textAnchor="middle" fill="#FFFFFF" fontSize="8" opacity="0.6">
            SINGLE-WEEK RING PULSES
          </text>
        </g>

        {/* Ring 6: 18-part day wheel with icons */}
        <g transform={`rotate(${rotations.day} ${centerX} ${centerY})`}>
          {/* Glowing lines from center */}
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.48 * Math.cos(rad);
            const y = centerY + radius * 0.48 * Math.sin(rad);
            
            return (
              <line
                key={`line-${i}`}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="#FFFFFF"
                strokeWidth="0.5"
                opacity="0.3"
              />
            );
          })}
          
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.48 * Math.cos(rad);
            const y = centerY + radius * 0.48 * Math.sin(rad);
            const isCurrent = i + 1 === calendarData?.part;
            const IconComponent = DAY_PART_ICONS[i] || Clock;
            
            return (
              <g key={`part-${i}`}>
                {/* Segment background */}
                <path
                  d={`M ${centerX} ${centerY} L ${centerX + radius * 0.38 * Math.cos(rad - Math.PI / 18)} ${centerY + radius * 0.38 * Math.sin(rad - Math.PI / 18)} A ${radius * 0.38} ${radius * 0.38} 0 0 1 ${centerX + radius * 0.38 * Math.cos(rad + Math.PI / 18)} ${centerY + radius * 0.38 * Math.sin(rad + Math.PI / 18)} Z`}
                  fill={isCurrent ? "rgba(255, 215, 0, 0.2)" : "rgba(255, 255, 255, 0.05)"}
                  stroke={isCurrent ? "#FFD700" : "rgba(255, 255, 255, 0.2)"}
                  strokeWidth={isCurrent ? "2" : "0.5"}
                />
                {/* Icon */}
                <g transform={`translate(${x}, ${y}) rotate(${angle + 90})`}>
                  <IconComponent 
                    size={isCurrent ? 16 : 12} 
                    stroke={isCurrent ? "#FFD700" : "#FFFFFF"}
                    fill={isCurrent ? "#FFD700" : "none"}
                    opacity={isCurrent ? 1 : 0.7}
                    filter={isCurrent ? "url(#glow-gold)" : undefined}
                  />
                </g>
                {/* Number */}
                <text
                  x={centerX + radius * 0.42 * Math.cos(rad)}
                  y={centerY + radius * 0.42 * Math.sin(rad)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isCurrent ? "#FFD700" : "#FFFFFF"}
                  fontSize="10"
                  fontWeight={isCurrent ? "bold" : "normal"}
                  filter={isCurrent ? "url(#glow-gold)" : undefined}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
          {/* Label */}
          <text x={centerX} y={centerY - radius * 0.35} textAnchor="middle" fill="#FFFFFF" fontSize="9" opacity="0.7" fontWeight="500">
            18-PART DAY WHEEL TURNS DAILY
          </text>
        </g>

        {/* Ring 7: 4-part daily quadrants */}
        <g transform={`rotate(${rotations.quadrant} ${centerX} ${centerY})`}>
          {Array.from({ length: 4 }).map((_, i) => {
            const angle = (i / 4) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.32 * Math.cos(rad);
            const y = centerY + radius * 0.32 * Math.sin(rad);
            
            return (
              <rect
                key={`quadrant-${i}`}
                x={x - 12}
                y={y - 12}
                width={24}
                height={24}
                fill="url(#silver-gradient)"
                opacity="0.6"
                transform={`rotate(${angle} ${x} ${y})`}
                rx="3"
                filter="url(#glow-white)"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Quadrant ${i + 1}/4`
                  });
                }}
              />
            );
          })}
          {/* Label */}
          <text x={centerX} y={centerY - radius * 0.25} textAnchor="middle" fill="#FFFFFF" fontSize="8" opacity="0.6">
            4-PART MICRO-WHEEL SPINS FASTEST
          </text>
        </g>

        {/* Ring 8: Center timeless days (golden sun core) */}
        <g transform={`rotate(${rotations.outOfTime} ${centerX} ${centerY})`}>
          {/* Outer golden ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.15}
            fill="url(#sun-gradient)"
            filter="url(#glow-gold)"
            opacity="0.9"
          />
          {/* Inner sun icon */}
          <g transform={`translate(${centerX}, ${centerY})`}>
            <Sun size={radius * 0.2} stroke="#FFD700" fill="#FFD700" opacity="0.9" />
          </g>
          {/* Timeless days circles */}
          <circle
            cx={centerX}
            cy={centerY - radius * 0.12}
            r={radius * 0.06}
            fill="url(#portal-gradient)"
            filter="url(#glow-gold)"
            opacity="0.8"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
                text: "Day Out of Time 1"
              });
            }}
          />
          <circle
            cx={centerX}
            cy={centerY + radius * 0.12}
            r={radius * 0.06}
            fill="url(#portal-gradient)"
            filter="url(#glow-gold)"
            opacity="0.8"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
                text: "Day Out of Time 2"
              });
            }}
          />
          {/* Label */}
          <text x={centerX} y={centerY + radius * 0.22} textAnchor="middle" fill="#FFD700" fontSize="7" opacity="0.8" fontWeight="500">
            INNERMOST TIMELESS DAYS WAIT
          </text>
        </g>

        {/* Anti-clockwise motion indicator arrows */}
        {Array.from({ length: 3 }).map((_, i) => {
          const angle = (i * 120) - 90;
          const rad = (angle * Math.PI) / 180;
          const x = centerX + radius * 0.7 * Math.cos(rad);
          const y = centerY + radius * 0.7 * Math.sin(rad);
          
          return (
            <path
              key={`arrow-${i}`}
              d={`M ${x} ${y} L ${x - 15 * Math.cos(rad)} ${y - 15 * Math.sin(rad)} L ${x - 8 * Math.cos(rad) + 5 * Math.sin(rad)} ${y - 8 * Math.sin(rad) - 5 * Math.cos(rad)} L ${x - 8 * Math.cos(rad) - 5 * Math.sin(rad)} ${y - 8 * Math.sin(rad) + 5 * Math.cos(rad)} Z`}
              fill="#FFFFFF"
              opacity="0.6"
              filter="url(#glow-white)"
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="calendar-wheel-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
