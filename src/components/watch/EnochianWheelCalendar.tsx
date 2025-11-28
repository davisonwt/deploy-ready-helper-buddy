import React, { useState, useEffect } from 'react';
import { Sun, Moon, Flame, Calendar, Clock } from 'lucide-react';

const EnochianWheelCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rotation, setRotation] = useState({ 
    outer: 0, 
    year: 0,
    months: 0, 
    weeks: 0, 
    days: 0, 
    dayWheel: 0 
  });
  const [enochianDate, setEnochianDate] = useState({ 
    month: 1, day: 1, year: 2025, weekDay: 4, sabbathWeek: 1,
    dayPart: 'Yôm', totalDayOfYear: 1, isIntercalary: false
  });

  // Constellation symbols for each season
  const constellations = {
    Spring: { name: 'Aries', symbol: '♈', icon: '🐏', color: '#10b981' },
    Summer: { name: 'Cancer', symbol: '♋', icon: '🦀', color: '#f59e0b' },
    Fall: { name: 'Libra', symbol: '♎', icon: '⚖️', color: '#ef4444' },
    Winter: { name: 'Capricorn', symbol: '♑', icon: '🐐', color: '#3b82f6' }
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

  const getSpringEquinox = (year: number) => new Date(year, 2, 20);

  const convertToEnochian = (gregorianDate: Date) => {
    const year = gregorianDate.getFullYear();
    const springEquinox = getSpringEquinox(year);
    const daysSinceEquinox = Math.floor((gregorianDate.getTime() - springEquinox.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceEquinox < 0) {
      const prevEquinox = getSpringEquinox(year - 1);
      const daysSincePrevEquinox = Math.floor((gregorianDate.getTime() - prevEquinox.getTime()) / (1000 * 60 * 60 * 24));
      return calculateEnochianDate(daysSincePrevEquinox, year - 1, gregorianDate);
    } else if (daysSinceEquinox >= 364) {
      // Timeless/Intercalary days (Hello-Yasef & Asfael)
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
        dayPart: getDayPart(gregorianDate.getHours())
      };
    }
    
    return calculateEnochianDate(daysSinceEquinox, year, gregorianDate);
  };

  const getDayPart = (hour: number) => {
    if (hour >= 6 && hour < 18) return 'Yôm';
    if (hour >= 18 && hour < 20) return 'Erev';
    if (hour >= 20 || hour < 4) return 'Laylah';
    return 'Boqer';
  };

  const calculateEnochianDate = (dayCount: number, year: number, gregorianDate: Date) => {
    let remainingDays = dayCount;
    let totalDayOfYear = dayCount + 1;
    
    for (const m of monthStructure) {
      if (remainingDays < m.days) {
        const day = remainingDays + 1;
        const weekDay = ((totalDayOfYear - 1) % 7) + 1;
        const sabbathWeek = Math.floor((totalDayOfYear - 1) / 7) + 1;
        
        // Check if this is an intercalary day (days 91, 182, 273, 364)
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
          dayPart: getDayPart(gregorianDate.getHours()),
          totalDayOfYear,
          isIntercalary
        };
      }
      remainingDays -= m.days;
    }
    
    return { month: 12, day: 31, year, weekDay: 7, sabbathWeek: 52, totalDayOfYear: 364 };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);
      setEnochianDate(convertToEnochian(now));
      
      setRotation(prev => ({
        outer: (prev.outer + 0.02) % 360,
        year: (prev.year - 0.01) % 360,
        months: (prev.months - 0.08) % 360,
        weeks: (prev.weeks + 0.12) % 360,
        days: (prev.days - 0.15) % 360,
        dayWheel: (prev.dayWheel + 0.5) % 360
      }));
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const getCreationDay = (weekDay: number) => {
    const days = ['', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 1', 'Day 2', 'Day 3'];
    return days[weekDay] || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-amber-400 mb-2 flex items-center justify-center gap-3 drop-shadow-lg">
            <Sun className="w-12 h-12 animate-pulse" />
            The Creator's Calendar
            <Moon className="w-10 h-10 text-blue-300" />
          </h1>
          <p className="text-gray-300 text-sm">364-Day Priestly Wheel • Solar-Locked Sabbaths</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Wheel */}
          <div className="xl:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl shadow-2xl p-8 border-4 border-amber-600/30">
              <svg width="100%" height="100%" viewBox="0 0 700 700" className="mx-auto">
                <defs>
                  <radialGradient id="centerGlow">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Depth and shadow filters */}
                  <filter id="dropShadowOuter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
                    <feOffset dx="2" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  <filter id="dropShadowMiddle" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="1.5" dy="1.5" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  <filter id="dropShadowInner" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="1" dy="1" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Radial gradients for 3D depth effect */}
                  <radialGradient id="ringGradientOuter" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2"/>
                    <stop offset="50%" stopColor="#d97706" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#78350f" stopOpacity="0.9"/>
                  </radialGradient>
                  
                  <radialGradient id="ringGradientMiddle" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15"/>
                    <stop offset="50%" stopColor="#475569" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9"/>
                  </radialGradient>
                  
                  <radialGradient id="ringGradientInner" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1"/>
                    <stop offset="50%" stopColor="#334155" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9"/>
                  </radialGradient>
                  
                  {/* Linear gradients for elevated ring edges */}
                  <linearGradient id="ringEdgeTop" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.3"/>
                  </linearGradient>
                  
                  <linearGradient id="ringEdgeBottom" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#78350f" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.2"/>
                  </linearGradient>
                </defs>

                {/* Outer 366-dot ring (dragging) */}
                <g transform={`rotate(${rotation.outer} 350 350)`}>
                  {Array.from({ length: 366 }).map((_, i) => {
                    const angle = (i * (360/366) - 90) * Math.PI / 180;
                    const x = 350 + 330 * Math.cos(angle);
                    const y = 350 + 330 * Math.sin(angle);
                    const isSpecial = (i + 1) === 91 || (i + 1) === 182 || (i + 1) === 273 || (i + 1) === 364;
                    return (
                      <circle 
                        key={i} 
                        cx={x} 
                        cy={y} 
                        r={isSpecial ? "4" : "2"} 
                        fill={isSpecial ? "#fbbf24" : "#64748b"}
                        opacity={isSpecial ? "1" : "0.4"}
                      >
                        {isSpecial && <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>}
                      </circle>
                    );
                  })}
                </g>

                {/* Year ring background - deepest layer */}
                <circle cx="350" cy="350" r="310" fill="none" stroke="#1e293b" strokeWidth="2" opacity="0.5"/>

                {/* Main calendar circle - elevated outer ring with depth */}
                <circle 
                  cx="350" 
                  cy="350" 
                  r="295" 
                  fill="url(#ringGradientOuter)" 
                  stroke="url(#ringEdgeTop)" 
                  strokeWidth="4"
                  filter="url(#dropShadowOuter)"
                  opacity="0.95"
                />
                {/* Additional shadow layer for more depth */}
                <circle 
                  cx="352" 
                  cy="352" 
                  r="295" 
                  fill="none" 
                  stroke="#78350f" 
                  strokeWidth="4"
                  opacity="0.3"
                />
                
                {/* Constellation Season Ring with Intercalary Gates - elevated layer */}
                <g filter="url(#dropShadowMiddle)">
                  {Object.entries(constellations).map(([season, data], i) => {
                    const angle = (i * 90 - 90) * Math.PI / 180;
                    const x = 350 + 265 * Math.cos(angle);
                    const y = 350 + 265 * Math.sin(angle);
                    const intercalaryDay = [91, 182, 273, 364][i];
                    const isCurrentGate = enochianDate.totalDayOfYear === intercalaryDay;
                    
                    return (
                      <g key={season}>
                        {/* Season arc with depth */}
                        <path
                          d={`M 350 350 L ${350 + 250 * Math.cos(angle - Math.PI/4)} ${350 + 250 * Math.sin(angle - Math.PI/4)} 
                             A 250 250 0 0 1 ${350 + 250 * Math.cos(angle + Math.PI/4)} ${350 + 250 * Math.sin(angle + Math.PI/4)} Z`}
                          fill={data.color}
                          opacity="0.2"
                        />
                        {/* Shadow layer for season arc */}
                        <path
                          d={`M 350 350 L ${350 + 250 * Math.cos(angle - Math.PI/4)} ${350 + 250 * Math.sin(angle - Math.PI/4)} 
                             A 250 250 0 0 1 ${350 + 250 * Math.cos(angle + Math.PI/4)} ${350 + 250 * Math.sin(angle + Math.PI/4)} Z`}
                          fill="#000000"
                          opacity="0.1"
                          transform="translate(1, 1)"
                        />
                        
                        {/* Constellation gate - elevated */}
                        <g transform={`translate(${x}, ${y})`} filter="url(#dropShadowInner)">
                          <circle r="35" fill={data.color} opacity="0.4" stroke={data.color} strokeWidth="2.5"/>
                          {/* Highlight for 3D effect */}
                          <circle r="35" fill="url(#ringGradientMiddle)" opacity="0.3"/>
                          {isCurrentGate && (
                            <circle r="38" fill="none" stroke="#fbbf24" strokeWidth="3">
                              <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
                            </circle>
                          )}
                          <text textAnchor="middle" dy="-10" className="text-xl fill-white font-bold">
                            {data.icon}
                          </text>
                          <text textAnchor="middle" dy="8" className="text-xs fill-white font-bold">
                            {season.toUpperCase()}
                          </text>
                          <text textAnchor="middle" dy="20" className="text-[9px] fill-amber-300">
                            DOT {intercalaryDay}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* Month Ring (12 divisions) - counter-clockwise - elevated */}
                <g transform={`rotate(${rotation.months} 350 350)`} filter="url(#dropShadowMiddle)">
                  {monthStructure.map((month, i) => {
                    const startAngle = (i * 30 - 90) * Math.PI / 180;
                    const midAngle = ((i * 30 + 15) - 90) * Math.PI / 180;
                    const x = 350 + 225 * Math.cos(midAngle);
                    const y = 350 + 225 * Math.sin(midAngle);
                    const isCurrentMonth = enochianDate.month === month.num;
                    
                    return (
                      <g key={i}>
                        {/* Shadow line */}
                        <line 
                          x1={350 + 210 * Math.cos(startAngle) + 1} 
                          y1={350 + 210 * Math.sin(startAngle) + 1}
                          x2={350 + 240 * Math.cos(startAngle) + 1} 
                          y2={350 + 240 * Math.sin(startAngle) + 1}
                          stroke="#000000" 
                          strokeWidth="2"
                          opacity="0.3"
                        />
                        {/* Main line */}
                        <line 
                          x1={350 + 210 * Math.cos(startAngle)} 
                          y1={350 + 210 * Math.sin(startAngle)}
                          x2={350 + 240 * Math.cos(startAngle)} 
                          y2={350 + 240 * Math.sin(startAngle)}
                          stroke="#475569" 
                          strokeWidth="2"
                        />
                        {/* Shadow circle */}
                        <circle cx={x + 1} cy={y + 1} r="12" fill="#000000" opacity="0.2"/>
                        {/* Main circle with gradient */}
                        <circle cx={x} cy={y} r="12" fill={isCurrentMonth ? "url(#ringGradientOuter)" : "url(#ringGradientMiddle)"} opacity="0.9"/>
                        <text 
                          x={x} y={y} dy="4"
                          textAnchor="middle" 
                          className={`text-xs font-bold ${isCurrentMonth ? 'fill-slate-900' : 'fill-gray-400'}`}
                        >
                          {month.num}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* 52-Week Ring (rotating clockwise) - elevated */}
                <g transform={`rotate(${rotation.weeks} 350 350)`} filter="url(#dropShadowInner)">
                  {Array.from({ length: 52 }, (_, i) => {
                    const angle = (i * (360/52) - 90) * Math.PI / 180;
                    const isCurrentWeek = enochianDate.sabbathWeek === i + 1;
                    
                    return (
                      <g key={i}>
                        {/* Shadow line */}
                        <line 
                          x1={350 + 190 * Math.cos(angle) + 0.5} 
                          y1={350 + 190 * Math.sin(angle) + 0.5}
                          x2={350 + 210 * Math.cos(angle) + 0.5} 
                          y2={350 + 210 * Math.sin(angle) + 0.5}
                          stroke="#000000" 
                          strokeWidth={isCurrentWeek ? "3" : "1"}
                          opacity="0.2"
                        />
                        {/* Main line */}
                        <line 
                          x1={350 + 190 * Math.cos(angle)} 
                          y1={350 + 190 * Math.sin(angle)}
                          x2={350 + 210 * Math.cos(angle)} 
                          y2={350 + 210 * Math.sin(angle)}
                          stroke={isCurrentWeek ? "#fbbf24" : "#334155"} 
                          strokeWidth={isCurrentWeek ? "3" : "1"}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* 18-Part Day Wheel (anti-clockwise) - most elevated */}
                <g transform={`rotate(${-rotation.dayWheel} 350 350)`} filter="url(#dropShadowInner)">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const angle = (i * 20 - 90) * Math.PI / 180;
                    let partColor = '#1e40af';
                    if (i >= 0 && i < 12) partColor = '#fbbf24'; // Yôm (day)
                    else if (i >= 12 && i < 14) partColor = '#f97316'; // Erev
                    else if (i >= 14 && i < 16) partColor = '#06b6d4'; // Boqer
                    
                    return (
                      <g key={i}>
                        {/* Shadow line */}
                        <line
                          x1={350 + 150 * Math.cos(angle) + 0.5}
                          y1={350 + 150 * Math.sin(angle) + 0.5}
                          x2={350 + 175 * Math.cos(angle) + 0.5}
                          y2={350 + 175 * Math.sin(angle) + 0.5}
                          stroke="#000000"
                          strokeWidth="2"
                          opacity="0.3"
                        />
                        {/* Main line */}
                        <line
                          x1={350 + 150 * Math.cos(angle)}
                          y1={350 + 150 * Math.sin(angle)}
                          x2={350 + 175 * Math.cos(angle)}
                          y2={350 + 175 * Math.sin(angle)}
                          stroke={partColor}
                          strokeWidth="2"
                          opacity="0.7"
                        />
                      </g>
                    );
                  })}
                  
                  {/* 4 Day Parts Labels */}
                  {[
                    { name: 'YÔM', angle: 0, color: '#fbbf24' },
                    { name: 'EREV', angle: 90, color: '#f97316' },
                    { name: 'LAYLAH', angle: 180, color: '#1e40af' },
                    { name: 'BOQER', angle: 270, color: '#06b6d4' }
                  ].map((part, i) => {
                    const angle = (part.angle - 90) * Math.PI / 180;
                    const x = 350 + 163 * Math.cos(angle);
                    const y = 350 + 163 * Math.sin(angle);
                    
                    return (
                      <text key={i} x={x} y={y} textAnchor="middle" dy="4"
                            className="text-[10px] font-bold fill-white">
                        {part.name}
                      </text>
                    );
                  })}
                </g>

                {/* Center Display - most elevated */}
                <circle cx="352" cy="352" r="130" fill="#000000" opacity="0.3"/>
                <circle cx="350" cy="350" r="130" fill="url(#centerGlow)"/>
                <circle cx="350" cy="350" r="125" fill="url(#ringGradientInner)" stroke="url(#ringEdgeTop)" strokeWidth="4" filter="url(#dropShadowInner)"/>
                {/* Inner highlight for 3D effect */}
                <circle cx="348" cy="348" r="125" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.2"/>
                
                {/* Sabbath indicator */}
                {enochianDate.weekDay === 7 && (
                  <g>
                    <circle cx="350" cy="350" r="115" fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray="8,4">
                      <animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <text x="350" y="300" textAnchor="middle" className="text-sm fill-blue-400 font-bold">
                      🕊️ SABBATH
                    </text>
                  </g>
                )}

                {/* Intercalary Day indicator */}
                {enochianDate.isIntercalary && !enochianDate.timelessDay && (
                  <g>
                    <circle cx="350" cy="350" r="120" fill="none" stroke="#fbbf24" strokeWidth="4">
                      <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
                    </circle>
                    <text x="350" y="295" textAnchor="middle" className="text-xs fill-amber-400 font-bold">
                      ⭐ INTERCALARY GATE
                    </text>
                  </g>
                )}

                {/* Timeless Days */}
                {enochianDate.timelessDay && (
                  <g>
                    <circle cx="350" cy="350" r="120" fill="none" stroke="#a855f7" strokeWidth="5" strokeDasharray="10,5">
                      <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <text x="350" y="295" textAnchor="middle" className="text-sm fill-purple-400 font-bold">
                      ⏳ TIMELESS DAY {enochianDate.timelessDay}
                    </text>
                  </g>
                )}
                
                <text x="350" y="340" textAnchor="middle" className="text-6xl fill-amber-400 font-bold drop-shadow-lg">
                  {enochianDate.day}
                </text>
                <text x="350" y="365" textAnchor="middle" className="text-base fill-gray-300">
                  {enochianDate.monthName} • Month {enochianDate.month}
                </text>
                <text x="350" y="385" textAnchor="middle" className="text-sm fill-gray-400">
                  Day {enochianDate.totalDayOfYear} of 364
                </text>
                <text x="350" y="405" textAnchor="middle" className="text-sm fill-amber-500 font-bold">
                  {enochianDate.dayPart}
                </text>
              </svg>
            </div>
          </div>

          {/* Info Panels */}
          <div className="space-y-4">
            {/* Sacred Time Card */}
            <div className="bg-gradient-to-br from-amber-900/40 to-slate-800/80 backdrop-blur rounded-xl shadow-xl p-5 border-2 border-amber-600/40">
              <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Sacred Time
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Day:</span>
                  <span className="text-white font-bold">{enochianDate.day}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Month:</span>
                  <span className="text-white font-bold">{enochianDate.monthName} ({enochianDate.month})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Season:</span>
                  <span className="text-white font-bold">{enochianDate.season}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Portal:</span>
                  <span className="text-amber-400 font-bold">Portal {enochianDate.portal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sabbath Week:</span>
                  <span className="text-white font-bold">{enochianDate.sabbathWeek} of 52</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Creation Day:</span>
                  <span className="text-white font-bold">{getCreationDay(enochianDate.weekDay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Day Part:</span>
                  <span className="text-amber-500 font-bold">{enochianDate.dayPart}</span>
                </div>

                {enochianDate.isIntercalary && !enochianDate.timelessDay && (
                  <div className="mt-3 pt-3 border-t border-amber-600/30">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">Priestly Intercalary Gate</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Season-ending cosmic clock reset</p>
                  </div>
                )}

                {enochianDate.timelessDay && (
                  <div className="mt-3 pt-3 border-t border-purple-600/30">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">Timeless Day {enochianDate.timelessDay}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {enochianDate.timelessDay === 1 ? 'Hello-Yasef: "Behold YHVH is adding"' : 'Asfael: "El is adding"'}
                    </p>
                  </div>
                )}

                {enochianDate.weekDay === 7 && (
                  <div className="mt-3 pt-3 border-t border-blue-600/30">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Flame className="w-4 h-4" />
                      <span className="font-bold">No Fire on Sabbath</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gregorian Time Card */}
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/80 backdrop-blur rounded-xl shadow-xl p-5 border-2 border-blue-600/40">
              <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Gregorian Time
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white">{currentDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white font-mono">{currentDate.toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Zone:</span>
                  <span className="text-white text-xs">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                </div>
              </div>
            </div>

            {/* Constellation Info */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-xl shadow-xl p-5 border-2 border-slate-700">
              <h3 className="text-gray-300 font-bold mb-3">Seasonal Constellations</h3>
              <div className="space-y-2">
                {Object.entries(constellations).map(([season, data]) => (
                  <div key={season} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{data.icon}</span>
                      <span className="text-gray-400">{season}</span>
                    </span>
                    <span style={{ color: data.color }} className="font-bold">{data.name} {data.symbol}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scripture Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-xl shadow-xl p-4 border-2 border-slate-700">
              <p className="text-xs text-gray-400 italic leading-relaxed">
                "The Sun is the Great Sign on the earth for days, sabbaths, months, feasts, years, sabbaths of years, jubilees and for all seasons of the years."
              </p>
              <p className="text-xs text-amber-500 mt-2 text-right">— Jubilees 2:9</p>
            </div>
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="mt-6 bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur rounded-xl shadow-xl p-6 border-2 border-slate-700">
          <h3 className="text-gray-300 font-bold mb-4 text-center">Synchronized Time Cycles</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-center">
            <div>
              <div className="text-2xl mb-2">⚙️</div>
              <p className="text-amber-400 font-bold">18-Part Day Wheel</p>
              <p className="text-gray-500">Anti-clockwise daily</p>
            </div>
            <div>
              <div className="text-2xl mb-2">📅</div>
              <p className="text-blue-400 font-bold">52-Week Ring</p>
              <p className="text-gray-500">Clockwise weekly</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🌙</div>
              <p className="text-green-400 font-bold">12-Month Ring</p>
              <p className="text-gray-500">Counter-clockwise</p>
            </div>
            <div>
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-purple-400 font-bold">Timeless Days</p>
              <p className="text-gray-500">1-2 days/year</p>
            </div>
            <div>
              <div className="text-2xl mb-2">⭐</div>
              <p className="text-amber-400 font-bold">Intercalary Gates</p>
              <p className="text-gray-500">Days 91, 182, 273, 364</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnochianWheelCalendar;

