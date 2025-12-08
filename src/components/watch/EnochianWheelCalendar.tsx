import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';

import { Sun, Moon } from 'lucide-react';

import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from '@/hooks/useUserLocation';
import { BeadPopup } from './BeadPopup';



const PART_MINUTES = 80;

const PARTS_PER_DAY = 18;

const MINUTES_PER_DAY = PART_MINUTES * PARTS_PER_DAY;

const DAYS_PER_YEAR = 364;



// Blood Drop Animation Component - drips from bottom bead to ground
const BloodDrop = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0.8, 0],
        y: [0, 80, 200, 400, 500],
        scale: [0, 0.8, 1, 1.2, 1],
        x: [0, 1, -1, 2, 0]
      }}
      transition={{ 
        duration: 4,
        times: [0, 0.15, 0.4, 0.8, 1],
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className="absolute pointer-events-none z-50"
      style={{
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '2px',
      }}
    >
      {/* Main drop */}
      <motion.div 
        className="w-4 h-4 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #ef4444, #dc2626 50%, #991b1b 100%)',
          boxShadow: '0 0 15px #dc2626, 0 0 30px #991b1b, inset 0 2px 5px rgba(255,255,255,0.3)',
        }}
      />
      {/* Dripping trail */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ 
          opacity: [0, 0.9, 0.7, 0.5, 0],
          scaleY: [0, 0.3, 0.7, 1, 1]
        }}
        transition={{ 
          duration: 4,
          times: [0, 0.1, 0.3, 0.6, 1]
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 origin-top"
        style={{
          width: '2px',
          height: '500px',
          background: 'linear-gradient(to bottom, rgba(220, 38, 38, 0.9), rgba(153, 27, 27, 0.6), rgba(127, 29, 29, 0.3))',
        }}
      />
      {/* Splash effect at ground */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: [0, 0, 0, 0.8, 0.6, 0],
          scale: [0, 0, 0, 1, 2, 3]
        }}
        transition={{ 
          duration: 4,
          times: [0, 0.7, 0.8, 0.85, 0.9, 1]
        }}
        className="absolute top-[500px] left-1/2 -translate-x-1/2 w-8 h-2 rounded-full blur-sm"
        style={{
          background: 'radial-gradient(ellipse, rgba(220, 38, 38, 0.6), transparent)',
        }}
      />
    </motion.div>
  );
};

// Helper function to calculate which days in a month fall on Shabbat (weekDay === 7)
// Based on the current year's calendar structure
const calculateSabbathDays = (month: number): number[] => {
  // Calculate dayOfYear for day 1 of the month
  const daysPerMonth = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let dayOfYearForMonthStart = 1;
  for (let m = 1; m < month; m++) {
    dayOfYearForMonthStart += daysPerMonth[m - 1];
  }
  
  // Use the same weekday calculation as calculateCreatorDate
  // Starting weekday for Year 6028 Month 1 Day 1 = 4
  const STARTING_WEEKDAY_YEAR_6028 = 4;
  
  // Find which days in this month fall on weekday 7 (Shabbat)
  const sabbathDays: number[] = [];
  const daysInMonth = daysPerMonth[month - 1];
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Calculate dayOfYear for this specific day
    const dayOfYear = dayOfYearForMonthStart + (day - 1);
    // Use the same formula as calculateCreatorDate
    const weekday = ((dayOfYear - 1 + STARTING_WEEKDAY_YEAR_6028 - 1) % 7) + 1;
    if (weekday === 7) {
      sabbathDays.push(day);
    }
  }
  
  return sabbathDays;
};

// Types for extended beads in Month 1
interface ExtendedBead {
  day: number;
  displayNumber: number;
  globalDay: number;
  color: string;
  isToday: boolean;
  isTekufah: boolean;
  isSabbath: boolean;
  isFirstSabbath: boolean;
  isFromMonth12: boolean;
  label: string;
  isNewYearStart: boolean;
}

const Month1Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  const sabbathDays = calculateSabbathDays(1);

  // Build 33 beads: 3 from month 12 (days 29, 30, 31) + 30 from month 1
  const beads: ExtendedBead[] = [];
  
  // First 3 beads are days 29, 30, 31 from month 12 (new week cycle days 1, 2, 3)
  for (let i = 0; i < 3; i++) {
    const day12 = 29 + i; // 29, 30, 31
    const weekCycleDay = i + 1; // 1, 2, 3
    const yhvhCount = i + 1; // 1, 2, 3
    
    beads.push({
      day: day12,
      displayNumber: day12,
      globalDay: 334 + day12, // Month 12 global offset
      color: '#1f2937',
      isToday: false, // These are from previous year
      isTekufah: false,
      isSabbath: false,
      isFirstSabbath: false,
      isFromMonth12: true,
      isNewYearStart: false,
      label: `day ${day12} of the 12th month day ${weekCycleDay} of the new years new week cycle and day ${yhvhCount} count of yhvh's 364 days`
    });
  }
  
  // Next 30 beads are days 1-30 from month 1
  for (let i = 0; i < 30; i++) {
    const day = i + 1;
    const weekCycleDay = i + 4; // Continues from 4, 5, 6, 7, then 1, 2, etc.
    const yhvhCount = i + 4; // Continues from 4
    const mansCount = i + 1; // 1, 2, 3...
    
    const isSabbath = sabbathDays.includes(day);
    const isFeast = day <= 4;
    const isTekufah = day === 1; // Day 1 is the tequvah with shadow line
    const isFirstSabbath = day === 4; // Day 4 is first sabbath
    
    let color = '#1f2937';
    if (isSabbath) color = '#fbbf24';
    if (isFeast) color = '#22d3ee';
    
    let label = '';
    if (day === 1) {
      label = `day 1 of the 1st month day 4 of the new years new week cycle and day 4 count of yhvh's 364 days and day 1 of mans 364 days`;
    } else if (day === 2) {
      label = `day 2 of the 1st month day 5 of the new years new week cycle and day 5 count of yhvh's 364 days and day 2 of mans 364 days`;
    } else if (day === 3) {
      label = `day 3 of the 1st month day 6 of the new years new week cycle and day 6 count of yhvh's 364 days and day 3 of mans 364 days`;
    } else if (day === 4) {
      label = `day 4 of the 1st month the first sabbath of the new years the 7th day of the new week cycle and day 7 count of yhvh's 364 days and day 4 of mans 364 days`;
    } else {
      const actualWeekCycleDay = ((weekCycleDay - 1) % 7) + 1;
      label = `day ${day} of the 1st month day ${actualWeekCycleDay} of week cycle and day ${yhvhCount} count of yhvh's 364 days and day ${mansCount} of mans 364 days`;
    }
    
    beads.push({
      day,
      displayNumber: day,
      globalDay: day,
      color,
      isToday: day === dayOfMonth,
      isTekufah,
      isSabbath,
      isFirstSabbath,
      isFromMonth12: false,
      isNewYearStart: day === 1,
      label
    });
  }

  // Reverse so day 1 of month 1 is at bottom
  const reversedBeads = [...beads].reverse();

  // Split into future and past
  const currentActualDay = dayOfMonth + 3; // Account for the 3 extra beads
  const futureBeads = reversedBeads.slice(0, reversedBeads.length - currentActualDay);
  const pastBeads = reversedBeads.slice(reversedBeads.length - currentActualDay);

  return (
    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-stone-900 to-black rounded-3xl shadow-2xl w-full">
      <h2 className="text-lg md:text-xl lg:text-2xl font-black text-amber-400 mb-2 md:mb-4 tracking-widest">MONTH 1</h2>
      <p className="text-xs text-amber-200/60 mb-2">33 Beads (includes days 29-31 from Month 12)</p>
      
      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>
        {futureBeads.map((bead) => {
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          
          return (
            <motion.div
              key={`${bead.isFromMonth12 ? 'm12-' : ''}${bead.displayNumber}`}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.5, 1],
                boxShadow: ["0 0 20px #fff", "0 0 80px #ec4899", "0 0 20px #fff"]
              } : bead.isFirstSabbath ? {
                boxShadow: ["0 0 30px #fbbf24", "0 0 60px #f59e0b", "0 0 30px #fbbf24"]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative flex items-center justify-center"
            >
              <div
                className={`w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${bead.isFromMonth12 ? 'opacity-70' : ''}`}
                onClick={() => !bead.isFromMonth12 && setSelectedBead({ year, month: 1, day: bead.displayNumber })}
                title={bead.label}
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,
                  boxShadow: bead.isToday 
                    ? '0 0 60px #ec4899, inset 0 0 30px #fff'
                    : bead.isTekufah
                    ? '0 0 40px #06b6d4, 0 0 0 8px #000 inset'
                    : bead.isFirstSabbath
                    ? '0 0 40px #fbbf24, inset 0 0 20px #fff'
                    : '0 10px 30px rgba(0,0,0,0.9), inset 0 5px 15px rgba(255,255,255,0.2)',
                  transform: 'translateZ(30px)'
                }}
              >
                <span className="text-xs font-bold text-amber-300 relative z-10">
                  {bead.displayNumber}
                </span>
                
                {/* Horizontal shadow line for tequvah day 1 */}
                {bead.isTekufah && (
                  <motion.div 
                    className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {bead.isToday && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-pink-500 border-dashed pointer-events-none"
                  style={{ left: 0, width: '44px', height: '44px' }}
                />
              )}
              
              {/* Special glow effect for first sabbath */}
              {bead.isFirstSabbath && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute w-16 h-16 rounded-full bg-amber-400/30 blur-lg pointer-events-none"
                  style={{ left: '-6px', top: '-6px' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>
        {pastBeads.map((bead, index) => {
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          const isBottomBead = index === pastBeads.length - 1;
          
          return (
            <motion.div
              key={`past-${bead.isFromMonth12 ? 'm12-' : ''}${bead.displayNumber}`}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.5, 1],
                boxShadow: ["0 0 20px #fff", "0 0 80px #ec4899", "0 0 20px #fff"]
              } : bead.isFirstSabbath ? {
                boxShadow: ["0 0 30px #fbbf24", "0 0 60px #f59e0b", "0 0 30px #fbbf24"]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative flex items-center justify-center"
            >
              <div
                className={`w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${bead.isFromMonth12 ? 'opacity-70' : ''}`}
                onClick={() => !bead.isFromMonth12 && setSelectedBead({ year, month: 1, day: bead.displayNumber })}
                title={bead.label}
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,
                  boxShadow: bead.isToday 
                    ? '0 0 60px #ec4899, inset 0 0 30px #fff'
                    : bead.isTekufah
                    ? '0 0 40px #06b6d4, 0 0 0 8px #000 inset'
                    : bead.isFirstSabbath
                    ? '0 0 40px #fbbf24, inset 0 0 20px #fff'
                    : '0 10px 30px rgba(0,0,0,0.9), inset 0 5px 15px rgba(255,255,255,0.2)',
                  transform: 'translateZ(30px)'
                }}
              >
                <span className="text-xs font-bold text-amber-300 relative z-10">
                  {bead.displayNumber}
                </span>
                
                {/* Horizontal shadow line for tequvah day 1 */}
                {bead.isTekufah && (
                  <motion.div 
                    className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {bead.isToday && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-pink-500 border-dashed pointer-events-none"
                  style={{ left: 0, width: '44px', height: '44px' }}
                />
              )}
              
              {/* Special glow effect for first sabbath */}
              {bead.isFirstSabbath && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute w-16 h-16 rounded-full bg-amber-400/30 blur-lg pointer-events-none"
                  style={{ left: '-6px', top: '-6px' }}
                />
              )}

              {isBottomBead && (
                <BloodDrop isActive={showBloodDrop} />
              )}
            </motion.div>
          );
        })}
      </div>

      {selectedBead && (
        <BeadPopup
          isOpen={!!selectedBead}
          onClose={() => setSelectedBead(null)}
          year={selectedBead.year}
          month={selectedBead.month}
          day={selectedBead.day}
        />
      )}
    </div>
  );
};


const Month2Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const { location } = useUserLocation();

  // Track part changes every 80 minutes (PART_MINUTES)
  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        // New part began - trigger blood drop animation
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000); // Match animation duration
      }
      setCurrentPart(newPart);
    };

    // Initialize current part
    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    // Check every minute for part changes
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Iyar = 30 days

  // Global day 31 → Day 1 of Iyar

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 30 + dayInMonth;           // Nisan = 30 days, so Iyar starts at global day 31

    // Calculate Shabbat days for Month 2 based on actual weekday (only day 7 of week)
    const sabbathDaysMonth2 = calculateSabbathDays(2);
    const isSabbath = sabbathDaysMonth2.includes(dayInMonth);

    const isFeast = dayInMonth === 14;           // Pesach Sheni (14th of Iyar)

    const isLagBaOmer = dayInMonth === 18;       // Traditional Lag BaOmer (33rd day of Omer count)



    let color = '#1f2937';                       // Regular day — deep midnight black

    if (isSabbath) color = '#fbbf24';            // Golden Sabbath

    if (isFeast)   color = '#22d3ee';            // Turquoise — Pesach Sheni

    if (isLagBaOmer) color = '#f59e0b';          // Amber fire — Lag BaOmer



    return {

      day: dayInMonth,

      globalDay,

      color,

      isToday: dayInMonth === dayOfMonth,

      isSabbath,

      isFeast,

      isLagBaOmer

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 30 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-stone-900 via-purple-950 to-black rounded-3xl shadow-2xl border border-amber-800/30 w-full">

      <motion.h2 

        initial={{ y: -50, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest">MONTH 2</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((bead) => {
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          
          return (
            <motion.div
              key={bead.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.6, 1],
                boxShadow: ["0 0 30px #fff", "0 0 100px #ec4899", "0 0 30px #fff"]
              } : {}}
              transition={{ duration: 0 }}
              className="relative flex items-center justify-center"
            >

            {/* Main Bead */}

            <div

              className="rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"

              onClick={() => setSelectedBead({ year, month: 2, day: bead.day })}

              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isToday

                  ? '0 0 80px #ec4899, inset 0 0 40px #fff'

                  : bead.isLagBaOmer

                  ? '0 0 60px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isFeast

                  ? '0 0 50px #22d3ee, 0 0 0 10px #000 inset'

                  : '0 12px 40px rgba(0,0,0,0.9), inset 0 6px 20px rgba(255,255,255,0.3)',

                transform: 'none'

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* Special Markers */}

            {bead.isLagBaOmer && (

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                <div className="w-16 h-16 rounded-full border-4 border-orange-500 animate-pulse" />

              </div>

            )}



            {bead.isFeast && (

              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none">

                <div className="text-cyan-300 text-xs font-bold">Pesach Sheni</div>

              </div>

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-70 pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((bead, index) => {
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          const isBottomBead = index === pastBeads.length - 1;
          
          return (
            <motion.div
              key={bead.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.6, 1],
                boxShadow: ["0 0 30px #fff", "0 0 100px #ec4899", "0 0 30px #fff"]
              } : {}}
              transition={{ duration: 0 }}
              className="relative flex items-center justify-center"
            >

            {/* Main Bead */}

            <div

              className="rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"

              onClick={() => setSelectedBead({ year, month: 2, day: bead.day })}

              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isToday

                  ? '0 0 80px #ec4899, inset 0 0 40px #fff'

                  : bead.isLagBaOmer

                  ? '0 0 60px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isFeast

                  ? '0 0 50px #22d3ee, 0 0 0 10px #000 inset'

                  : '0 12px 40px rgba(0,0,0,0.9), inset 0 6px 20px rgba(255,255,255,0.3)',

                transform: 'none'

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* Special Markers */}

            {bead.isLagBaOmer && (

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                <div className="w-16 h-16 rounded-full border-4 border-orange-500 animate-pulse" />

              </div>

            )}



            {bead.isFeast && (

              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none">

                <div className="text-cyan-300 text-xs font-bold">Pesach Sheni</div>

              </div>

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-70 pointer-events-none"

              />

            )}

            {/* Blood drop animation from bottom bead */}
            {isBottomBead && (
              <BloodDrop isActive={showBloodDrop} />
            )}

          </motion.div>
          );
        })}
      </div>




      {/* Bead Popup */}
      {selectedBead && (
        <BeadPopup
          isOpen={!!selectedBead}
          onClose={() => setSelectedBead(null)}
          year={selectedBead.year}
          month={selectedBead.month}
          day={selectedBead.day}
        />
      )}

    </div>

  );

};



const Month3Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const { location } = useUserLocation();

  // Track part changes every 80 minutes (PART_MINUTES)
  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Sivan = 31 days

  // Global day starts at 61 (30 Nisan + 30 Iyar + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 60 + dayInMonth;

    // Calculate Shabbat days for Month 3 based on actual weekday (only day 7 of week)
    const sabbathDaysMonth3 = calculateSabbathDays(3);
    const isSabbath = sabbathDaysMonth3.includes(dayInMonth);

    const isShavuot = dayInMonth === 6;                   // Torah given on 6th Sivan

    const isPreShavuot = dayInMonth === 5;                // Day before — special preparation

    const isPostShavuot = dayInMonth === 7;               // Day after — lingering light



    let color = '#1f2937';                                // Regular day

    if (isSabbath) color = '#fbbf24';                     // Golden Sabbath

    if (isShavuot) color = '#ec4899';                     // Deep pink fire — the day Torah descended

    if (isPreShavuot) color = '#c084fc';                  // Purple dawn — anticipation

    if (isPostShavuot) color = '#f0abfc';                 // Soft pink glow — afterglow



    return {

      day: dayInMonth,

      globalDay,

      color,

      isToday: dayInMonth === dayOfMonth,

      isShavuot,

      isPreShavuot,

      isPostShavuot,

      isSabbath

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-purple-950 via-black to-indigo-950 rounded-3xl shadow-2xl border-2 border-amber-600/40 w-full">

      <motion.h2 

        initial={{ scale: 0.8, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 1.5, type: "spring", stiffness: 80 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-amber-300 via-pink-500 to-purple-400 bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-amber-300 via-pink-500 to-purple-400 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 3</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((bead) => {
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          
          return (
            <motion.div
              key={bead.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.8, 1],
                boxShadow: ["0 0 40px #fff", "0 0 120px #ec4899", "0 0 40px #fff"]
              } : bead.isShavuot ? {
                boxShadow: ["0 0 60px #ec4899", "0 0 100px #fff", "0 0 60px #ec4899"]
              } : {}}
              transition={{ duration: 0 }}
              className="relative flex items-center justify-center"
            >

            {/* Main Bead */}

            <div

              className="rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"

              onClick={() => setSelectedBead({ year, month: 3, day: bead.day })}

              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isShavuot

                  ? '0 0 100px #ec4899, 0 0 160px #fff, inset 0 0 50px #fff'

                  : bead.isToday

                  ? '0 0 100px #ec4899, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.3)',

                transform: 'none',
                ...(bead.isShavuot && { border: '8px solid #fff' })

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* Shavuot Crown — Torah descending */}

            {bead.isShavuot && (

              <motion.div

                animate={{ y: [0, -20, 0], rotate: [0, 360] }}

                transition={{ duration: 6, repeat: Infinity }}

                className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none"

              >

                <div className="text-sm md:text-base">Torah</div>

              </motion.div>

            )}



            {/* Pre-Shavuot glow */}

            {bead.isPreShavuot && (

              <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((bead, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          
          return (
            <motion.div
              key={bead.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.8, 1],
                boxShadow: ["0 0 40px #fff", "0 0 120px #ec4899", "0 0 40px #fff"]
              } : bead.isShavuot ? {
                boxShadow: ["0 0 60px #ec4899", "0 0 100px #fff", "0 0 60px #ec4899"]
              } : {}}
              transition={{ duration: 0 }}
              className="relative flex items-center justify-center"
            >

            {/* Main Bead */}

            <div

              className="rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"

              onClick={() => setSelectedBead({ year, month: 3, day: bead.day })}

              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isShavuot

                  ? '0 0 100px #ec4899, 0 0 160px #fff, inset 0 0 50px #fff'

                  : bead.isToday

                  ? '0 0 100px #ec4899, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.3)',

                transform: 'none',
                ...(bead.isShavuot && { border: '8px solid #fff' })

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* Shavuot Crown — Torah descending */}

            {bead.isShavuot && (

              <motion.div

                animate={{ y: [0, -20, 0], rotate: [0, 360] }}

                transition={{ duration: 6, repeat: Infinity }}

                className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none"

              >

                <div className="text-sm md:text-base">Torah</div>

              </motion.div>

            )}



            {/* Pre-Shavuot glow */}

            {bead.isPreShavuot && (

              <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-80 pointer-events-none"

              />

            )}

            {/* Blood drop animation from bottom bead */}
            {isBottomBead && (
              <BloodDrop isActive={showBloodDrop} />
            )}

          </motion.div>
          );
        })}
      </div>




      {/* Bead Popup */}
      {selectedBead && (
        <BeadPopup
          isOpen={!!selectedBead}
          onClose={() => setSelectedBead(null)}
          year={selectedBead.year}
          month={selectedBead.month}
          day={selectedBead.day}
        />
      )}

    </div>

  );

};



const Month4Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Tammuz = 30 days

  // Global day starts at 92 (30+30+31+1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 91 + dayInMonth;

    // Month 4 Sabbaths: Days 4, 11, 18, 25
    // Calculate Shabbat days based on actual weekday (only day 7 of week)
    const sabbathDays = calculateSabbathDays(4);
    const isSabbath = sabbathDays.includes(dayInMonth);

    const is17Tammuz     = dayInMonth === 17;                   // Fast — breach of Jerusalem walls

    const isGoldenCalf   = dayInMonth === 16;                   // Day before the fast — sin committed

    const isThreeWeeks   = dayInMonth >= 17;                    // Mourning period begins



    let color = '#1f2937';                                      // Regular day — midnight black

    if (isSabbath)                     color = '#fbbf24';      // Golden Sabbath

    if (is17Tammuz)                    color = '#dc2626';      // Blood-red — the fast

    if (isGoldenCalf)                  color = '#f59e0b';      // False gold — the calf

    if (isThreeWeeks && !is17Tammuz && !isSabbath) color = '#475569'; // Ash-grey mourning



    return {

      day: dayInMonth,

      globalDay,

      color,

      isToday: dayInMonth === dayOfMonth,

      is17Tammuz,

      isGoldenCalf,

      isThreeWeeks,

      isSabbath

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-slate-900 via-red-950 to-black rounded-3xl shadow-2xl border-2 border-red-900/60 w-full">

      <motion.h2 

        initial={{ scale: 0.8, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 2, type: "spring", stiffness: 60 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-amber-600 via-red-600 to-gray-800 bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-amber-600 via-red-600 to-gray-800 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 4</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((bead) => (

          <motion.div

            key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 1.8, 1],

              boxShadow: ["0 0 40px #fff", "0 0 120px #dc2626", "0 0 40px #fff"]

            } : bead.is17Tammuz ? {

              boxShadow: ["0 0 80px #dc2626", "0 0 140px #450a0a", "0 0 80px #dc2626"]

            } : {}}

            transition={bead.is17Tammuz ? { duration: 4, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"

              onClick={() => setSelectedBead({ year, month: 4, day: bead.day })}

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is17Tammuz

                  ? '0 0 120px #dc2626, 0 0 180px #450a0a, inset 0 0 60px #991b1b'

                  : bead.isGoldenCalf

                  ? '0 0 80px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isToday

                  ? '0 0 100px #dc2626, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.2)',

                transform: 'translateZ(30px)',


              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* 17 Tammuz — Cracked tablet effect */}

            {bead.is17Tammuz && (

              <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">

                <div className="w-32 h-1 bg-red-800 rotate-45" />

                <div className="w-32 h-1 bg-red-800 -rotate-45" />

                <div className="text-red-300 text-xs font-bold">Walls Breached</div>

              </div>

            )}



            {/* Golden Calf false fire */}

            {bead.isGoldenCalf && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-4 border-yellow-600 opacity-60 pointer-events-none"

              />

            )}



            {/* Mourning ash overlay after 17th */}

            {bead.isThreeWeeks && bead.day >= 17 && !bead.is17Tammuz && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-gray-800/40 pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-red-600 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((bead, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          return (
            <motion.div
              key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 1.8, 1],

              boxShadow: ["0 0 40px #fff", "0 0 120px #dc2626", "0 0 40px #fff"]

            } : bead.is17Tammuz ? {

              boxShadow: ["0 0 80px #dc2626", "0 0 140px #450a0a", "0 0 80px #dc2626"]

            } : {}}

            transition={bead.is17Tammuz ? { duration: 4, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"

              onClick={() => setSelectedBead({ year, month: 4, day: bead.day })}

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is17Tammuz

                  ? '0 0 120px #dc2626, 0 0 180px #450a0a, inset 0 0 60px #991b1b'

                  : bead.isGoldenCalf

                  ? '0 0 80px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isToday

                  ? '0 0 100px #dc2626, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.2)',

                transform: 'translateZ(30px)',


              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* 17 Tammuz — Cracked tablet effect */}

            {bead.is17Tammuz && (

              <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">

                <div className="w-32 h-1 bg-red-800 rotate-45" />

                <div className="w-32 h-1 bg-red-800 -rotate-45" />

                <div className="text-red-300 text-xs font-bold">Walls Breached</div>

              </div>

            )}



            {/* Golden Calf false fire */}

            {bead.isGoldenCalf && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-4 border-yellow-600 opacity-60 pointer-events-none"

              />

            )}



            {/* Mourning ash overlay after 17th */}

            {bead.isThreeWeeks && bead.day >= 17 && !bead.is17Tammuz && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-gray-800/40 pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-red-600 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}
      </div>




      {/* Bead Popup */}
      {selectedBead && (
        <BeadPopup
          isOpen={!!selectedBead}
          onClose={() => setSelectedBead(null)}
          year={selectedBead.year}
          month={selectedBead.month}
          day={selectedBead.day}
        />
      )}

    </div>

  );

};



const Month5Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Av = 30 days

  // Global day starts at 122 (30+30+31+30+1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 121 + dayInMonth;

    // Month 5 Sabbaths: Days 2, 9, 16, 23, 30
    // Calculate Shabbat days based on actual weekday (only day 7 of week)
    const sabbathDays = calculateSabbathDays(5);
    const isSabbath = sabbathDays.includes(dayInMonth);

    const is9Av          = dayInMonth === 9;                    // Destruction of both Temples

    const isPre9Av       = dayInMonth >= 1 && dayInMonth <= 8;   // Nine Days of intensifying mourning

    const isPost9Av      = dayInMonth >= 10;                    // Mourning continues, but lighter

    const isSpiesReport  = dayInMonth === 9;                    // Same day — spies returned (tradition)



    let color = '#1f2937';                                      // Regular day — midnight black

    if (isSabbath)                     color = '#fbbf24';      // Golden Sabbath (even in mourning, Shabbat shines)

    if (is9Av)                         color = '#450a0a';      // Blackest red — heart of destruction

    if (isPre9Av && !isSabbath)        color = '#374151';      // Dark slate — Nine Days

    if (isPost9Av && !isSabbath)       color = '#475569';      // Ash grey — mourning lingers



    return {

      day: dayInMonth,

      color,

      isToday: dayInMonth === dayOfMonth,

      is9Av,

      isPre9Av,

      isPost9Av,

      isSabbath

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-gray-900 via-red-950 to-black rounded-3xl shadow-2xl border-4 border-red-900/80 w-full">

      <motion.h2 

        initial={{ scale: 0.7, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 2.5, type: "spring", stiffness: 70 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-gray-600 via-red-700 to-black bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-gray-600 via-red-700 to-black bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 5</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((bead) => (

          <motion.div

            key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 2, 1],

              boxShadow: ["0 0 50px #fff", "0 0 150px #dc2626", "0 0 50px #fff"]

            } : bead.is9Av ? {

              boxShadow: ["0 0 100px #450a0a", "0 0 200px #000", "0 0 100px #450a0a"],

              rotate: [0, 5, -5, 0]

            } : {}}

            transition={bead.is9Av ? { duration: 6, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is9Av

                  ? '0 0 180px #450a0a, 0 0 300px #000, inset 0 0 80px #000'

                  : bead.isToday

                  ? '0 0 140px #dc2626, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.1)',

                transform: 'translateZ(30px)',
                ...(bead.is9Av && { border: '12px solid #000' })

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* 9th of Av — Temple flames and smoke */}

            {bead.is9Av && (

              <>

                <motion.div

                  animate={{ y: [-20, -60], opacity: [1, 0] }}

                  transition={{ duration: 4, repeat: Infinity }}

                  className="absolute inset-0 rounded-full bg-red-900/60 blur-xl pointer-events-none"

                />

                <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-black text-gray-800 pointer-events-none">

                  Temple

                </div>

              </>

            )}



            {/* Nine Days — increasing darkness */}

            {bead.isPre9Av && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-red-600 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((bead, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          return (
            <motion.div
              key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 2, 1],

              boxShadow: ["0 0 50px #fff", "0 0 150px #dc2626", "0 0 50px #fff"]

            } : bead.is9Av ? {

              boxShadow: ["0 0 100px #450a0a", "0 0 200px #000", "0 0 100px #450a0a"],

              rotate: [0, 5, -5, 0]

            } : {}}

            transition={bead.is9Av ? { duration: 6, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is9Av

                  ? '0 0 180px #450a0a, 0 0 300px #000, inset 0 0 80px #000'

                  : bead.isToday

                  ? '0 0 140px #dc2626, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.1)',

                transform: 'translateZ(30px)',
                ...(bead.is9Av && { border: '12px solid #000' })

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* 9th of Av — Temple flames and smoke */}

            {bead.is9Av && (

              <>

                <motion.div

                  animate={{ y: [-20, -60], opacity: [1, 0] }}

                  transition={{ duration: 4, repeat: Infinity }}

                  className="absolute inset-0 rounded-full bg-red-900/60 blur-xl pointer-events-none"

                />

                <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-black text-gray-800 pointer-events-none">

                  Temple

                </div>

              </>

            )}



            {/* Nine Days — increasing darkness */}

            {bead.isPre9Av && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-red-600 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}
      </div>




    </div>

  );

};



const Month6Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Elul = 31 days

  // Global day starts at 152 (30+30+31+30+30+1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 151 + dayInMonth;

    // Calculate Shabbat days for Month 6 based on actual weekday (only day 7 of week)
    const sabbathDaysMonth6 = calculateSabbathDays(6);
    const isSabbath = sabbathDaysMonth6.includes(dayInMonth);

    const isLast12Days  = dayInMonth >= 19;                    // 12 days of return (tribe-by-tribe tradition)

    const is29Elul      = dayInMonth === 29;                   // Final day — the King enters the city

    const isShofarDay   = dayInMonth >= 2 && !isSabbath;       // Shofar blown every weekday



    let color = '#1f2937';                                     // Regular day

    if (isSabbath)                    color = '#fbbf24';     // Golden Sabbath

    if (is29Elul)                     color = '#ec4899';     // Royal pink — the King returns

    if (isLast12Days && !isSabbath)   color = '#22d3ee';     // Turquoise light of teshuvah

    if (isShofarDay && !isLast12Days && !isSabbath) color = '#60a5fa'; // Soft blue — daily shofar



    return {

      day: dayInMonth,

      color,

      isToday: dayInMonth === dayOfMonth,

      is29Elul,

      isLast12Days,

      isShofarDay,

      isSabbath

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-indigo-950 via-black to-purple-950 rounded-3xl shadow-2xl border-2 border-cyan-700/60 w-full">

      <motion.h2 

        initial={{ y: -80, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        transition={{ duration: 2, type: "spring", stiffness: 80 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 6</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((bead) => (

          <motion.div

            key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 2, 1],

              boxShadow: ["0 0 50px #fff", "0 0 160px #ec4899", "0 0 50px #fff"]

            } : bead.is29Elul ? {

              boxShadow: ["0 0 120px #ec4899", "0 0 200px #fff", "0 0 120px #ec4899"],

              rotate: [0, 360]

            } : {}}

            transition={bead.is29Elul ? { duration: 8, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is29Elul

                  ? '0 0 180px #ec4899, 0 0 300px #fff, inset 0 0 80px #fff'

                  : bead.isToday

                  ? '0 0 140px #ec4899, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.9), inset 0 10px 30px rgba(255,255,255,0.3)',

                transform: 'translateZ(30px)',
                ...(bead.is29Elul && { border: '12px solid #fff' })

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* 29 Elul — Royal entrance */}

            {bead.is29Elul && (

              <motion.div

                animate={{ scale: [1, 1.4, 1] }}

                transition={{ duration: 4, repeat: Infinity }}

                className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm md:text-base pointer-events-none"

              >

                Crown

              </motion.div>

            )}



            {/* Last 12 days — rising light */}

            {bead.isLast12Days && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping pointer-events-none" />

            )}



            {/* Daily shofar glow (weekdays) */}

            {bead.isShofarDay && !bead.isLast12Days && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-pulse pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((bead, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          return (
            <motion.div
              key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 2, 1],

              boxShadow: ["0 0 50px #fff", "0 0 160px #ec4899", "0 0 50px #fff"]

            } : bead.is29Elul ? {

              boxShadow: ["0 0 120px #ec4899", "0 0 200px #fff", "0 0 120px #ec4899"],

              rotate: [0, 360]

            } : {}}

            transition={bead.is29Elul ? { duration: 8, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is29Elul

                  ? '0 0 180px #ec4899, 0 0 300px #fff, inset 0 0 80px #fff'

                  : bead.isToday

                  ? '0 0 140px #ec4899, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.9), inset 0 10px 30px rgba(255,255,255,0.3)',

                transform: 'translateZ(30px)',
                ...(bead.is29Elul && { border: '12px solid #fff' })

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>



            {/* 29 Elul — Royal entrance */}

            {bead.is29Elul && (

              <motion.div

                animate={{ scale: [1, 1.4, 1] }}

                transition={{ duration: 4, repeat: Infinity }}

                className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm md:text-base pointer-events-none"

              >

                Crown

              </motion.div>

            )}



            {/* Last 12 days — rising light */}

            {bead.isLast12Days && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping pointer-events-none" />

            )}



            {/* Daily shofar glow (weekdays) */}

            {bead.isShofarDay && !bead.isLast12Days && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-pulse pointer-events-none" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-80 pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}
      </div>




    </div>

  );

};



const Month7Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Tishrei = 31 days

  // Global day starts at 183 (previous 6 months = 182 days)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const day = i + 1;

    const globalDay = 182 + day;

    // Month 7 Sabbaths: Days 4, 11, 18, 25
    // Calculate Shabbat days based on actual weekday (only day 7 of week)
    const sabbathDays = calculateSabbathDays(7);
    const isSabbath = sabbathDays.includes(day);

    const isRoshHashana = day <= 2;                     // 1–2 Tishrei

    const isYomKippur   = day === 10;

    const isSukkot      = day >= 15 && day <= 21;

    const isSheminiAtzeret = day === 22;

    const isSimchatTorah = day === 23;



    let color = '#1f2937';

    if (isSabbath)           color = '#fbbf24';         // Gold

    if (isRoshHashana)       color = '#dc2626';         // Deep red crown

    if (isYomKippur)         color = '#ffffff';         // Pure white – forgiveness

    if (isSukkot)            color = '#34d399';         // Emerald joy of Sukkot

    if (isSheminiAtzeret || isSimchatTorah) color = '#a78bfa'; // Purple-violet rejoicing with Torah



    return {

      day,

      color,

      isToday: day === dayOfMonth,

      isRoshHashana,

      isYomKippur,

      isSukkot,

      isSheminiAtzeret,

      isSimchatTorah,

      isSabbath

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-black via-purple-950 to-amber-950 rounded-3xl shadow-2xl border-4 border-amber-600 w-full">

      <motion.h2 

        initial={{ scale: 0, rotate: -180 }}

        animate={{ scale: 1, rotate: 0 }}

        transition={{ duration: 3, type: "spring", stiffness: 60 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-red-600 via-white to-amber-500 bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-red-600 via-white to-amber-500 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 7</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((b) => (

          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.2, 1], boxShadow: ["0 0 60px #fff", "0 0 180px gold", "0 0 60px #fff"] } :

              b.isRoshHashana ? { y: [0, -15, 0] } :

              b.isYomKippur ? { boxShadow: ["0 0 100px #fff", "0 0 200px #fff", "0 0 100px #fff"] } :

              b.isSukkot ? { rotate: [0, 360] } :

              {}

            }

            transition={{ duration: b.isSukkot ? 20 : 3, repeat: Infinity }}

            className="relative"

          >

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.isRoshHashana ? '0 0 160px #dc2626, inset 0 0 80px #fff' :

                  b.isYomKippur   ? '0 0 200px #fff, 0 0 300px #fff, inset -80px -80px 120px #0000' :

                  b.isSukkot      ? '0 0 120px #34d399, 0 20px 60px rgba(0,0,0,0.8)' :

                  b.isToday       ? '0 0 180px gold' :

                  '0 25px 80px rgba(0,0,0,0.9), inset 0 12px 40px rgba(255,255,255,0.4)',

                transform: 'translateZ(100px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-amber-300 drop-shadow-2xl relative z-10">
                {b.day}
              </span>
            </div>



            {/* Rosh Hashana crown */}

            {b.isRoshHashana && (

              <motion.div animate={{ y: [0, -30, 0] }} transition={{ repeat: Infinity, duration: 4 }}

                className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm md:text-base pointer-events-none">Crown</motion.div>

            )}



            {/* Yom Kippur white fire */}

            {b.isYomKippur && (

              <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 5, repeat: Infinity }}

                className="absolute inset-0 rounded-full bg-white blur-3xl pointer-events-none" />

            )}



            {/* Sukkot lulav spin */}

            {b.isSukkot && (

              <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}

                className="absolute -inset-8 bg-emerald-500/20 rounded-full pointer-events-none" />

            )}

          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((b, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          return (
          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.2, 1], boxShadow: ["0 0 60px #fff", "0 0 180px gold", "0 0 60px #fff"] } :

              b.isRoshHashana ? { y: [0, -15, 0] } :

              b.isYomKippur ? { boxShadow: ["0 0 100px #fff", "0 0 200px #fff", "0 0 100px #fff"] } :

              b.isSukkot ? { rotate: [0, 360] } :

              {}

            }

            transition={{ duration: b.isSukkot ? 20 : 3, repeat: Infinity }}

            className="relative"

          >

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.isRoshHashana ? '0 0 160px #dc2626, inset 0 0 80px #fff' :

                  b.isYomKippur   ? '0 0 200px #fff, 0 0 300px #fff, inset -80px -80px 120px #0000' :

                  b.isSukkot      ? '0 0 120px #34d399, 0 20px 60px rgba(0,0,0,0.8)' :

                  b.isToday       ? '0 0 180px gold' :

                  '0 25px 80px rgba(0,0,0,0.9), inset 0 12px 40px rgba(255,255,255,0.4)',

                transform: 'translateZ(100px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-amber-300 drop-shadow-2xl relative z-10">
                {b.day}
              </span>
            </div>



            {/* Rosh Hashana crown */}

            {b.isRoshHashana && (

              <motion.div animate={{ y: [0, -30, 0] }} transition={{ repeat: Infinity, duration: 4 }}

                className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm md:text-base pointer-events-none">Crown</motion.div>

            )}



            {/* Yom Kippur white fire */}

            {b.isYomKippur && (

              <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 5, repeat: Infinity }}

                className="absolute inset-0 rounded-full bg-white blur-3xl pointer-events-none" />

            )}



            {/* Sukkot lulav spin */}

            {b.isSukkot && (

              <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}

                className="absolute -inset-8 bg-emerald-500/20 rounded-full pointer-events-none" />

            )}

            {/* Blood drop animation from bottom bead */}
            {isBottomBead && (
              <BloodDrop isActive={showBloodDrop} />
            )}

          </motion.div>
          );
        })}
      </div>




    </div>

  );

};



const Month8Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Cheshvan = 30 days

  // Global day starts at 214 (182 + 31 previous months)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 213 + day;

    // Month 8 Sabbaths: Days 2, 9, 16, 23, 30
    // Calculate Shabbat days based on actual weekday (only day 7 of week)
    const sabbathDays = calculateSabbathDays(8);
    const isSabbath = sabbathDays.includes(day);

    const is7Cheshvan   = day === 7;                     // Vayehi – prayers for rain begin (Israel)

    const is23Cheshvan  = day === 23;                    // Traditional date of future Temple cornerstone laying



    let color = '#1f2937';                               // Deep midnight – the "bitter" month

    if (isSabbath)          color = '#fbbf24';           // Golden Sabbath – light even in bitterness

    if (is7Cheshvan)        color = '#22d3ee';           // Rain-blue – Geshem prayer begins

    if (is23Cheshvan)       color = '#f59e0b';           // Hidden fire – future Temple stone



    return {

      day,

      color,

      isToday: day === dayOfMonth,

      isSabbath,

      is7Cheshvan,

      is23Cheshvan

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 30 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-gray-900 via-slate-950 to-black rounded-3xl shadow-2xl border-2 border-gray-700 w-full">

      <motion.h2 

        initial={{ opacity: 0, y: -100 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 2, type: "spring", stiffness: 70 }}

        className="text-lg md:text-xl font-black text-gray-500 mb-4 md:mb-6 tracking-widest"

        style={{ textShadow: '0 0 40px rgba(251,191,36,0.3)' }}

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black text-gray-500 mb-2 md:mb-4 tracking-widest">MONTH 8</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((b) => (

          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2, 1], boxShadow: ["0 0 60px #fff", "0 0 160px #f59e0b", "0 0 60px #fff"] } :

              b.is23Cheshvan ? { boxShadow: ["0 0 100px #f59e0b", "0 0 180px #ff8c00", "0 0 100px #f59e0b"] } :

              b.is7Cheshvan ? { opacity: [0.7, 1, 0.7] } :

              {}

            }

            transition={{ duration: b.is23Cheshvan ? 6 : 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #444, ${b.color})`,

                boxShadow: 

                  b.is23Cheshvan ? '0 0 180px #f59e0b, 0 0 300px #ff8c00, inset 0 0 80px #fff' :

                  b.is7Cheshvan   ? '0 0 80px #22d3ee, inset 0 0 40px #67e8f9' :

                  b.isToday       ? '0 0 160px #fff' :

                  '0 20px 70px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.15)',

                transform: 'translateZ(90px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-gray-400 relative z-10">
                {b.day}
              </span>
            </div>



            {/* 23 Cheshvan – Temple cornerstone fire */}

            {b.is23Cheshvan && (

              <motion.div

                animate={{ scale: [1, 1.6, 1] }}

                transition={{ duration: 5, repeat: Infinity }}

                className="absolute inset-0 rounded-full border-8 border-orange-600 blur-sm pointer-events-none"

              />

            )}



            {/* 7 Cheshvan – Rain drops */}

            {b.is7Cheshvan && (

              <>

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity }}

                  className="absolute top-0 left-1/2 w-1 h-12 bg-cyan-400/60 blur-sm pointer-events-none" />

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}

                  className="absolute top-0 left-1/3 w-1 h-12 bg-cyan-400/60 blur-sm pointer-events-none" />

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}

                  className="absolute top-0 right-1/3 w-1 h-12 bg-cyan-400/60 blur-sm pointer-events-none" />

              </>

            )}

          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((b, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          return (
          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2, 1], boxShadow: ["0 0 60px #fff", "0 0 160px #f59e0b", "0 0 60px #fff"] } :

              b.is23Cheshvan ? { boxShadow: ["0 0 100px #f59e0b", "0 0 180px #ff8c00", "0 0 100px #f59e0b"] } :

              b.is7Cheshvan ? { opacity: [0.7, 1, 0.7] } :

              {}

            }

            transition={{ duration: b.is23Cheshvan ? 6 : 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #444, ${b.color})`,

                boxShadow: 

                  b.is23Cheshvan ? '0 0 180px #f59e0b, 0 0 300px #ff8c00, inset 0 0 80px #fff' :

                  b.is7Cheshvan   ? '0 0 80px #22d3ee, inset 0 0 40px #67e8f9' :

                  b.isToday       ? '0 0 160px #fff' :

                  '0 20px 70px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.15)',

                transform: 'translateZ(90px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-gray-400 relative z-10">
                {b.day}
              </span>
            </div>



            {/* 23 Cheshvan – Temple cornerstone fire */}

            {b.is23Cheshvan && (

              <motion.div

                animate={{ scale: [1, 1.6, 1] }}

                transition={{ duration: 5, repeat: Infinity }}

                className="absolute inset-0 rounded-full border-8 border-orange-600 blur-sm pointer-events-none"

              />

            )}



            {/* 7 Cheshvan – Rain drops */}

            {b.is7Cheshvan && (

              <>

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity }}

                  className="absolute top-0 left-1/2 w-1 h-12 bg-cyan-400/60 blur-sm pointer-events-none" />

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}

                  className="absolute top-0 left-1/3 w-1 h-12 bg-cyan-400/60 blur-sm pointer-events-none" />

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}

                  className="absolute top-0 right-1/3 w-1 h-12 bg-cyan-400/60 blur-sm pointer-events-none" />

              </>

            )}

          </motion.div>
          );
        })}
      </div>




    </div>

  );

};



const Month9Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Kislev = 31 days

  // Global day starts at 244 (182 + 31 + 30 + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const day = i + 1;

    const globalDay = 243 + day;

    // Month 9 Sabbaths: Days 7, 14, 21, 28
    // Calculate Shabbat days based on actual weekday (only day 7 of week)
    const sabbathDays = calculateSabbathDays(9);
    const isSabbath = sabbathDays.includes(day);

    let color = '#1f2937';                                 // Deep winter night

    if (isSabbath)               color = '#fbbf24';       // Golden Sabbath



      return {

      day,

      globalDay,

      color,

      isToday: day === dayOfMonth,

      isSabbath

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-indigo-950 via-black to-amber-950 rounded-3xl shadow-2xl border-4 border-amber-700/50 w-full">

      <motion.h2 

        initial={{ scale: 0, rotate: 360 }}

        animate={{ scale: 1, rotate: 0 }}

        transition={{ duration: 3, type: "spring", stiffness: 80 }}

        className="text-lg md:text-xl font-black bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 bg-clip-text text-transparent mb-4 md:mb-6 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 9</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((b) => (

          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.3, 1] } :


              {}

            }

            transition={{ duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead → becomes a living flame */}

            <div

              className="relative w-11 h-11 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 40% 20%, #fff, ${b.color})`,

                boxShadow: 

                  b.isToday ? '0 0 200px #ec4899' :

                  '0 30px 100px rgba(0,0,0,0.9), inset 0 15px 50px rgba(255,255,255,0.3)',

                transform: 'translateZ(120px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-amber-300 drop-shadow-2xl relative z-10">
                {b.day}
              </span>


            </div>







          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((b, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          return (
          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.3, 1] } :


              {}

            }

            transition={{ duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead → becomes a living flame */}

            <div

              className="relative w-11 h-11 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 40% 20%, #fff, ${b.color})`,

                boxShadow: 

                  b.isToday ? '0 0 200px #ec4899' :

                  '0 30px 100px rgba(0,0,0,0.9), inset 0 15px 50px rgba(255,255,255,0.3)',

                transform: 'translateZ(120px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-amber-300 drop-shadow-2xl relative z-10">
                {b.day}
              </span>


            </div>







          </motion.div>
          );
        })}

      </div>




    </div>

  );

};



const Month10Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Tevet = 30 days

  // Global day starts at 275 (182 + 31 + 30 + 31 + 1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 274 + day;

    // Calculate Shabbat days for Month 10 based on actual weekday (only day 7 of week)
    const sabbathDaysMonth10 = calculateSabbathDays(10);
    const isSabbath = sabbathDaysMonth10.includes(day);

    const is10Tevet       = day === 10;                    // Fast – siege of Jerusalem began

    let color = '#1f2937';                                 // Cold winter night

    if (isSabbath)               color = '#fbbf24';       // Golden Sabbath

    if (is10Tevet)               color = '#374151';       // Iron-grey siege



    return {

      day,

      color,

      isToday: day === dayOfMonth,

      globalDay,

      isSabbath,

      is10Tevet

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 30 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-slate-900 via-gray-950 to-black rounded-3xl shadow-2xl border-3 border-gray-800 w-full">

      <motion.h2 

        initial={{ opacity: 0, y: -80 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 2.5, type: "spring", stiffness: 70 }}

        className="text-lg md:text-xl font-black text-gray-400 mb-4 md:mb-6 tracking-widest"

        style={{ textShadow: '0 0 60px rgba(255,255,255,0.2)' }}

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black text-gray-400 mb-2 md:mb-4 tracking-widest">MONTH 10</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((b) => (

          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.2, 1] } :

              b.is10Tevet ? { rotate: [0, 3, -3, 0], boxShadow: ["0 0 120px #1e293b", "0 0 200px #000"] } :


              {}

            }

            transition={{ duration: b.is10Tevet ? 6 : 3, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.is10Tevet ? '0 0 180px #1e293b, 0 0 300px #000, inset 0 0 80px #111' :


                  b.isToday ? '0 0 200px #fff' :

                  '0 30px 100px rgba(0,0,0,0.95), inset 0 15px 50px rgba(255,255,255,0.15)',

                transform: 'none'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-gray-400 drop-shadow-2xl relative z-10">
                {b.day}
              </span>


            </div>



            {/* 10 Tevet – siege walls */}

            {b.is10Tevet && (

              <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-black text-gray-800 rotate-12 pointer-events-none">

                Walls

              </div>

            )}




          </motion.div>
        ))}
      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col relative" style={{ gap: '1mm' }}>

        {pastBeads.map((b, index) => {
          const isBottomBead = index === pastBeads.length - 1;
          return (
          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.2, 1] } :

              b.is10Tevet ? { rotate: [0, 3, -3, 0], boxShadow: ["0 0 120px #1e293b", "0 0 200px #000"] } :


              {}

            }

            transition={{ duration: b.is10Tevet ? 6 : 3, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.is10Tevet ? '0 0 180px #1e293b, 0 0 300px #000, inset 0 0 80px #111' :


                  b.isToday ? '0 0 200px #fff' :

                  '0 30px 100px rgba(0,0,0,0.95), inset 0 15px 50px rgba(255,255,255,0.15)',

                transform: 'none'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-gray-400 drop-shadow-2xl relative z-10">
                {b.day}
              </span>


            </div>



            {/* 10 Tevet – siege walls */}

            {b.is10Tevet && (

              <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-black text-gray-800 rotate-12 pointer-events-none">

                Walls

              </div>

            )}




          </motion.div>
          );
        })}

      </div>




    </div>

  );

};



const Month11Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Shevat = 30 days

  // Global day starts at 305 (274 + 30 + 1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 304 + day;

    // Calculate Shabbat days for Month 11 based on actual weekday (only day 7 of week)
    const sabbathDaysMonth11 = calculateSabbathDays(11);
    const isSabbath = sabbathDaysMonth11.includes(day);

    const isTuBShevat  = day === 15;                    // New Year for Trees – almond blossoms



    let color = '#1f2937';                              // Winter night

    if (isSabbath)      color = '#fbbf24';              // Golden Sabbath

    if (isTuBShevat)    color = '#f8fafc';              // Pure snow-white with pink undertone



    return {

      day,

      globalDay,

      color,

      isToday: day === dayOfMonth,

      isSabbath,

      isTuBShevat

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 30 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-pink-950 via-black to-teal-950 rounded-3xl shadow-2xl border-4 border-pink-800/40 w-full">

      <motion.h2 

        initial={{ scale: 0.6, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 3, type: "spring", stiffness: 60, damping: 15 }}

        className="text-9xl font-black bg-gradient-to-r from-pink-300 via-white to-teal-300 bg-clip-text text-transparent mb-16 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-pink-300 via-white to-teal-300 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 11</h2>

      </motion.h2>



      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {futureBeads.map((b) => {
          const curveAngle = getSolarCurveAngle(b.globalDay);
  return (
            <motion.div
              key={b.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={

                b.isToday ? { scale: [1, 2.4, 1] } :

                b.isTuBShevat ? { 

                  y: [0, -20, 0],

                  rotate: [0, 5, -5, 0],

                  boxShadow: ["0 0 120px #fff", "0 0 240px #f8fafc", "0 0 120px #fff"]

                } :

                {}

              }
              transition={{ duration: b.isTuBShevat ? 6 : 2, repeat: Infinity }}
              className="relative flex items-center justify-center"
            >
              {/* Main Bead – becomes an almond blossom on 15 Shevat */}
              <div
                className="relative w-11 h-11 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black flex items-center justify-center"
                style={{
                  background: b.isTuBShevat 
                    ? `radial-gradient(circle at 50% 30%, #fff, #fdb5cd)` 
                    : `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isTuBShevat ? '0 0 200px #fff, 0 0 400px #fdb5cd, inset 0 0 100px #fff' :
                    b.isToday ? '0 0 220px #ec4899' :
                    '0 35px 120px rgba(0,0,0,0.9), inset 0 18px 60px rgba(255,255,255,0.3)',
                  transform: 'translateZ(140px)',
                  aspectRatio: '1 / 1'
                }}
              >
                {/* Almond blossoms blooming on Tu B'Shevat */}
                {b.isTuBShevat && (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {Array.from({ length: 8 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-12 h-20 bg-gradient-to-b from-pink-200 to-white rounded-full blur-md"
                          style={{ transform: `rotate(${i * 45}deg) translateY(-70px)` }}
                        />
                      ))}
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center text-pink-300 text-xs font-light pointer-events-none">
                      Almond Tree
        </div>
                  </>
                )}

                {/* Day number */}
                <span className="text-xs font-bold text-pink-200 drop-shadow-2xl relative z-10">
                  {b.day}
                </span>
              </div>

              {/* Gentle falling petals on Tu B'Shevat */}
              {b.isTuBShevat && (
                <>
                  <motion.div animate={{ y: [100, -300], opacity: [0, 1, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 0 }}
                    className="absolute top-0 left-1/4 w-6 h-10 bg-pink-200/60 rounded-full blur-sm pointer-events-none" />
                  <motion.div animate={{ y: [100, -300], opacity: [0, 1, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }}
                    className="absolute top-0 left-1/2 w-8 h-12 bg-white/70 rounded-full blur-sm pointer-events-none" />
                  <motion.div animate={{ y: [100, -300], opacity: [0, 1, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 4 }}
                    className="absolute top-0 right-1/4 w-7 h-11 bg-pink-100/60 rounded-full blur-sm pointer-events-none" />
                </>
              )}
            </motion.div>
          );
        })}

      </div>

      {/* 1cm gap between future and past beads */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>
        {pastBeads.map((b) => {
          const curveAngle = getSolarCurveAngle(b.globalDay);
                  return (
            <motion.div
              key={b.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={

                b.isToday ? { scale: [1, 2.4, 1] } :

                b.isTuBShevat ? { 

                  y: [0, -20, 0],

                  rotate: [0, 5, -5, 0],

                  boxShadow: ["0 0 120px #fff", "0 0 240px #f8fafc", "0 0 120px #fff"]

                } :

                {}

              }
              transition={{ duration: b.isTuBShevat ? 6 : 2, repeat: Infinity }}
              className="relative flex items-center justify-center"
            >
              {/* Main Bead – becomes an almond blossom on 15 Shevat */}
              <div
                className="relative w-11 h-11 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black flex items-center justify-center"
                style={{
                  background: b.isTuBShevat 
                    ? `radial-gradient(circle at 50% 30%, #fff, #fdb5cd)` 
                    : `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isTuBShevat ? '0 0 200px #fff, 0 0 400px #fdb5cd, inset 0 0 100px #fff' :
                    b.isToday ? '0 0 220px #ec4899' :
                    '0 35px 120px rgba(0,0,0,0.9), inset 0 18px 60px rgba(255,255,255,0.3)',
                  transform: 'translateZ(140px)',
                  aspectRatio: '1 / 1'
                }}
              >
                {/* Almond blossoms blooming on Tu B'Shevat */}
                {b.isTuBShevat && (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {Array.from({ length: 8 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-12 h-20 bg-gradient-to-b from-pink-200 to-white rounded-full blur-md"
                          style={{ transform: `rotate(${i * 45}deg) translateY(-70px)` }}
                        />
                      ))}
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center text-pink-300 text-xs font-light pointer-events-none">
                      Almond Tree
                    </div>
                  </>
                )}

                {/* Day number */}
                <span className="text-xs font-bold text-pink-200 drop-shadow-2xl relative z-10">
                  {b.day}
                </span>
              </div>

              {/* Gentle falling petals on Tu B'Shevat */}
              {b.isTuBShevat && (
                <>
                  <motion.div animate={{ y: [100, -300], opacity: [0, 1, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 0 }}
                    className="absolute top-0 left-1/4 w-6 h-10 bg-pink-200/60 rounded-full blur-sm pointer-events-none" />
                  <motion.div animate={{ y: [100, -300], opacity: [0, 1, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }}
                    className="absolute top-0 left-1/2 w-8 h-12 bg-white/70 rounded-full blur-sm pointer-events-none" />
                  <motion.div animate={{ y: [100, -300], opacity: [0, 1, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 4 }}
                    className="absolute top-0 right-1/4 w-7 h-11 bg-pink-100/60 rounded-full blur-sm pointer-events-none" />
                </>
              )}
            </motion.div>
                );
              })}
      </div>


    </div>

  );

};



// Types for Month 12 extended beads
interface Month12Bead {
  day: number;
  displayNumber: number | string;
  globalDay: number;
  color: string;
  isToday: boolean;
  isSabbath: boolean;
  isPurim: boolean;
  isShushanPurim: boolean;
  isAdarJoy: boolean;
  isLastSabbath: boolean;
  isDaysOutOfTime: boolean;
  isDaysOutOfTime1: boolean;
  isDaysOutOfTime2: boolean;
  isNewWeekCycle: boolean;
  label: string;
  beadType: 'regular' | 'daysOutOfTime1' | 'daysOutOfTime2' | 'newWeekCycle';
}

const Month12Strand = ({ dayOfMonth, year }: { dayOfMonth: number; year: number }) => {
  const [selectedBead, setSelectedBead] = useState<{ year: number; month: number; day: number } | null>(null);
  const [showBloodDrop, setShowBloodDrop] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const { location } = useUserLocation();

  useEffect(() => {
    const updatePart = () => {
      const now = new Date();
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      const newPart = creatorTime.part;
      
      if (newPart !== currentPart && currentPart !== 0) {
        setShowBloodDrop(true);
        setTimeout(() => setShowBloodDrop(false), 4000);
      }
      setCurrentPart(newPart);
    };

    const now = new Date();
    const creatorTime = getCreatorTime(now, location.lat, location.lon);
    setCurrentPart(creatorTime.part);
    
    const interval = setInterval(updatePart, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  const sabbathDaysMonth12 = calculateSabbathDays(12);

  // Build extended beads: 28 regular days + 2 days out of time + 3 new week cycle days = 33 total
  const beads: Month12Bead[] = [];
  
  // First: Regular days 1-28
  for (let i = 1; i <= 28; i++) {
    const day = i;
    const globalDay = 334 + day;
    const isSabbath = sabbathDaysMonth12.includes(day);
    const isPurim = day === 14;
    const isShushanPurim = day === 15;
    const isAdarJoy = day >= 13;
    const isLastSabbath = day === 28;

    let color = '#1f2937';
    if (isSabbath) color = '#fbbf24';
    if (isPurim) color = '#ec4899';
    if (isShushanPurim) color = '#a78bfa';
    if (isAdarJoy && !isPurim && !isShushanPurim && !isSabbath) color = '#f0abfc';
    if (isLastSabbath) color = '#9333ea';

    let label = '';
    if (day === 28) {
      label = "yhvh's day 364 sabbath 52";
    }

    beads.push({
      day,
      displayNumber: day,
      globalDay,
      color,
      isToday: day === dayOfMonth,
      isSabbath,
      isPurim,
      isShushanPurim,
      isAdarJoy,
      isLastSabbath,
      isDaysOutOfTime: false,
      isDaysOutOfTime1: false,
      isDaysOutOfTime2: false,
      isNewWeekCycle: false,
      label,
      beadType: 'regular'
    });
  }

  // Second: Days Out of Time (2 beads after day 28)
  // Bead 1: If tequvah on 2nd day of 7th month, 1 day added (not counted)
  beads.push({
    day: 0,
    displayNumber: 'DOT1',
    globalDay: 362,
    color: '#4c1d95', // Deep purple for days out of time
    isToday: false,
    isSabbath: false,
    isPurim: false,
    isShushanPurim: false,
    isAdarJoy: false,
    isLastSabbath: false,
    isDaysOutOfTime: true,
    isDaysOutOfTime1: true,
    isDaysOutOfTime2: false,
    isNewWeekCycle: false,
    label: "Asfa'el - Day out of time 1: if the tequvah appears on the 2nd day of the 7th month only 1 day is added and this day is not counted",
    beadType: 'daysOutOfTime1'
  });

  // Bead 2: If tequvah on 3rd day of 7th month, 2nd day also added (not counted)
  beads.push({
    day: 0,
    displayNumber: 'DOT2',
    globalDay: 363,
    color: '#581c87', // Even deeper purple
    isToday: false,
    isSabbath: false,
    isPurim: false,
    isShushanPurim: false,
    isAdarJoy: false,
    isLastSabbath: false,
    isDaysOutOfTime: true,
    isDaysOutOfTime1: false,
    isDaysOutOfTime2: true,
    isNewWeekCycle: false,
    label: "Asfa'el - Day out of time 2: if the tequvah appears on the 3rd day of the 7th month this 2nd day is also added and this day is also not counted",
    beadType: 'daysOutOfTime2'
  });

  // Third: Days 29, 30, 31 (new week cycle)
  for (let i = 29; i <= 31; i++) {
    const day = i;
    const globalDay = 334 + day;
    const weekCycleDay = i - 28; // 1, 2, 3

    beads.push({
      day,
      displayNumber: day,
      globalDay,
      color: '#8b5cf6', // Purple for new week cycle
      isToday: day === dayOfMonth,
      isSabbath: false,
      isPurim: false,
      isShushanPurim: false,
      isAdarJoy: false,
      isLastSabbath: false,
      isDaysOutOfTime: false,
      isDaysOutOfTime1: false,
      isDaysOutOfTime2: false,
      isNewWeekCycle: true,
      label: `day ${weekCycleDay} of new week cycle`,
      beadType: 'newWeekCycle'
    });
  }

  // Reverse so day 1 is at bottom
  const reversedBeads = [...beads].reverse();

  // For future/past split, consider beadType - days out of time are always shown
  const futureBeads = reversedBeads.filter(bead => 
    (bead.beadType === 'regular' && bead.day > dayOfMonth) || 
    bead.beadType === 'daysOutOfTime1' || 
    bead.beadType === 'daysOutOfTime2' ||
    (bead.beadType === 'newWeekCycle' && bead.day > dayOfMonth)
  );
  const pastBeads = reversedBeads.filter(bead => 
    (bead.beadType === 'regular' && bead.day <= dayOfMonth) ||
    (bead.beadType === 'newWeekCycle' && bead.day <= dayOfMonth)
  );

  return (
    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-purple-950 via-pink-900 to-black rounded-3xl shadow-2xl border-4 border-pink-700 w-full">
      <motion.h2 
        initial={{ scale: 0, rotate: -720 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 4, type: "spring", stiffness: 50 }}
        className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl"
      >
        MONTH 12
      </motion.h2>

      {/* Future days (uncounted) - at top */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>
        {futureBeads.map((b, idx) => {
          const curveAngle = getSolarCurveAngle(b.globalDay);
          const beadKey = b.beadType === 'daysOutOfTime1' ? 'dot1' : 
                         b.beadType === 'daysOutOfTime2' ? 'dot2' : 
                         `day-${b.day}`;
          return (
            <motion.div
              key={beadKey}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={
                b.isToday ? { scale: [1, 2.5, 1] } :
                b.isDaysOutOfTime ? {
                  boxShadow: ["0 0 50px #4c1d95", "0 0 100px #581c87", "0 0 50px #4c1d95"],
                  scale: [1, 1.1, 1]
                } :
                b.isLastSabbath ? { 
                  boxShadow: ["0 0 40px #9333ea", "0 0 80px #a855f7", "0 0 40px #9333ea"]
                } :
                b.isNewWeekCycle ? { 
                  boxShadow: ["0 0 30px #8b5cf6", "0 0 60px #a78bfa", "0 0 30px #8b5cf6"]
                } :
                b.isPurim ? { 
                  scale: [1, 1.3, 1],
                  rotate: [0, 360],
                  boxShadow: ["0 0 160px #ec4899", "0 0 300px #fff", "0 0 160px #ec4899"]
                } :
                b.isShushanPurim ? { boxShadow: ["0 0 200px #a78bfa", "0 0 400px #e879f9"] } :
                b.isAdarJoy ? { opacity: [0.8, 1, 0.8] } :
                {}
              }
              transition={{ duration: b.isPurim ? 3 : b.isDaysOutOfTime ? 3 : 2, repeat: Infinity }}
              className="relative flex items-center gap-2"
            >
              <div
                className={`relative w-11 h-11 md:w-12 md:h-12 rounded-full border-3 md:border-4 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${
                  b.isDaysOutOfTime ? 'border-purple-900' : 'border-black'
                }`}
                onClick={() => b.beadType === 'regular' || b.beadType === 'newWeekCycle' 
                  ? setSelectedBead({ year, month: 12, day: b.day }) 
                  : null}
                title={b.label}
                style={{
                  background: b.isDaysOutOfTime 
                    ? `radial-gradient(circle at 30% 30%, #a78bfa, ${b.color})`
                    : `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isDaysOutOfTime ? '0 0 60px #4c1d95, inset 0 0 25px rgba(167,139,250,0.5)' :
                    b.isLastSabbath ? '0 0 60px #9333ea, inset 0 0 20px #fff' :
                    b.isNewWeekCycle ? '0 0 50px #8b5cf6, inset 0 0 15px #fff' :
                    b.isPurim ? '0 0 300px #ec4899, 0 0 500px #fff, inset 0 0 120px #fff' :
                    b.isShushanPurim ? '0 0 280px #a78bfa, 0 0 450px #f0abfc' :
                    b.isToday ? '0 0 250px #ec4899' :
                    '0 40px 140px rgba(0,0,0,0.9), inset 0 20px 70px rgba(255,255,255,0.4)',
                  transform: 'translateZ(160px)',
                  aspectRatio: '1 / 1'
                }}
              >
                {b.isPurim && (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-4 h-12 bg-gradient-to-b from-pink-400 to-purple-400 rounded-full blur-sm"
                          style={{ 
                            transform: `rotate(${i * 30}deg) translateY(-100px)`,
                            animation: `confetti 4s infinite ${i * 0.2}s`
                          }}
                        />
                      ))}
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-pink-300 pointer-events-none">
                      PURIM
                    </div>
                  </>
                )}
                {b.isDaysOutOfTime && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-purple-200 pointer-events-none text-center px-1"
                  >
                    {b.isDaysOutOfTime1 ? 'DOT 1' : 'DOT 2'}
                  </motion.div>
                )}
                <span className={`text-xs font-bold drop-shadow-2xl relative z-10 ${
                  b.isDaysOutOfTime ? 'text-purple-100' : 'text-pink-300'
                }`}>
                  {b.isDaysOutOfTime ? '' : b.displayNumber}
                </span>
              </div>

              {/* No label text - info shown only on click via popup */}
            </motion.div>
          );
        })}
      </div>

      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>
        {pastBeads.map((b) => {
          const curveAngle = getSolarCurveAngle(b.globalDay);
          const beadKey = `past-day-${b.day}`;
          return (
            <motion.div
              key={beadKey}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={
                b.isToday ? { scale: [1, 2.5, 1] } :
                b.isLastSabbath ? { 
                  boxShadow: ["0 0 40px #9333ea", "0 0 80px #a855f7", "0 0 40px #9333ea"]
                } :
                b.isNewWeekCycle ? { 
                  boxShadow: ["0 0 30px #8b5cf6", "0 0 60px #a78bfa", "0 0 30px #8b5cf6"]
                } :
                b.isPurim ? { 
                  scale: [1, 1.3, 1],
                  rotate: [0, 360],
                  boxShadow: ["0 0 160px #ec4899", "0 0 300px #fff", "0 0 160px #ec4899"]
                } :
                b.isShushanPurim ? { boxShadow: ["0 0 200px #a78bfa", "0 0 400px #e879f9"] } :
                b.isAdarJoy ? { opacity: [0.8, 1, 0.8] } :
                {}
              }
              transition={{ duration: b.isPurim ? 3 : 2, repeat: Infinity }}
              className="relative flex items-center gap-2"
            >
              <div
                className="relative w-11 h-11 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                onClick={() => setSelectedBead({ year, month: 12, day: b.day })}
                title={b.label}
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isLastSabbath ? '0 0 60px #9333ea, inset 0 0 20px #fff' :
                    b.isNewWeekCycle ? '0 0 50px #8b5cf6, inset 0 0 15px #fff' :
                    b.isPurim ? '0 0 300px #ec4899, 0 0 500px #fff, inset 0 0 120px #fff' :
                    b.isShushanPurim ? '0 0 280px #a78bfa, 0 0 450px #f0abfc' :
                    b.isToday ? '0 0 250px #ec4899' :
                    '0 40px 140px rgba(0,0,0,0.9), inset 0 20px 70px rgba(255,255,255,0.4)',
                  transform: 'translateZ(160px)',
                  aspectRatio: '1 / 1'
                }}
              >
                {b.isPurim && (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-4 h-12 bg-gradient-to-b from-pink-400 to-purple-400 rounded-full blur-sm"
                          style={{ 
                            transform: `rotate(${i * 30}deg) translateY(-100px)`,
                            animation: `confetti 4s infinite ${i * 0.2}s`
                          }}
                        />
                      ))}
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-pink-300 pointer-events-none">
                      PURIM
                    </div>
                  </>
                )}
                <span className="text-xs font-bold text-pink-300 drop-shadow-2xl relative z-10">
                  {b.displayNumber}
                </span>
              </div>

              {/* No label text - info shown only on click via popup */}
            </motion.div>
          );
        })}
      </div>

      {selectedBead && (
        <BeadPopup
          isOpen={!!selectedBead}
          onClose={() => setSelectedBead(null)}
          year={selectedBead.year}
          month={selectedBead.month}
          day={selectedBead.day}
        />
      )}
    </div>
  );
};



// ——— Solar Curve Angle Calculation ———
const getSolarCurveAngle = (globalDay: number) => {
    // Your fixed reference: Day 4 = 20 March 2025 = straight line (0°)
    const daySinceTekufah = globalDay - 4;

    // Key sacred days in your 364-day year
    const longestDayGlobal = 30 + 30 + 31;            // = Day 91 → 31st of 3rd month
    const nextStraightLineGlobal = 182 + 2;           // Day 184 → 2nd of 7th month

    let angle = 0;

    if (globalDay < 4 || globalDay >= 364) {
      angle = 0;                                          // Outside the year = perfectly straight
    }
    else if (daySinceTekufah <= longestDayGlobal - 4) {
      // First quarter → curve grows from 0° → max 28°
      const progress = daySinceTekufah / (longestDayGlobal - 4);
      angle = 28 * Math.sin(progress * Math.PI / 2);
    }
    else if (globalDay <= nextStraightLineGlobal) {
      // Second quarter → curve shrinks back to 0°
      const progress = (globalDay - longestDayGlobal) / (nextStraightLineGlobal - longestDayGlobal);
      angle = 28 * Math.cos(progress * Math.PI / 2);
    }
    else {
      // Second half of year → mirror the curve (southern-hemisphere style)
      const mirrorDay = globalDay - nextStraightLineGlobal + 4;
      const progress = mirrorDay / (longestDayGlobal - 4);
      angle = -28 * Math.sin(progress * Math.PI / 2);     // negative = opposite bow
    }

    return angle;   // Returns value between -28° and +28°
};



const EnochianTimepiece = () => {

  // Use shared location hook for time parts calculation
  const { location } = useUserLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [enochianDate, setEnochianDate] = useState({ 

    year: 6028, dayOfYear: 255, month: 9, dayOfMonth: 13, weekOfYear: 37,

    dayOfWeek: 6, dayPart: 'Laylah', eighteenPart: 12, daysInCurrentMonth: 31,

    timelessDay: 0, season: 'Fall'

  });

  // Calculate if Asfa'el should be shown (appears on +2 years, every 5-year cycle)
  // For now, showing it every 2 years as a simple implementation
  const currentYear = currentTime.getFullYear();
  const showAsfael = (currentYear % 2 === 0); // Simple: show on even years



  const monthStructure = [

    { num: 1, days: 30, season: 'Spring' }, { num: 2, days: 30, season: 'Spring' },

    { num: 3, days: 31, season: 'Spring' }, { num: 4, days: 30, season: 'Summer' },

    { num: 5, days: 30, season: 'Summer' }, { num: 6, days: 31, season: 'Summer' },

    { num: 7, days: 30, season: 'Fall' },   { num: 8, days: 30, season: 'Fall' },

    { num: 9, days: 31, season: 'Fall' },   { num: 10, days: 30, season: 'Winter' },

    { num: 11, days: 30, season: 'Winter' },{ num: 12, days: 31, season: 'Winter' }

  ];




  // Update calendar date using the exact same logic as DashboardPage
  useEffect(() => {
    const updateCalendar = () => {
      const now = new Date();
      setCurrentTime(now);
      
      // Use the exact same calculation as DashboardPage
      const creatorDate = calculateCreatorDate(now);
      
      // Get Creator time parts
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      
      // Get day part name
      const dayParts = [
        'Boker', 'Boker', 'Boker', 'Tzohorayim', 'Tzohorayim', 'Tzohorayim',
        'Tzohorayim', 'Tzohorayim', 'Tzohorayim', 'Erev', 'Erev', 'Erev',
        'Laylah', 'Laylah', 'Laylah', 'Laylah', 'Laylah', 'Laylah'
      ];
      const dayPart = dayParts[creatorTime.part - 1] || 'Boker';
      
      // Get season
      const season = creatorDate.month <= 3 ? 'Spring' :
                    creatorDate.month <= 6 ? 'Summer' :
                    creatorDate.month <= 9 ? 'Fall' : 'Winter';
      
      setEnochianDate((prev) => ({
        ...prev,
        year: creatorDate.year,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        dayOfYear: creatorDate.dayOfYear,
        weekOfYear: Math.floor((creatorDate.dayOfYear - 1) / 7) + 1,
        dayOfWeek: creatorDate.weekDay,
        dayPart,
        eighteenPart: creatorTime.part,
        season,
      }));
    };

    updateCalendar();
    
    // Update every minute (same as Dashboard)
    const interval = setInterval(updateCalendar, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);



  // Calendar date is now calculated using the exact same logic as DashboardPage





  return (

    <div className="min-h-screen bg-black relative overflow-hidden">

      <style>{`
        @keyframes pulse {
          from { 
            filter: drop-shadow(0 0 80px #00ff9d) drop-shadow(0 0 130px #00ff9d);
          }
          to { 
            filter: drop-shadow(0 0 130px #00ff9d) drop-shadow(0 0 200px #00ff9d);
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950" />

      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-purple-900/20 to-transparent" />
      </div>

      {/* Header - Compact */}
      <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="relative z-10 pt-4 pb-2 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-amber-300 via-yellow-500 to-pink-600 bg-clip-text text-transparent px-4">
          MONTH BEAD STRANDS
        </h1>
        <p className="text-base md:text-lg text-amber-200 mt-1 tracking-widest">Eternal • 364 • Aligned Forever</p>
      </motion.div>

      {/* Main Content Container - Centered Beads */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 md:px-8 gap-4 md:gap-8">
        {/* Month Strand - Centered */}
        <div 
          className="flex-shrink-0 flex flex-col items-center w-full max-w-md"
        >
          {/* Only show current month beads */}
          {enochianDate.month === 1 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month1Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 2 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month2Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 3 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month3Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 4 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month4Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 5 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month5Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 6 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month6Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 7 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month7Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 8 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month8Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 9 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month9Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 10 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month10Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 11 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month11Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}

          {enochianDate.month === 12 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="w-full"
            >
              <Month12Strand dayOfMonth={enochianDate.dayOfMonth} year={enochianDate.year} />
            </motion.div>
          )}
        </div>
      </div>



      {/* Review Sections - Other Months (Temporary for Review) */}
      <div className="relative z-10 mt-32 space-y-32 px-4">
        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 10 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month10Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 11 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month11Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 12 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month12Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 1 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month1Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 2 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month2Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 3 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month3Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 4 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month4Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 5 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month5Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 6 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month6Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 7 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month7Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 8 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month8Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 9 - Review</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex-shrink-0 flex flex-col items-center w-full max-w-md">
              <Month9Strand dayOfMonth={0} year={0} />
            </div>
          </div>
        </div>
      </div>

      {/* THE TWO DAYS OUTSIDE TIME — HELO-YASEPH & ASFA'EL */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="relative z-10 mt-16 md:mt-32 pt-8 md:pt-16 border-t-4 border-pink-900/50 px-4"
      >
        <p className="text-2xl md:text-4xl text-pink-300 mb-8 md:mb-12 tracking-widest text-center">Days Outside Time</p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 max-w-4xl mx-auto">
          {/* Helo-Yaseph — always appears every 5-year cycle */}
          <div className="my-6 md:my-12">
            <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-gray-900 to-black border-4 md:border-8 border-gray-800 shadow-2xl flex items-center justify-center">
              <span className="text-xl md:text-2xl font-bold text-gray-400">אֱלוֹיָסֵף</span>
            </div>
            <p className="text-center mt-4 text-base md:text-xl text-gray-400">Helo-Yaseph • Yah is adding</p>
                </div>

          {/* Asfa'el — appears only on +2 years */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: showAsfael ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="my-6 md:my-12"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border-4 md:border-8 border-zinc-700 shadow-2xl flex items-center justify-center">
              <span className="text-xl md:text-2xl font-bold text-zinc-500">אַסְפָּעֵאל</span>
                </div>
            <p className="text-center mt-4 text-base md:text-xl text-zinc-500">Asfa'el • El is adding</p>
          </motion.div>
                </div>
      </motion.div>



      {/* Footer Info */}
      <motion.div 
        initial={{ y: 100 }} 
        animate={{ y: 0 }} 
        className="relative z-10 px-4 pb-8 text-center"
      >
        <p className="text-xl md:text-2xl font-bold text-amber-300 tracking-widest">
          Year {enochianDate.year} • Month {enochianDate.month} • Day {enochianDate.dayOfMonth} • Part {enochianDate.eighteenPart}/18
        </p>
        <p className="text-base md:text-lg text-amber-200 mt-2">The Creator's wheels never lie • Forever in sync</p>
        <p className="text-sm md:text-base text-yellow-400 mt-2">Day {enochianDate.dayOfYear}</p>
      </motion.div>



      {/* Decorative Icons */}
      <Sun className="absolute top-4 right-4 w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 text-amber-400 animate-pulse z-10" />
      <Moon className="absolute top-4 left-4 w-10 h-10 md:w-14 md:h-14 lg:w-20 lg:h-20 text-blue-300 animate-pulse z-10" />


    </div>

  );

};



export default EnochianTimepiece;

// Export individual month strands for external use
export {
  Month1Strand,
  Month2Strand,
  Month3Strand,
  Month4Strand,
  Month5Strand,
  Month6Strand,
  Month7Strand,
  Month8Strand,
  Month9Strand,
  Month10Strand,
  Month11Strand,
  Month12Strand
};
