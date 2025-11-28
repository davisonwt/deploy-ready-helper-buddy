// Sow2Grow Calendar Component — Dashboard Version
// Embedded version without fixed positioning

'use client';

import { motion } from 'framer-motion';
import SunCalc from 'suncalc';
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { he } from 'date-fns/locale';
import { format } from 'date-fns/format';

// ═══════════════════════════════════════════════════════════════════
// CONFIG — REAL OBSERVED JERUSALEM 2025
// ═══════════════════════════════════════════════════════════════════
const SPRING_TEQUFAH_2025 = new Date('2025-03-20T09:37:00Z');
const DAYS_PER_YEAR = 364;
const TRIBES = ['ראובן','שמעון','לוי','יהודה','דן','נפתלי','גד','אשר','יששכר','זבולון','יוסף','בנימין'];
const GUARDIANS = ['כסיל Orion', 'כימה Pleiades', 'עיש Arcturus', 'חדרי תימן'];

// Simple feast days (expand as needed)
const FEAST_DAYS = [1, 15, 22, 50, 91, 183, 274, 360]; // Example: Aviv 1, Pesach, Shavuot, etc.

export default function Sow2GrowCalendar() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const displayDate = birthDate || now;
  const lat = 31.7683; // Jerusalem — or use user's location later
  const lon = 35.2137;

  const times = SunCalc.getTimes(displayDate, lat, lon);
  const msSinceSpring = displayDate.getTime() - SPRING_TEQUFAH_2025.getTime();
  const totalDays = Math.floor(msSinceSpring / 86400000);
  const rawDayOfYear = (totalDays % (DAYS_PER_YEAR + 1)) + 1;
  const isInDaysOutOfTime = rawDayOfYear > DAYS_PER_YEAR;
  const dayOfYear = isInDaysOutOfTime ? rawDayOfYear - DAYS_PER_YEAR : rawDayOfYear;
  const yearProgress = (dayOfYear - 1) / DAYS_PER_YEAR;

  const quadrant = Math.floor((dayOfYear - 1) / 91);
  const tribeIndex = Math.floor((dayOfYear - 1) / (DAYS_PER_YEAR / 12));
  const isSabbath = (totalDays + 3) % 7 === 3;
  const isFeast = FEAST_DAYS.includes(dayOfYear);
  const isTequfah = Math.abs(dayOfYear - 1) < 1 || Math.abs(dayOfYear - 184) < 1;

  // 18 Sacred Parts — sunrise to sunrise
  const dayFraction = (displayDate.getTime() - times.sunrise.getTime() + 86400000) % 86400000 / 86400000;
  const sacredPart = Math.floor(dayFraction * 18) % 18 + 1;

  // Analemma
  const analemma = Math.sin(yearProgress * Math.PI * 2);
  const sunX = Math.sin(yearProgress * Math.PI * 2) * analemma * 48;

  // Bead position: drops at sunrise
  const beadDropProgress = dayFraction; // 0 to 1 over the day
  const currentBeadY = beadDropProgress * 800; // pixels down the string

  return (
    <div className="relative bg-gradient-to-br from-black via-slate-900 to-black text-amber-50 rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
      {/* TOP: BIRTH DATE PICKER */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="bg-black/60 border-amber-600 text-amber-100 hover:bg-amber-950/50 text-sm px-6 py-3 font-hebrew shadow-2xl">
              {birthDate ? `נולדת בתאריך: ${format(birthDate, 'd MMMM yyyy', { locale: he })}` : 'בחר תאריך לידה'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={birthDate || undefined}
              onSelect={(d) => setBirthDate(d || null)}
              locale={he}
              className="rounded-lg border-4 border-amber-600 bg-black/95 text-amber-100 font-hebrew"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-center gap-8 pt-16 pb-8">
        {/* LEFT: EZEKIEL LIVING WHEELS */}
        <div className="relative w-80 h-80">
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
                  className="absolute -inset-10 blur-3xl"
                >
                  <div className="w-36 h-36 rounded-full bg-yellow-400 opacity-70"/>
                </motion.div>
                <div className="w-28 h-28 rounded-full bg-gradient-to-b from-yellow-200 to-orange-700 shadow-2xl border-6 border-amber-300"/>
              </div>
            </motion.div>
          </motion.div>
          <SacredDayWheel part={sacredPart} />
          <SabbathRays isSabbath={isSabbath} />
          {isInDaysOutOfTime && (
            <motion.div 
              animate={{ opacity: [0.5,1,0.5] }} 
              className="absolute inset-6 rounded-full border-16 border-purple-500 shadow-2xl shadow-purple-600"
            />
          )}
          {isTequfah && (
            <motion.div 
              animate={{ opacity: [0,1,0] }} 
              transition={{ duration: 6, repeat: 3 }}
              className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-yellow-400 animate-pulse font-hebrew"
            >
              תְּקוּפָה
            </motion.div>
          )}

          {/* CENTER THRONE — TRUE IDENTITY */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              {birthDate ? (
                <>
                  <div className="text-7xl font-bold font-hebrew drop-shadow-2xl">{sacredPart}</div>
                  <div className="text-4xl mt-2 font-hebrew">{GUARDIANS[quadrant]}</div>
                  <div className="text-3xl mt-1">שער {TRIBES[tribeIndex]}</div>
                  <div className="text-2xl mt-4 font-hebrew">יום {dayOfYear} · שנת ה׳</div>
                  {isSabbath && (
                    <div className="text-5xl mt-4 text-yellow-400 animate-pulse font-hebrew">נולדת בשבת קודש</div>
                  )}
                  {isInDaysOutOfTime && (
                    <div className="text-4xl mt-4 text-purple-400 animate-pulse font-hebrew">נולדת ביום בין המצרים</div>
                  )}
                </>
              ) : (
                <div className="text-3xl font-hebrew animate-pulse">
                  בחר תאריך ↑<br/>לגלות את זהותך האמיתית
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PHYSICAL BEAD CALENDAR — 12 STRINGS + DAYS OUT OF TIME */}
        <div className="relative w-64 h-[600px]">
          <h2 className="text-2xl font-hebrew text-amber-400 text-center mb-4">לוח החרוזים שלך</h2>
          <div className="relative h-[500px] border-l-4 border-amber-600 pl-6">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const daysInMonth = monthIndex < 11 ? 30 : 34; // 11×30 + 1×34 = 364
              const startDay = monthIndex * 30 + Math.min(monthIndex, 10) * 4 + 1;
              return (
                <div key={monthIndex} className="mb-3">
                  <div className="text-amber-300 text-sm font-hebrew mb-1 text-right pr-3">
                    חודש {monthIndex + 1}
                  </div>
                  <div className="relative h-24">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const thisDay = startDay + i;
                      const isToday = thisDay === dayOfYear && !isInDaysOutOfTime;
                      const isPast = thisDay < dayOfYear || (thisDay === dayOfYear && isInDaysOutOfTime);
                      const isSabbathBead = (thisDay + 3) % 7 === 0;
                      const isFeastBead = FEAST_DAYS.includes(thisDay);

                      return (
                        <motion.div
                          key={i}
                          className="absolute left-3 w-6 h-6 rounded-full shadow-lg"
                          initial={{ y: -500 }}
                          animate={{ y: isPast ? 500 : (isToday ? currentBeadY : -500) }}
                          transition={{ duration: 1.5, ease: "easeIn" }}
                          style={{ top: `${i * 20}px` }}
                        >
                          <div className={`w-full h-full rounded-full border-2 border-amber-900
                            ${isToday ? 'ring-2 ring-yellow-400 shadow-yellow-400/80' : ''}
                            ${isSabbathBead ? 'bg-yellow-500' : isFeastBead ? 'bg-blue-500' : 'bg-amber-900'}`}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* DAYS OUT OF TIME STRING */}
            <div className="mt-8 text-purple-400 text-lg font-hebrew text-center mb-3">ימים בין המצרים</div>
            <div className="flex justify-center gap-8">
              <motion.div 
                animate={{ y: isInDaysOutOfTime ? currentBeadY : -500 }} 
                className="w-10 h-10 rounded-full bg-purple-600 border-6 border-purple-300 shadow-xl shadow-purple-500"
              />
              {rawDayOfYear > DAYS_PER_YEAR + 1 && (
                <motion.div 
                  animate={{ y: currentBeadY }} 
                  className="w-10 h-10 rounded-full bg-purple-600 border-6 border-purple-300 shadow-xl"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WHEEL COMPONENTS — BEAUTIFUL & COMPLETE
// ═══════════════════════════════════════════════════════════════════

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
            opacity={active ? 0.5 : 0.2} 
            stroke="#fbbf24" 
            strokeWidth={active ? 8 : 3}
          />
        );
      })}
      <text x="160" y="50" textAnchor="middle" fill="#fbbf24" fontSize="28" className="font-hebrew">
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
            fontSize={tribe === currentTribe ? "20" : "14"} 
            className="font-hebrew"
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
            strokeWidth={active ? 12 : 3} 
            animate={{ opacity: active ? 1 : 0.4 }}
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
            strokeWidth={isSabbath ? 12 : 3}
            opacity={isSabbath ? 1 : 0.3}
            animate={isSabbath ? { opacity: [0.7,1,0.7] } : {}}
          />
        );
      })}
    </svg>
  );
}

