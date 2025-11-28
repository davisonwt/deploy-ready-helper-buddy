/**
 * CalendarWheel Component
 * 
 * Renders eight nested SVG rings representing the sacred calendar system:
 * 1. 366-dot solar orbit (year ring)
 * 2. 52-week Sabbath cycle
 * 3. 12-month gate
 * 4. 7-week omer count
 * 5. 1-week creation cycle
 * 6. 18-part day wheel
 * 7. 4-part daily quadrants
 * 8. Center pair of out-of-time days
 * 
 * Each ring rotates anti-clockwise at real-world speed, synced to server timestamp.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCreatorTime } from '@/utils/customTime';
import { getCreatorDate } from '@/utils/customCalendar';
import { getDayInfo } from '@/utils/sacredCalendar';
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
}

// Use Supabase Edge Function directly or proxy
const API_ENDPOINT = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-now`
  : '/api/calendar/now';
const FETCH_THROTTLE_MS = 60000; // 1 minute

export default function CalendarWheel({
  timezone = 'Africa/Johannesburg',
  theme = 'auto',
  size = 400,
  className = ''
}: CalendarWheelProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [serverTimestamp, setServerTimestamp] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const url = supabaseUrl 
        ? `${supabaseUrl}/functions/v1/calendar-now`
        : API_ENDPOINT;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Include apikey for Supabase Edge Functions (required even for public functions)
      // Authorization header is optional but helps if function requires it
      if (supabaseAnonKey) {
        headers['apikey'] = supabaseAnonKey;
        // Try with auth first, fallback to no auth if 401
        headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
      }
      
      let response = await fetch(url, { headers });
      
      // If 401, try without Authorization header (public function)
      if (response.status === 401 && supabaseAnonKey) {
        const publicHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        };
        response = await fetch(url, { headers: publicHeaders });
      }
      if (!response.ok) throw new Error('Failed to fetch server time');
      
      const data = await response.json();
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
      
      setCalendarData({
        timestamp: data.timestamp,
        year: creatorDate.year,
        dayOfYear: creatorDay,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: customTime.part,
        quadrant: Math.ceil(customTime.part / 4.5), // 4 parts per quadrant
        season: getSeason(creatorDate.month)
      });
      
      setIsLoading(false);
      setError(null);
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
      
      setCalendarData({
        timestamp: now.toISOString(),
        year: creatorDate.year,
        dayOfYear: creatorDay,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        weekday: creatorDate.weekDay,
        part: customTime.part,
        quadrant: Math.ceil(customTime.part / 4.5),
        season: getSeason(creatorDate.month)
      });
      
      setIsLoading(false);
      setError('Using client time (server unavailable)');
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
    const weekRotation = -((dayInfo.weekDay - 1) / 7) * 360;
    
    // Month gate: 12 months per rotation
    const monthRotation = -((dayInfo.month - 1) / 12) * 360;
    
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
          {/* Metallic gradients */}
          <linearGradient id="metallic-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--metallic-gold-light, #d4af37)" />
            <stop offset="50%" stopColor="var(--metallic-gold, #b8941d)" />
            <stop offset="100%" stopColor="var(--metallic-gold-dark, #8b6914)" />
          </linearGradient>
          <linearGradient id="metallic-silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--metallic-silver-light, #e8e8e8)" />
            <stop offset="50%" stopColor="var(--metallic-silver, #c0c0c0)" />
            <stop offset="100%" stopColor="var(--metallic-silver-dark, #808080)" />
          </linearGradient>
          
          {/* Glowing Sabbath dots */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Portal colors */}
          <radialGradient id="portal-gradient">
            <stop offset="0%" stopColor="var(--portal-center, #4a90e2)" />
            <stop offset="100%" stopColor="var(--portal-edge, #1a1a2e)" />
          </radialGradient>
        </defs>

        {/* Ring 1: 366-dot solar orbit (year ring) */}
        <g transform={`rotate(${rotations.year} ${centerX} ${centerY})`}>
          {Array.from({ length: 366 }).map((_, i) => {
            const angle = (i / 366) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.95 * Math.cos(rad);
            const y = centerY + radius * 0.95 * Math.sin(rad);
            const isSabbath = (i + 1) % 7 === 0;
            
            return (
              <circle
                key={`year-${i}`}
                cx={x}
                cy={y}
                r={isSabbath ? 3 : 2}
                fill={isSabbath ? "var(--sabbath-glow, #ffd700)" : "var(--solar-dot, #888)"}
                filter={isSabbath ? "url(#glow)" : undefined}
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
        </g>

        {/* Ring 2: 52-week Sabbath cycle */}
        <g transform={`rotate(${rotations.week} ${centerX} ${centerY})`}>
          {Array.from({ length: 52 }).map((_, i) => {
            const angle = (i / 52) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.85 * Math.cos(rad);
            const y = centerY + radius * 0.85 * Math.sin(rad);
            
            return (
              <circle
                key={`week-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill="url(#metallic-gold)"
                filter="url(#glow)"
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
        </g>

        {/* Ring 3: 12-month gate */}
        <g transform={`rotate(${rotations.month} ${centerX} ${centerY})`}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.75 * Math.cos(rad);
            const y = centerY + radius * 0.75 * Math.sin(rad);
            
            return (
              <rect
                key={`month-${i}`}
                x={x - 8}
                y={y - 8}
                width={16}
                height={16}
                fill="url(#metallic-silver)"
                transform={`rotate(${angle} ${x} ${y})`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Month ${i + 1} Gate`
                  });
                }}
              />
            );
          })}
        </g>

        {/* Ring 4: 7-week omer count */}
        <g transform={`rotate(${rotations.omer} ${centerX} ${centerY})`}>
          {Array.from({ length: 7 }).map((_, i) => {
            const angle = (i / 7) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.65 * Math.cos(rad);
            const y = centerY + radius * 0.65 * Math.sin(rad);
            
            return (
              <polygon
                key={`omer-${i}`}
                points={`${x},${y - 6} ${x + 6},${y + 4} ${x - 6},${y + 4}`}
                fill="var(--omer-color, #8b4513)"
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
        </g>

        {/* Ring 5: 1-week creation cycle */}
        <g transform={`rotate(${rotations.creation} ${centerX} ${centerY})`}>
          {Array.from({ length: 7 }).map((_, i) => {
            const angle = (i / 7) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.55 * Math.cos(rad);
            const y = centerY + radius * 0.55 * Math.sin(rad);
            
            return (
              <circle
                key={`creation-${i}`}
                cx={x}
                cy={y}
                r={5}
                fill={i === 6 ? "var(--sabbath-glow, #ffd700)" : "var(--creation-day, #4a90e2)"}
                filter={i === 6 ? "url(#glow)" : undefined}
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
        </g>

        {/* Ring 6: 18-part day wheel */}
        <g transform={`rotate(${rotations.day} ${centerX} ${centerY})`}>
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.45 * Math.cos(rad);
            const y = centerY + radius * 0.45 * Math.sin(rad);
            const isCurrent = i + 1 === calendarData?.part;
            
            return (
              <circle
                key={`part-${i}`}
                cx={x}
                cy={y}
                r={isCurrent ? 6 : 4}
                fill={isCurrent ? "var(--current-part, #ff6b6b)" : "var(--part-color, #666)"}
                stroke={isCurrent ? "var(--current-part-glow, #ffd700)" : "none"}
                strokeWidth={isCurrent ? 2 : 0}
                filter={isCurrent ? "url(#glow)" : undefined}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    text: `Part ${i + 1}/18${isCurrent ? ' (Current)' : ''}`
                  });
                }}
              />
            );
          })}
        </g>

        {/* Ring 7: 4-part daily quadrants */}
        <g transform={`rotate(${rotations.quadrant} ${centerX} ${centerY})`}>
          {Array.from({ length: 4 }).map((_, i) => {
            const angle = (i / 4) * 360;
            const rad = (angle * Math.PI) / 180;
            const x = centerX + radius * 0.35 * Math.cos(rad);
            const y = centerY + radius * 0.35 * Math.sin(rad);
            
            return (
              <rect
                key={`quadrant-${i}`}
                x={x - 10}
                y={y - 10}
                width={20}
                height={20}
                fill="var(--quadrant-color, #4a90e2)"
                opacity={0.7}
                transform={`rotate(${angle} ${x} ${y})`}
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
        </g>

        {/* Ring 8: Center pair of out-of-time days */}
        <g transform={`rotate(${rotations.outOfTime} ${centerX} ${centerY})`}>
          <circle
            cx={centerX}
            cy={centerY - 15}
            r={8}
            fill="url(#portal-gradient)"
            filter="url(#glow)"
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
            cy={centerY + 15}
            r={8}
            fill="url(#portal-gradient)"
            filter="url(#glow)"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
                text: "Day Out of Time 2"
              });
            }}
          />
        </g>
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
            background: 'var(--tooltip-bg, rgba(0, 0, 0, 0.9))',
            color: 'var(--tooltip-text, #fff)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="calendar-wheel-error" style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: 'var(--error-color, #ff6b6b)',
          opacity: 0.7
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

