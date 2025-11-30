import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';

import { Sun, Moon } from 'lucide-react';

import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from '@/hooks/useUserLocation';



const PART_MINUTES = 80;

const PARTS_PER_DAY = 18;

const MINUTES_PER_DAY = PART_MINUTES * PARTS_PER_DAY;

const DAYS_PER_YEAR = 364;



const Month1Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Nisan pattern exactly as in your photo:

  // 1–3 = Blue (New Moon cycle start)

  // 4   = Blue + Tekufah shadow (straight line)

  // 7,14,21,28 = Yellow Sabbath

  // Rest = Black

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = day; // Month 1 starts at global day 1

    // Month 1 Sabbaths: Days 4, 11, 18, 25
    const isSabbath = [4, 11, 18, 25].includes(day);

    const isFeast = day <= 4;                   // First 4 days = blue feast cycle

    const isTekufah = day === 4;                // Day 4 = special tekufah marker



    let color = '#1f2937';                      // Regular day (deep black)

    if (isSabbath) color = '#fbbf24';           // Golden Sabbath

    if (isFeast)   color = '#22d3ee';           // Turquoise feast



    return { day, globalDay, color, isToday: day === dayOfMonth, isTekufah };

  }).reverse(); // Reverse so day 1 is at bottom, day 30 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-stone-900 to-black rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-y-auto">

      <h2 className="text-lg md:text-xl lg:text-2xl font-black text-amber-400 mb-2 md:mb-4 tracking-widest">MONTH 1</h2>

      

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
                scale: [1, 1.5, 1],
                boxShadow: ["0 0 20px #fff", "0 0 80px #ec4899", "0 0 20px #fff"]
              } : {}}
              transition={{ duration: 0 }}
              className="relative flex items-center justify-center"
            >

            <div

              className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 md:border-3 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isToday 

                  ? '0 0 60px #ec4899, inset 0 0 30px #fff'

                  : bead.isTekufah

                  ? '0 0 40px #06b6d4, 0 0 0 8px #000 inset'

                  : '0 10px 30px rgba(0,0,0,0.9), inset 0 5px 15px rgba(255,255,255,0.2)',

                transform: 'translateZ(30px)'

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>

            {bead.isTekufah && (

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                <div className="w-2 h-full bg-cyan-400/80" /> {/* Tekufah straight line */}

              </div>

            )}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-4 border-pink-500 border-dashed pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}

      </div>

      {/* 1cm gap between future and past days */}
      <div style={{ height: '1cm' }} />

      {/* Past days (counted) - at bottom */}
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((bead) => {
          const curveAngle = getSolarCurveAngle(bead.globalDay);
          
          return (
            <motion.div
              key={bead.day}
              style={{
                transform: `perspective(600px) rotateX(${curveAngle * 0.7}deg) rotateY(${curveAngle * 0.3}deg) scaleX(${1 + Math.abs(curveAngle) * 0.003})`,
                transformOrigin: "center bottom",
              }}
              animate={bead.isToday ? {
                scale: [1, 1.5, 1],
                boxShadow: ["0 0 20px #fff", "0 0 80px #ec4899", "0 0 20px #fff"]
              } : {}}
              transition={{ duration: 0 }}
              className="relative flex items-center justify-center"
            >

            <div

              className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 md:border-3 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isToday 

                  ? '0 0 60px #ec4899, inset 0 0 30px #fff'

                  : bead.isTekufah

                  ? '0 0 40px #06b6d4, 0 0 0 8px #000 inset'

                  : '0 10px 30px rgba(0,0,0,0.9), inset 0 5px 15px rgba(255,255,255,0.2)',

                transform: 'translateZ(30px)'

              }}

            >
              <span className="text-xs font-bold text-amber-300 relative z-10">
                {bead.day}
              </span>
            </div>

            {bead.isTekufah && (

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                <div className="w-2 h-full bg-cyan-400/80" /> {/* Tekufah straight line */}

              </div>

            )}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-4 border-pink-500 border-dashed pointer-events-none"

              />

            )}

          </motion.div>
          );
        })}

      </div>



      <div className="mt-12 text-amber-200 text-center">

        <p>Blue = First 4 days of new cycle</p>

        <p>Day 4 = Tekufah • The straight shadow falls</p>

        <p>Yellow = Sabbath • Day 7,14,21,28</p>

      </div>

    </div>

  );

};



const Month2Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Iyar = 30 days

  // Global day 31 → Day 1 of Iyar

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 30 + dayInMonth;           // Nisan = 30 days, so Iyar starts at global day 31

    // Month 2 Sabbaths: Days 2, 9, 16, 23, 30
    const isSabbath = [2, 9, 16, 23, 30].includes(dayInMonth);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-stone-900 via-purple-950 to-black rounded-3xl shadow-2xl border border-amber-800/30">

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
              className="relative"
            >

            {/* Main Bead */}

            <div

              className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 md:border-3 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 35% 35%, #fff, ${bead.color})`,

                boxShadow: bead.isToday

                  ? '0 0 80px #ec4899, inset 0 0 40px #fff'

                  : bead.isLagBaOmer

                  ? '0 0 60px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isFeast

                  ? '0 0 50px #22d3ee, 0 0 0 10px #000 inset'

                  : '0 12px 40px rgba(0,0,0,0.9), inset 0 6px 20px rgba(255,255,255,0.3)',

                transform: 'translateZ(40px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-amber-200 relative z-10">
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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((bead) => {
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
              className="relative"
            >

            {/* Main Bead */}

            <div

              className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 md:border-3 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 35% 35%, #fff, ${bead.color})`,

                boxShadow: bead.isToday

                  ? '0 0 80px #ec4899, inset 0 0 40px #fff'

                  : bead.isLagBaOmer

                  ? '0 0 60px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isFeast

                  ? '0 0 50px #22d3ee, 0 0 0 10px #000 inset'

                  : '0 12px 40px rgba(0,0,0,0.9), inset 0 6px 20px rgba(255,255,255,0.3)',

                transform: 'translateZ(40px)'

              }}

            >
              <span className="text-xs md:text-sm font-bold text-amber-200 relative z-10">
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



      {/* Legend */}

      <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-6 text-amber-100 text-xs md:text-sm text-center">

        <div>Yellow = Sabbath (6, 13, 20, 27)</div>

        <div>Turquoise = 14th • Pesach Sheni</div>

        <div>Amber = 18th • Lag BaOmer</div>

        <div>Black = Regular days</div>

      </div>



      <p className="mt-8 text-amber-300 italic text-sm">

        The second cord — month of healing, second chances, and hidden fire.

      </p>

    </div>

  );

};



const Month3Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Sivan = 31 days

  // Global day starts at 61 (30 Nisan + 30 Iyar + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 60 + dayInMonth;

    // Month 3 Sabbaths: Days 7, 14, 21, 28
    const isSabbath = [7, 14, 21, 28].includes(dayInMonth);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-purple-950 via-black to-indigo-950 rounded-3xl shadow-2xl border-2 border-amber-600/40">

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
              className="relative"
            >

            {/* Main Bead */}

            <div

              className="w-24 h-24 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isShavuot

                  ? '0 0 100px #ec4899, 0 0 160px #fff, inset 0 0 50px #fff'

                  : bead.isToday

                  ? '0 0 100px #ec4899, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.3)',

                transform: 'translateZ(60px)',

                border: bead.isShavuot ? '8px solid #fff' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-amber-200 drop-shadow-lg relative z-10">
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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((bead) => {
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
              className="relative"
            >

            {/* Main Bead */}

            <div

              className="w-24 h-24 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isShavuot

                  ? '0 0 100px #ec4899, 0 0 160px #fff, inset 0 0 50px #fff'

                  : bead.isToday

                  ? '0 0 100px #ec4899, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.3)',

                transform: 'translateZ(60px)',

                border: bead.isShavuot ? '8px solid #fff' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-amber-200 drop-shadow-lg relative z-10">
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



      {/* Sacred Legend */}

      <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-6 text-amber-100 text-xs md:text-sm font-medium text-center">

        <div>Yellow = Sabbath (5,12,19,26)</div>

        <div>Pink Fire = 6th • Shavuot • Torah Given</div>

        <div>Purple = 5th • Day of Preparation</div>

        <div>Soft Pink = 7th • Afterglow of Revelation</div>

      </div>



      <motion.p 

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ delay: 2 }}

        className="mt-6 text-xs md:text-sm text-amber-300 italic font-light tracking-wider"

      >

        "And the mountain burned with fire unto the heart of heaven…"

      </motion.p>

    </div>

  );

};



const Month4Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Tammuz = 30 days

  // Global day starts at 92 (30+30+31+1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 91 + dayInMonth;

    // Month 4 Sabbaths: Days 4, 11, 18, 25
    const isSabbath = [4, 11, 18, 25].includes(dayInMonth);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-slate-900 via-red-950 to-black rounded-3xl shadow-2xl border-2 border-red-900/60">

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

              className="w-24 h-24 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is17Tammuz

                  ? '0 0 120px #dc2626, 0 0 180px #450a0a, inset 0 0 60px #991b1b'

                  : bead.isGoldenCalf

                  ? '0 0 80px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isToday

                  ? '0 0 100px #dc2626, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.2)',

                transform: 'translateZ(60px)',

                border: bead.is17Tammuz ? '8px solid #991b1b' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-amber-200 drop-shadow-lg relative z-10">
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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((bead) => (

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

              className="w-24 h-24 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is17Tammuz

                  ? '0 0 120px #dc2626, 0 0 180px #450a0a, inset 0 0 60px #991b1b'

                  : bead.isGoldenCalf

                  ? '0 0 80px #f59e0b, 0 0 0 12px #000 inset'

                  : bead.isToday

                  ? '0 0 100px #dc2626, inset 0 0 40px #fff'

                  : '0 15px 50px rgba(0,0,0,0.9), inset 0 8px 25px rgba(255,255,255,0.2)',

                transform: 'translateZ(60px)',

                border: bead.is17Tammuz ? '8px solid #991b1b' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-amber-200 drop-shadow-lg relative z-10">
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



      {/* Legend */}

      <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-6 text-amber-100 text-xs md:text-sm font-medium text-center">

        <div>Yellow = Shabbat (3,10,17,24)</div>

        <div>Blood Red = 17th • Fast of Tammuz</div>

        <div>False Gold = 16th • Golden Calf sin</div>

        <div>Ash Grey = Three Weeks of mourning begin</div>

      </div>



      <motion.p 

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ delay: 2 }}

        className="mt-12 text-3xl text-red-400 italic font-light tracking-wider"

      >

        "And Moses saw the calf… and he broke the tablets…"

      </motion.p>

    </div>

  );

};



const Month5Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Av = 30 days

  // Global day starts at 122 (30+30+31+30+1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 121 + dayInMonth;

    // Month 5 Sabbaths: Days 2, 9, 16, 23, 30
    const isSabbath = [2, 9, 16, 23, 30].includes(dayInMonth);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-gray-900 via-red-950 to-black rounded-3xl shadow-2xl border-4 border-red-900/80">

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

              className="w-28 h-28 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #333, ${bead.color})`,

                boxShadow: bead.is9Av

                  ? '0 0 180px #450a0a, 0 0 300px #000, inset 0 0 80px #000'

                  : bead.isToday

                  ? '0 0 140px #dc2626, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.1)',

                transform: 'translateZ(80px)',

                border: bead.is9Av ? '12px solid #000' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-gray-400 drop-shadow-2xl relative z-10">
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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((bead) => (

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

              className="w-28 h-28 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #333, ${bead.color})`,

                boxShadow: bead.is9Av

                  ? '0 0 180px #450a0a, 0 0 300px #000, inset 0 0 80px #000'

                  : bead.isToday

                  ? '0 0 140px #dc2626, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.1)',

                transform: 'translateZ(80px)',

                border: bead.is9Av ? '12px solid #000' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-gray-400 drop-shadow-2xl relative z-10">
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



      {/* Legend */}

      <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-6 text-gray-300 text-xs md:text-sm font-medium text-center">

        <div>Yellow = Shabbat (1,8,15,22,29)</div>

        <div>Blackest Red = 9th • Both Temples Destroyed</div>

        <div>Dark Slate = First 8 days • Nine Days of mourning</div>

        <div>Ash Grey = After 9th • Mourning lingers</div>

      </div>



      <motion.p 

        initial={{ opacity: 0, y: 30 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 3 }}

        className="mt-8 text-xs md:text-sm text-red-500 italic font-light tracking-widest text-center max-w-2xl"

      >

        "By the rivers of Babylon, there we sat and wept…"

      </motion.p>

    </div>

  );

};



const Month6Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Elul = 31 days

  // Global day starts at 152 (30+30+31+30+30+1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 151 + dayInMonth;

    // Month 6 Sabbaths: Days 7, 14, 21, 28
    const isSabbath = [7, 14, 21, 28].includes(dayInMonth);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-indigo-950 via-black to-purple-950 rounded-3xl shadow-2xl border-2 border-cyan-700/60">

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

              className="w-28 h-28 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is29Elul

                  ? '0 0 180px #ec4899, 0 0 300px #fff, inset 0 0 80px #fff'

                  : bead.isToday

                  ? '0 0 140px #ec4899, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.9), inset 0 10px 30px rgba(255,255,255,0.3)',

                transform: 'translateZ(80px)',

                border: bead.is29Elul ? '12px solid #fff' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-cyan-300 drop-shadow-2xl relative z-10">
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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((bead) => (

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

              className="w-28 h-28 rounded-full border-8 border-black relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.is29Elul

                  ? '0 0 180px #ec4899, 0 0 300px #fff, inset 0 0 80px #fff'

                  : bead.isToday

                  ? '0 0 140px #ec4899, inset 0 0 60px #fff'

                  : '0 20px 60px rgba(0,0,0,0.9), inset 0 10px 30px rgba(255,255,255,0.3)',

                transform: 'translateZ(80px)',

                border: bead.is29Elul ? '12px solid #fff' : '8px solid #000'

              }}

            >
              <span className="text-sm md:text-base font-bold text-cyan-300 drop-shadow-2xl relative z-10">
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



      {/* Legend */}

      <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-6 text-cyan-200 text-xs md:text-sm font-medium text-center">

        <div>Yellow = Shabbat (6,13,20,27)</div>

        <div>Royal Pink = 29th • The King Returns</div>

        <div>Turquoise = Days 19–30 • Twelve Tribes Return</div>

        <div>Blue glow = Daily Shofar (weekdays)</div>

      </div>



      <motion.p 

        initial={{ opacity: 0, y: 40 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 3 }}

        className="mt-8 text-xs md:text-sm text-pink-400 italic font-light tracking-widest text-center"

      >

        "I am my Beloved's, and my Beloved is mine."

      </motion.p>



      <motion.div 

        animate={{ opacity: [0.4, 1, 0.4] }}

        transition={{ duration: 4, repeat: Infinity }}

        className="mt-4 text-xs md:text-sm text-cyan-300"

      >

        The shofar calls… the King is in the field.

      </motion.div>

    </div>

  );

};



const Month7Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Tishrei = 31 days

  // Global day starts at 183 (previous 6 months = 182 days)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const day = i + 1;

    const globalDay = 182 + day;

    // Month 7 Sabbaths: Days 4, 11, 18, 25
    const isSabbath = [4, 11, 18, 25].includes(day);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-black via-purple-950 to-amber-950 rounded-3xl shadow-2xl border-4 border-amber-600">

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

              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((b) => (

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

              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-3 md:border-4 border-black relative flex items-center justify-center"

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



      <div className="mt-12 text-center space-y-2 text-xs md:text-sm text-amber-200">

        <p>1–2 Red • Rosh Hashana – The King is crowned</p>

        <p>10 White • Yom Kippur – Sealed in the Book of Life</p>

        <p>15–21 Emerald • Sukkot – Joy of the clouds of glory</p>

        <p>22–23 Violet • Shemini Atzeret & Simchat Torah</p>

      </div>



      <motion.p className="mt-8 text-xs md:text-sm font-light text-amber-400 italic">

        "In the seventh month… you shall afflict your souls… and rejoice with the Torah."

      </motion.p>

    </div>

  );

};



const Month8Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Cheshvan = 30 days

  // Global day starts at 214 (182 + 31 previous months)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 213 + day;

    // Month 8 Sabbaths: Days 2, 9, 16, 23, 30
    const isSabbath = [2, 9, 16, 23, 30].includes(day);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-gray-900 via-slate-950 to-black rounded-3xl shadow-2xl border-2 border-gray-700">

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

              className="w-[18px] h-[18px] md:w-20 md:h-20 rounded-full border-6 md:border-8 border-gray-900 relative flex items-center justify-center"

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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((b) => (

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

              className="w-[18px] h-[18px] md:w-20 md:h-20 rounded-full border-6 md:border-8 border-gray-900 relative flex items-center justify-center"

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



      <div className="mt-28 text-center space-y-6 text-xl text-gray-400">

        <p>Yellow = Sabbath (2,9,16,23,30)</p>

        <p>Cyan = 7th • Prayers for rain begin in the Land</p>

        <p>Hidden Fire = 23rd • Future laying of Third Temple cornerstone</p>

      </div>



      <motion.p 

        initial={{ opacity: 0 }}

        animate={{ opacity: [0.4, 1, 0.4] }}

        transition={{ duration: 8, repeat: Infinity }}

        className="mt-8 text-xs md:text-sm text-orange-500 italic font-light tracking-widest"

      >

        "Mar-Cheshvan" … yet the seeds of redemption are planted here.

      </motion.p>

    </div>

  );

};



const Month9Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Kislev = 31 days

  // Global day starts at 244 (182 + 31 + 30 + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const day = i + 1;

    const globalDay = 243 + day;

    // Month 9 Sabbaths: Days 7, 14, 21, 28
    const isSabbath = [7, 14, 21, 28].includes(day);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-indigo-950 via-black to-amber-950 rounded-3xl shadow-2xl border-4 border-amber-700/50">

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

              className="relative w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black overflow-hidden flex items-center justify-center"

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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((b) => (

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

              className="relative w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black overflow-hidden flex items-center justify-center"

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




    </div>

  );

};



const Month10Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Tevet = 30 days

  // Global day starts at 275 (182 + 31 + 30 + 31 + 1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 274 + day;

    // Month 10 Sabbaths: Days 4, 11, 18, 25
    const isSabbath = [4, 11, 18, 25].includes(day);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-slate-900 via-gray-950 to-black rounded-3xl shadow-2xl border-3 border-gray-800">

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

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black overflow-hidden relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.is10Tevet ? '0 0 180px #1e293b, 0 0 300px #000, inset 0 0 80px #111' :


                  b.isToday ? '0 0 200px #fff' :

                  '0 30px 100px rgba(0,0,0,0.95), inset 0 15px 50px rgba(255,255,255,0.15)',

                transform: 'translateZ(110px)'

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
      <div className="flex flex-col" style={{ gap: '1mm' }}>

        {pastBeads.map((b) => (

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

              className="w-11 h-11 md:w-13 md:h-13 rounded-full border-3 md:border-4 border-black overflow-hidden relative flex items-center justify-center"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.is10Tevet ? '0 0 180px #1e293b, 0 0 300px #000, inset 0 0 80px #111' :


                  b.isToday ? '0 0 200px #fff' :

                  '0 30px 100px rgba(0,0,0,0.95), inset 0 15px 50px rgba(255,255,255,0.15)',

                transform: 'translateZ(110px)'

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



      <div className="mt-32 text-center space-y-6 text-xl text-gray-400">

        <p>Yellow = Sabbath (7,14,21,28)</p>


        <p>Iron Grey = 10 Tevet • Siege of Jerusalem began</p>

      </div>



      <motion.p 

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ delay: 2 }}

        className="mt-8 text-xs md:text-sm text-gray-300 italic font-light tracking-widest"

      >

        Even as the walls closed in, the light refused to die.

      </motion.p>

    </div>

  );

};



const Month11Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Shevat = 30 days

  // Global day starts at 305 (274 + 30 + 1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 304 + day;

    // Month 11 Sabbaths: Days 2, 9, 16, 23, 30
    const isSabbath = [2, 9, 16, 23, 30].includes(day);

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

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-pink-950 via-black to-teal-950 rounded-3xl shadow-2xl border-4 border-pink-800/40">

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
                className="relative w-6 h-6 md:w-8 md:h-8 rounded-full border-2 md:border-3 border-black overflow-hidden flex items-center justify-center"
                style={{
                  background: b.isTuBShevat 
                    ? `radial-gradient(circle at 50% 30%, #fff, #fdb5cd)` 
                    : `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isTuBShevat ? '0 0 200px #fff, 0 0 400px #fdb5cd, inset 0 0 100px #fff' :
                    b.isToday ? '0 0 220px #ec4899' :
                    '0 35px 120px rgba(0,0,0,0.9), inset 0 18px 60px rgba(255,255,255,0.3)',
                  transform: 'translateZ(140px)'
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
                className="relative w-6 h-6 md:w-8 md:h-8 rounded-full border-2 md:border-3 border-black overflow-hidden flex items-center justify-center"
                style={{
                  background: b.isTuBShevat 
                    ? `radial-gradient(circle at 50% 30%, #fff, #fdb5cd)` 
                    : `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isTuBShevat ? '0 0 200px #fff, 0 0 400px #fdb5cd, inset 0 0 100px #fff' :
                    b.isToday ? '0 0 220px #ec4899' :
                    '0 35px 120px rgba(0,0,0,0.9), inset 0 18px 60px rgba(255,255,255,0.3)',
                  transform: 'translateZ(140px)'
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

      <motion.div className="mt-36 text-center space-y-8">

        <p className="text-5xl text-pink-300 font-light">15 Shevat • Tu B'Shevat</p>

        <p className="text-7xl font-bold bg-gradient-to-r from-pink-400 to-white bg-clip-text text-transparent">

          The almond tree awakens

        </p>

        <p className="text-3xl italic text-pink-200 mt-12 max-w-2xl">

          "For behold, the winter is past… the blossoms appear on the earth."

        </p>

      </motion.div>

    </div>

  );

};



const Month12Strand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Adar = 31 days (in your 364-day system)

  // Global day starts at 335 (304 + 30 + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

                  const day = i + 1;

    const globalDay = 334 + day;

    // Month 12 Sabbaths: Days 7, 14, 21, 28
    const isSabbath = [7, 14, 21, 28].includes(day);

    const isPurim       = day === 14;                    // 14 Adar – Purim

    const isShushanPurim= day === 15;                    // 15 Adar – Shushan Purim

    const isAdarJoy     = day >= 13;                     // Joy increases from 13th onward



    let color = '#1f2937';                               // Night before the dawn

    if (isSabbath)          color = '#fbbf24';           // Golden Sabbath

    if (isPurim)            color = '#ec4899';           // Royal pink – Esther's victory

    if (isShushanPurim)     color = '#a78bfa';           // Purple – the walled city's extra day

    if (isAdarJoy && !isPurim && !isShushanPurim && !isSabbath)

                            color = '#f0abfc';           // Light pink – the joy spreads



    return {

      day,

      globalDay,

      color,

      isToday: day === dayOfMonth,

      isSabbath,

      isPurim,

      isShushanPurim,

      isAdarJoy

    };

  }).reverse(); // Reverse so day 1 is at bottom, day 31 at top

  // Split beads into future (uncounted) and past (counted) days
  const futureBeads = beads.filter(bead => bead.day > dayOfMonth);
  const pastBeads = beads.filter(bead => bead.day <= dayOfMonth);



  return (

    <div className="flex flex-col items-center p-4 md:p-6 bg-gradient-to-b from-purple-950 via-pink-900 to-black rounded-3xl shadow-2xl border-4 border-pink-700">

      <motion.h2 

        initial={{ scale: 0, rotate: -720 }}

        animate={{ scale: 1, rotate: 0 }}

        transition={{ duration: 4, type: "spring", stiffness: 50 }}

        className="text-9xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent mb-16 tracking-widest drop-shadow-2xl"

      >

        <h2 className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent mb-2 md:mb-4 tracking-widest drop-shadow-2xl">MONTH 12</h2>

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

                b.isToday ? { scale: [1, 2.5, 1] } :

                b.isPurim ? { 

                  scale: [1, 1.3, 1],

                  rotate: [0, 360],

                  boxShadow: ["0 0 160px #ec4899", "0 0 300px #fff", "0 0 160px #ec4899"]

                } :

                b.isShushanPurim ? { boxShadow: ["0 0 200px #a78bfa", "0 0 400px #e879f9"] } :

                b.isAdarJoy ? { opacity: [0.8, 1, 0.8] } :

                {}

              }
              transition={{ duration: b.isPurim ? 3 : 4, repeat: Infinity }}
              className="relative flex items-center justify-center"
            >
              {/* Main Bead – explodes into joy on Purim */}
              <div
                className="relative w-6 h-6 md:w-8 md:h-8 rounded-full border-2 md:border-3 border-black overflow-hidden flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isPurim ? '0 0 300px #ec4899, 0 0 500px #fff, inset 0 0 120px #fff' :
                    b.isShushanPurim ? '0 0 280px #a78bfa, 0 0 450px #f0abfc' :
                    b.isToday ? '0 0 250px #ec4899' :
                    '0 40px 140px rgba(0,0,0,0.9), inset 0 20px 70px rgba(255,255,255,0.4)',
                  transform: 'translateZ(160px)'
                }}
              >
                {/* Purim celebration – confetti & groggers */}
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

                {/* Day number */}
                <span className="text-xs font-bold text-pink-300 drop-shadow-2xl relative z-10">
                  {b.day}
                </span>
              </div>
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

                b.isToday ? { scale: [1, 2.5, 1] } :

                b.isPurim ? { 

                  scale: [1, 1.3, 1],

                  rotate: [0, 360],

                  boxShadow: ["0 0 160px #ec4899", "0 0 300px #fff", "0 0 160px #ec4899"]

                } :

                b.isShushanPurim ? { boxShadow: ["0 0 200px #a78bfa", "0 0 400px #e879f9"] } :

                b.isAdarJoy ? { opacity: [0.8, 1, 0.8] } :

                {}

              }
              transition={{ duration: b.isPurim ? 3 : 4, repeat: Infinity }}
              className="relative flex items-center justify-center"
            >
              {/* Main Bead – explodes into joy on Purim */}
              <div
                className="relative w-6 h-6 md:w-8 md:h-8 rounded-full border-2 md:border-3 border-black overflow-hidden flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,
                  boxShadow: 
                    b.isPurim ? '0 0 300px #ec4899, 0 0 500px #fff, inset 0 0 120px #fff' :
                    b.isShushanPurim ? '0 0 280px #a78bfa, 0 0 450px #f0abfc' :
                    b.isToday ? '0 0 250px #ec4899' :
                    '0 40px 140px rgba(0,0,0,0.9), inset 0 20px 70px rgba(255,255,255,0.4)',
                  transform: 'translateZ(160px)'
                }}
              >
                {/* Purim celebration – confetti & groggers */}
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

                {/* Day number */}
                <span className="text-xs font-bold text-pink-300 drop-shadow-2xl relative z-10">
                  {b.day}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>



      <motion.div className="mt-40 text-center space-y-10">

        <p className="text-6xl text-pink-400 font-light">14 Adar • PURIM</p>

        <p className="text-8xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">

          Joy Increased

        </p>

        <p className="text-4xl italic text-pink-200 mt-16 max-w-3xl">

          "When Adar enters, we increase in joy."

        </p>

        <p className="text-5xl text-amber-300 mt-12">

          The final strand completes the circle.

        </p>

      </motion.div>

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



  const zodiacWheel = [

    { constellation: 'ARIES', tribe: 'Yehudah', banner: 'Lion', month: 'Nisan' },

    { constellation: 'TAURUS', tribe: 'Yissakar', banner: 'Donkey', month: 'Iyar' },

    { constellation: 'GEMINI', tribe: 'Zebulon', banner: 'Ship', month: 'Sivan' },

    { constellation: 'CANCER', tribe: 'Reuben', banner: 'Man', month: 'Tammuz' },

    { constellation: 'LEO', tribe: 'Simeon', banner: 'Sword', month: 'Av' },

    { constellation: 'VIRGO', tribe: 'Gad', banner: 'Fire', month: 'Elul' },

    { constellation: 'LIBRA', tribe: 'Ephraim', banner: 'Ox', month: 'Tishrei' },

    { constellation: 'SCORPIO', tribe: 'Manasseh', banner: 'Unicorn', month: 'Cheshvan' },

    { constellation: 'SAGITTARIUS', tribe: 'Benyamin', banner: 'Wolf', month: 'Kislev' },

    { constellation: 'CAPRICORN', tribe: 'Dan', banner: 'Eagle', month: 'Tevet' },

    { constellation: 'AQUARIUS', tribe: 'Asher', banner: 'Tree', month: 'Shevat' },

    { constellation: 'PISCES', tribe: 'Naphtali', banner: 'Deer', month: 'Adar' }

  ];



  const greatWheel = ['ORION', 'HYDRA', 'CENTAURUS', 'PEGASUS'];



  const size = 6000; // Much bigger wheel - 10cm diameter target

  const center = size / 2;



  const RadiantText = ({ text, radius, angle, size = 18, weight = 'bold', color = '#fbbf24' }: { text: string; radius: number; angle: number; size?: number; weight?: string; color?: string }) => {

    const rad = (angle - 90) * Math.PI / 180;

    const x = center + radius * Math.cos(rad);

    const y = center + radius * Math.sin(rad);

    const textRot = angle + (angle > 90 && angle < 270 ? 180 : 0);

    return (

      <text

        x={x} y={y}

        textAnchor="middle"

        dominantBaseline="middle"

        transform={`rotate(${textRot}, ${x}, ${y})`}

        className={`${weight} tracking-widest`}

        style={{

          fontSize: `${size}px`,

          fill: color,

          filter: 'drop-shadow(0 0 12px currentColor)',

          paintOrder: 'stroke fill',

          stroke: 'black',

          strokeWidth: 4,

        }}

      >

        {text}

      </text>

    );

  };

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



  const seasonRotation = ((enochianDate.dayOfYear - 1) / 91) * 90;

  const zodiacRotation = -((enochianDate.dayOfYear - 1) / 30.333) * 30;

  const greatRotation = -((enochianDate.dayOfYear - 1) / 91) * 90;

  const dayRotation = ((enochianDate.dayOfYear - 1) / 364) * 360;



  return (

    <div className="min-h-screen bg-black overflow-x-hidden relative" style={{ padding: '5cm' }}>

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




      {/* Header */}
      <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="relative z-10 pt-8 pb-4 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-amber-300 via-yellow-500 to-pink-600 bg-clip-text text-transparent px-4">
          THE CREATOR'S WHEEL
        </h1>
        <p className="text-xl md:text-2xl text-amber-200 mt-2 tracking-widest">Eternal • 364 • Aligned Forever</p>
      </motion.div>


      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8" style={{ padding: '5cm 5cm 5cm 5cm', minHeight: 'calc(100vh - 10cm)' }}>
        
        {/* Calendar Wheel - Left/Center Side - MUCH BIGGER - fills left side */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ duration: 2 }}
          className="flex items-center justify-center flex-1"
          style={{ 
            width: '100%',
            height: 'calc(100vh - 10cm)', 
            minWidth: '50cm',
            minHeight: '50cm',
            maxWidth: 'calc(100% - 350px)'
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">

          <defs>

            <filter id="abyssShadow" x="-200%" y="-200%" width="400%" height="400%">

              <feDropShadow dx="30" dy="30" stdDeviation="20" floodColor="#000" floodOpacity="0.95"/>

              <feDropShadow dx="60" dy="60" stdDeviation="50" floodColor="#000" floodOpacity="0.8"/>

              <feDropShadow dx="90" dy="90" stdDeviation="80" floodColor="#000" floodOpacity="0.6"/>

            </filter>

            <filter id="holyFire">

              <feGaussianBlur stdDeviation="15" result="blur"/>

              <feFlood floodColor="#fbbf24" floodOpacity="1"/>

              <feComposite in2="blur" operator="in"/>

              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>

            </filter>

            <radialGradient id="abyss"><stop offset="0%" stopColor="#1a0033"/><stop offset="100%" stopColor="#000"/></radialGradient>

            <linearGradient id="bronze"><stop offset="0%" stopColor="#fcd34d"/><stop offset="100%" stopColor="#92400e"/></linearGradient>

          </defs>



          {[400, 370, 340, 310, 280, 250, 220, 190, 160, 130].map((r, i) => (

            <g key={r} filter="url(#abyssShadow)">

              <circle cx={center} cy={center} r={r} fill="none" stroke="url(#bronze)" strokeWidth={i < 3 ? 14 : 8} opacity="0.9"/>

              <circle cx={center} cy={center} r={r - 10} fill="none" stroke="#1e293b" strokeWidth="4" opacity="0.7"/>

            </g>

          ))}



          {['SPRING', 'SUMMER', 'FALL', 'WINTER'].map((s, i) => (

            <g key={s} filter="url(#holyFire)" transform={`rotate(${seasonRotation}, ${center}, ${center})`}>

              <path d={`M ${center} ${center} L ${center + 430*Math.cos((i*90-90)*Math.PI/180)} ${center + 430*Math.sin((i*90-90)*Math.PI/180)} A 430 430 0 0 1 ${center + 430*Math.cos((i*90)*Math.PI/180)} ${center + 430*Math.sin((i*90)*Math.PI/180)} Z`}

                    fill={['#10b981','#f59e0b','#ef4444','#3b82f6'][i]} opacity="0.3"/>

              <RadiantText text={s} radius={470} angle={i*90 + 45} size={40} color="#fff"/>

            </g>

          ))}



          <g filter="url(#holyFire)" transform={`rotate(${zodiacRotation}, ${center}, ${center})`}>

            {zodiacWheel.map((z, i) => (

              <g key={i}>

                <RadiantText text={z.constellation} radius={320} angle={i*30} size={24} color="#fbbf24"/>

                <RadiantText text={z.tribe} radius={295} angle={i*30} size={18} color="#f59e0b"/>

                <RadiantText text={z.banner} radius={270} angle={i*30} size={32} color="#fff"/>

              </g>

            ))}

          </g>



          <g filter="url(#abyssShadow)" transform={`rotate(${greatRotation}, ${center}, ${center})`}>

            {greatWheel.map((g, i) => (

              <RadiantText key={g} text={g} radius={230} angle={i*90 + 45} size={36} color="#34d399"/>

            ))}

          </g>



          <motion.g animate={{ y: [0, -30, 0] }} transition={{ duration: 6, repeat: Infinity }}

                    transform={`rotate(${((enochianDate.dayOfYear - 1)/364)*360}, ${center}, ${center})`}>

            <circle cx={center} cy={center-380} r="50" fill="#ec4899" filter="url(#abyssShadow)"/>

            <circle cx={center} cy={center-380} r="38" fill="#000" stroke="#fbbf24" strokeWidth="10" filter="url(#holyFire)"/>

            <text x={center} y={center-370} textAnchor="middle" className="text-6xl font-black fill-white" filter="url(#holyFire)">

              {enochianDate.dayOfYear}

            </text>

          </motion.g>



          <g filter="url(#abyssShadow)">

            <circle cx={center} cy={center} r="140" fill="url(#abyss)"/>

            <circle cx={center} cy={center} r="120" fill="#000" stroke="#fbbf24" strokeWidth="20" filter="url(#holyFire)"/>

            <text x={center} y={center-30} textAnchor="middle" className="text-9xl font-black fill-amber-400" filter="url(#holyFire)">

              {enochianDate.dayOfMonth}

            </text>

            <text x={center} y={center+40} textAnchor="middle" className="text-4xl fill-pink-400 tracking-widest" filter="url(#holyFire)">

              {enochianDate.dayPart.toUpperCase()}

            </text>

          </g>




              </svg>
        </motion.div>



        {/* Month Strand - Only Current Month Visible Around Wheel */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            width: '100%', 
            height: '100%',
            paddingRight: '1cm'
          }}
        >
          {/* Only show current month around the wheel */}
          {enochianDate.month === 1 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 0px)', 
                top: 'calc(50% + 180px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month1Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 2 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 140px)', 
                top: 'calc(50% + 170px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month2Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 3 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 260px)', 
                top: 'calc(50% + 100px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month3Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 4 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 340px)', 
                top: 'calc(50% + 0px)',
                width: '320px',
                transform: 'translateX(-50%)',
                filter: 'drop-shadow(0 0 80px #00ff9d) drop-shadow(0 0 130px #00ff9d)',
                animation: 'pulse 3s infinite alternate'
              }}
            >
              <Month4Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 5 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 300px)', 
                top: 'calc(50% - 120px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month5Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 6 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 180px)', 
                top: 'calc(50% - 180px)',
                width: '300px',
                transform: 'translateX(-50%)',
                filter: 'drop-shadow(0 0 50px #ff9500)'
              }}
            >
              <Month6Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 7 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 20px)', 
                top: 'calc(50% - 160px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month7Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 8 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% - 120px)', 
                top: 'calc(50% - 100px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month8Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 9 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% - 200px)', 
                top: 'calc(50% + 0px)',
                width: '320px',
                transform: 'translateX(-50%)',
                filter: 'drop-shadow(0 0 80px #00ff9d) drop-shadow(0 0 130px #00ff9d)',
                animation: 'pulse 3s infinite alternate'
              }}
            >
              <Month9Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 10 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% - 140px)', 
                top: 'calc(50% + 120px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month10Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 11 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% - 20px)', 
                top: 'calc(50% + 170px)',
                width: '280px',
                transform: 'translateX(-50%)'
              }}
            >
              <Month11Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}

          {enochianDate.month === 12 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-auto"
              style={{ 
                left: 'calc(50% + 0px)', 
                top: 'calc(50% + 180px)',
                width: '350px',
                transform: 'translateX(-50%) scale(1.2)',
                filter: 'drop-shadow(0 0 50px #ff9500) drop-shadow(0 0 100px #ff9500)'
              }}
            >
              <Month12Strand dayOfMonth={enochianDate.dayOfMonth} />
            </motion.div>
          )}
        </div>
      </div>



      {/* Review Sections - Other Months (Temporary for Review) */}
      <div className="relative z-10 mt-32 space-y-32 px-4">
        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 10 - Review</h2>
          <div className="flex justify-center">
            <Month10Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 11 - Review</h2>
          <div className="flex justify-center">
            <Month11Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 12 - Review</h2>
          <div className="flex justify-center">
            <Month12Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 1 - Review</h2>
          <div className="flex justify-center">
            <Month1Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 2 - Review</h2>
          <div className="flex justify-center">
            <Month2Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 3 - Review</h2>
          <div className="flex justify-center">
            <Month3Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 4 - Review</h2>
          <div className="flex justify-center">
            <Month4Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 5 - Review</h2>
          <div className="flex justify-center">
            <Month5Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 6 - Review</h2>
          <div className="flex justify-center">
            <Month6Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 7 - Review</h2>
          <div className="flex justify-center">
            <Month7Strand dayOfMonth={0} />
          </div>
        </div>

        <div className="border-t-4 border-amber-600/30 pt-16">
          <h2 className="text-4xl font-bold text-amber-400 mb-8 text-center">Month 8 - Review</h2>
          <div className="flex justify-center">
            <Month8Strand dayOfMonth={0} />
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
        <p className="text-sm md:text-base text-yellow-400 mt-2">Day {enochianDate.dayOfYear} → Wheel at {dayRotation.toFixed(2)}°</p>
      </motion.div>



      {/* Decorative Icons */}
      <Sun className="absolute top-4 right-4 w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 text-amber-400 animate-pulse z-10" />
      <Moon className="absolute top-4 left-4 w-10 h-10 md:w-14 md:h-14 lg:w-20 lg:h-20 text-blue-300 animate-pulse z-10" />


    </div>

  );

};



export default EnochianTimepiece;
