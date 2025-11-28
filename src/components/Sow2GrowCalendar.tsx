// app/page.tsx — FINAL CINEMATIC SMOOTH BEAD VERSION (English)

'use client';

import { motion } from 'framer-motion';
import SunCalc from 'suncalc';
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const DAYS_PER_YEAR = 364;
const TRIBES = ['Reuben','Simeon','Levi','Judah','Dan','Naphtali','Gad','Asher','Issachar','Zebulun','Joseph','Benjamin'];
const GUARDIANS = ['Orion', 'Pleiades', 'Arcturus', 'Southern Chambers'];
const FEAST_DAYS = [1, 15, 22, 50, 91, 183, 274, 360];

export default function SmoothBeadClock() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [lat, setLat] = useState(31.7683);
  const [lon, setLon] = useState(35.2137);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 16); // 60fps
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); },
      () => {}, { timeout: 10000 }
    );
    return () => clearInterval(id);
  }, []);

  const displayDate = birthDate || now;
  const times = SunCalc.getTimes(displayDate, lat, lon);
  const msSinceSpring = displayDate.getTime() - new Date('2025-03-20T09:37:00Z').getTime();
  const totalDays = Math.floor(msSinceSpring / 86400000);
  const rawDayOfYear = (totalDays % (DAYS_PER_YEAR + 1)) + 1;
  const isInDaysOutOfTime = rawDayOfYear > DAYS_PER_YEAR;
  const dayOfYear = isInDaysOutOfTime ? rawDayOfYear - DAYS_PER_YEAR : rawDayOfYear;
  const yearProgress = (dayOfYear - 1) / DAYS_PER_YEAR;

  const quadrant = Math.floor((dayOfYear - 1) / 91);
  const tribeIndex = Math.floor((dayOfYear - 1) / (DAYS_PER_YEAR / 12));
  const isSabbath = (totalDays + 3) % 7 === 3;
  const isTequfah = Math.abs(dayOfYear - 1) < 1 || Math.abs(dayOfYear - 184) < 1;

  // Ultra-smooth day fraction (0 → 1 from sunrise to next sunrise)
  const dayFraction = (displayDate.getTime() - times.sunrise.getTime() + 86400000) % 86400000 / 86400000;
  const sacredPart = Math.floor(dayFraction * 18) % 18 + 1;
  const analemma = Math.sin(yearProgress * Math.PI * 2);
  const sunX = Math.sin(yearProgress * Math.PI * 2) * analemma * 50;

  // Smooth bead drop with realistic physics
  const beadDrop = (monthIndex: number, dayInMonth: number) => {
    const thisDay = monthIndex * 30 + (monthIndex >= 11 ? 4 : 0) + dayInMonth + 1;
    const isPast = thisDay < dayOfYear;
    const isToday = thisDay === dayOfYear && !isInDaysOutOfTime;

    if (isPast) return { y: 320, transition: { duration: 0.8, ease: "easeOut" as const } };
    if (isToday) {
      return {
        y: dayFraction * 320,
        transition: { duration: 0.4, ease: "linear" as const, type: "tween" as const }
      };
    }
    return { y: -50, transition: { duration: 0 } };
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-black to-slate-950 text-amber-100 rounded-lg overflow-hidden" style={{ minHeight: '800px' }}>

      {/* BIRTH PICKER */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-800 to-yellow-700 hover:from-amber-700 hover:to-yellow-600 text-white text-lg px-8 py-4 rounded-full shadow-2xl border-4 border-amber-500">
              {birthDate ? `Born: ${format(birthDate, 'MMMM d, yyyy')}` : 'Select Birth Date → Reveal True Identity'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={birthDate || undefined} onSelect={setBirthDate} className="rounded-xl border-4 border-amber-600 bg-slate-900 text-amber-100" />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex h-full items-center justify-center gap-16 px-8 pt-20 pb-8 overflow-y-auto">

        {/* LEFT: EZEKIEL WHEELS */}
        <div className="relative w-80 h-80 flex-shrink-0">
          <motion.div animate={{ rotate: -yearProgress * 360 }}>
            <YearWheel quadrant={quadrant} />
          </motion.div>
          <TribalGates currentTribe={TRIBES[tribeIndex]} />
          <motion.div animate={{ rotate: -yearProgress * 360 }}>
            <motion.div animate={{ x: sunX }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-12 blur-3xl"
                >
                  <div className="w-44 h-44 rounded-full bg-yellow-400 opacity-60"/>
                </motion.div>
                <div className="w-36 h-36 rounded-full bg-gradient-to-b from-yellow-200 to-orange-600 shadow-2xl border-8 border-amber-300"/>
              </div>
            </motion.div>
          </motion.div>
          <SacredDayWheel part={sacredPart} />
          <SabbathRays isSabbath={isSabbath} />
          {isTequfah && (
            <motion.div 
              animate={{ opacity: [0,1,0] }} 
              transition={{ duration: 5, repeat: 3 }}
              className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-yellow-400"
            >
              TEQUFAH
            </motion.div>
          )}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              {birthDate ? (
                <>
                  <div className="text-7xl font-bold drop-shadow-2xl">{sacredPart}</div>
                  <div className="text-4xl mt-3">{GUARDIANS[quadrant]}</div>
                  <div className="text-3xl mt-1">Gate of {TRIBES[tribeIndex]}</div>
                  <div className="text-2xl mt-4">Day {dayOfYear} of 364</div>
                  {isSabbath && (
                    <div className="text-5xl mt-6 text-yellow-400 animate-pulse">Born on Sabbath</div>
                  )}
                  {isInDaysOutOfTime && (
                    <div className="text-4xl mt-6 text-purple-400 animate-pulse">Born in Day Out of Time</div>
                  )}
                </>
              ) : (
                <div className="text-3xl animate-pulse">Select your birth date above</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: ULTRA-SMOOTH BEAD CALENDAR */}
        <div className="w-80 flex-shrink-0">
          <h2 className="text-4xl font-bold text-amber-400 text-center mb-8">Bead Calendar</h2>
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {Array.from({ length: 12 }, (_, m) => (
              <div key={m} className="text-center">
                <div className="text-xl text-amber-300 mb-2">Month {m + 1}</div>
                <div className="relative h-80 bg-slate-950/80 rounded-2xl border-2 border-amber-800/50 shadow-2xl overflow-hidden">
                  {Array.from({ length: m < 11 ? 30 : 34 }, (_, i) => {
                    const thisDay = m * 30 + (m >= 11 ? 4 : 0) + i + 1;
                    const isToday = thisDay === dayOfYear && !isInDaysOutOfTime;
                    const isSabbathDay = (thisDay + 3) % 7 === 0;
                    const isFeastDay = FEAST_DAYS.includes(thisDay);

                    return (
                      <motion.div
                        key={i}
                        className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full shadow-2xl"
                        initial={{ y: -100 }}
                        animate={beadDrop(m, i)}
                      >
                        <div className={`w-full h-full rounded-full border-4 border-amber-900
                          ${isToday ? 'ring-4 ring-yellow-400 shadow-yellow-400/90 shadow-2xl' : ''}
                          ${isSabbathDay ? 'bg-yellow-500' : isFeastDay ? 'bg-blue-500' : 'bg-amber-900'}`}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Days Out of Time — extra smooth */}
            <div className="text-center mt-12">
              <div className="text-3xl text-purple-400 mb-4">Days Out of Time</div>
              <div className="flex justify-center gap-10">
                <motion.div
                  animate={isInDaysOutOfTime ? { y: dayFraction * 250 } : { y: -100 }}
                  transition={{ duration: 0.4, ease: "linear" }}
                  className="w-16 h-16 rounded-full bg-purple-600 border-8 border-purple-300 shadow-2xl shadow-purple-600/70"
                />
                {rawDayOfYear > DAYS_PER_YEAR + 1 && (
                  <motion.div
                    animate={{ y: dayFraction * 250 }}
                    transition={{ duration: 0.4, ease: "linear" }}
                    className="w-16 h-16 rounded-full bg-purple-600 border-8 border-purple-300 shadow-2xl"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wheels — unchanged, perfect
function YearWheel({ quadrant }: { quadrant: number }) {
  return (
    <svg viewBox="0 0 320 320" className="w-full h-full">
      {GUARDIANS.map((g, i) => {
        const active = i === quadrant;
        const start = i * 90 - 90;
        const d = `M160,160 L${160+150*Math.cos(start*Math.PI/180)},${160+150*Math.sin(start*Math.PI/180)} A150,150 0 0 1 ${160+150*Math.cos((start+90)*Math.PI/180)},${160+150*Math.sin((start+90)*Math.PI/180)} Z`;
        return (
          <path 
            key={i} 
            d={d} 
            fill={active ? '#ea580c' : '#1e293b'} 
            opacity={active ? 0.6 : 0.2} 
            stroke="#fbbf24" 
            strokeWidth={active ? 12 : 4}
          />
        );
      })}
      <text x="160" y="50" textAnchor="middle" fill="#fbbf24" fontSize="32" fontWeight="bold">
        {GUARDIANS[quadrant]}
      </text>
    </svg>
  );
}

function TribalGates({ currentTribe }: { currentTribe: string }) {
  return (
    <svg viewBox="0 0 320 320" className="absolute inset-0">
      {TRIBES.map((tribe, i) => {
        const angle = i * 30 - 90;
        const x = 160 + 130 * Math.cos(angle * Math.PI/180);
        const y = 160 + 130 * Math.sin(angle * Math.PI/180);
        return (
          <text 
            key={i} 
            x={x} 
            y={y} 
            textAnchor="middle" 
            fill={tribe === currentTribe ? "#fcd34d" : "#64748b"} 
            fontSize={tribe === currentTribe ? "24" : "16"} 
            fontWeight="bold"
          >
            {tribe}
          </text>
        );
      })}
    </svg>
  );
}

function SacredDayWheel({ part }: { part: number }) {
  return (
    <svg viewBox="0 0 320 320" className="absolute inset-0">
      {Array.from({ length: 18 }, (_, i) => {
        const active = i + 1 === part;
        const angle = i * 20 - 90;
        const d = `M160,160 L${160+110*Math.cos(angle*Math.PI/180)},${160+110*Math.sin(angle*Math.PI/180)} A110,110 0 0 1 ${160+110*Math.cos((angle+20)*Math.PI/180)},${160+110*Math.sin((angle+20)*Math.PI/180)} L160,160 Z`;
        return (
          <motion.path 
            key={i} 
            d={d} 
            fill={active ? '#fbbf24' : '#1e293b'} 
            stroke={active ? '#fcd34d' : '#475569'} 
            strokeWidth={active ? 14 : 4} 
            animate={{ opacity: active ? 1 : 0.3 }}
          />
        );
      })}
    </svg>
  );
}

function SabbathRays({ isSabbath }: { isSabbath: boolean }) {
  return (
    <svg viewBox="0 0 320 320" className="absolute inset-0">
      {Array.from({ length: 7 }, (_, i) => {
        const angle = i * (360 / 7) - 90;
        return (
          <motion.line 
            key={i}
            x1="160" 
            y1="160"
            x2={160 + 140 * Math.cos(angle * Math.PI / 180)}
            y2={160 + 140 * Math.sin(angle * Math.PI / 180)}
            stroke={isSabbath ? '#fcd34d' : '#64748b'}
            strokeWidth={isSabbath ? 18 : 4}
            opacity={isSabbath ? 1 : 0.3}
            animate={isSabbath ? { opacity: [0.7,1,0.7] } : {}}
          />
        );
      })}
    </svg>
  );
}
