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
  { name: "Adnar'el", tribe: 'Yehoseph', creature: 'Lion', color: '#f2b705', tribes: ['Judah','Issachar','Zebulun'], constellation: 'Orion' },
  { name: "Barkiel", tribe: 'Reuben', creature: 'Man', color: '#15803d', tribes: ['Dan','Asher','Naphtali'], constellation: 'Hydra' },
  { name: "Bomi'el", tribe: 'Gershon', creature: 'Ox', color: '#991b1b', tribes: ['Ephraim','Manasseh','Benjamin'], constellation: '?' },
  { name: "Gad'el", tribe: 'Asher', creature: 'Eagle', color: '#1d4ed8', tribes: ['Reuben','Simeon','Gad'], constellation: 'Pegasus' },
];

const partNames = ['Day', 'Man', 'Ox', 'Night', 'Eagle', 'Lion'];

// 12 sun-portals (zodiac), Month 1 (Aviv) = Aries, then sequential
const ZODIAC = [
  { name: 'Aries', sym: '♈' },
  { name: 'Taurus', sym: '♉' },
  { name: 'Gemini', sym: '♊' },
  { name: 'Cancer', sym: '♋' },
  { name: 'Leo', sym: '♌' },
  { name: 'Virgo', sym: '♍' },
  { name: 'Libra', sym: '♎' },
  { name: 'Scorpio', sym: '♏' },
  { name: 'Sagittarius', sym: '♐' },
  { name: 'Capricorn', sym: '♑' },
  { name: 'Aquarius', sym: '♒' },
  { name: 'Pisces', sym: '♓' },
];

// Synodic month + reference new moon (2000-01-06 18:14 UTC) per Enoch 73-74
const SYNODIC = 29.530588853;
const LUNAR_REF = Date.UTC(2000, 0, 6, 18, 14, 0);
const MOON_GLYPHS = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

// Mean lunar ecliptic longitude (degrees, 0=Aries 0°) — good enough to place the
// moon in its current zodiac gate. Ref: J2000 epoch mean elements.
function moonEclipticLongitude(now: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const d = (now.getTime() - J2000) / 86400000;
  let L = 218.316 + 13.176396 * d;
  L = ((L % 360) + 360) % 360;
  return L;
}

function computeMoon(now: Date) {
  const daysSince = (now.getTime() - LUNAR_REF) / 86400000;
  const age = ((daysSince % SYNODIC) + SYNODIC) % SYNODIC; // 0..29.53
  const phase = age / SYNODIC; // 0..1
  const lunarYearDay = Math.floor(((daysSince % 354) + 354) % 354); // 0..353
  const phaseIdx = Math.floor(phase * 8 + 0.5) % 8;
  const longitude = moonEclipticLongitude(now); // 0..360 (Aries 0)
  const zodiacIdx = Math.floor(longitude / 30) % 12;
  return { age, phase, lunarYearDay, glyph: MOON_GLYPHS[phaseIdx], longitude, zodiacIdx };
}

function polar(radius: number, degrees: number, offset?: Offset) {
  const a = ((degrees - 90) * Math.PI) / 180;
  return {
    x: cx + (offset?.x || 0) + radius * Math.cos(a),
    y: cy + (offset?.y || 0) + radius * Math.sin(a),
  };
}

// Arc path used as a baseline for curved text along a ring segment.
// Auto-flips on the bottom half so the text reads right-side-up.
function arcLabelPath(radius: number, startDeg: number, endDeg: number, offset?: Offset) {
  const mid = (startDeg + endDeg) / 2;
  const flip = mid > 90 && mid < 270;
  const a1 = flip ? endDeg : startDeg;
  const a2 = flip ? startDeg : endDeg;
  const p1 = polar(radius, a1, offset);
  const p2 = polar(radius, a2, offset);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = flip ? 0 : 1;
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${large} ${sweep} ${p2.x} ${p2.y}`;
}

function ArcLabel({ id, radius, start, end, children, fill = '#fef3c7', size = 12, weight = 700, offset }: { id: string; radius: number; start: number; end: number; children: React.ReactNode; fill?: string; size?: number; weight?: number; offset?: Offset }) {
  return (
    <>
      <path id={id} d={arcLabelPath(radius, start, end, offset)} fill="none" stroke="none" />
      <text fill={fill} fontSize={size} fontWeight={weight}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{children}</textPath>
      </text>
    </>
  );
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
function locationHour(date: Date, lon: number): number {
  return (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + lon / 15 + 24) % 24;
}

function dayPhaseColor(hourOfDay: number, sun: SunriseData | null, lon: number): string {
  // hourOfDay in 0..24
  let sunriseH = 6, sunsetH = 18;
  if (sun) {
    sunriseH = locationHour(sun.sunrise, lon);
    sunsetH = locationHour(sun.sunset, lon);
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

function DaylightRing({ inner, outer, now, sun, lon, rotation = 0 }: { inner: number; outer: number; now: Date; sun: SunriseData | null; lon: number; rotation?: number }) {
  const segs = 96;
  const hoursNow = locationHour(now, lon);
  // Local day map, rotated so the current daylight marker sits under the sun arm.
  const markerAngle = (hoursNow / 24) * 360;
  const marker = polar((inner + outer) / 2, markerAngle);
  return (
    <g transform={`rotate(${rotation} ${cx} ${cy})`}>
      {Array.from({ length: segs }).map((_, i) => {
        const start = (i / segs) * 360;
        const end = ((i + 1.02) / segs) * 360;
        const hourAtSeg = ((i + 0.5) / segs) * 24;
        const fill = dayPhaseColor(hourAtSeg, sun, lon);
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

  // Sun arm = sun's current zodiac gate angle (advances 1°/day across her 30° gate).
  // This makes the fixed tribe + leader rings line up with the sun arm.
  // (Time-of-day is still shown by the marker dot on the inner Daylight ring.)
  const sunGateAngle = (monthIndex * 30) + ((sacred.date.day - 1) / 30) * 30; // 0..360
  const sunAngle = ((sunGateAngle % 360) + 360) % 360;

  // Moon arm = moon's real ecliptic longitude (where she sits among the 12 gates).
  const moonArmAngle = ((moon.longitude % 360) + 360) % 360;

  // Helper: rotation that brings a ring's active segment up under the sun arm
  const alignRotation = (activeIndex: number, count: number) => {
    const segCenter = ((activeIndex + 0.5) / count) * 360;
    return `rotate(${sunAngle - segCenter} ${cx} ${cy})`;
  };

  const daylightMarkerAngle = ((now.getHours() + now.getMinutes() / 60) / 24) * 360;
  const daylightRotation = sunAngle - daylightMarkerAngle;

  const armTip = polar(438, sunAngle);
  const moonArmTip = polar(438, moonArmAngle);

  const weekDay = sacred.weekDay;
  const seasonName = (location.lat < 0 ? SEASONS_S : SEASONS_N)[monthIndex];

  // ---- Hover tooltip: magnifying-glass cursor + per-ring + per-segment info ----
  type TipInfo = { title: string; detail: string; x: number; y: number };
  const [hover, setHover] = useState<TipInfo | null>(null);
  const [pinned, setPinned] = useState<TipInfo | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // Click outside the wheel wrapper unpins
  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPinned(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pinned]);

  const describeAt = (r: number, ang: number): { title: string; detail: string } | null => {
    // For rotating rings: the active segment is brought to screen-angle `sunAngle`.
    // So hovered segment index = round(activeIdx + (ang - sunAngle)/360 * count) mod count.
    const rotSeg = (count: number, active: number) => {
      const diff = ((ang - sunAngle) / 360) * count;
      const idx = Math.round(active + diff);
      return ((idx % count) + count) % count;
    };
    const fixedSeg = (count: number) => Math.floor((((ang % 360) + 360) % 360) / (360 / count));
    const daylightAng = (((ang - daylightRotation) % 360) + 360) % 360;

    if (r >= 468 && r <= 484) {
      // Moon ring no longer rotates — segments are fixed at angle = (i/354)*360
      const i = fixedSeg(354);
      const z = ZODIAC[moon.zodiacIdx];
      return { title: 'Moon ring — 354-day lunar year (Enoch 73-74)', detail: `Lunar day ${i + 1}/354 · today ${moon.glyph} ${(moon.phase * 100).toFixed(0)}% · gate ${z.sym} ${z.name}` };
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
    if (r >= 295 && r <= 325) {
      const idx = fixedSeg(12);
      const leader = leaders[Math.floor(idx / 3)];
      const tribe = leader.tribes[idx % 3];
      const z = ZODIAC[idx];
      const sunHere = monthIndex === idx;
      const moonHere = moon.zodiacIdx === idx;
      const here = [sunHere ? '☉ Sun' : null, moonHere ? '☽ Moon' : null].filter(Boolean).join(' · ');
      return { title: '12 Tribes / Sun-portals (Zodiac gates)', detail: `Gate ${idx + 1}: ${z.sym} ${z.name} · ${tribe} (camp of ${leader.name})${here ? ' · ' + here : ''}` };
    }
    if (r >= 225 && r <= 293) {
      const idx = fixedSeg(4);
      const leader = leaders[idx];
      return { title: 'Priest-Leader quadrant (4 cardinal angels)', detail: `${leader.name} · ${leader.creature} · constellation ${leader.constellation} · tribe ${leader.tribe}` };
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
      const hr = ((daylightAng / 360) * 24 + 24) % 24;
      const h = Math.floor(hr);
      const m = Math.floor((hr - h) * 60);
      return { title: 'Daylight phase ring (24-hour sky)', detail: `~${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} local · morning / day / evening / night` };
    }
    return null;
  };

  const infoAtEvent = (e: React.MouseEvent<SVGSVGElement>): TipInfo | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 1000;
    const py = ((e.clientY - rect.top) / rect.height) * 1000;
    const dx = px - cx, dy = py - cy;
    const r = Math.hypot(dx, dy);
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (ang < 0) ang += 360;
    const info = describeAt(r, ang);
    return info ? { ...info, x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
  };

  const onSvgMove = (e: React.MouseEvent<SVGSVGElement>) => setHover(infoAtEvent(e));
  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const info = infoAtEvent(e);
    setPinned(info); // info or null → click on empty area unpins
  };

  const tip = pinned ?? hover;

  return (
    <div className="mx-auto" style={{ width: safeSize, maxWidth: '100%' }}>
      <div ref={wrapRef} className="relative" style={{ width: '100%', aspectRatio: '1 / 1' }}>
      <svg viewBox="0 0 1000 1000" className="h-full w-full drop-shadow-[0_0_34px_hsl(var(--s2g-amber)/0.24)] cursor-zoom-in" role="img" aria-label="YHVH wheel within wheels calendar" onMouseMove={onSvgMove} onMouseLeave={() => setHover(null)} onClick={onSvgClick}>


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

        {/* 12 tribes / sun-portals (zodiac gates) — Month 1 (Aviv) = Aries.
            Sun gate = current month; Moon gate = computed from lunar longitude. */}
        {leaders.flatMap((leader, qi) =>
          leader.tribes.map((tribe, ti) => {
            const idx = qi * 3 + ti;
            const start = (idx / 12) * 360;
            const end = ((idx + 1) / 12) * 360;
            const active = monthIndex === idx;
            const moonHere = moon.zodiacIdx === idx;
            const z = ZODIAC[idx];
            const mid = start + (end - start) / 2;
            return (
              <g key={`tribe-${idx}`}>
                <path
                  d={arcPath(295, 325, start, end, ringOffsets.tribes)}
                  fill={active ? '#facc15' : moonHere ? '#cbd5e1' : leader.color}
                  opacity={active ? 1 : moonHere ? 0.85 : 0.55}
                  stroke="#020617"
                  strokeWidth="1.2"
                />
                {/* Tribe + zodiac curved along the segment's own arc */}
                <ArcLabel id={`tribe-arc-${idx}`} radius={310} start={start + 1} end={end - 1} fill={active ? '#0b1220' : '#fef3c7'} size={11} weight={800} offset={ringOffsets.tribes}>
                  {`${tribe} · ${z.sym} ${z.name}`}
                </ArcLabel>
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
              <path d={arcPath(225, 293, start, end, ringOffsets.leaders)} fill={leader.color} opacity={active ? 0.94 : 0.46} stroke="#020617" strokeWidth="3" />
              <ArcLabel id={`leader-arc-${i}`} radius={278} start={start + 4} end={end - 4} fill="#fef3c7" size={17} weight={800} offset={ringOffsets.leaders}>{`${textOverrides[`leader-${i}`] || leader.name} · ★ ${leader.constellation}`}</ArcLabel>
              <ArcLabel id={`leader-tribe-arc-${i}`} radius={250} start={start + 10} end={end - 10} fill="#e2e8f0" size={12} weight={600} offset={ringOffsets.leaders}>{leader.tribe}</ArcLabel>
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


        {/* Moon ring — 354-day lunar tick band (Enoch 73-74). Moon glyph is placed
            at the moon's real zodiac longitude so she lines up with the gate she is
            currently in on the 12-tribes ring (not with the sun arm). */}
        <g>
          {Array.from({ length: 354 }).map((_, i) => {
            const start = (i / 354) * 360;
            const end = ((i + 0.9) / 354) * 360;
            const active = i === moon.lunarYearDay;
            const fill = active ? '#e5e7eb' : i % 29 === 0 ? '#94a3b8' : '#1e293b';
            return <path key={`moon-${i}`} d={arcPath(468, 484, start, end, ringOffsets.moon)} fill={fill} opacity={active ? 1 : 0.7} />;
          })}
          {(() => {
            // Moon glyph at her current zodiac gate angle (0° = Aries / top of dial)
            const moonGateAngle = moon.longitude;
            const p = polar(476, moonGateAngle, ringOffsets.moon);
            return (
              <g>
                {/* radial pointer from moon ring inward to the gate it occupies */}
                <line
                  x1={polar(325, moonGateAngle, ringOffsets.moon).x}
                  y1={polar(325, moonGateAngle, ringOffsets.moon).y}
                  x2={p.x}
                  y2={p.y}
                  stroke="#e5e7eb"
                  strokeWidth="1.2"
                  opacity="0.6"
                  strokeDasharray="3 3"
                />
                <circle cx={p.x} cy={p.y} r="16" fill="#0b1220" stroke="#e5e7eb" strokeWidth="1.8" />
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="22">{moon.glyph}</text>
              </g>
            );
          })()}
        </g>




        {/* Outer blue hub circle */}
        <circle cx={cx + (ringOffsets.centerHub?.x || 0)} cy={cy + (ringOffsets.centerHub?.y || 0)} r="104" fill="#020617" stroke="#1d4ed8" strokeWidth="5" />
        {/* Daylight phase ring — rotated so the current daylight marker lines up with the sun arm */}
        <DaylightRing inner={64} outer={100} now={now} sun={sun} lon={location.lon} rotation={daylightRotation} />
        {/* Gold inner hub circle (holds the today text) */}
        <circle cx={cx + (ringOffsets.centerHub?.x || 0)} cy={cy + (ringOffsets.centerHub?.y || 0)} r="60" fill="#081426" stroke="#d4a017" strokeWidth="2" />

        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy - 22 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" dominantBaseline="middle" fill="#60a5fa" fontSize="15" fontWeight="900">{seasonName}</text>
        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy - 2 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" dominantBaseline="middle" fill="#fef3c7" fontSize="20" fontWeight="900">{sacred.date.month}/{sacred.date.day}</text>
        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy + 18 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" fill="#fef3c7" fontSize="11" fontWeight="700">Day {weekDay} of week</text>
        <text x={cx + (ringOffsets.centerHub?.x || 0)} y={cy + 34 + (ringOffsets.centerHub?.y || 0)} textAnchor="middle" fill="#d4a017" fontSize="10" fontWeight="700">Part {dayPart + 1}/18</text>

        {/* Sun arm: points at the sun's current zodiac gate (Aries=Month 1) */}
        <g transform={`rotate(${sunAngle} ${cx} ${cy})`} style={{ transition: 'transform 1s linear' }}>
          <line x1={cx} y1={72} x2={cx} y2={cy} stroke="#e5e7eb" strokeWidth="5" filter="url(#goldGlow)" />
          <path d={`M ${cx} 50 L ${cx - 16} 85 L ${cx + 16} 85 Z`} fill="#facc15" filter="url(#goldGlow)" />
        </g>
        <circle cx={armTip.x} cy={armTip.y} r="18" fill="#facc15" opacity="0.75" stroke="#a16207" strokeWidth="3" />

        {/* Moon arm: points at the moon's current zodiac gate (her own cycle) */}
        <g transform={`rotate(${moonArmAngle} ${cx} ${cy})`} style={{ transition: 'transform 1s linear' }}>
          <line x1={cx} y1={72} x2={cx} y2={cy} stroke="#cbd5e1" strokeWidth="3" strokeDasharray="6 4" opacity="0.9" />
          <path d={`M ${cx} 56 L ${cx - 12} 84 L ${cx + 12} 84 Z`} fill="#e5e7eb" stroke="#475569" strokeWidth="1.2" />
        </g>
        <circle cx={moonArmTip.x} cy={moonArmTip.y} r="14" fill="#0b1220" stroke="#e5e7eb" strokeWidth="2" />
        <text x={moonArmTip.x} y={moonArmTip.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="18">{moon.glyph}</text>


      </svg>
      {tip && (
        <div
          className={`absolute z-30 max-w-[260px] rounded-md border px-3 py-2 text-xs text-amber-50 shadow-[0_4px_20px_rgba(0,0,0,0.7)] ${pinned ? 'border-amber-400 bg-slate-900 pointer-events-auto' : 'border-amber-500/60 bg-slate-950/95 pointer-events-none'}`}
          style={{ left: tip.x + 18, top: Math.max(tip.y - 10, 0) }}
        >
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <span className="font-extrabold text-amber-300">{tip.title}</span>
            {pinned && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPinned(null); }}
                className="ml-1 -mr-1 -mt-1 text-amber-300/70 hover:text-amber-100"
                aria-label="Unpin"
              >×</button>
            )}
          </div>
          <div className="leading-snug text-amber-100/90">{tip.detail}</div>
          {pinned && <div className="mt-1 text-[10px] text-amber-300/60">pinned · click empty space to release</div>}
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