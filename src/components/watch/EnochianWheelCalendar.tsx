import React, { useState, useEffect } from 'react';
import { Sun, Moon, Calendar } from 'lucide-react';

const PART_MINUTES   = 80;            // 1 part = 80 min
const PARTS_PER_DAY  = 18;            // 18 parts
const MINUTES_PER_DAY = PART_MINUTES * PARTS_PER_DAY; // 1 440
const DAYS_PER_YEAR  = 364;

const EnochianWheelCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [enochianDate, setEnochianDate] = useState({ 
    dayOfYear: 255, month: 9, dayOfMonth: 13, weekOfYear: 37,
    dayOfWeek: 6, dayPart: 'Laylah', eighteenPart: 12, daysInCurrentMonth: 31,
    timelessDay: 0, season: 'Fall'
  });
  const [sunData, setSunData]       = useState(null);
  const [sacredNow, setSacredNow]   = useState(null);   // sunrise-based clock

  /* ----------  MONTH STRUCTURE  ---------- */
  const monthStructure = [
    { num: 1, days: 30, season: 'Spring' }, { num: 2, days: 30, season: 'Spring' },
    { num: 3, days: 31, season: 'Spring' }, { num: 4, days: 30, season: 'Summer' },
    { num: 5, days: 30, season: 'Summer' }, { num: 6, days: 31, season: 'Summer' },
    { num: 7, days: 30, season: 'Fall' },   { num: 8, days: 30, season: 'Fall' },
    { num: 9, days: 31, season: 'Fall' },   { num: 10, days: 30, season: 'Winter' },
    { num: 11, days: 30, season: 'Winter' },{ num: 12, days: 31, season: 'Winter' }
  ];

  const seasons = {
    Spring: { color: '#10b981', icon: '🐏', name: 'ARIES' },
    Summer: { color: '#f59e0b', icon: '♋', name: 'CANCER' },
    Fall: { color: '#ef4444', icon: '♎', name: 'LIBRA' },
    Winter: { color: '#3b82f6', icon: '♑', name: 'CAPRICORN' }
  };

  /* ----------  12 & 4 GREAT WHEELS  ---------- */
  const zodiacWheel = [
    { num: 1, constellation: 'Aries', tribe: 'Yehudah', banner: '🦁', month: 'Nisan', priest: 'Har', highPriest: 'Alki\'el' },
    { num: 2, constellation: 'Taurus', tribe: 'Yissakar', banner: '🫏', month: 'Iyar', priest: 'Nar', highPriest: 'El' },
    { num: 3, constellation: 'Gemini', tribe: 'Zebulon', banner: '⛵', month: 'Sivan', priest: 'Iel', highPriest: 'Iel' },
    { num: 4, constellation: 'Cancer', tribe: 'Reuben', banner: '👤', month: 'Tammuz', priest: 'Kohath', highPriest: 'Kohath' },
    { num: 5, constellation: 'Leo', tribe: 'Simeon', banner: '⚔️', month: 'Av', priest: 'Kohath', highPriest: 'Kohath' },
    { num: 6, constellation: 'Virgo', tribe: 'Gad', banner: '🔥', month: 'Elul', priest: 'Kohath', highPriest: 'Kohath' },
    { num: 7, constellation: 'Libra', tribe: 'Ephraim', banner: '🐂', month: 'Tishrei', priest: 'Gershon', highPriest: 'Gershon' },
    { num: 8, constellation: 'Scorpius', tribe: 'Manasseh', banner: '🦄', month: 'Cheshvan', priest: 'Gershon', highPriest: 'Gershon' },
    { num: 9, constellation: 'Sagittarius', tribe: 'Benyamin', banner: '🐺', month: 'Kislev', priest: 'Gershon', highPriest: 'Gershon' },
    { num: 10, constellation: 'Capricornus', tribe: 'Dan', banner: '🦅', month: 'Tevet', priest: 'Merari', highPriest: 'Merari' },
    { num: 11, constellation: 'Aquarius', tribe: 'Asher', banner: '🌿', month: 'Shevat', priest: 'Merari', highPriest: 'Merari' },
    { num: 12, constellation: 'Pisces', tribe: 'Naphtali', banner: '🦌', month: 'Adar', priest: 'Merari', highPriest: 'Merari' }
  ];

  const greatWheel = [
    { name: 'Orion', highPriest: 'Moses & Aaron', tribes: ['Yehudah', 'Yissakar', 'Zebulon'], banners: ['🦁', '🫏', '⛵'], priest: 'Aaron', season: 'Spring', startDay: 1 },
    { name: 'Hydra', highPriest: 'Kohath', tribes: ['Reuben', 'Simeon', 'Gad'], banners: ['👤', '⚔️', '🔥'], priest: 'Kohath', season: 'Summer', startDay: 92 },
    { name: 'Centaurus', highPriest: 'Gershon', tribes: ['Ephraim', 'Manasseh', 'Benyamin'], banners: ['🐂', '🦄', '🐺'], priest: 'Gershon', season: 'Fall', startDay: 183 },
    { name: 'Pegasus', highPriest: 'Merari', tribes: ['Dan', 'Asher', 'Naphtali'], banners: ['🦅', '🌿', '🦌'], priest: 'Merari', season: 'Winter', startDay: 274 }
  ];

  /* ----------  SACRED PORTAL TABLE  ---------- */
  const portalMap = {
    north: [
      { days: 30, dayParts: 10, nightParts: 8 },   // Portal 4 – Spring
      { days: 30, dayParts: 11, nightParts: 7 },   // Portal 5 – Spring
      { days: 31, dayParts: 12, nightParts: 6 },   // Portal 6 – Summer
      { days: 30, dayParts: 11, nightParts: 7 },   // Portal 6 – Fall
      { days: 30, dayParts: 10, nightParts: 8 },   // Portal 5 – Fall
      { days: 31, dayParts: 9, nightParts: 9 },    // Portal 4 – Equinox
      { days: 30, dayParts: 8, nightParts: 10 },   // Portal 3 – Winter
      { days: 30, dayParts: 7, nightParts: 11 },   // Portal 2 – Winter
      { days: 31, dayParts: 6, nightParts: 12 },   // Portal 1 – Winter
      { days: 30, dayParts: 7, nightParts: 11 },   // Portal 1 – Spring
      { days: 30, dayParts: 8, nightParts: 10 },   // Portal 2 – Spring
      { days: 31, dayParts: 9, nightParts: 9 },    // Portal 3 – Equinox
    ],
    south: function () { return this.north.slice().reverse(); }
  };

  const getSacredDayNight = (dayOfYear, hemisphere = 'north') => {
    const map = hemisphere === 'south' ? portalMap.south() : portalMap.north;
    let d = 1;
    for (const p of map) {
      if (dayOfYear <= d + p.days - 1) return { dayParts: p.dayParts, nightParts: p.nightParts };
      d += p.days;
    }
    return { dayParts: 9, nightParts: 9 };
  };

  const getRealSunrise = async (lat, lng) => {
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`;
    const res = await fetch(url);
    const data = await res.json();
    const sr = new Date(data.results.sunrise);
    return { hour: sr.getHours(), minute: sr.getMinutes() };
  };

  const getSacredSunTimes = async (doy, lat, lng, hem) => {
    const { dayParts, nightParts } = getSacredDayNight(doy, hem);
    const { hour, minute } = await getRealSunrise(lat, lng);
    const sunriseMin = hour * 60 + minute;
    const dayMin = dayParts * PART_MINUTES;
    const sunsetMin = sunriseMin + dayMin;
      return {
      sunrise: { hour, minute },
      sunset: { hour: Math.floor(sunsetMin / 60) % 24, minute: sunsetMin % 60 },
      dayParts, nightParts
    };
  };

  /* ----------  Enochian DATE  ---------- */
  const getSpringEquinox = y => new Date(y, 2, 20);
  const convertToEnochian = d => {
    const y = d.getFullYear();
    const equinox = getSpringEquinox(y);
    let days = Math.floor((d.getTime() - equinox.getTime()) / 86400000);
    if (days < 0) days += 364;
    if (days >= 364) return { ...calcEnochian(363, d), dayOfYear: 364 + (days - 363), timelessDay: days - 363 };
    return calcEnochian(days, d);
  };
  const calcEnochian = (days, d) => {
    let rem = days;
    for (const m of monthStructure) {
      if (rem < m.days) return makeEnochian(m.num, rem + 1, days, d);
      rem -= m.days;
    }
    return makeEnochian(12, 31, 363, d);
  };
  const makeEnochian = (month, dom, days, d) => ({
    dayOfYear: days + 1, month, dayOfMonth: dom,
    weekOfYear: Math.floor(days / 7) + 1, dayOfWeek: (days % 7) + 1,
    dayPart: '', eighteenPart: 1, daysInCurrentMonth: monthStructure[month - 1].days,
    timelessDay: 0, season: monthStructure[month - 1].season
  });

  /* ----------  SUNRISE-BASED CLOCK  ---------- */
  const updateSacredClock = () => {
    if (!sunData) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const sunriseMin = sunData.sunrise.hour * 60 + sunData.sunrise.minute;
    let offsetMin = nowMin - sunriseMin;
    if (offsetMin < 0) offsetMin += MINUTES_PER_DAY;   // previous sacred day
    const part = Math.floor(offsetMin / PART_MINUTES) + 1;
    const dayPartName = (() => {
      const sunsetMin = sunriseMin + sunData.dayParts * PART_MINUTES;
      const erevEnd = sunsetMin + 120;
      const boqerStart = sunriseMin - 120;
      if (offsetMin >= 0 && offsetMin < sunsetMin - sunriseMin) return 'Yôm';
      if (offsetMin >= sunsetMin - sunriseMin && offsetMin < erevEnd - sunriseMin) return 'Erev';
      if (offsetMin >= boqerStart - sunriseMin && offsetMin < 0) return 'Boqer'; // before sunrise same day
      return 'Laylah';
    })();
    setSacredNow({ part, dayPartName, offsetMin });
    setEnochianDate(prev => ({ ...prev, dayPart: dayPartName, eighteenPart: part }));
  };

  /* ----------  LIFE-CYCLE  ---------- */
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentDate(new Date());
      updateSacredClock();
    }, 1000);
    return () => clearInterval(t);
  }, [sunData]);

  useEffect(() => {
    setEnochianDate(convertToEnochian(currentDate));
  }, [currentDate]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      const hem = latitude < 0 ? 'south' : 'north';
      const data = await getSacredSunTimes(enochianDate.dayOfYear, latitude, longitude, hem);
      setSunData(data);
    }, async () => {
      const data = await getSacredSunTimes(enochianDate.dayOfYear, 31.8, 35.2, 'north');
      setSunData(data);
    });
  }, [enochianDate.dayOfYear]);

  /* ----------  DISPLAY LINE  ---------- */
  const displayLine = sunData && sacredNow
    ? `Year 6028 • Month ${enochianDate.month} • Day ${enochianDate.dayOfMonth}  •  Weekday ${enochianDate.dayOfWeek} • Part ${sacredNow.part}/${PARTS_PER_DAY}  •  Day ${enochianDate.dayOfYear} of 6028 • Regular Day  •  ${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${currentDate.toLocaleDateString('en-GB')} at ${currentDate.toLocaleTimeString('en-GB')}  •  Creator's wheels never lie • forever in sync`
    : 'Loading sacred time...';

  const size = 1000, center = size / 2;
  const seasonRotation = ((enochianDate.dayOfYear - 1) / 91) * 90;
  const zodiacRotation   = -((enochianDate.dayOfYear - 1) / 30) * 30;
  const greatRotation    = -((enochianDate.dayOfYear - 1) / 91) * 90;

  /* ----------  NEW EVEN SPACING + BORDER COLORS  ---------- */
  const ringData = [
    { r: 340, stroke: '#fbbf24', name: '365-day' },
    { r: 315, stroke: '#f59e0b', name: '12-Zodiac' },
    { r: 285, stroke: '#22c55e', name: '4-Great' },
    { r: 255, stroke: '#10b981', name: '30-day' },
    { r: 225, stroke: '#60a5fa', name: '52-week' },
    { r: 195, stroke: '#ef4444', name: '31-day' },
    { r: 165, stroke: '#1e40af', name: '18-part' },
    { r: 135, stroke: '#8b5cf6', name: '7-weekday' },
    { r: 105, stroke: '#ec4899', name: '4-part-day' },
    { r: 75, stroke: '#9333ea', name: '2-DOOT' },
    { r: 10, stroke: '#d97706', name: 'centre' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-amber-400 mb-2 flex items-center justify-center gap-3 drop-shadow-lg">
            <Sun className="w-12 h-12 animate-pulse" />The Creator's Calendar<Moon className="w-10 h-10 text-blue-300" />
          </h1>
          <p className="text-gray-300 text-xs">Sun-rise aligned • 10 Sacred Wheels • 364-Day Portal Year</p>
        </div>

        {/* ---------------  WHEEL  --------------- */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur rounded-2xl shadow-2xl p-6 border-4 border-amber-600/30">
            <svg width={800} height={800} viewBox="0 0 1000 1000" className="drop-shadow-xl">
              <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>

              {/* BACKGROUND SEASONS */}
                <g transform={`rotate(${seasonRotation}, ${center}, ${center})`}>
                {Object.entries(seasons).map(([s, d], i) => {
                  const outerRadius = ringData.find(r => r.name === '365-day')?.r || 340;
                  const a = (i * 90 - 90) * Math.PI / 180;
                  const b = ((i + 1) * 90 - 90) * Math.PI / 180;
                  return <path key={s} d={`M ${center} ${center} L ${center + outerRadius * Math.cos(a)} ${center + outerRadius * Math.sin(a)} A ${outerRadius} ${outerRadius} 0 0 1 ${center + outerRadius * Math.cos(b)} ${center + outerRadius * Math.sin(b)} Z`} fill={d.color} opacity="0.15" />;
                })}
              </g>

              {/* 12 ZODIAC CIRCLE - Render early so it's visible */}
              <g transform={`rotate(${-((enochianDate.dayOfYear - 1) / 30) * 360}, ${center}, ${center})`}>
                <circle cx={center} cy={center} r={ringData.find(r => r.name === '12-Zodiac')?.r} fill="none" stroke={ringData.find(r => r.name === '12-Zodiac')?.stroke} strokeWidth="6" opacity="1" />
              </g>

              {/* 4 GREAT CONSTELLATIONS CIRCLE - Render early so it's visible */}
              <g transform={`rotate(${-((enochianDate.dayOfYear - 1) / 91) * 90}, ${center}, ${center})`}>
                <circle cx={center} cy={center} r={ringData.find(r => r.name === '4-Great')?.r} fill="none" stroke={ringData.find(r => r.name === '4-Great')?.stroke} strokeWidth="6" opacity="1" />
              </g>

              {/* ----------  RENDER EACH RING WITH BORDER  ---------- */}
              {ringData.map((ring, i) => {
                // Skip zodiac and great constellations as they're rendered above with rotation
                if (ring.name === '12-Zodiac' || ring.name === '4-Great') return null;
                // Skip centre as it has special handling below
                if (ring.name === 'centre') return null;
                  return (
                        <circle
                    key={ring.name}
                    cx={center}
                    cy={center}
                    r={ring.r}
                    fill="none"
                    stroke={ring.stroke}
                    strokeWidth="3"
                    opacity="0.9"
                  />
                );
              })}

              {Object.entries(seasons).map(([s, d], i) => {
                const ang = (i * 90 + 45 - 90) * Math.PI / 180;
                const x = center + 390 * Math.cos(ang);
                const y = center + 390 * Math.sin(ang);
                return <text key={`lbl-${s}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * 90 + 45} ${x} ${y})`} className="text-lg fill-white font-bold tracking-widest">{s.toUpperCase()}</text>;
              })}

              {/* 365 DAY WHEEL */}
              <g transform={`rotate(${((enochianDate.dayOfYear - 1) / 364) * 360}, ${center}, ${center})`}>
                {[365, 366].map((d, i) => {
                  const outerRadius = ringData.find(r => r.name === '365-day')?.r || 340;
                  const ang = (-90 + (i - 0.5) * 2) * Math.PI / 180;
                  const x = center + (outerRadius - 20) * Math.cos(ang);
                  const y = center + (outerRadius - 20) * Math.sin(ang);
                  const cur = d === enochianDate.dayOfYear;
                  return <g key={`t-${d}`}><circle cx={x} cy={y} r="8" fill={cur ? '#a855f7' : '#9333ea'} stroke="#fbbf24" strokeWidth="2" />{cur && <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-white">{d}</text>}</g>;
                })}
                  {Array.from({ length: 364 }).map((_, i) => {
                  const day = i + 1;
                  const ang = (-90 + (i / 364) * 360) * Math.PI / 180;
                  const cur = day === enochianDate.dayOfYear;
                  const int = day === 91 || day === 182 || day === 273 || day === 364;
                  const outerRadius = ringData.find(r => r.name === '365-day')?.r || 340;
                  const x1 = center + (outerRadius - 25) * Math.cos(ang);
                  const y1 = center + (outerRadius - 25) * Math.sin(ang);
                  const x2 = center + outerRadius * Math.cos(ang);
                  const y2 = center + outerRadius * Math.sin(ang);
                  if (cur && day !== 255) {
                    const outerRadius = ringData.find(r => r.name === '365-day')?.r || 340;
                    const tx = center + (outerRadius - 20) * Math.cos(ang);
                    const ty = center + (outerRadius - 20) * Math.sin(ang);
                    return <g key={`d-${i}`}><circle cx={tx} cy={ty} r="14" fill="#fbbf24" opacity="0.3" /><circle cx={tx} cy={ty} r="12" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" /><text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${-90 + (i / 364) * 360}, ${tx}, ${ty})`} className="font-bold fill-amber-400" style={{ fontSize: '14px' }}>{day}</text></g>;
                  }
                  return <line key={`l-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={int ? '#f59e0b' : '#64748b'} strokeWidth={int ? '3' : '2.5'} strokeLinecap="round" opacity={int ? '0.9' : '0.7'} />;
                })}
              </g>

              {/* 12 ZODIAC LABELS AND MARKERS */}
              <g transform={`rotate(${-((enochianDate.dayOfYear - 1) / 30) * 360}, ${center}, ${center})`}>
                {zodiacWheel.map((s, i) => {
                  const ang = (i * 30 - 90) * Math.PI / 180;
                  const mid = (i * 30 + 15 - 90);
                  const midRad = mid * Math.PI / 180;
                  const zodiacRadius = ringData.find(r => r.name === '12-Zodiac')?.r || 315;
                  const labelX = center + (zodiacRadius - 5) * Math.cos(midRad);
                  const labelY = center + (zodiacRadius - 5) * Math.sin(midRad);
                  const textRot = mid + 90;
                  return <g key={`z-${i}`}>
                    <line x1={center + (zodiacRadius - 15) * Math.cos(ang)} y1={center + (zodiacRadius - 15) * Math.sin(ang)} x2={center + zodiacRadius * Math.cos(ang)} y2={center + zodiacRadius * Math.sin(ang)} stroke={ringData.find(r => r.name === '12-Zodiac')?.stroke} strokeWidth="4" />
                    <text x={labelX} y={labelY - 8} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRot}, ${labelX}, ${labelY - 8})`} fill="#fbbf24" fontSize="16" fontWeight="bold" style={{textShadow: '0 0 3px black'}}>{s.num}. {s.constellation}</text>
                    <text x={labelX} y={labelY + 8} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRot}, ${labelX}, ${labelY + 8})`} fill="#f59e0b" fontSize="13" style={{textShadow: '0 0 3px black'}}>{s.tribe}</text>
                    <text x={labelX} y={labelY + 20} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRot}, ${labelX}, ${labelY + 20})`} fill="#fbbf24" fontSize="12" style={{textShadow: '0 0 3px black'}}>{s.month}</text>
                  </g>;
                })}
              </g>

              {/* 4 GREAT CONSTELLATIONS LABELS AND MARKERS */}
              <g transform={`rotate(${-((enochianDate.dayOfYear - 1) / 91) * 90}, ${center}, ${center})`}>
                {greatWheel.map((g, i) => {
                  const ang = (i * 90 - 90) * Math.PI / 180;
                  const mid = (i * 90 + 45 - 90);
                  const midRad = mid * Math.PI / 180;
                  const greatRadius = ringData.find(r => r.name === '4-Great')?.r || 285;
                  const labelX = center + (greatRadius - 5) * Math.cos(midRad);
                  const labelY = center + (greatRadius - 5) * Math.sin(midRad);
                  const textRot = mid + 90;
                  return <g key={`g-${i}`}>
                    <line x1={center + (greatRadius - 15) * Math.cos(ang)} y1={center + (greatRadius - 15) * Math.sin(ang)} x2={center + greatRadius * Math.cos(ang)} y2={center + greatRadius * Math.sin(ang)} stroke={ringData.find(r => r.name === '4-Great')?.stroke} strokeWidth="5" />
                    <text x={labelX} y={labelY - 6} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRot}, ${labelX}, ${labelY - 6})`} fill="#10b981" fontSize="18" fontWeight="bold" style={{textShadow: '0 0 4px black'}}>{g.name}</text>
                    <text x={labelX} y={labelY + 10} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRot}, ${labelX}, ${labelY + 10})`} fill="#22c55e" fontSize="14" style={{textShadow: '0 0 4px black'}}>{g.highPriest}</text>
                    <text x={labelX} y={labelY + 24} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRot}, ${labelX}, ${labelY + 24})`} fill="#34d399" fontSize="12" style={{textShadow: '0 0 4px black'}}>{g.tribes.join(' ')}</text>
                  </g>;
                })}
              </g>

              {/* 30 DAY */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '30-day');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" /> : null;
                })()}
                  {Array.from({ length: 30 }).map((_, i) => {
                  const ring = ringData.find(r => r.name === '30-day');
                  const ringRadius = ring?.r || 255;
                  const ang = (i * 12 - 90) * Math.PI / 180;
                  const mid = (i * 12 + 6 - 90);
                  const cur = enochianDate.daysInCurrentMonth === 30 && i + 1 === enochianDate.dayOfMonth;
                  return <g key={`30-${i}`}>
                    <line x1={center + (ringRadius - 20) * Math.cos(ang)} y1={center + (ringRadius - 20) * Math.sin(ang)} x2={center + ringRadius * Math.cos(ang)} y2={center + ringRadius * Math.sin(ang)} stroke={ring?.stroke} strokeWidth="2" />
                    <text x={center + (ringRadius - 10) * Math.cos(mid * Math.PI / 180)} y={center + (ringRadius - 10) * Math.sin(mid * Math.PI / 180)} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${center + (ringRadius - 10) * Math.cos(mid * Math.PI / 180)} ${center + (ringRadius - 10) * Math.sin(mid * Math.PI / 180)})`} className={`font-bold ${cur ? 'fill-green-200' : 'fill-green-400'}`} style={{ fontSize: '14px' }}>{i + 1}</text>
                  </g>;
                })}
                </g>



              {/* 52 WEEKS */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '52-week');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" opacity="0.9" /> : null;
                })()}
                {Array.from({ length: 52 }).map((_, w) => {
                  const ang = (w * 6.923 - 90) * Math.PI / 180;
                  return <g key={`w-${w}`}>
                    <line x1={center + 205 * Math.cos(ang)} y1={center + 205 * Math.sin(ang)} x2={center + 225 * Math.cos(ang)} y2={center + 225 * Math.sin(ang)} stroke="#60a5fa" strokeWidth="3" />
                    {Array.from({ length: 6 }).map((_, d) => {
                      const a2 = (w * 6.923 + (d + 1) * (6.923 / 7) - 90) * Math.PI / 180;
                      const sab = d === 5;
                      return <line key={`d-${d}`} x1={center + 208 * Math.cos(a2)} y1={center + 208 * Math.sin(a2)} x2={center + 222 * Math.cos(a2)} y2={center + 222 * Math.sin(a2)} stroke={sab ? '#93c5fd' : '#64748b'} strokeWidth={sab ? '2' : '1.5'} />;
                    })}
                  </g>;
                })}
              </g>

              {/* 31 DAY */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '31-day');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" opacity="0.9" /> : null;
                })()}
                  {Array.from({ length: 31 }).map((_, i) => {
                  const ang = (i * 11.612 - 90) * Math.PI / 180;
                  const mid = (i * 11.612 + 5.806 - 90);
                  const cur = enochianDate.daysInCurrentMonth === 31 && i + 1 === enochianDate.dayOfMonth;
                  return <g key={`31-${i}`}>
                    <line x1={center + 175 * Math.cos(ang)} y1={center + 175 * Math.sin(ang)} x2={center + 195 * Math.cos(ang)} y2={center + 195 * Math.sin(ang)} stroke="#ef4444" strokeWidth="2" />
                    <text x={center + 185 * Math.cos(mid * Math.PI / 180)} y={center + 185 * Math.sin(mid * Math.PI / 180)} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${center + 185 * Math.cos(mid * Math.PI / 180)} ${center + 185 * Math.sin(mid * Math.PI / 180)})`} className={`font-bold ${cur ? 'fill-red-200' : 'fill-red-400'}`} style={{ fontSize: '14px' }}>{i + 1}</text>
                  </g>;
                })}
              </g>

              {/* 18 PARTS – SACRED LENGTH */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '18-part');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" opacity="0.9" /> : null;
                })()}
                {sunData && Array.from({ length: 18 }).map((_, i) => {
                  const ang = (i * 20 - 90) * Math.PI / 180;
                  const mid = (i * 20 + 10 - 90);
                  const day = i < sunData.dayParts;
                  const cur = i + 1 === enochianDate.eighteenPart;
                  return <g key={`18-${i}`}>
                    <line x1={center + 145 * Math.cos(ang)} y1={center + 145 * Math.sin(ang)} x2={center + 165 * Math.cos(ang)} y2={center + 165 * Math.sin(ang)} stroke={day ? '#fbbf24' : '#1e40af'} strokeWidth={i === 0 || i === sunData.dayParts ? '3' : '2'} />
                    <text x={center + 155 * Math.cos(mid * Math.PI / 180)} y={center + 155 * Math.sin(mid * Math.PI / 180)} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${center + 155 * Math.cos(mid * Math.PI / 180)} ${center + 155 * Math.sin(mid * Math.PI / 180)})`} className={`font-bold ${cur ? 'fill-yellow-200' : 'fill-blue-300'}`} style={{ fontSize: '12px' }}>{i + 1}</text>
                  </g>;
                })}
              </g>

              {/* 7 WEEKDAYS */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '7-weekday');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" opacity="0.9" /> : null;
                })()}
                  {Array.from({ length: 7 }).map((_, i) => {
                  const ang = (i * 51.428 - 90) * Math.PI / 180;
                  const mid = (i * 51.428 + 25.714 - 90);
                  const sab = i === 6;
                  const cur = i + 1 === enochianDate.dayOfWeek;
                  const tx = center + 125 * Math.cos(mid * Math.PI / 180);
                  const ty = center + 125 * Math.sin(mid * Math.PI / 180);
                  return <g key={`7-${i}`}>
                    <line x1={center + 115 * Math.cos(ang)} y1={center + 115 * Math.sin(ang)} x2={center + 135 * Math.cos(ang)} y2={center + 135 * Math.sin(ang)} stroke={sab ? '#a78bfa' : '#8b5cf6'} strokeWidth={sab ? '3' : '2'} />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid + 90} ${tx} ${ty})`} className={`font-bold ${cur ? 'fill-purple-200' : 'fill-purple-400'}`} style={{ fontSize: sab ? '11px' : '10px' }}>{sab ? 'Sabbath' : `Day ${i + 1}`}</text>
                  </g>;
                })}
              </g>

              {/* 4 PARTS OF DAY – PROPORTIONAL */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '4-part-day');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" opacity="0.9" /> : null;
                })()}
                {sunData && (() => {
                  const { dayParts, nightParts } = sunData;
                  const degPer = 360 / 18;
                  const yom = dayParts * degPer;
                  const erev = 1.5 * degPer;
                  const boqer = 1.5 * degPer;
                  const laylah = nightParts * degPer - erev - boqer;
                  const parts = [
                    { name: 'Yôm', label: 'Day', deg: yom, color: '#fbbf24', key: 'Yôm' },
                    { name: 'Erev', label: 'Evening', deg: erev, color: '#f97316', key: 'Erev' },
                    { name: 'Laylah', label: 'Night', deg: laylah, color: '#1e3a8a', key: 'Laylah' },
                    { name: 'Boqer', label: 'Morning', deg: boqer, color: '#fb923c', key: 'Boqer' }
                  ];
                  let curAng = 90;
                  return parts.map((p, i) => {
                    const start = curAng;
                    const end = start + p.deg;
                    const mid = (start + end) / 2;
                    const startRad = start * Math.PI / 180;
                    const isCur = p.key === enochianDate.dayPart;
                    curAng = end;
                    const tx = center + 95 * Math.cos(mid * Math.PI / 180);
                    const ty = center + 95 * Math.sin(mid * Math.PI / 180);
                    return <g key={`4p-${i}`}>
                      <line x1={center + 85 * Math.cos(startRad)} y1={center + 85 * Math.sin(startRad)} x2={center + 105 * Math.cos(startRad)} y2={center + 105 * Math.sin(startRad)} stroke={p.color} strokeWidth="3" />
                      <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid + 90} ${tx} ${ty})`} className={`font-bold ${isCur ? 'fill-white' : 'fill-gray-300'}`} style={{ fontSize: p.name === 'Yôm' ? '13px' : '10px' }}>{p.label}</text>
                  </g>;
                  });
                  })()}
              </g>

              {/* 2 DOOT */}
              <g>
                {(() => {
                  const ring = ringData.find(r => r.name === '2-DOOT');
                  return ring ? <circle cx={center} cy={center} r={ring.r} fill="none" stroke={ring.stroke} strokeWidth="3" opacity="0.9" /> : null;
                })()}
                {[
                  { name: 'Helio-Yasef', day: 365, color: '#a855f7' },
                  { name: "Asfa'el", day: 366, color: '#7c3aed' }
                ].map((d, i) => {
                  const ang = (i * 180 - 90) * Math.PI / 180;
                  const mid = (i * 180 + 90 - 90);
                  const midRad = mid * Math.PI / 180;
                  const cur = enochianDate.dayOfYear === d.day;
                  const tx = center + 65 * Math.cos(midRad);
                  const ty = center + 65 * Math.sin(midRad);
                  return <g key={`doot-${i}`}>
                    <line x1={center + 55 * Math.cos(ang)} y1={center + 55 * Math.sin(ang)} x2={center + 75 * Math.cos(ang)} y2={center + 75 * Math.sin(ang)} stroke={d.color} strokeWidth="3" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid + 90} ${tx} ${ty})`} className={`font-bold ${cur ? 'fill-purple-200' : 'fill-purple-400'}`} style={{ fontSize: '11px' }}>{d.name}</text>
                  </g>;
                })}
              </g>

              {/* CENTRE DISC */}
              {(() => {
                const ring = ringData.find(r => r.name === 'centre');
                return ring ? <circle cx={center} cy={center} r={ring.r} fill="#0f172a" stroke={ring.stroke} strokeWidth="2" /> : null;
              })()}
              {enochianDate.dayOfWeek === 7 && <circle cx={center} cy={center} r="8" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4,2"><animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" /></circle>}
              <text x={center} y={center + 3} textAnchor="middle" className="text-[8px] fill-amber-400 font-bold">{enochianDate.dayOfMonth}</text>

              {/* PINK 255 MARKERS */}
                {(() => {
                const outerRadius = ringData.find(r => r.name === '365-day')?.r || 340;
                const degPer = 360 / 364;
                const pinkLine = -90 - (4 * degPer);
                const pink255 = pinkLine - (254 * degPer);
                const ang = pink255 * Math.PI / 180;
                const tipX = center + outerRadius * Math.cos(ang);
                const tipY = center + outerRadius * Math.sin(ang);
                const outerX = center + (outerRadius + 15) * Math.cos(ang);
                const outerY = center + (outerRadius + 15) * Math.sin(ang);
                const p1 = (pink255 + 90) * Math.PI / 180;
                const p2 = (pink255 - 90) * Math.PI / 180;
                const b1x = outerX + 10 * Math.cos(p1);
                const b1y = outerY + 10 * Math.sin(p1);
                const b2x = outerX + 10 * Math.cos(p2);
                const b2y = outerY + 10 * Math.sin(p2);
                const tx = center + (outerRadius + 50) * Math.cos(ang);
                const ty = center + (outerRadius + 50) * Math.sin(ang);
                return <g>
                  <polygon points={`${tipX},${tipY} ${b1x},${b1y} ${b2x},${b2y}`} fill="#ec4899" stroke="#ec4899" strokeWidth="2" />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" style={{ fill: '#ec4899', fontWeight: 'bold', fontSize: '28px', fontFamily: 'Arial, sans-serif' }}>255</text>
                </g>;
                })()}
              </svg>
            </div>
          </div>

        {/* ---------------  BANNER-LINE YOU REQUESTED  --------------- */}
        <div className="text-center">
          <p className="text-amber-300 font-semibold text-sm tracking-wide">
            {displayLine}
          </p>
                </div>

                </div>
                </div>
  );
};

export default EnochianWheelCalendar;
