import React, { useState, useEffect } from 'react';
import { Sun, Moon, Flame, Calendar, Clock } from 'lucide-react';

interface EnochianDateState {
  month: number;
  day: number;
  year: number;
  weekDay: number;
  sabbathWeek: number;
  dayPart: string;
  totalDayOfYear: number;
  isIntercalary: boolean;
  timelessDay?: number;
  monthName?: string;
  season?: string;
  portal?: number;
  dayOf30Cycle?: number; // For circle 2 (30-day cycle)
  dayOf31Cycle?: number; // For circle 4 (31-day cycle)
}

const EnochianWheelCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sunriseTime, setSunriseTime] = useState<Date | null>(null);
  const [sunsetTime, setSunsetTime] = useState<Date | null>(null);
  const [enochianDate, setEnochianDate] = useState<EnochianDateState>({ 
    month: 1, day: 1, year: 2025, weekDay: 4, sabbathWeek: 1,
    dayPart: 'Yom', totalDayOfYear: 1, isIntercalary: false
  });

  // Season colors
  const seasons = {
    Spring: { color: '#10b981', name: 'Spring', angle: 0 },
    Summer: { color: '#f59e0b', name: 'Summer', angle: 90 },
    Fall: { color: '#ef4444', name: 'Fall', angle: 180 },
    Winter: { color: '#3b82f6', name: 'Winter', angle: 270 }
  };

  const monthStructure = [
    { num: 1, days: 30, portal: 4, season: 'Spring', name: 'Aviv' },
    { num: 2, days: 30, portal: 5, season: 'Spring', name: 'Ziv' },
    { num: 3, days: 31, portal: 6, season: 'Spring', name: 'Sivan' },
    { num: 4, days: 30, portal: 6, season: 'Summer', name: 'Tammuz' },
    { num: 5, days: 30, portal: 5, season: 'Summer', name: 'Av' },
    { num: 6, days: 31, portal: 4, season: 'Summer', name: 'Elul' },
    { num: 7, days: 30, portal: 3, season: 'Fall', name: 'Ethanim' },
    { num: 8, days: 30, portal: 2, season: 'Fall', name: 'Bul' },
    { num: 9, days: 31, portal: 1, season: 'Fall', name: 'Kislev' },
    { num: 10, days: 30, portal: 1, season: 'Winter', name: 'Tevet' },
    { num: 11, days: 30, portal: 2, season: 'Winter', name: 'Shevat' },
    { num: 12, days: 31, portal: 3, season: 'Winter', name: 'Adar' }
  ];

  // Get sunrise and sunset times
  const getSunriseSunsetTimes = async (date: Date): Promise<{ sunrise: Date; sunset: Date }> => {
    // For now, use provided times: sunrise 05:13, sunset 19:26
    // In production, integrate with sunrise-sunset API based on user location
    const sunrise = new Date(date);
    sunrise.setHours(5, 13, 0, 0);
    
    const sunset = new Date(date);
    sunset.setHours(19, 26, 0, 0);
    
    return { sunrise, sunset };
  };

  const getSpringEquinox = (year: number) => new Date(year, 2, 20);

  const getDayPart = (currentTime: Date, sunrise: Date, sunset: Date): string => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    const sunriseMinutes = sunrise.getHours() * 60 + sunrise.getMinutes();
    const sunsetMinutes = sunset.getHours() * 60 + sunset.getMinutes();
    
    // Day part calculation based on actual sunrise/sunset
    if (timeInMinutes >= sunriseMinutes && timeInMinutes < sunsetMinutes) {
      return 'Yom'; // Day (between sunrise and sunset)
    } else if (timeInMinutes >= sunsetMinutes && timeInMinutes < sunsetMinutes + 120) {
      return 'Erev'; // Evening (2 hours after sunset)
    } else if (timeInMinutes >= sunsetMinutes + 120 || timeInMinutes < sunriseMinutes - 120) {
      return 'Laylah'; // Night
    } else {
      return 'Boqer'; // Morning (2 hours before sunrise)
    }
  };

  const convertToEnochian = async (gregorianDate: Date, sunrise: Date, sunset: Date): Promise<EnochianDateState> => {
    // IMPORTANT: Day starts at sunrise, not midnight!
    // Compare current time with today's sunrise time
    const currentHour = gregorianDate.getHours();
    const currentMinute = gregorianDate.getMinutes();
    const sunriseHour = sunrise.getHours();
    const sunriseMinute = sunrise.getMinutes();
    
    // Convert to minutes for accurate comparison
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const sunriseTimeMinutes = sunriseHour * 60 + sunriseMinute;
    
    // If current time is before sunrise, we're still on the previous calendar day
    let effectiveDate = new Date(gregorianDate);
    if (currentTimeMinutes < sunriseTimeMinutes) {
      // Still on previous day - subtract one day
      effectiveDate.setDate(effectiveDate.getDate() - 1);
      console.log(`[Enochian Calendar] Before sunrise (${currentHour}:${currentMinute.toString().padStart(2, '0')} < ${sunriseHour}:${sunriseMinute.toString().padStart(2, '0')}), using previous day`);
    }

    const year = effectiveDate.getFullYear();
    const springEquinox = getSpringEquinox(year);
    // Calculate days since equinox using the effective date (date portion only, normalized to noon)
    const effectiveDateNoon = new Date(effectiveDate);
    effectiveDateNoon.setHours(12, 0, 0, 0);
    const equinoxNoon = new Date(springEquinox);
    equinoxNoon.setHours(12, 0, 0, 0);
    const daysSinceEquinox = Math.floor((effectiveDateNoon.getTime() - equinoxNoon.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceEquinox < 0) {
      const prevEquinox = getSpringEquinox(year - 1);
      const daysSincePrevEquinox = Math.floor((effectiveDate.getTime() - prevEquinox.getTime()) / (1000 * 60 * 60 * 24));
      return calculateEnochianDate(daysSincePrevEquinox, year - 1, effectiveDate, sunrise, sunset);
    } else if (daysSinceEquinox >= 364) {
      const timelessDay = daysSinceEquinox - 363;
      return { 
        month: 12, 
        day: 31, 
        year, 
        weekDay: 7, 
        sabbathWeek: 52, 
        timelessDay,
        isIntercalary: true,
        totalDayOfYear: 365 + (timelessDay - 1),
        dayPart: getDayPart(gregorianDate, sunrise, sunset),
        dayOf30Cycle: ((timelessDay - 1) % 30) + 1,
        dayOf31Cycle: ((timelessDay - 1) % 31) + 1
      };
    }
    
    return calculateEnochianDate(daysSinceEquinox, year, effectiveDate, sunrise, sunset);
  };

  const calculateEnochianDate = (dayCount: number, year: number, gregorianDate: Date, sunrise: Date, sunset: Date): EnochianDateState => {
    let remainingDays = dayCount;
    let totalDayOfYear = dayCount + 1;
    
    for (const m of monthStructure) {
      if (remainingDays < m.days) {
        const day = remainingDays + 1;
        // Weekday calculation: Year starts on Day 4 (weekday 4)
        // Day 1 = weekday 4, Day 2 = weekday 5, Day 3 = weekday 6, Day 4 = weekday 7 (Sabbath), etc.
        // Formula matches sacredCalendar.ts: ((totalDayOfYear - 1 + 3) % 7) + 1
        // This maps: 0->4, 1->5, 2->6, 3->7, 4->1, 5->2, 6->3
        const weekDay = ((totalDayOfYear - 1 + 3) % 7) + 1;
        
        // Debug logging
        console.log(`[Enochian Calendar] Day ${totalDayOfYear}: weekDay = ${weekDay}, calculation: ((${totalDayOfYear} - 1 + 3) % 7) + 1 = ${((totalDayOfYear - 1 + 3) % 7) + 1}`);
        const sabbathWeek = Math.floor((totalDayOfYear - 1) / 7) + 1;
        const isIntercalary = totalDayOfYear === 91 || totalDayOfYear === 182 || 
                              totalDayOfYear === 273 || totalDayOfYear === 364;
        
        return { 
          month: m.num, 
          day, 
          year, 
          weekDay, 
          sabbathWeek, 
          portal: m.portal, 
          season: m.season,
          monthName: m.name,
          dayPart: getDayPart(gregorianDate, sunrise, sunset),
          totalDayOfYear,
          isIntercalary,
          dayOf30Cycle: ((day - 1) % 30) + 1,
          dayOf31Cycle: m.days === 31 ? day : ((day - 1) % 31) + 1
        };
      }
      remainingDays -= m.days;
    }
    
    return { 
      month: 12, 
      day: 31, 
      year, 
      weekDay: 7, 
      sabbathWeek: 52, 
      totalDayOfYear: 364,
      dayPart: getDayPart(gregorianDate, sunrise, sunset),
      isIntercalary: false,
      dayOf30Cycle: 30,
      dayOf31Cycle: 31
    };
  };

  useEffect(() => {
    const updateCalendar = async () => {
      const now = new Date();
      // Get today's sunrise/sunset times
      const { sunrise, sunset } = await getSunriseSunsetTimes(now);
      
      setSunriseTime(sunrise);
      setSunsetTime(sunset);
      setCurrentDate(now);
      
      // convertToEnochian will handle the sunrise-based day calculation internally
      const enochian = await convertToEnochian(now, sunrise, sunset);
      setEnochianDate(enochian);
    };

    updateCalendar();
    const timer = setInterval(updateCalendar, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const centerX = 350;
  const centerY = 350;
  
  // Calculate rotations and positions
  const dayOfYearAngle = ((enochianDate.totalDayOfYear - 1) / 364) * 360;
  const weekAngle = ((enochianDate.sabbathWeek - 1) / 52) * 360;
  const dayOfWeekAngle = ((enochianDate.weekDay - 1) / 7) * 360;
  const dayPartAngle = (() => {
    const parts = ['Yom', 'Erev', 'Laylah', 'Boqer'];
    const index = parts.indexOf(enochianDate.dayPart);
    return (index / 4) * 360;
  })();
  
  // Season background rotation (1/4 per 91 days)
  const seasonRotation = ((enochianDate.totalDayOfYear - 1) % 91) / 91 * 90;
  const currentSeason = enochianDate.season || 'Spring';
  const seasonAngle = seasons[currentSeason as keyof typeof seasons]?.angle || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4" style={{ background: 'radial-gradient(circle at center, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-amber-800 mb-2 flex items-center justify-center gap-3 drop-shadow-lg">
            <Sun className="w-12 h-12 animate-pulse text-amber-600" />
            The Creator's Calendar
            <Moon className="w-10 h-10 text-amber-700" />
          </h1>
          <p className="text-amber-900/70 text-sm font-medium">7-Circle Time Wheel 🌟 Day Begins at Sunrise</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="bg-gradient-to-br from-amber-100/90 via-orange-50/90 to-yellow-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-4 border-amber-400/50" style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(251, 191, 36, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
            }}>
              <svg width="100%" height="100%" viewBox="0 0 700 700" className="mx-auto" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))' }}>
                <defs>
                  <linearGradient id="metallicSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" stopOpacity="1"/>
                    <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#64748b" stopOpacity="1"/>
                  </linearGradient>
                  
                  <linearGradient id="metallicGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef9c3" stopOpacity="1"/>
                    <stop offset="50%" stopColor="#fde047" stopOpacity="0.95"/>
                    <stop offset="100%" stopColor="#eab308" stopOpacity="1"/>
                  </linearGradient>
                  
                  <radialGradient id="centerGlow">
                    <stop offset="0%" stopColor="#fef9c3" stopOpacity="1"/>
                    <stop offset="50%" stopColor="#fde047" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#eab308" stopOpacity="0"/>
                  </radialGradient>
                  
                  <filter id="glowWhite" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  <filter id="dropShadowDeep" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
                    <feOffset dx="4" dy="6"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Elevated circle shadow - creates depth effect */}
                  <filter id="elevatedShadow" x="-150%" y="-150%" width="400%" height="400%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="12"/>
                    <feOffset dx="0" dy="8"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.6"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Radial gradient for elevated circle depth */}
                  <radialGradient id="elevatedCircleGradient" cx="50%" cy="30%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4"/>
                    <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.3"/>
                    <stop offset="70%" stopColor="#94a3b8" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#475569" stopOpacity="0.6"/>
                  </radialGradient>
                  
                  {/* Highlight for top edge of elevated circle */}
                  <linearGradient id="elevatedHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6"/>
                    <stop offset="20%" stopColor="#f1f5f9" stopOpacity="0.4"/>
                    <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#64748b" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>

                {/* Background: 4 Seasons rotating */}
                <g style={{ transform: `rotate(${seasonRotation + seasonAngle}deg)`, transformOrigin: `${centerX}px ${centerY}px` }}>
                  {Object.values(seasons).map((season, i) => {
                    const angle = (i * 90 - 90) * Math.PI / 180;
                    const startAngle = angle - Math.PI / 2;
                    const endAngle = angle + Math.PI / 2;
                    const largeArc = 1;
                    const x1 = centerX + 340 * Math.cos(startAngle);
                    const y1 = centerY + 340 * Math.sin(startAngle);
                    const x2 = centerX + 340 * Math.cos(endAngle);
                    const y2 = centerY + 340 * Math.sin(endAngle);
                    
                    return (
                      <g key={season.name}>
                        <path
                          d={`M ${centerX} ${centerY} L ${x1} ${y1} A 340 340 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={season.color}
                          opacity="0.15"
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Circle 1: 366 dots/lines - Day 254 of 364 year */}
                {/* Top middle line is Day 1, counting anti-clockwise */}
                {/* Elevated outer circle with 3D depth effect */}
                <g>
                  {/* Shadow layer - creates the elevated effect */}
                  <circle cx={centerX} cy={centerY + 4} r="332" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="6" opacity="0.4"/>
                  
                  {/* Main elevated circle with gradient and highlight */}
                  <circle 
                    cx={centerX} 
                    cy={centerY} 
                    r="330" 
                    fill="url(#elevatedCircleGradient)" 
                    stroke="url(#metallicSilver)" 
                    strokeWidth="4" 
                    filter="url(#elevatedShadow)"
                    opacity="0.95"
                  />
                  
                  {/* Top highlight for 3D effect */}
                  <circle 
                    cx={centerX} 
                    cy={centerY - 2} 
                    r="328" 
                    fill="none" 
                    stroke="url(#elevatedHighlight)" 
                    strokeWidth="2" 
                    opacity="0.7"
                  />
                  
                  {/* Inner shadow to create depth */}
                  <circle 
                    cx={centerX} 
                    cy={centerY + 2} 
                    r="328" 
                    fill="none" 
                    stroke="rgba(0,0,0,0.2)" 
                    strokeWidth="1" 
                    opacity="0.5"
                  />
                  {Array.from({ length: 366 }, (_, i) => {
                    const dayNumber = i + 1;
                    // Start at top (-90 degrees) and count anti-clockwise
                    // Anti-clockwise means decreasing angle: -90, -90-delta, -90-2*delta, etc.
                    const angleRad = (-90 - i * (360/366)) * Math.PI / 180;
                    const angleDeg = (-90 - i * (360/366));
                    const x1 = centerX + 325 * Math.cos(angleRad);
                    const y1 = centerY + 325 * Math.sin(angleRad);
                    const x2 = centerX + 335 * Math.cos(angleRad);
                    const y2 = centerY + 335 * Math.sin(angleRad);
                    const isCurrentDay = dayNumber === enochianDate.totalDayOfYear;
                    const isDay365Or366 = dayNumber === 365 || dayNumber === 366;
                    
                    // For current day: show number instead of line/dot
                    // Number is positioned exactly where the line would be (radius 325-335, centered at 330)
                    if (isCurrentDay) {
                      // Position at the center of where the line would be (radius 330)
                      const textX = centerX + 330 * Math.cos(angleRad);
                      const textY = centerY + 330 * Math.sin(angleRad);
                      // Rotate to align with radial line direction (pointing outward from center)
                      // angleDeg is already the angle from top, so rotate by that amount
                      return (
                        <text
                          key={`day-${i}`}
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-sm fill-black font-bold"
                          transform={`rotate(${angleDeg + 90} ${textX} ${textY})`}
                        >
                          {dayNumber}
                        </text>
                      );
                    }
                    
                    // Days 365 and 366 are dots (when not current day)
                    if (isDay365Or366) {
                      const dotX = centerX + 330 * Math.cos(angleRad);
                      const dotY = centerY + 330 * Math.sin(angleRad);
                      return (
                        <circle
                          key={`day-${i}`}
                          cx={dotX}
                          cy={dotY}
                          r={3}
                          fill="#000000"
                          opacity={0.8}
                        />
                      );
                    }
                    
                    // All other days: show line
                    return (
                      <line
                        key={`day-${i}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#000000"
                        strokeWidth={2}
                        opacity={0.8}
                      />
                    );
                  })}
                  <text x={centerX} y={centerY - 310} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    Day {enochianDate.totalDayOfYear} of 364
                  </text>
                </g>

                {/* Circle 2: 30 days (1-30) */}
                <g>
                  <circle cx={centerX} cy={centerY} r="290" fill="none" stroke="url(#metallicGold)" strokeWidth="25" filter="url(#dropShadowDeep)"/>
                  {Array.from({ length: 30 }, (_, i) => {
                    const angle = (i * (360/30) - 90) * Math.PI / 180;
                    const x = centerX + 290 * Math.cos(angle);
                    const y = centerY + 290 * Math.sin(angle);
                    const dayNum = i + 1;
                    const isCurrent = dayNum === (enochianDate.dayOf30Cycle || enochianDate.day);
                    
                    return (
                      <g key={`day30-${i}`}>
                        <circle cx={x} cy={y} r={isCurrent ? 8 : 4} fill={isCurrent ? '#fbbf24' : '#94a3b8'} filter={isCurrent ? "url(#glowStrong)" : undefined}/>
                        {i % 5 === 0 && (
                          <text x={x} y={y - 12} textAnchor="middle" className="text-[8px] fill-amber-900 font-bold">
                            {dayNum}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text x={centerX} y={centerY - 270} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    Day {(enochianDate.dayOf30Cycle || enochianDate.day)} of 30
                  </text>
                </g>

                {/* Circle 3: 52 weeks (364 dots) */}
                <g>
                  <circle cx={centerX} cy={centerY} r="250" fill="none" stroke="url(#metallicSilver)" strokeWidth="20" filter="url(#dropShadowDeep)"/>
                  {Array.from({ length: 364 }, (_, i) => {
                    const angle = (i * (360/364) - 90) * Math.PI / 180;
                    const x = centerX + 250 * Math.cos(angle);
                    const y = centerY + 250 * Math.sin(angle);
                    const weekNum = Math.floor(i / 7) + 1;
                    const isCurrentWeek = weekNum === enochianDate.sabbathWeek;
                    
                    return (
                      <circle
                        key={`week-${i}`}
                        cx={x}
                        cy={y}
                        r={isCurrentWeek ? 3 : 1}
                        fill={isCurrentWeek ? '#60a5fa' : '#94a3b8'}
                        filter={isCurrentWeek ? "url(#glowStrong)" : undefined}
                      />
                    );
                  })}
                  <text x={centerX} y={centerY - 230} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    Week {enochianDate.sabbathWeek} of 52
                  </text>
                </g>

                {/* Circle 4: 31 days (1-31) */}
                <g>
                  <circle cx={centerX} cy={centerY} r="210" fill="none" stroke="url(#metallicGold)" strokeWidth="18" filter="url(#dropShadowDeep)"/>
                  {Array.from({ length: 31 }, (_, i) => {
                    const angle = (i * (360/31) - 90) * Math.PI / 180;
                    const x = centerX + 210 * Math.cos(angle);
                    const y = centerY + 210 * Math.sin(angle);
                    const dayNum = i + 1;
                    const isCurrent = dayNum === (enochianDate.dayOf31Cycle || enochianDate.day);
                    
                    return (
                      <g key={`day31-${i}`}>
                        <circle cx={x} cy={y} r={isCurrent ? 7 : 3} fill={isCurrent ? '#fbbf24' : '#94a3b8'} filter={isCurrent ? "url(#glowStrong)" : undefined}/>
                        {i % 5 === 0 && (
                          <text x={x} y={y - 4} textAnchor="middle" className="text-[8px] fill-amber-900 font-bold">
                            {dayNum}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text x={centerX} y={centerY - 190} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    Day {(enochianDate.dayOf31Cycle || enochianDate.day)} of Month {enochianDate.month}
                  </text>
                </g>

                {/* Circle 5: 7 days (1,2,3,4,5,6,s) */}
                <g style={{ transform: `rotate(${dayOfWeekAngle}deg)`, transformOrigin: `${centerX}px ${centerY}px` }}>
                  <circle cx={centerX} cy={centerY} r="170" fill="none" stroke="url(#metallicGold)" strokeWidth="15" filter="url(#dropShadowDeep)"/>
                  {['1', '2', '3', '4', '5', '6', 's'].map((day, i) => {
                    const angle = (i * (360/7) - 90) * Math.PI / 180;
                    const x = centerX + 170 * Math.cos(angle);
                    const y = centerY + 170 * Math.sin(angle);
                    const isCurrent = i + 1 === enochianDate.weekDay;
                    
                    return (
                      <g key={`weekday-${i}`}>
                        <circle cx={x} cy={y} r={isCurrent ? 12 : 8} fill={day === 's' ? '#3b82f6' : (isCurrent ? '#fbbf24' : '#475569')} filter={isCurrent ? "url(#glowStrong)" : undefined}/>
                        <text x={x} y={y + 3} textAnchor="middle" className="text-[10px] fill-white font-bold">
                          {day}
                        </text>
                      </g>
                    );
                  })}
                  <text x={centerX} y={centerY - 150} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    Day {enochianDate.weekDay === 7 ? 'Sabbath' : enochianDate.weekDay} of the week
                  </text>
                </g>

                {/* Circle 6: 4 parts (day/evening/night/morning) */}
                <g style={{ transform: `rotate(${dayPartAngle}deg)`, transformOrigin: `${centerX}px ${centerY}px` }}>
                  <circle cx={centerX} cy={centerY} r="130" fill="none" stroke="url(#metallicSilver)" strokeWidth="12" filter="url(#dropShadowDeep)"/>
                  {['Yom', 'Erev', 'Laylah', 'Boqer'].map((part, i) => {
                    const angle = (i * (360/4) - 90) * Math.PI / 180;
                    const x = centerX + 130 * Math.cos(angle);
                    const y = centerY + 130 * Math.sin(angle);
                    const isCurrent = part === enochianDate.dayPart;
                    const colors = { Yom: '#fbbf24', Erev: '#f97316', Laylah: '#1e40af', Boqer: '#06b6d4' };
                    
                    return (
                      <g key={`part-${i}`}>
                        <circle cx={x} cy={y} r={isCurrent ? 10 : 6} fill={colors[part as keyof typeof colors]} filter={isCurrent ? "url(#glowStrong)" : undefined}/>
                        <text x={x} y={y + 3} textAnchor="middle" className="text-[9px] fill-white font-bold">
                          {part}
                        </text>
                      </g>
                    );
                  })}
                  <text x={centerX} y={centerY - 110} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    {enochianDate.dayPart}
                  </text>
                </g>

                {/* Circle 7: Inner circle - 2 parts (Hello-Yasef & Asfa'el) */}
                <g>
                  <circle cx={centerX} cy={centerY} r="90" fill="url(#centerGlow)" filter="url(#glowStrong)"/>
                  <circle cx={centerX} cy={centerY} r="80" fill="url(#metallicGold)" stroke="url(#metallicGold)" strokeWidth="4" filter="url(#dropShadowDeep)"/>
                  
                  {/* Split circle into 2 parts */}
                  <path d={`M ${centerX} ${centerY} L ${centerX} ${centerY - 80} A 80 80 0 0 1 ${centerX} ${centerY + 80} Z`} fill="#a855f7" opacity="0.3"/>
                  <path d={`M ${centerX} ${centerY} L ${centerX} ${centerY + 80} A 80 80 0 0 1 ${centerX} ${centerY - 80} Z`} fill="#f59e0b" opacity="0.3"/>
                  
                  <text x={centerX} y={centerY - 20} textAnchor="middle" className="text-xs fill-purple-700 font-bold">
                    Hello-Yasef
                  </text>
                  <text x={centerX} y={centerY + 20} textAnchor="middle" className="text-xs fill-amber-800 font-bold">
                    Asfa'el
                  </text>
                  
                  {enochianDate.timelessDay && (
                    <text x={centerX} y={centerY + 5} textAnchor="middle" className="text-lg fill-purple-600 font-bold">
                      DOOT {enochianDate.timelessDay}
                    </text>
                  )}
                </g>

                {/* Center display */}
                <text x={centerX} y={centerY - 10} textAnchor="middle" className="text-4xl fill-amber-900 font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  {enochianDate.day}
                </text>
                <text x={centerX} y={centerY + 15} textAnchor="middle" className="text-sm fill-amber-800 font-semibold">
                  {enochianDate.monthName}
                </text>
              </svg>
            </div>
          </div>

          {/* Info Panels */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-100/90 via-orange-50/90 to-yellow-50/90 backdrop-blur-xl rounded-xl shadow-xl p-5 border-2 border-amber-400/50">
              <h3 className="text-amber-800 font-bold mb-3 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-600" />
                7-Circle Display
              </h3>
              <div className="space-y-2 text-xs text-amber-900/80">
                <p><strong>Circle 1:</strong> Day {enochianDate.totalDayOfYear} of 364</p>
                <p><strong>Circle 2 (30-day):</strong> Day {(enochianDate.dayOf30Cycle || enochianDate.day)}</p>
                <p><strong>Circle 3 (52 weeks):</strong> Week {enochianDate.sabbathWeek}</p>
                <p><strong>Circle 4 (31-day):</strong> Day {(enochianDate.dayOf31Cycle || enochianDate.day)} of Month {enochianDate.month}</p>
                <p><strong>Circle 5 (7 days):</strong> Day {enochianDate.weekDay === 7 ? 'Sabbath' : enochianDate.weekDay} of the week</p>
                <p><strong>Circle 6 (4 parts):</strong> {enochianDate.dayPart}</p>
                <p><strong>Circle 7 (DOOT):</strong> {enochianDate.timelessDay ? `Day ${enochianDate.timelessDay}` : 'Regular Day'}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-100/90 via-orange-50/90 to-yellow-50/90 backdrop-blur-xl rounded-xl shadow-xl p-5 border-2 border-amber-400/50">
              <h3 className="text-amber-800 font-bold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Time Info
              </h3>
              <div className="space-y-2 text-xs text-amber-900/80">
                <p><strong>Current Time:</strong> {currentDate.toLocaleTimeString()}</p>
                <p><strong>Sunrise:</strong> {sunriseTime ? `${String(sunriseTime.getHours()).padStart(2, '0')}:${String(sunriseTime.getMinutes()).padStart(2, '0')}` : '05:13'}</p>
                <p><strong>Sunset:</strong> {sunsetTime ? `${String(sunsetTime.getHours()).padStart(2, '0')}:${String(sunsetTime.getMinutes()).padStart(2, '0')}` : '19:26'}</p>
                <p><strong>Day Begins:</strong> At Sunrise</p>
                <p><strong>Season:</strong> {enochianDate.season}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnochianWheelCalendar;
