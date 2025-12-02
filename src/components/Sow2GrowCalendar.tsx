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

  // Ultra-smooth day fraction (0 → 1 from sunrise to next sunrise)
  const dayFraction = (displayDate.getTime() - times.sunrise.getTime() + 86400000) % 86400000 / 86400000;

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

      <div className="flex h-full items-center justify-center px-8 pt-20 pb-8 overflow-y-auto">
        <div className="w-full max-w-3xl">
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
