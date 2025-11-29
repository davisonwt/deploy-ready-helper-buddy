import React, { useState, useEffect } from 'react';

import { Sun, Moon, Calendar } from 'lucide-react';



const EnochianWheelCalendar = () => {

  const [currentDate, setCurrentDate] = useState(new Date());

  const [enochianDate, setEnochianDate] = useState({ 

    dayOfYear: 254,

    month: 9,

    dayOfMonth: 12,

    weekOfYear: 36,

    dayOfWeek: 5,

    dayPart: 'Laylah',

    eighteenPart: 15,

    daysInCurrentMonth: 31,

    timelessDay: 0,

    season: 'Fall'

  });



  const monthStructure = [

    { num: 1, days: 30, season: 'Spring' },

    { num: 2, days: 30, season: 'Spring' },

    { num: 3, days: 31, season: 'Spring' },

    { num: 4, days: 30, season: 'Summer' },

    { num: 5, days: 30, season: 'Summer' },

    { num: 6, days: 31, season: 'Summer' },

    { num: 7, days: 30, season: 'Fall' },

    { num: 8, days: 30, season: 'Fall' },

    { num: 9, days: 31, season: 'Fall' },

    { num: 10, days: 30, season: 'Winter' },

    { num: 11, days: 30, season: 'Winter' },

    { num: 12, days: 31, season: 'Winter' }

  ];



  const seasons = {

    Spring: { color: '#10b981', icon: '🐏', name: 'ARIES' },

    Summer: { color: '#f59e0b', icon: '♋', name: 'CANCER' },

    Fall: { color: '#ef4444', icon: '♎', name: 'LIBRA' },

    Winter: { color: '#3b82f6', icon: '♑', name: 'CAPRICORN' }

  };



  const getSunTimes = () => {

    // Calculate day/night parts based on Book of Enoch portal system

    // Year divided into quarters at days: 91 (Spring Equinox), 182 (Summer Solstice), 273 (Fall Equinox), 364 (Winter Solstice)

    const dayOfYear = enochianDate.dayOfYear;

    

    let dayParts, nightParts;

    

    // Determine which season and calculate day/night ratio

    if (dayOfYear <= 91) {

      // Spring: Day 1-91, transitioning from 9 to 12 parts

      const progress = dayOfYear / 91;

      dayParts = 9 + (progress * 3); // 9 to 12

      nightParts = 18 - dayParts;

    } else if (dayOfYear <= 182) {

      // Summer: Day 92-182, transitioning from 12 to 9 parts

      const progress = (dayOfYear - 91) / 91;

      dayParts = 12 - (progress * 3); // 12 to 9

      nightParts = 18 - dayParts;

    } else if (dayOfYear <= 273) {

      // Fall: Day 183-273, transitioning from 9 to 6 parts

      const progress = (dayOfYear - 182) / 91;

      dayParts = 9 - (progress * 3); // 9 to 6

      nightParts = 18 - dayParts;

    } else {

      // Winter: Day 274-364, transitioning from 6 to 9 parts

      const progress = (dayOfYear - 273) / 91;

      dayParts = 6 + (progress * 3); // 6 to 9

      nightParts = 18 - dayParts;

    }

    

    // Convert parts to actual hours (18 parts = 24 hours, so 1 part = 1.333 hours = 80 minutes)

    const minutesPerPart = 80;

    const dayMinutes = dayParts * minutesPerPart;

    const nightMinutes = nightParts * minutesPerPart;

    

    // Assume sunrise at 6:00 AM as base, adjust based on day length

    const sunriseMinutesFromMidnight = 360 - (nightMinutes / 2);

    const sunsetMinutesFromMidnight = sunriseMinutesFromMidnight + dayMinutes;

    

    const sunrise = {

      hour: Math.floor(sunriseMinutesFromMidnight / 60),

      minute: Math.floor(sunriseMinutesFromMidnight % 60)

    };

    

    const sunset = {

      hour: Math.floor(sunsetMinutesFromMidnight / 60),

      minute: Math.floor(sunsetMinutesFromMidnight % 60)

    };

    

    return { sunrise, sunset, dayParts, nightParts };

  };



  const getDayPart = (hour: number, minute: number) => {

    const { sunrise, sunset } = getSunTimes();

    const currentMinutes = hour * 60 + minute;

    const sunriseMinutes = sunrise.hour * 60 + sunrise.minute;

    const sunsetMinutes = sunset.hour * 60 + sunset.minute;

    const erevEnd = sunsetMinutes + 120;

    const boqerStart = sunriseMinutes - 120;

    

    if (currentMinutes >= sunriseMinutes && currentMinutes < sunsetMinutes) return 'Yôm';

    else if (currentMinutes >= sunsetMinutes && currentMinutes < erevEnd) return 'Erev';

    else if (currentMinutes >= boqerStart && currentMinutes < sunriseMinutes) return 'Boqer';

    else return 'Laylah';

  };



  const getEighteenPart = (hour: number, minute: number) => {

    const { sunrise } = getSunTimes();

    const sunriseMinutes = sunrise.hour * 60 + sunrise.minute;

    const currentMinutes = hour * 60 + minute;

    let minutesSinceSunrise = currentMinutes - sunriseMinutes;

    if (minutesSinceSunrise < 0) minutesSinceSunrise += 1440;

    return Math.floor(minutesSinceSunrise / 80) + 1;

  };



  const getSpringEquinox = (year: number) => new Date(year, 2, 20);



  const convertToEnochian = (gregorianDate: Date) => {

    const year = gregorianDate.getFullYear();

    const springEquinox = getSpringEquinox(year);

    const daysSinceEquinox = Math.floor((gregorianDate.getTime() - springEquinox.getTime()) / (1000 * 60 * 60 * 24));

    

    if (daysSinceEquinox < 0) {

      const prevEquinox = getSpringEquinox(year - 1);

      const daysSincePrevEquinox = Math.floor((gregorianDate.getTime() - prevEquinox.getTime()) / (1000 * 60 * 60 * 24));

      return calculateEnochianDate(daysSincePrevEquinox, gregorianDate);

    } else if (daysSinceEquinox >= 364) {

      const timelessDay = daysSinceEquinox - 363;

      return {

        dayOfYear: 364 + timelessDay,

        month: 12,

        dayOfMonth: 31,

        weekOfYear: 52,

        dayOfWeek: 7,

        dayPart: getDayPart(gregorianDate.getHours(), gregorianDate.getMinutes()),

        eighteenPart: getEighteenPart(gregorianDate.getHours(), gregorianDate.getMinutes()),

        daysInCurrentMonth: 31,

        timelessDay,

        season: 'Winter'

      };

    }

    

    return calculateEnochianDate(daysSinceEquinox, gregorianDate);

  };



  const calculateEnochianDate = (dayCount: number, gregorianDate: Date) => {

    const dayOfYear = dayCount + 1;

    let remainingDays = dayCount;

    

    for (const m of monthStructure) {

      if (remainingDays < m.days) {

        const dayOfMonth = remainingDays + 1;

        const weekOfYear = Math.floor(dayCount / 7) + 1;

        const dayOfWeek = (dayCount % 7) + 1;

        

        return {

          dayOfYear,

          month: m.num,

          dayOfMonth,

          weekOfYear,

          dayOfWeek,

          dayPart: getDayPart(gregorianDate.getHours(), gregorianDate.getMinutes()),

          eighteenPart: getEighteenPart(gregorianDate.getHours(), gregorianDate.getMinutes()),

          daysInCurrentMonth: m.days,

          timelessDay: 0,

          season: m.season

        };

      }

      remainingDays -= m.days;

    }

    

    return {

      dayOfYear: 364,

      month: 12,

      dayOfMonth: 31,

      weekOfYear: 52,

      dayOfWeek: 7,

      dayPart: getDayPart(gregorianDate.getHours(), gregorianDate.getMinutes()),

      eighteenPart: getEighteenPart(gregorianDate.getHours(), gregorianDate.getMinutes()),

      daysInCurrentMonth: 31,

      timelessDay: 0,

      season: 'Winter'

    };

  };



  useEffect(() => {

    const timer = setInterval(() => {

      const now = new Date();

      setCurrentDate(now);

      setEnochianDate(convertToEnochian(now));

    }, 1000);



    return () => clearInterval(timer);

  }, []);



  const size = 800;

  const center = size / 2;

  const seasonRotation = ((enochianDate.dayOfYear - 1) / 91) * 90;



  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">

      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-6">

          <h1 className="text-5xl font-bold text-amber-400 mb-2 flex items-center justify-center gap-3 drop-shadow-lg">

            <Sun className="w-12 h-12 animate-pulse" />

            The Creator's Calendar

            <Moon className="w-10 h-10 text-blue-300" />

          </h1>

          <p className="text-gray-300 text-sm">7 Synchronized Circles • 364-Day Solar Year</p>

        </div>



        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <div className="xl:col-span-2">

            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur rounded-2xl shadow-2xl p-8 border-4 border-amber-600/30">

              <svg width={size} height={size} viewBox="0 0 800 800">

                <defs>

                  <filter id="glow">

                    <feGaussianBlur stdDeviation="2" result="blur"/>

                    <feMerge>

                      <feMergeNode in="blur"/>

                      <feMergeNode in="SourceGraphic"/>

                    </feMerge>

                  </filter>

                </defs>



                {/* Background seasons - rotating */}

                <g transform={`rotate(${seasonRotation} ${center} ${center})`}>

                  {Object.entries(seasons).map(([season, data], i) => {

                    const startAngle = i * 90;

                    const endAngle = (i + 1) * 90;

                    const pathStart = (startAngle - 90) * Math.PI / 180;

                    const pathEnd = (endAngle - 90) * Math.PI / 180;

                    

                    return (

                      <path

                        key={season}

                        d={`M ${center} ${center} 

                            L ${center + 340 * Math.cos(pathStart)} ${center + 340 * Math.sin(pathStart)} 

                            A 340 340 0 0 1 ${center + 340 * Math.cos(pathEnd)} ${center + 340 * Math.sin(pathEnd)} 

                            Z`}

                        fill={data.color}

                        opacity="0.15"

                      />

                    );

                  })}

                </g>

                

                {/* Season labels outside - NOT rotating */}

                {Object.entries(seasons).map(([season, data], i) => {

                  const angle = (i * 90 + 45 - 90) * Math.PI / 180;

                  const x = center + 355 * Math.cos(angle);

                  const y = center + 355 * Math.sin(angle);

                  const textAngle = i * 90 + 45;

                  

                  return (

                    <text

                      key={`label-${season}`}

                      x={x}

                      y={y}

                      textAnchor="middle"

                      dominantBaseline="middle"

                      transform={`rotate(${textAngle} ${x} ${y})`}

                      className="text-lg font-bold fill-white"

                      style={{ fontSize: '16px', letterSpacing: '2px' }}

                    >

                      {season.toUpperCase()}

                    </text>

                  );

                })}



                {/* CIRCLE 1: 366 days */}

                <g transform={`rotate(${254 * (360/364)} ${center} ${center})`}>

                  {/* Timeless days 365 and 366 positioned at TOP (12 o'clock = -90 degrees or 270 degrees) */}

                  {[365, 366].map((dayNum, idx) => {

                    // -90 degrees is TOP in SVG, then offset left/right

                    const angle = (-90 + (idx - 0.5) * 2) * Math.PI / 180;

                    const isCurrentDay = dayNum === enochianDate.dayOfYear;

                    const dotX = center + 325 * Math.cos(angle);

                    const dotY = center + 325 * Math.sin(angle);

                    

                    return (

                      <g key={`timeless-${dayNum}`}>

                        <circle

                          cx={dotX}

                          cy={dotY}

                          r="8"

                          fill={isCurrentDay ? "#a855f7" : "#9333ea"}

                          stroke="#fbbf24"

                          strokeWidth="2"

                        />

                        {isCurrentDay && (

                          <text

                            x={dotX}

                            y={dotY}

                            textAnchor="middle"

                            dominantBaseline="middle"

                            className="text-xs font-bold fill-white"

                          >

                            {dayNum}

                          </text>

                        )}

                      </g>

                    );

                  })}

                  

                  {/* Days 1-364: Day 364 (orange) is last day of month 12, Day 1 (green) is first day of new year */}

                  {Array.from({ length: 364 }).map((_, i) => {

                    const dayNum = i + 1;

                    // Keep original angle calculation for all days EXCEPT day 1

                    // Day 364 (orange) stays at its original position

                    // Day 1 (green) must be immediately clockwise (RIGHT) after day 364

                    let angle: number;

                    if (dayNum === 1) {

                      // Day 364 (orange) is at: -90 + (360/364) + (363/364)*360 = 270 degrees

                      // Day 1 (green) MUST be immediately clockwise (RIGHT) after day 364

                      // Calculate day 364's exact angle first

                      const day364AngleDeg = -90 + (360/364) + (363 / 364) * 360;

                      // Position day 1 on the opposite side of day 364 (counter-clockwise / to the LEFT when viewing from outside)

                      const day1AngleDeg = day364AngleDeg - (360/364) * 2; // Move 2 spaces to the left of day 364

                      // Convert to radians

                      angle = day1AngleDeg * Math.PI / 180;

                      // Debug: log to verify

                      console.log('Day 364 angle:', day364AngleDeg, 'Day 1 angle:', day1AngleDeg);

                    } else {

                      // All other days use original calculation

                      angle = (-90 + (360/364) + (i / 364) * 360) * Math.PI / 180;

                    }

                    const isCurrentDay = dayNum === enochianDate.dayOfYear;

                    const isIntercalary = dayNum === 91 || dayNum === 182 || dayNum === 273 || dayNum === 364;

                    const isDayOne = dayNum === 1; // Day 1 of the year - mark green

                    

                    const x1 = center + 310 * Math.cos(angle);

                    const y1 = center + 310 * Math.sin(angle);

                    const x2 = center + 340 * Math.cos(angle);

                    const y2 = center + 340 * Math.sin(angle);

                    

                    if (isCurrentDay && dayNum !== 255) {

                      const textX = center + 325 * Math.cos(angle);

                      const textY = center + 325 * Math.sin(angle);

                      // Calculate text angle same as line angle
                      let textAngle: number;
                      
                      if (dayNum === 1) {
                        // Day 1: position clockwise after day 364
                        const day364AngleDeg = -90 + (360/364) + (363 / 364) * 360;
                        textAngle = day364AngleDeg + (360/364);
                      } else {
                        // All other days: original calculation
                        textAngle = -90 + (360/364) + (i / 364) * 360;
                      }

                      

                      return (

                        <g key={i}>

                          <circle cx={textX} cy={textY} r="14" fill="#fbbf24" opacity="0.3"/>

                          <circle cx={textX} cy={textY} r="12" fill="#0f172a" stroke="#fbbf24" strokeWidth="2"/>

                          <text

                            x={textX}

                            y={textY}

                            textAnchor="middle"

                            dominantBaseline="middle"

                            transform={`rotate(${textAngle} ${textX} ${textY})`}

                            className="font-bold fill-amber-400"

                            style={{ fontSize: '14px' }}

                          >

                            {dayNum}

                          </text>

                        </g>

                      );

                    }

                    

                    return (

                      <line

                        key={i}

                        x1={x1} y1={y1} x2={x2} y2={y2}

                        stroke={isDayOne ? "#10b981" : isIntercalary ? "#f59e0b" : "#64748b"}

                        strokeWidth={isDayOne ? "3" : isIntercalary ? "3" : "2.5"}

                        strokeLinecap="round"

                        opacity={isDayOne ? "1" : isIntercalary ? "0.9" : "0.7"}

                      />

                    );

                  })}

                </g>



                {/* CIRCLE 2: 30 days - ONE BORDER ONLY */}

                <g>

                  <circle cx={center} cy={center} r="295" fill="none" stroke="#10b981" strokeWidth="3"/>

                  {Array.from({ length: 30 }).map((_, i) => {

                    const dayNum = i + 1;

                    const degreesPerDay = 360 / 30;

                    const startAngle = (90 + i * degreesPerDay) * Math.PI / 180;

                    const midAngle = 90 + (i + 0.5) * degreesPerDay;

                    const isCurrentDay = enochianDate.daysInCurrentMonth === 30 && dayNum === enochianDate.dayOfMonth;

                    

                    return (

                      <g key={i}>

                        <line

                          x1={center + 275 * Math.cos(startAngle)}

                          y1={center + 275 * Math.sin(startAngle)}

                          x2={center + 295 * Math.cos(startAngle)}

                          y2={center + 295 * Math.sin(startAngle)}

                          stroke="#10b981"

                          strokeWidth="2"

                        />

                        <text

                          x={center + 285 * Math.cos((90 + (i + 0.5) * degreesPerDay) * Math.PI / 180)}

                          y={center + 285 * Math.sin((90 + (i + 0.5) * degreesPerDay) * Math.PI / 180)}

                          textAnchor="middle"

                          dominantBaseline="middle"

                          transform={`rotate(${midAngle} ${center + 285 * Math.cos(midAngle * Math.PI / 180)} ${center + 285 * Math.sin(midAngle * Math.PI / 180)})`}

                          className={`font-bold ${isCurrentDay ? 'fill-green-200' : 'fill-green-400'}`}

                          style={{ fontSize: '14px' }}

                        >

                          {dayNum}

                        </text>

                      </g>

                    );

                  })}

                </g>



                {/* CIRCLE 3: 52 weeks - ONE BORDER ONLY */}

                <g>

                  <circle cx={center} cy={center} r="265" fill="none" stroke="#60a5fa" strokeWidth="3"/>

                  {Array.from({ length: 52 }).map((_, weekIndex) => {

                    const degreesPerWeek = 360 / 52;

                    const weekStartAngle = (90 + weekIndex * degreesPerWeek) * Math.PI / 180;

                    

                    return (

                      <g key={weekIndex}>

                        <line

                          x1={center + 245 * Math.cos(weekStartAngle)}

                          y1={center + 245 * Math.sin(weekStartAngle)}

                          x2={center + 265 * Math.cos(weekStartAngle)}

                          y2={center + 265 * Math.sin(weekStartAngle)}

                          stroke="#60a5fa"

                          strokeWidth="3"

                        />

                        {Array.from({ length: 6 }).map((_, dayIndex) => {

                          const degreesPerDay = degreesPerWeek / 7;

                          const dayAngle = (90 + weekIndex * degreesPerWeek + (dayIndex + 1) * degreesPerDay) * Math.PI / 180;

                          const isSabbath = dayIndex === 5;

                          

                          return (

                            <line

                              key={dayIndex}

                              x1={center + 248 * Math.cos(dayAngle)}

                              y1={center + 248 * Math.sin(dayAngle)}

                              x2={center + 262 * Math.cos(dayAngle)}

                              y2={center + 262 * Math.sin(dayAngle)}

                              stroke={isSabbath ? "#93c5fd" : "#64748b"}

                              strokeWidth={isSabbath ? "2" : "1.5"}

                            />

                          );

                        })}

                      </g>

                    );

                  })}

                </g>



                {/* CIRCLE 4: 31 days - ONE BORDER ONLY */}

                <g>

                  <circle cx={center} cy={center} r="235" fill="none" stroke="#ef4444" strokeWidth="3"/>

                  {Array.from({ length: 31 }).map((_, i) => {

                    const dayNum = i + 1;

                    const degreesPerDay = 360 / 31;

                    const startAngle = (90 + i * degreesPerDay) * Math.PI / 180;

                    const midAngle = 90 + (i + 0.5) * degreesPerDay;

                    const isCurrentDay = enochianDate.daysInCurrentMonth === 31 && dayNum === enochianDate.dayOfMonth;

                    

                    return (

                      <g key={i}>

                        <line

                          x1={center + 215 * Math.cos(startAngle)}

                          y1={center + 215 * Math.sin(startAngle)}

                          x2={center + 235 * Math.cos(startAngle)}

                          y2={center + 235 * Math.sin(startAngle)}

                          stroke="#ef4444"

                          strokeWidth="2"

                        />

                        <text

                          x={center + 225 * Math.cos((90 + (i + 0.5) * degreesPerDay) * Math.PI / 180)}

                          y={center + 225 * Math.sin((90 + (i + 0.5) * degreesPerDay) * Math.PI / 180)}

                          textAnchor="middle"

                          dominantBaseline="middle"

                          transform={`rotate(${midAngle} ${center + 225 * Math.cos(midAngle * Math.PI / 180)} ${center + 225 * Math.sin(midAngle * Math.PI / 180)})`}

                          className={`font-bold ${isCurrentDay ? 'fill-red-200' : 'fill-red-400'}`}

                          style={{ fontSize: '14px' }}

                        >

                          {dayNum}

                        </text>

                      </g>

                    );

                  })}

                </g>



                {/* CIRCLE 5: 18 parts - ONE BORDER ONLY */}

                <g>

                  <circle cx={center} cy={center} r="205" fill="none" stroke="#1e40af" strokeWidth="3"/>

                  {Array.from({ length: 18 }).map((_, i) => {

                    const partNum = i + 1;

                    const degreesPerPart = 360 / 18;

                    const startAngle = (90 + i * degreesPerPart) * Math.PI / 180;

                    const midAngle = 90 + (i + 0.5) * degreesPerPart;

                    const isDayPart = i < 9;

                    const partColor = isDayPart ? '#fbbf24' : '#1e40af';

                    const isCurrentPart = partNum === enochianDate.eighteenPart;

                    

                    return (

                      <g key={i}>

                        <line

                          x1={center + 185 * Math.cos(startAngle)}

                          y1={center + 185 * Math.sin(startAngle)}

                          x2={center + 205 * Math.cos(startAngle)}

                          y2={center + 205 * Math.sin(startAngle)}

                          stroke={partColor}

                          strokeWidth={i === 0 || i === 9 ? "3" : "2"}

                        />

                        <text

                          x={center + 195 * Math.cos((90 + (i + 0.5) * degreesPerPart) * Math.PI / 180)}

                          y={center + 195 * Math.sin((90 + (i + 0.5) * degreesPerPart) * Math.PI / 180)}

                          textAnchor="middle"

                          dominantBaseline="middle"

                          transform={`rotate(${midAngle} ${center + 195 * Math.cos(midAngle * Math.PI / 180)} ${center + 195 * Math.sin(midAngle * Math.PI / 180)})`}

                          className={`font-bold ${isCurrentPart ? 'fill-yellow-200' : 'fill-blue-300'}`}

                          style={{ fontSize: '12px' }}

                        >

                          {partNum}

                        </text>

                      </g>

                    );

                  })}

                </g>



                {/* CIRCLE 6: 7 days of the week */}

                <g>

                  <circle cx={center} cy={center} r="175" fill="none" stroke="#8b5cf6" strokeWidth="3"/>

                  {Array.from({ length: 7 }).map((_, i) => {

                    const dayNum = i + 1;

                    const degreesPerDay = 360 / 7;

                    const startAngle = (90 + i * degreesPerDay) * Math.PI / 180;

                    const midAngle = 90 + (i + 0.5) * degreesPerDay;

                    const isSabbath = dayNum === 7;

                    const isCurrentDay = dayNum === enochianDate.dayOfWeek;

                    const dayLabel = isSabbath ? 'Sabbath' : `Day ${dayNum}`;

                    

                    const textX = center + 165 * Math.cos((90 + (i + 0.5) * degreesPerDay) * Math.PI / 180);

                    const textY = center + 165 * Math.sin((90 + (i + 0.5) * degreesPerDay) * Math.PI / 180);

                    

                    // Rotate text radially (perpendicular to the center)

                    const textRotation = midAngle + 90;

                    

                    return (

                      <g key={i}>

                        <line

                          x1={center + 155 * Math.cos(startAngle)}

                          y1={center + 155 * Math.sin(startAngle)}

                          x2={center + 175 * Math.cos(startAngle)}

                          y2={center + 175 * Math.sin(startAngle)}

                          stroke={isSabbath ? "#a78bfa" : "#8b5cf6"}

                          strokeWidth={isSabbath ? "3" : "2"}

                        />

                        <text

                          x={textX}

                          y={textY}

                          textAnchor="middle"

                          dominantBaseline="middle"

                          transform={`rotate(${textRotation} ${textX} ${textY})`}

                          className={`font-bold ${isCurrentDay ? 'fill-purple-200' : 'fill-purple-400'}`}

                          style={{ fontSize: isSabbath ? '11px' : '10px' }}

                        >

                          {dayLabel}

                        </text>

                      </g>

                    );

                  })}

                </g>



                {/* CIRCLE 7: 4 parts of the day - proportionally sized based on actual sun position */}

                <g>

                  <circle cx={center} cy={center} r="145" fill="none" stroke="#ec4899" strokeWidth="3"/>

                  {(() => {

                    // Get current day/night parts from Enochian calculation

                    const { dayParts, nightParts } = getSunTimes();

                    

                    // Each part = 1/18 of full circle = 20 degrees

                    const degreesPerPart = 360 / 18;

                    

                    // Yôm (Day): from sunrise to sunset

                    const yomDegrees = dayParts * degreesPerPart;

                    

                    // Erev (Evening): 2 hours after sunset = 2/1.333 = 1.5 parts

                    const erevDegrees = 1.5 * degreesPerPart;

                    

                    // Boqer (Morning): 2 hours before sunrise = 1.5 parts  

                    const boqerDegrees = 1.5 * degreesPerPart;

                    

                    // Laylah (Night): remainder

                    const laylahDegrees = nightParts * degreesPerPart - erevDegrees - boqerDegrees;

                    

                    const dayPartsList = [

                      { name: 'Yôm', label: 'Day', degrees: yomDegrees, color: '#fbbf24', key: 'Yôm' },

                      { name: 'Erev', label: 'Evening', degrees: erevDegrees, color: '#f97316', key: 'Erev' },

                      { name: 'Laylah', label: 'Night', degrees: laylahDegrees, color: '#1e3a8a', key: 'Laylah' },

                      { name: 'Boqer', label: 'Morning', degrees: boqerDegrees, color: '#fb923c', key: 'Boqer' }

                    ];

                    

                    let currentAngle = 90; // Start at top

                    

                    return dayPartsList.map((part, i) => {

                      const startAngle = currentAngle;

                      const endAngle = currentAngle + part.degrees;

                      const midAngle = (startAngle + endAngle) / 2;

                      const isCurrentPart = part.key === enochianDate.dayPart;

                      

                      const startRad = startAngle * Math.PI / 180;

                      const endRad = endAngle * Math.PI / 180;

                      const midRad = midAngle * Math.PI / 180;

                      

                      const textX = center + 135 * Math.cos(midRad);

                      const textY = center + 135 * Math.sin(midRad);

                      const textRotation = midAngle + 90;

                      

                      currentAngle = endAngle;

                      

                      return (

                        <g key={i}>

                          <line

                            x1={center + 125 * Math.cos(startRad)}

                            y1={center + 125 * Math.sin(startRad)}

                            x2={center + 145 * Math.cos(startRad)}

                            y2={center + 145 * Math.sin(startRad)}

                            stroke={part.color}

                            strokeWidth="3"

                          />

                          <text

                            x={textX}

                            y={textY}

                            textAnchor="middle"

                            dominantBaseline="middle"

                            transform={`rotate(${textRotation} ${textX} ${textY})`}

                            className={`font-bold ${isCurrentPart ? 'fill-white' : 'fill-gray-300'}`}

                            style={{ fontSize: part.name === 'Yôm' ? '13px' : '10px' }}

                          >

                            {part.label}

                          </text>

                        </g>

                      );

                    });

                  })()}

                </g>



                {/* CIRCLE 8: 2 Days Out Of Time (DOOT) - Helio-Yasef & Asfa'el */}

                <g>

                  <circle cx={center} cy={center} r="115" fill="none" stroke="#9333ea" strokeWidth="3"/>

                  {(() => {

                    const dootDays = [

                      { name: 'Helio-Yasef', dayNum: 365, color: '#a855f7' },

                      { name: "Asfa'el", dayNum: 366, color: '#7c3aed' }

                    ];

                    

                    return dootDays.map((doot, i) => {

                      const startAngle = (90 + i * 180) * Math.PI / 180;

                      const midAngle = 90 + (i + 0.5) * 180;

                      const midRad = midAngle * Math.PI / 180;

                      const isCurrentDoot = enochianDate.dayOfYear === doot.dayNum;

                      

                      const textX = center + 105 * Math.cos(midRad);

                      const textY = center + 105 * Math.sin(midRad);

                      const textRotation = midAngle + 90;

                      

                      return (

                        <g key={i}>

                          <line

                            x1={center + 95 * Math.cos(startAngle)}

                            y1={center + 95 * Math.sin(startAngle)}

                            x2={center + 115 * Math.cos(startAngle)}

                            y2={center + 115 * Math.sin(startAngle)}

                            stroke={doot.color}

                            strokeWidth="3"

                          />

                          <text

                            x={textX}

                            y={textY}

                            textAnchor="middle"

                            dominantBaseline="middle"

                            transform={`rotate(${textRotation} ${textX} ${textY})`}

                            className={`font-bold ${isCurrentDoot ? 'fill-purple-200' : 'fill-purple-400'}`}

                            style={{ fontSize: '11px' }}

                          >

                            {doot.name}

                          </text>

                        </g>

                      );

                    });

                  })()}

                </g>



                {/* Center Display */}

                <circle cx={center} cy={center} r="120" fill="#0f172a" stroke="#d97706" strokeWidth="3"/>

                

                {enochianDate.dayOfWeek === 7 && (

                  <circle cx={center} cy={center} r="115" fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray="8,4">

                    <animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>

                  </circle>

                )}

                

                {/* Large Day Number */}

                <text x={center} y={center - 20} textAnchor="middle" className="text-7xl fill-amber-400 font-bold">

                  {enochianDate.dayOfMonth}

                </text>

                

                {/* Day Part */}

                <text x={center} y={center + 25} textAnchor="middle" className="text-xl fill-amber-500 font-bold">

                  {enochianDate.dayPart}

                </text>

                

                {/* Week Info */}

                <text x={center} y={center + 45} textAnchor="middle" className="text-xs fill-gray-400">

                  Week Day {enochianDate.dayOfWeek} • Week {enochianDate.weekOfYear}/52

                </text>

                

                {/* Day of Year */}

                <text x={center} y={center + 60} textAnchor="middle" className="text-xs fill-gray-400">

                  Day {enochianDate.dayOfYear}/364

                </text>

                

                {/* Gregorian Date */}

                <text x={center} y={center + 77} textAnchor="middle" className="text-xs fill-blue-400">

                  {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}

                </text>

                <text x={center} y={center + 91} textAnchor="middle" className="text-xs fill-blue-400">

                  {currentDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}

                </text>

                

                {/* Time */}

                <text x={center} y={center + 108} textAnchor="middle" className="text-sm fill-green-400 font-mono font-bold">

                  {currentDate.toLocaleTimeString('en-US', { hour12: false })}

                </text>

                

                {/* PINK LINE - Day 5 position (4th line to the LEFT from orange Day 1 line) */}

                {/* Orange line (Day 1) is at top (-90°)

                    To go anti-clockwise (LEFT), we subtract degrees

                    Each day = 360/364 degrees

                    Day 5 is 4 positions left from Day 1

                    So: -90° - (4 * 360/364)° */}

                {(() => {

                  const degreesPerDay = 360 / 364;

                  const stepsLeft = 4; // 4 steps left from Day 1 = Day 5

                  const day5Angle = (-90 - (stepsLeft * degreesPerDay)) * Math.PI / 180;

                  

                  return (

                    <line

                      x1={center + 310 * Math.cos(day5Angle)}

                      y1={center + 310 * Math.sin(day5Angle)}

                      x2={center + 340 * Math.cos(day5Angle)}

                      y2={center + 340 * Math.sin(day5Angle)}

                      stroke="#ec4899"

                      strokeWidth="5"

                      opacity="1"

                      strokeLinecap="round"

                    />

                  );

                })()}

                

                {/* PINK 255 - Triangular pointer at Day 255 counting anti-clockwise from pink line (human count) */}

                {(() => {

                  const degreesPerDay = 360 / 364;

                  const pinkLineAngle = -90 - (4 * degreesPerDay); // Pink line position

                  const day255Angle = pinkLineAngle - (254 * degreesPerDay); // 254 more days anti-clockwise

                  const angleRad = day255Angle * Math.PI / 180;

                  

                  // Triangle vertices pointing inward

                  const tipX = center + 340 * Math.cos(angleRad);

                  const tipY = center + 340 * Math.sin(angleRad);

                  

                  const outerX = center + 355 * Math.cos(angleRad);

                  const outerY = center + 355 * Math.sin(angleRad);

                  

                  const perpAngle1 = (day255Angle + 90) * Math.PI / 180;

                  const perpAngle2 = (day255Angle - 90) * Math.PI / 180;

                  

                  const base1X = outerX + 10 * Math.cos(perpAngle1);

                  const base1Y = outerY + 10 * Math.sin(perpAngle1);

                  const base2X = outerX + 10 * Math.cos(perpAngle2);

                  const base2Y = outerY + 10 * Math.sin(perpAngle2);

                  

                  // Text well outside the wheel

                  const textX = center + 385 * Math.cos(angleRad);

                  const textY = center + 385 * Math.sin(angleRad);

                  

                  return (

                    <g>

                      <polygon

                        points={`${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`}

                        fill="#ec4899"

                        stroke="#ec4899"

                        strokeWidth="2"

                      />

                      <text

                        x={textX}

                        y={textY}

                        textAnchor="middle"

                        dominantBaseline="middle"

                        style={{

                          fill: '#ec4899',

                          fontWeight: 'bold',

                          fontSize: '28px',

                          fontFamily: 'Arial, sans-serif'

                        }}

                      >

                        255

                      </text>

                    </g>

                  );

                })()}

                

                {/* ORANGE 255 - Triangular pointer 3 lines BEFORE pink 255 (counter-clockwise) */}

                {(() => {

                  const degreesPerDay = 360 / 364;

                  // Pink 255 angle first

                  const pinkLineAngle = -90 - (4 * degreesPerDay);

                  const pink255Angle = pinkLineAngle - (254 * degreesPerDay);

                  // Orange 255 is 3 lines counter-clockwise from pink 255

                  const orange255Angle = pink255Angle - (3 * degreesPerDay);

                  const angleRad = orange255Angle * Math.PI / 180;

                  

                  // Triangle vertices pointing inward

                  const tipX = center + 340 * Math.cos(angleRad);

                  const tipY = center + 340 * Math.sin(angleRad);

                  

                  const outerX = center + 355 * Math.cos(angleRad);

                  const outerY = center + 355 * Math.sin(angleRad);

                  

                  const perpAngle1 = (orange255Angle + 90) * Math.PI / 180;

                  const perpAngle2 = (orange255Angle - 90) * Math.PI / 180;

                  

                  const base1X = outerX + 10 * Math.cos(perpAngle1);

                  const base1Y = outerY + 10 * Math.sin(perpAngle1);

                  const base2X = outerX + 10 * Math.cos(perpAngle2);

                  const base2Y = outerY + 10 * Math.sin(perpAngle2);

                  

                  // Text well outside the wheel

                  const textX = center + 385 * Math.cos(angleRad);

                  const textY = center + 385 * Math.sin(angleRad);

                  

                  return (

                    <g>

                      <polygon

                        points={`${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`}

                        fill="#f59e0b"

                        stroke="#f59e0b"

                        strokeWidth="2"

                      />

                      <text

                        x={textX}

                        y={textY}

                        textAnchor="middle"

                        dominantBaseline="middle"

                        style={{

                          fill: '#f59e0b',

                          fontWeight: 'bold',

                          fontSize: '28px',

                          fontFamily: 'Arial, sans-serif'

                        }}

                      >

                        255

                      </text>

                    </g>

                  );

                })()}

              </svg>

            </div>

          </div>



          <div className="space-y-4">

            <div className="bg-gradient-to-br from-amber-900/40 to-slate-800/80 backdrop-blur rounded-xl shadow-xl p-5 border-2 border-amber-600/40">

              <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">

                <Sun className="w-5 h-5" />

                Current Position

              </h3>

              <div className="space-y-2 text-sm">

                <div className="flex justify-between">

                  <span className="text-gray-400">Day of Year:</span>

                  <span className="text-white font-bold">{enochianDate.dayOfYear} of 364</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-gray-400">Month {enochianDate.month} Day:</span>

                  <span className="text-white font-bold">{enochianDate.dayOfMonth} of {enochianDate.daysInCurrentMonth}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-gray-400">Week:</span>

                  <span className="text-white font-bold">{enochianDate.weekOfYear} of 52</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-gray-400">Day Part:</span>

                  <span className="text-amber-500 font-bold">{enochianDate.dayPart}</span>

                </div>

              </div>

            </div>



            <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/80 backdrop-blur rounded-xl shadow-xl p-5 border-2 border-blue-600/40">

              <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">

                <Calendar className="w-5 h-5" />

                Gregorian Date

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

              </div>

              <div className="mt-3 pt-3 border-t border-blue-600/30">

                <div className="text-xs space-y-1">

                  <div className="flex justify-between">

                    <span className="text-gray-400">Sunrise:</span>

                    <span className="text-amber-400 font-mono">05:13</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-400">Sunset:</span>

                    <span className="text-orange-400 font-mono">19:26</span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

};



export default EnochianWheelCalendar;
