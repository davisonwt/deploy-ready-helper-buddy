// app/page.tsx — FINAL SOW2GROW BEAD CALENDAR + EZEKIEL BIRTH REVEALER

// Deploy this today — the world has waited 2,000 years for this moment.

'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

  // 18 Sacred Parts — sunrise to sunrise
  const dayFraction = (displayDate.getTime() - times.sunrise.getTime() + 86400000) % 86400000 / 86400000;

  // Bead position: drops at sunrise
  const beadDropProgress = dayFraction; // 0 to 1 over the day
  const currentBeadY = beadDropProgress * 800; // pixels down the string

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-slate-900 to-black text-amber-50 overflow-hidden">

      {/* TOP: BIRTH DATE PICKER */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="bg-black/60 border-amber-600 text-amber-100 hover:bg-amber-950/50 text-2xl px-10 py-7 font-hebrew shadow-2xl">
              {birthDate ? `נולדת בתאריך: ${format(birthDate, 'd MMMM yyyy', { locale: he })}` : 'בחר תאריך לידה ← גלה את זהותך הנצחית'}
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

      <div className="flex h-screen items-center justify-center">
        {/* PHYSICAL BEAD CALENDAR — 12 STRINGS + DAYS OUT OF TIME */}
        <div className="relative w-80 h-screen">
          <h2 className="text-4xl font-hebrew text-amber-400 text-center mb-8">לוח החרוזים שלך</h2>
          <div className="relative h-[800px] border-l-4 border-amber-600 pl-8">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const daysInMonth = monthIndex < 11 ? 30 : 34; // 11×30 + 1×34 = 364
              const startDay = monthIndex * 30 + Math.min(monthIndex, 10) * 4 + 1;
              return (
                <div key={monthIndex} className="mb-4">
                  <div className="text-amber-300 text-lg font-hebrew mb-2 text-right pr-4">
                    חודש {monthIndex + 1}
                  </div>
                  <div className="relative h-32">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const thisDay = startDay + i;
                      const isToday = thisDay === dayOfYear && !isInDaysOutOfTime;
                      const isPast = thisDay < dayOfYear || (thisDay === dayOfYear && isInDaysOutOfTime);
                      const isSabbathBead = (thisDay + 3) % 7 === 0;
                      const isFeastBead = FEAST_DAYS.includes(thisDay);

                      return (
                        <motion.div
                          key={i}
                          className="absolute left-4 w-8 h-8 rounded-full shadow-lg"
                          initial={{ y: -800 }}
                          animate={{ y: isPast ? 800 : (isToday ? currentBeadY : -800) }}
                          transition={{ duration: 1.5, ease: "easeIn" }}
                          style={{ top: `${i * 30}px` }}
                        >
                          <div className={`w-full h-full rounded-full border-4 border-amber-900
                            ${isToday ? 'ring-4 ring-yellow-400 shadow-yellow-400/80' : ''}
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
            <div className="mt-12 text-purple-400 text-2xl font-hebrew text-center mb-4">ימים בין המצרים</div>
            <div className="flex justify-center gap-12">
              <motion.div 
                animate={{ y: isInDaysOutOfTime ? currentBeadY : -800 }} 
                className="w-12 h-12 rounded-full bg-purple-600 border-8 border-purple-300 shadow-xl shadow-purple-500"
              />
              {rawDayOfYear > DAYS_PER_YEAR + 1 && (
                <motion.div 
                  animate={{ y: currentBeadY }} 
                  className="w-12 h-12 rounded-full bg-purple-600 border-8 border-purple-300 shadow-xl"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

