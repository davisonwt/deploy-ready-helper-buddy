// YHWH Eternal Wheel — Beautiful Canvas Calendar Visualization
'use client';

import { useEffect, useRef, useState } from 'react';
import SunCalc from 'suncalc';
import { getDayInfo, getAllDays } from '@/utils/sacredCalendar';

const brass = '#b48f50';
const wood = '#3c2a1a';
const glow = '#ffddaa';
const crimson = '#c41e3a';
const silver = '#e5e5ff';
const shabbat = '#f0f0ff';
const dayColor = '#ffd700'; // Golden for day
const eveningColor = '#ff8c42'; // Orange for evening
const nightColor = '#1a1a2e'; // Dark blue for night
const morningColor = '#ff6b9d'; // Pink for morning

interface YHWHWheelProps {
  onDataUpdate?: (data: {
    year: number;
    month: number;
    day: number;
    weekday: number;
    part: number;
    watch: string;
    drift: string;
    timestamp: string;
  }) => void;
}

export default function YHWHWheel({ onDataUpdate }: YHWHWheelProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const t0Ref = useRef(Date.now());
  const [lat, setLat] = useState(31.7683); // Jerusalem default
  const [lon, setLon] = useState(35.2137);

  useEffect(() => {
    // Get user location
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      () => {}, // Keep default if fails
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(rect.width, 400); // Ensure minimum size
      const h = Math.max(rect.height, 400);
      canvas.width = w;
      canvas.height = h;
    };

    resize();
    window.addEventListener('resize', resize);
    
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }

    // Ensure canvas is visible immediately
    canvas.style.display = 'block';
    canvas.style.visibility = 'visible';
    canvas.style.opacity = '1';

    // Draw perfect circle segment
    function drawCircleSegment(
      cx: number, cy: number, 
      innerRadius: number, outerRadius: number,
      startAngle: number, endAngle: number,
      color: string, lineWidth: number = 1
    ) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(cx, cy, (innerRadius + outerRadius) / 2, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    }

    // Draw filled circle segment
    function drawFilledSegment(
      cx: number, cy: number,
      innerRadius: number, outerRadius: number,
      startAngle: number, endAngle: number,
      fillColor: string, strokeColor?: string, strokeWidth: number = 1
    ) {
      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(startAngle) * innerRadius,
        cy + Math.sin(startAngle) * innerRadius
      );
      ctx.arc(cx, cy, innerRadius, startAngle, endAngle);
      ctx.lineTo(
        cx + Math.cos(endAngle) * outerRadius,
        cy + Math.sin(endAngle) * outerRadius
      );
      ctx.arc(cx, cy, outerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    let animationId: number;
    
    function animate() {
      animationId = requestAnimationFrame(animate);

      const now = Date.now();
      const secs = (now - t0Ref.current) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(w, h) * 0.45;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, w, h);

      // Calculate current day and time
      const SPRING_TEQUFAH_2025 = new Date('2025-03-20T09:37:00Z');
      const msSinceSpring = now - SPRING_TEQUFAH_2025.getTime();
      const totalDays = Math.floor(msSinceSpring / 86400000);
      const creatorDay = (totalDays % 364) + 1;
      const isInDaysOutOfTime = (totalDays % 365) > 363; // Days 364-365 are out of time
      
      // Get sunrise/sunset for current part of day
      const times = SunCalc.getTimes(new Date(now), lat, lon);
      const currentTime = now;
      const sunrise = times.sunrise.getTime();
      const sunset = times.sunset.getTime();
      const nextSunrise = times.sunrise.getTime() + 86400000;
      
      let partOfDay: 'Day' | 'Evening' | 'Night' | 'Morning' = 'Day';
      if (currentTime >= sunrise && currentTime < sunset) {
        partOfDay = 'Day';
      } else if (currentTime >= sunset && currentTime < sunset + (nextSunrise - sunset) * 0.25) {
        partOfDay = 'Evening';
      } else if (currentTime >= sunset + (nextSunrise - sunset) * 0.25 && currentTime < sunrise) {
        partOfDay = 'Night';
      } else {
        partOfDay = 'Morning';
      }

      const dayInfo = getDayInfo(creatorDay);
      const allDays = getAllDays(2); // Assuming Tequfah on day 2

      // OUTER CIRCLE: 366 solar day parts (364 Creator days + 2 days out of time)
      const outerRadius = maxRadius;
      const outerInnerRadius = maxRadius * 0.92;
      const solarDays = 366;
      const anglePerDay = (Math.PI * 2) / solarDays;

      // Draw each solar day with 4 parts - PERFECT CIRCLES
      for (let i = 0; i < solarDays; i++) {
        const dayIndex = i;
        const dayData = allDays[dayIndex] || allDays[Math.min(dayIndex, allDays.length - 1)];
        const startAngle = -Math.PI / 2 + i * anglePerDay;
        const endAngle = startAngle + anglePerDay;
        
        // Each day has 4 parts: Day, Evening, Night, Morning
        const partAngle = anglePerDay / 4;
        
        // Determine colors based on day type
        let dayPartColor = dayColor;
        let eveningPartColor = eveningColor;
        let nightPartColor = nightColor;
        let morningPartColor = morningColor;
        
        // Highlight current day
        const isCurrentDay = (dayIndex === creatorDay - 1 && !isInDaysOutOfTime) || 
                           (isInDaysOutOfTime && dayIndex >= 364);
        const strokeWidth = isCurrentDay ? 2 : 0.5;
        
        // Color adjustments for special days
        if (dayData.isSabbath || dayData.isHighSabbath) {
          dayPartColor = shabbat;
          eveningPartColor = shabbat;
          nightPartColor = shabbat;
          morningPartColor = shabbat;
        } else if (dayData.isFeast) {
          dayPartColor = '#ff6b6b';
          eveningPartColor = '#ff6b6b';
          nightPartColor = '#ff6b6b';
          morningPartColor = '#ff6b6b';
        } else if (dayData.isTequfah) {
          dayPartColor = '#00ff00';
          eveningPartColor = '#00ff00';
          nightPartColor = '#00ff00';
          morningPartColor = '#00ff00';
        } else if (dayData.isIntercalary || dayData.isDayOutOfTime) {
          dayPartColor = '#9b59b6';
          eveningPartColor = '#9b59b6';
          nightPartColor = '#9b59b6';
          morningPartColor = '#9b59b6';
        }

        // Draw 4 parts of the day - using perfect arc segments
        drawFilledSegment(cx, cy, outerInnerRadius, outerRadius, startAngle, startAngle + partAngle, dayPartColor, brass, strokeWidth);
        drawFilledSegment(cx, cy, outerInnerRadius, outerRadius, startAngle + partAngle, startAngle + partAngle * 2, eveningPartColor, brass, strokeWidth);
        drawFilledSegment(cx, cy, outerInnerRadius, outerRadius, startAngle + partAngle * 2, startAngle + partAngle * 3, nightPartColor, brass, strokeWidth);
        drawFilledSegment(cx, cy, outerInnerRadius, outerRadius, startAngle + partAngle * 3, endAngle, morningPartColor, brass, strokeWidth);
      }
      
      // Draw outer circle border for perfect circle appearance
      ctx.strokeStyle = brass;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw inner circle border
      ctx.beginPath();
      ctx.arc(cx, cy, outerInnerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Golden sunrise line indicator
      const yearProgress = (creatorDay - 1) / 364;
      const yearAngle = -Math.PI / 2 + yearProgress * Math.PI * 2;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(yearAngle) * outerRadius * 1.05, cy + Math.sin(yearAngle) * outerRadius * 1.05);
      ctx.stroke();

      // INNER RINGS (keeping existing functionality)
      const innerRadius1 = maxRadius * 0.75;
      const innerRadius2 = maxRadius * 0.70;
      
      // 24 priestly courses ring
      const lunarAngle = -secs / (86400 * 354) * Math.PI * 2;
      const course = Math.floor(secs / (86400 * 7)) % 24;
      drawCircleSegment(cx, cy, innerRadius1, innerRadius1 + 8, 0, Math.PI * 2, wood, 6);
      ctx.strokeStyle = crimson;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = innerRadius1 * 0.08;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius1 + 4, lunarAngle + course * Math.PI * 2 / 24, lunarAngle + (course + 1) * Math.PI * 2 / 24);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Silver moon pointer
      ctx.strokeStyle = silver;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(lunarAngle) * (innerRadius1 + 4), cy + Math.sin(lunarAngle) * (innerRadius1 + 4));
      ctx.stroke();

      // 18-part yowm ring
      const yowmAngle = -secs / (80 * 60) * Math.PI * 2;
      const part = (secs / (80 * 60)) % 18;
      ctx.strokeStyle = `hsl(${part * 20},100%,65%)`;
      ctx.lineWidth = innerRadius2 * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius2, yowmAngle, yowmAngle + Math.PI * 2 / 18);
      ctx.stroke();

      // 7-day week ring
      const weekAngle = -secs / 86400 * Math.PI * 2 / 7;
      const weekRadius = maxRadius * 0.55;
      drawCircleSegment(cx, cy, weekRadius, weekRadius + 6, 0, Math.PI * 2, brass, 5);
      if (Math.floor(secs / 86400 % 7) === 6) {
        ctx.strokeStyle = shabbat;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(secs * 4);
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, weekRadius + 3, weekAngle, weekAngle + Math.PI * 2 / 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 4 watches hand
      const watch = Math.floor((secs % 86400) / 21600);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(-Math.PI / 2 + watch * Math.PI / 2) * maxRadius * 0.35,
        cy + Math.sin(-Math.PI / 2 + watch * Math.PI / 2) * maxRadius * 0.35
      );
      ctx.stroke();

      // Calculate data for external display - use dayInfo for accurate month/day
      const drift = ((secs / 86400 / 364) * 10 % 10).toFixed(1);
      const watchName = ['Day', 'Evening', 'Night', 'Morning'][watch];
      const nowDate = new Date(now);
      
      // Format time in South Africa timezone (Africa/Johannesburg)
      const saTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(nowDate);
      
      const saDateStr = `${saTime.find(p => p.type === 'year')?.value}-${saTime.find(p => p.type === 'month')?.value}-${saTime.find(p => p.type === 'day')?.value} ${saTime.find(p => p.type === 'hour')?.value}:${saTime.find(p => p.type === 'minute')?.value}:${saTime.find(p => p.type === 'second')?.value}`;
      const dayOfWeek = nowDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Africa/Johannesburg' });
      
      // Call callback with wheel data
      if (onDataUpdate) {
        onDataUpdate({
          year: 6028,
          month: dayInfo.month,
          day: dayInfo.dayOfMonth,
          weekday: dayInfo.weekDay,
          part: Math.floor(part) + 1,
          watch: watchName,
          drift,
          timestamp: `${saDateStr} ${dayOfWeek}`
        });
      }
    }

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [lat, lon]);

  return (
    <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ width: '100%', height: '100%', minWidth: '400px', minHeight: '400px', maxWidth: '600px', maxHeight: '600px', aspectRatio: '1 / 1', zIndex: 10, position: 'relative', backgroundColor: 'transparent' }}>
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full" 
        style={{ 
          position: 'relative', 
          zIndex: 10, 
          display: 'block',
          pointerEvents: 'auto'
        }} 
      />
    </div>
  );
}
