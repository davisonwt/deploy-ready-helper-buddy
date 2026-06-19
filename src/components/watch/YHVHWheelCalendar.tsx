'use client';

import React, { useEffect, useState } from 'react';
import { useSacredNow } from '@/hooks/useSacredNow';
import { useUserLocation } from '@/hooks/useUserLocation';
import { getSunriseSunset, type SunriseData } from '@/utils/sunrise';

type Offset = { x?: number; y?: number };

const SEASONS_N = ['Spring','Spring','Spring','Summer','Summer','Summer','Fall','Fall','Fall','Winter','Winter','Winter'];
const SEASONS_S = ['Fall','Fall','Fall','Winter','Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer'];

/**
 * Compute current 18-part-of-day index based on sunrise/sunset per Enoch 71/72.
 * Day (sunrise→sunset) and night (sunset→next sunrise) are each split proportionally
 * into 18 total parts, then current local time maps to the active slot.
 */
function compute18PartIndex(now: Date, sun: SunriseData | null): number {
  if (!sun) {
    return Math.floor((now.getHours() / 24) * 18);
  }
  const sr = sun.sunrise.getTime();
  const ss = sun.sunset.getTime();
  const t = now.getTime();
  const dayMs = ss - sr;
  const totalDayHours = dayMs / 3600000;
  // Enoch: equinox = 9 day / 9 night; proportional otherwise
  const dayParts = Math.max(6, Math.min(12, Math.round((totalDayHours / 24) * 18)));
  const nightParts = 18 - dayParts;
  if (t >= sr && t < ss) {
    const frac = (t - sr) / dayMs;
    return Math.min(dayParts - 1, Math.floor(frac * dayParts));
  }
  // night
  const nextSr = sr + 24 * 3600000;
  const nightMs = nextSr - ss;
  const tt = t < sr ? t + 24 * 3600000 - ss : t - ss;
  const frac = Math.max(0, Math.min(0.9999, tt / nightMs));
  return dayParts + Math.floor(frac * nightParts);
}

interface YHVHWheelCalendarProps {
  size?: number;
  customRadii?: Record<string, number | undefined>;
  ringOffsets?: Record<string, Offset | undefined>;
  textOverrides?: Record<string, string>;
}

const cx = 500;
const cy = 500;
const TAU = Math.PI * 2;

const leaders = [
  { name: "Adnar'el", tribe: 'Yehoseph', creature: 'Lion', color: '#f2b705', tribes: ['Judah','Issachar','Zebulun'] },
  { name: "Barkiel", tribe: 'Reuben', creature: 'Man', color: '#15803d', tribes: ['Dan','Asher','Naphtali'] },
  { name: "Bomi'el", tribe: 'Gershon', creature: 'Ox', color: '#991b1b', tribes: ['Ephraim','Manasseh','Benjamin'] },
  { name: "Gad'el", tribe: 'Asher', creature: 'Eagle', color: '#1d4ed8', tribes: ['Reuben','Simeon','Gad'] },
];

const partNames = ['Day', 'Man', 'Ox', 'Night', 'Eagle', 'Lion'];

// Synodic month + reference new moon (2000-01-06 18:14 UTC) per Enoch 73-74
const SYNODIC = 29.530588853;
const LUNAR_REF = Date.UTC(2000, 0, 6, 18, 14, 0);
const MOON_GLYPHS = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

function computeMoon(now: Date) {
  const daysSince = (now.getTime() - LUNAR_REF) / 86400000;
  const age = ((daysSince % SYNODIC) + SYNODIC) % SYNODIC; // 0..29.53
  const phase = age / SYNODIC; // 0..1
  const lunarYearDay = Math.floor(((daysSince % 354) + 354) % 354); // 0..353
  const phaseIdx = Math.floor(phase * 8 + 0.5) % 8;
  return { age, phase, lunarYearDay, glyph: MOON_GLYPHS[phaseIdx] };
}

function polar(radius: number, degrees: number, offset?: Offset) {
  const a = ((degrees - 90) * Math.PI) / 180;
  return {
    x: cx + (offset?.x || 0) + radius * Math.cos(a),
    y: cy + (offset?.y || 0) + radius * Math.sin(a),
  };
}

function arcPath(inner: number, outer: number, start: number, end: number, offset?: Offset) {
  const large = end - start > 180 ? 1 : 0;
  const p1 = polar(outer, start, offset);
  const p2 = polar(outer, end, offset);
  const p3 = polar(inner, end, offset);
  const p4 = polar(inner, start, offset);
  return `M ${p1.x} ${p1.y} A ${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function RingSegments({ count, inner, outer, activeIndex, goldEvery = 7, offset }: { count: number; inner: number; outer: number; activeIndex?: number; goldEvery?: number; offset?: Offset }) {
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const start = (i / count) * 360;
        const end = ((i + 0.82) / count) * 360;
        const isActive = i === activeIndex;
        const fill = isActive ? '#0ea5e9' : i % goldEvery === 0 ? '#d4a017' : i % 13 === 0 ? '#2563eb' : '#475569';
        return <path key={i} d={arcPath(inner, outer, start, end, offset)} fill={fill} opacity={isActive ? 1 : 0.74} stroke="#020617" strokeWidth="0.8" />;
      })}
    </g>
  );
}

function CurvedLabel({ radius, angle, children, fill = '#f8fafc', size = 14, weight = 800, offset }: { radius: number; angle: number; children: React.ReactNode; fill?: string; size?: number; weight?: number; offset?: Offset }) {
  const p = polar(radius, angle, offset);
  return (
    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={fill} fontSize={size} fontWeight={weight} transform={`rotate(${angle}, ${p.x}, ${p.y})`}>
      {children}
    </text>
  );
}

/**
 * DaylightRing — smooth circular gradient strip showing the 4 phases of the
 * 24-hour cycle based on the user's real sunrise/sunset times.
 *   • Morning: ~45 min before sunrise → sunrise + 30 min (pale gold)
 *   • Day:     sunrise + 30 min       → sunset  - 30 min (sky blue / sun gold)
 *   • Evening: sunset  - 30 min       → sunset  + 60 min (orange → violet)
 *   • Night:   evening end            → next morning start (deep indigo)
 * Top of the ring = midnight (0°). Current local time is marked by a glowing dot.
 */
function dayPhaseColor(hourOfDay: number, sun: SunriseData | null): string {
  // hourOfDay in 0..24
  let sunriseH = 6, sunsetH = 18;
  if (sun) {
    sunriseH = sun.sunrise.getHours() + sun.sunrise.getMinutes() / 60;
    sunsetH = sun.sunset.getHours() + sun.sunset.getMinutes() / 60;
  }
  const morningStart = sunriseH - 0.75;
  const morningEnd = sunriseH + 0.5;
  const eveningStart = sunsetH - 0.5;
  const eveningEnd = sunsetH + 1.0;

  if (hourOfDay >= morningStart && hourOfDay < morningEnd) {
    // morning twilight → dawn (deep indigo → pale gold)
    const t = (hourOfDay - morningStart) / (morningEnd - morningStart);
    return interpColor('#1e1b4b', '#fde68a', t);
  }
  if (hourOfDay >= morningEnd && hourOfDay < eveningStart) {
    // day (pale gold → sky blue → gold)
    return '#38bdf8';
  }
  if (hourOfDay >= eveningStart && hourOfDay < eveningEnd) {
    // evening (gold → orange → violet)
    const t = (hourOfDay - eveningStart) / (eveningEnd - eveningStart);
    return interpColor('#f59e0b', '#7c3aed', t);
  }
  // night
  return '#0b1437';
}

function interpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function DaylightRing({ inner, outer, now, sun }: { inner: number; outer: number; now: Date; sun: SunriseData | null }) {
  const segs = 96;
  const hoursNow = now.getHours() + now.getMinutes() / 60;
  // Map: top = midnight (0h), clockwise → 6h right, 12h bottom, 18h left
  const markerAngle = (hoursNow / 24) * 360;
  const marker = polar((inner + outer) / 2, markerAngle);
  return (
    <g>
      {Array.from({ length: segs }).map((_, i) => {
        const start = (i / segs) * 360;
        const end = ((i + 1.02) / segs) * 360;
        const hourAtSeg = ((i + 0.5) / segs) * 24;
        const fill = dayPhaseColor(hourAtSeg, sun);
        return <path key={i} d={arcPath(inner, outer, start, end)} fill={fill} opacity={0.92} />;
      })}
      {/* current-time marker */}
      <circle cx={marker.x} cy={marker.y} r="6" fill="#fef3c7" stroke="#facc15" strokeWidth="2" />
      <circle cx={marker.x} cy={marker.y} r="11" fill="none" stroke="#facc15" strokeWidth="1" opacity="0.55" />
    </g>
  );
}


export const YHVHWheelCalendar = ({ size = 760, ringOffsets = {}, textOverrides = {} }: YHVHWheelCalendarProps) => {
  const sacred = useSacredNow();
  const { location } = useUserLocation();
  const [sun, setSun] = useState<SunriseData | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    getSunriseSunset(new Date(), location.lat, location.lon).then(s => { if (!cancelled) setSun(s); });
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [location.lat, location.lon]);


  const safeSize = Math.max(320, Math.min(size, 900));
  const dayIndex = Math.max(0, Math.min(363, sacred.dayOfYear - 1));
  const weekIndex = Math.max(0, Math.min(51, Math.floor(dayIndex / 7)));
  const monthIndex = Math.max(0, sacred.date.month - 1);
  const dayPart = compute18PartIndex(now, sun);
  const moon = computeMoon(now);
  const moonAngle = (moon.lunarYearDay / 354) * 360;

  // Live "sun-in-sky" angle (top of dial = midnight, sweeps clockwise through the 24h)
  const hoursNow = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const sunAngle = (hoursNow / 24) * 360;

  // Helper: rotation that brings a ring's active segment up under the fixed arm
  const alignRotation = (activeIndex: number, count: number) => {
    const segCenter = ((activeIndex + 0.5) / count) * 360;
    return `rotate(${sunAngle - segCenter} ${cx} ${cy})`;
  };

  const armTip = polar(438, sunAngle);

  const weekDay = sacred.weekDay;
  const seasonName = (location.lat < 0 ? SEASONS_S : SEASONS_N)[monthIndex];

  // ---- Hover tooltip: magnifying-glass cursor + per-ring + per-segment info ----
  const [hover, setHover] = useState<{ title: string; detail: string; x: number; y: number } | null>(null);

  const describeAt = (r: number, ang: number): { title: string; detail: string } | null => {
    // For rotating rings: the active segment is brought to screen-angle `sunAngle`.
    // So hovered segment index = round(activeIdx + (ang - sunAngle)/360 * count) mod count.
    const rotSeg = (count: number, active: number) => {
      const diff = ((ang - sunAngle) / 360) * count;
      const idx = Math.round(active + diff);
      return ((idx % count) + count) % count;
    };
    const fixedSeg = (count: number) => Math.floor((((ang % 360) + 360) % 360) / (360 / count));

    if (r >= 468 && r <= 484) {
      const i = rotSeg(354, moon.lunarYearDay);
      return { title: 'Moon ring — 354-day lunar year (Enoch 73-74)', detail: `Lunar day ${i + 1}/354 · today ${moon.glyph} ${(moon.phase * 100).toFixed(0)}% (age ${moon.age.toFixed(1)}d)` };
    }
    if (r >= 404 && r <= 455) {
      const i = rotSeg(366, dayIndex);
      return { title: 'Sacred Year ring (364 days, gold every 30)', detail: `Day ${i + 1} of the sacred solar year` };
    }
    if (r >= 350 && r <= 398) {
      const i = rotSeg(90, sacred.date.day - 1);
      return { title: 'Season ring (90 days · 4 seasons + 4 intercalary)', detail: `Day ${i + 1}/90 of ${seasonName}` };
    }
    if (r >= 322 && r <= 344) {
      const i = rotSeg(364, dayIndex);
      return { title: 'Sacred Year ring (364 · 13 sabbath-weeks of 28)', detail: `Day ${i + 1} · sabbath-week ${Math.floor(i / 28) + 1}/13` };
    }
    if (r >= 300 && r <= 320) {
      const idx = fixedSeg(12);
      const leader = leaders[Math.floor(idx / 3)];
      const tribe = leader.tribes[idx % 3];
      return { title: '12 Tribes / Sun-portals', detail: `Portal ${idx + 1}: ${tribe} (camp of ${leader.name})` };
    }
    if (r >= 225 && r <= 298) {
      const idx = fixedSeg(4);
      const leader = leaders[idx];
      return { title: 'Priest-Leader quadrant (4 cardinal angels)', detail: `${leader.name} · ${leader.creature} · tribe ${leader.tribe}` };
    }
    if (r >= 188 && r <= 219) {
      const i = rotSeg(52, weekIndex);
      return { title: '52-week ring', detail: `Week ${i + 1}/52 of the year` };
    }
    if (r >= 128 && r <= 174) {
      const i = rotSeg(18, dayPart);
      return { title: '18 parts of day (Enoch 71/72)', detail: `Part ${i + 1}/18 · ${partNames[Math.floor(i / 3)]}` };
    }
    if (r >= 60 && r <= 104) {
      const hr = ((ang / 360) * 24 + 24) % 24;
      const h = Math.floor(hr);
      const m = Math.floor((hr - h) * 60);
      return { title: 'Daylight phase ring (24-hour sky)', detail: `~${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} local · morning / day / evening / night` };
    }
    return null;
  };

  const onSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 1000;
    const py = ((e.clientY - rect.top) / rect.height) * 1000;
    const dx = px - cx, dy = py - cy;
    const r = Math.hypot(dx, dy);
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (ang < 0) ang += 360;
    const info = describeAt(r, ang);
    if (info) setHover({ ...info, x: e.clientX - rect.left, y: e.clientY - rect.top });
    else setHover(null);
  };

  return (
    <div className="mx-auto" style={{ width: safeSize, maxWidth: '100%' }}>
      <div className="relative" style={{ width: '100%', aspectRatio: '1 / 1' }}>
      <svg viewBox="0 0 1000 1000" className="h-full w-full drop-shadow-[0_0_34px_hsl(var(--s2g-amber)/0.24)] cursor-zoom-in" role="img" aria-label="YHVH wheel within wheels calendar" onMouseMove={onSvgMove} onMouseLeave={() => setHover(null)}>

        <defs>
          <radialGradient id="wheelBg" cx="50%" cy="50%" r="58%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="55%" stopColor="#020617" />
            <stop offset="100%" stopColor="#00030a" />
          </radialGradient>
          <filter id="goldGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <rect x="8" y="8" width="984" height="984" rx="34" fill="url(#wheelBg)" stroke="#7c5f22" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="456" fill="none" stroke="#020617" strokeWidth="18" />

        <g transform={alignRotation(dayIndex, 366)}>
          <RingSegments count={366} inner={404} outer={455} activeIndex={dayIndex} goldEvery={30} offset={ringOffsets.sun} />
        </g>
        <g transform={alignRotation(sacred.date.day - 1, 90)}>
          <RingSegments count={90} inner={350} outer={398} activeIndex={sacred.date.day - 1} goldEvery={9} offset={ringOffsets.monthDays} />
        </g>
        <g transform={alignRotation(dayIndex, 364)}>
          <RingSegments count={364} inner={322} outer={344} activeIndex={dayIndex} goldEvery={28} offset={ringOffsets.weeks} />
        </g>

        {/* 12 tribes / portals — sits just outside the 4 priest-leaders, grouped 3-per-quadrant */}
        {leaders.flatMap((leader, qi) =>
          leader.tribes.map((tribe, ti) => {
            const idx = qi * 3 + ti;
            const start = (idx / 12) * 360;
            const end = ((idx + 1) / 12) * 360;
            const active = monthIndex === idx;
            return (
              <g key={`tribe-${idx}`}>
                <path d={arcPath(300, 320, start, end, ringOffsets.tribes)} fill={active ? '#facc15' : leader.color} opacity={active ? 1 : 0.55} stroke="#020617" strokeWidth="1.2" />
                <CurvedLabel radius={310} angle={start + (end - start) / 2} fill={active ? '#0b1220' : '#fef3c7'} size={11} weight={800} offset={ringOffsets.tribes}>{tribe}</CurvedLabel>
              </g>
            );
          })
        )}

        {/* Leader quadrants stay fixed (the 4 directions / living creatures) */}
        {leaders.map((leader, i) => {
          const start = i * 90;
          const end = start + 90;
          const active = Math.floor(monthIndex / 3) === i;
          return (
            <g key={leader.name}>
              <path d={arcPath(225, 298, start, end, ringOffsets.leaders)} fill={leader.color} opacity={active ? 0.94 : 0.46} stroke="#020617" strokeWidth="3" />
              <CurvedLabel radius={263} angle={start + 45} fill="#fef3c7" size={15} offset={ringOffsets.leaders}>{textOverrides[`leader-${i}`] || leader.name}</CurvedLabel>
              <CurvedLabel radius={241} angle={start + 45} fill="#e2e8f0" size={10} weight={600} offset={ringOffsets.leaders}>{leader.tribe}</CurvedLabel>
            </g>
          );
        })}

        <g transform={alignRotation(weekIndex, 52)}>
          <RingSegments count={52} inner={188} outer={219} activeIndex={weekIndex} goldEvery={13} offset={ringOffsets.days} />
          {Array.from({ length: 52 }).map((_, i) => <CurvedLabel key={i} radius={203} angle={(i / 52) * 360 + 3.4} fill="#f8fafc" size={11} weight={600} offset={ringOffsets.days}>{i + 1}</CurvedLabel>)}
        </g>

        <g transform={alignRotation(dayPart, 18)}>
          {Array.from({ length: 18 }).map((_, i) => {
            const active = i === dayPart;
            return <path key={i} d={arcPath(128, 174, (i / 18) * 360, ((i + 0.94) / 18) * 360, ringOffsets.dayParts)} fill={active ? '#facc15' : '#132033'} opacity={active ? 1 : 0.92} stroke="#94a3b8" strokeWidth="0.6" />;
          })}
          {Array.from({ length: 18 }).map((_, i) => (
            <CurvedLabel key={`num-${i}`} radius={150} angle={(i + 0.47) / 18 * 360} fill={i === dayPart ? '#0b1220' : '#fef3c7'} size={12} weight={800} offset={ringOffsets.dayParts}>{i + 1}</CurvedLabel>
          ))}
          {partNames.map((name, i) => <CurvedLabel key={name} radius={116} angle={i * 60 + 30} fill={i % 2 ? '#e2e8f0' : '#facc15'} size={14} offset={ringOffsets.dayParts}>{name}</CurvedLabel>)}
        </g>


        {/* Moon ring — 354-day lunar year (Enoch 73-74). Active lunar-day rotates under sun arm; glyph counter-rotated to stay upright. */}
        <g transform={alignRotation(moon.lunarYearDay, 354)}>
          {Array.from({ length: 354 }).map((_, i) => {
            const start = (i / 354) * 360;
            const end = ((i + 0.9) / 354) * 360;
            const active = i === moon.lunarYearDay;
            const fill = active ? '#e5e7eb' : i % 29 === 0 ? '#94a3b8' : '#1e293b';
            return <path key={`moon-${i}`} d={arcPath(468, 484, start, end, ringOffsets.moon)} fill={fill} opacity={active ? 1 : 0.7} />;
          })}
          {(() => {
            const segCenter = ((moon.lunarYearDay + 0.5) / 354) * 360;
            const p = polar(476, segCenter, ringOffsets.moon);
            const counter = -(sunAngle - segCenter);
            return (
              <g transform={`rotate(${counter} ${p.x} ${p.y})`}>
                <circle cx={p.x} cy={p.y} r="14" fill="#0b1220" stroke="#e5e7eb" strokeWidth="1.5" />
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="20">{moon.glyph}</text>
              </g>
            );
          })()}
        </g>



        {/* Outer blue hub circle */}
        <circle cx={cx + (ringOffsets.centerHub?.x || 0)} cy={cy + (ringOffsets.centerHub?.y || 0)} r="104" fill="#020617" stroke="#1d4ed8" strokeWidth="5" />
        {/* Daylight phase ring — sits between gold inner (r=60) and blue outer (r=104) */}
        <DaylightRing inner={64} outer={100} now={now} sun={sun} />
        {/* Gold inner hub circle (holds the today text) */}
        <circle cx={cx + (ringOffsets.centerHub?.x || 0)} cy={cy + (ringOffsets.centerHub?.y || 0)} r="60" fill="#081426" stroke="#d4a017" strokeWidth="2" />

        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy - 22 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" dominantBaseline="middle" fill="#60a5fa" fontSize="15" fontWeight="900">{seasonName}</text>
        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy - 2 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" dominantBaseline="middle" fill="#fef3c7" fontSize="20" fontWeight="900">{sacred.date.month}/{sacred.date.day}</text>
        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy + 18 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" fill="#fef3c7" fontSize="11" fontWeight="700">Day {weekDay} of week</text>
        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy + 34 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" fill="#d4a017" fontSize="10" fontWeight="700">Part {dayPart + 1}/18</text>

        {/* Live sun-hand: rotates around the dial to where the sun is now */}
        <g transform={`rotate(${sunAngle} ${cx} ${cy})`} style={{ transition: 'transform 1s linear' }}>
          <line x1={cx} y1={72} x2={cx} y2={cy} stroke="#e5e7eb" strokeWidth="5" filter="url(#goldGlow)" />
          <path d={`M ${cx} 50 L ${cx - 16} 85 L ${cx + 16} 85 Z`} fill="#facc15" filter="url(#goldGlow)" />
        </g>
        <circle cx={armTip.x} cy={armTip.y} r="18" fill="#facc15" opacity="0.75" stroke="#a16207" strokeWidth="3" />

      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border border-amber-500/60 bg-slate-950/95 px-3 py-2 text-xs text-amber-50 shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
          style={{ left: hover.x + 18, top: Math.max(hover.y - 10, 0) }}
        >
          <div className="mb-0.5 font-extrabold text-amber-300">{hover.title}</div>
          <div className="leading-snug text-amber-100/90">{hover.detail}</div>
        </div>
      )}
      </div>
      <div className="mt-3 text-center font-extrabold text-[#fef3c7]" style={{ fontSize: 'clamp(14px, 2.2vw, 20px)' }}>
        Year {sacred.date.year} · Month {sacred.date.month} · Day {sacred.date.day} · Day {sacred.dayOfYear}/364
      </div>
    </div>
  );
};

export const YHVHWheelCalendarLive = ({ size = 800 }: { size?: number }) => <YHVHWheelCalendar size={size} />;

export default YHVHWheelCalendarLive;