import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';

import { Sun, Moon } from 'lucide-react';



const PART_MINUTES = 80;

const PARTS_PER_DAY = 18;

const MINUTES_PER_DAY = PART_MINUTES * PARTS_PER_DAY;

const DAYS_PER_YEAR = 364;



const NisanStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Nisan pattern exactly as in your photo:

  // 1–3 = Blue (New Moon cycle start)

  // 4   = Blue + Tekufah shadow (straight line)

  // 7,14,21,28 = Yellow Sabbath

  // Rest = Black

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const isSabbath = day % 7 === 0;

    const isFeast = day <= 4;                   // First 4 days = blue feast cycle

    const isTekufah = day === 4;                // Day 4 = special tekufah marker



    let color = '#1f2937';                      // Regular day (deep black)

    if (isSabbath) color = '#fbbf24';           // Golden Sabbath

    if (isFeast)   color = '#22d3ee';           // Turquoise feast



    return { day, color, isToday: day === dayOfMonth, isTekufah };

  });



  return (

    <div className="flex flex-col items-center p-12 bg-gradient-to-b from-stone-900 to-black rounded-3xl shadow-2xl">

      <h2 className="text-5xl font-black text-amber-400 mb-8 tracking-widest">NISAN • STRAND 1</h2>

      

      <div className="flex flex-col gap-3">

        {beads.map((bead) => (

          <motion.div

            key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 1.5, 1],

              boxShadow: ["0 0 20px #fff", "0 0 80px #ec4899", "0 0 20px #fff"]

            } : {}}

            transition={{ duration: 2, repeat: Infinity }}

            className="relative"

          >

            <div

              className="w-16 h-16 rounded-full border-8 border-black"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${bead.color})`,

                boxShadow: bead.isToday 

                  ? '0 0 60px #ec4899, inset 0 0 30px #fff'

                  : bead.isTekufah

                  ? '0 0 40px #06b6d4, 0 0 0 8px #000 inset'

                  : '0 10px 30px rgba(0,0,0,0.9), inset 0 5px 15px rgba(255,255,255,0.2)',

                transform: 'translateZ(30px)'

              }}

            />

            {bead.isTekufah && (

              <div className="absolute inset-0 flex items-center justify-center">

                <div className="w-2 h-full bg-cyan-400/80" /> {/* Tekufah straight line */}

              </div>

            )}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-4 border-pink-500 border-dashed"

              />

            )}

            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-amber-300">

              {bead.day}

            </span>

          </motion.div>

        ))}

      </div>



      <div className="mt-12 text-amber-200 text-center">

        <p>Blue = First 4 days of new cycle</p>

        <p>Day 4 = Tekufah • The straight shadow falls</p>

        <p>Yellow = Sabbath • Day 7,14,21,28</p>

      </div>

    </div>

  );

};



const IyarStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Iyar = 30 days

  // Global day 31 → Day 1 of Iyar

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 30 + dayInMonth;           // Nisan = 30 days, so Iyar starts at global day 31

    const dayOfWeek = (globalDay - 1) % 7;        // 0 = Day 1 of creation week



    const isSabbath = dayOfWeek === 6;           // Every 7th day: 6,13,20,27

    const isFeast = dayInMonth === 14;           // Pesach Sheni (14th of Iyar)

    const isLagBaOmer = dayInMonth === 18;       // Traditional Lag BaOmer (33rd day of Omer count)



    let color = '#1f2937';                       // Regular day — deep midnight black

    if (isSabbath) color = '#fbbf24';            // Golden Sabbath

    if (isFeast)   color = '#22d3ee';            // Turquoise — Pesach Sheni

    if (isLagBaOmer) color = '#f59e0b';          // Amber fire — Lag BaOmer



    return {

      day: dayInMonth,

      color,

      isToday: dayInMonth === dayOfMonth,

      isSabbath,

      isFeast,

      isLagBaOmer

    };

  });



  return (

    <div className="flex flex-col items-center p-12 bg-gradient-to-b from-stone-900 via-purple-950 to-black rounded-3xl shadow-2xl border border-amber-800/30">

      <motion.h2 

        initial={{ y: -50, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        className="text-6xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-10 tracking-widest"

      >

        IYAR • STRAND 2

      </motion.h2>



      <div className="flex flex-col gap-4">

        {beads.map((bead) => (

          <motion.div

            key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 1.6, 1],

              boxShadow: ["0 0 30px #fff", "0 0 100px #ec4899", "0 0 30px #fff"]

            } : {}}

            transition={{ duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-20 h-20 rounded-full border-8 border-black"

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

            />



            {/* Special Markers */}

            {bead.isLagBaOmer && (

              <div className="absolute inset-0 flex items-center justify-center">

                <div className="w-16 h-16 rounded-full border-4 border-orange-500 animate-pulse" />

              </div>

            )}



            {bead.isFeast && (

              <div className="absolute -top-3 left-1/2 -translate-x-1/2">

                <div className="text-cyan-300 text-xs font-bold">Pesach Sheni</div>

              </div>

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-70"

              />

            )}



            {/* Day Number */}

            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-amber-200 font-bold text-lg">

              {bead.day}

            </span>

          </motion.div>

        ))}

      </div>



      {/* Legend */}

      <div className="mt-16 grid grid-cols-2 gap-8 text-amber-100 text-center">

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



const SivanStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Sivan = 31 days

  // Global day starts at 61 (30 Nisan + 30 Iyar + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 60 + dayInMonth;

    const dayOfWeek = (globalDay - 1) % 7;



    const isSabbath = dayOfWeek === 6;                    // 5,12,19,26

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

      color,

      isToday: dayInMonth === dayOfMonth,

      isShavuot,

      isPreShavuot,

      isPostShavuot,

      isSabbath

    };

  });



  return (

    <div className="flex flex-col items-center p-16 bg-gradient-to-b from-purple-950 via-black to-indigo-950 rounded-3xl shadow-2xl border-2 border-amber-600/40">

      <motion.h2 

        initial={{ scale: 0.8, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 1.5, type: "spring", stiffness: 80 }}

        className="text-7xl font-black bg-gradient-to-r from-amber-300 via-pink-500 to-purple-400 bg-clip-text text-transparent mb-12 tracking-widest drop-shadow-2xl"

      >

        SIVAN • STRAND 3

      </motion.h2>



      <div className="flex flex-col gap-5">

        {beads.map((bead) => (

          <motion.div

            key={bead.day}

            animate={bead.isToday ? {

              scale: [1, 1.8, 1],

              boxShadow: ["0 0 40px #fff", "0 0 120px #ec4899", "0 0 40px #fff"]

            } : bead.isShavuot ? {

              boxShadow: ["0 0 60px #ec4899", "0 0 100px #fff", "0 0 60px #ec4899"]

            } : {}}

            transition={bead.isShavuot ? { duration: 3, repeat: Infinity } : { duration: 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-24 h-24 rounded-full border-8 border-black"

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

            />



            {/* Shavuot Crown — Torah descending */}

            {bead.isShavuot && (

              <motion.div

                animate={{ y: [0, -20, 0], rotate: [0, 360] }}

                transition={{ duration: 6, repeat: Infinity }}

                className="absolute -top-12 left-1/2 -translate-x-1/2"

              >

                <div className="text-6xl">Torah</div>

              </motion.div>

            )}



            {/* Pre-Shavuot glow */}

            {bead.isPreShavuot && (

              <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-80"

              />

            )}



            {/* Day Number */}

            <span className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-2xl font-bold text-amber-200 drop-shadow-lg">

              {bead.day}

            </span>

          </motion.div>

        ))}

      </div>



      {/* Sacred Legend */}

      <div className="mt-20 grid grid-cols-2 gap-10 text-amber-100 text-lg font-medium text-center">

        <div>Yellow = Sabbath (5,12,19,26)</div>

        <div>Pink Fire = 6th • Shavuot • Torah Given</div>

        <div>Purple = 5th • Day of Preparation</div>

        <div>Soft Pink = 7th • Afterglow of Revelation</div>

      </div>



      <motion.p 

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ delay: 2 }}

        className="mt-12 text-3xl text-amber-300 italic font-light tracking-wider"

      >

        "And the mountain burned with fire unto the heart of heaven…"

      </motion.p>

    </div>

  );

};



const TammuzStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Tammuz = 30 days

  // Global day starts at 92 (30+30+31+1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 91 + dayInMonth;

    const dayOfWeek = (globalDay - 1) % 7;



    const isSabbath      = dayOfWeek === 6;                     // 3,10,17,24

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

  });



  return (

    <div className="flex flex-col items-center p-16 bg-gradient-to-b from-slate-900 via-red-950 to-black rounded-3xl shadow-2xl border-2 border-red-900/60">

      <motion.h2 

        initial={{ scale: 0.8, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 2, type: "spring", stiffness: 60 }}

        className="text-7xl font-black bg-gradient-to-r from-amber-600 via-red-600 to-gray-800 bg-clip-text text-transparent mb-12 tracking-widest drop-shadow-2xl"

      >

        TAMMUZ • STRAND 4

      </motion.h2>



      <div className="flex flex-col gap-5">

        {beads.map((bead) => (

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

              className="w-24 h-24 rounded-full border-8 border-black"

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

            />



            {/* 17 Tammuz — Cracked tablet effect */}

            {bead.is17Tammuz && (

              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">

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

                className="absolute inset-0 rounded-full border-4 border-yellow-600 opacity-60"

              />

            )}



            {/* Mourning ash overlay after 17th */}

            {bead.isThreeWeeks && bead.day >= 17 && !bead.is17Tammuz && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-gray-800/40" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-red-600 border-dashed opacity-80"

              />

            )}



            <span className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-2xl font-bold text-amber-200 drop-shadow-lg">

              {bead.day}

            </span>

          </motion.div>

        ))}

      </div>



      {/* Legend */}

      <div className="mt-20 grid grid-cols-2 gap-10 text-amber-100 text-lg font-medium text-center">

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



const AvStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Av = 30 days

  // Global day starts at 122 (30+30+31+30+1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 121 + dayInMonth;

    const dayOfWeek = (globalDay - 1) % 7;



    const isSabbath      = dayOfWeek === 6;                     // 1,8,15,22,29

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

  });



  return (

    <div className="flex flex-col items-center p-16 bg-gradient-to-b from-gray-900 via-red-950 to-black rounded-3xl shadow-2xl border-4 border-red-900/80">

      <motion.h2 

        initial={{ scale: 0.7, opacity: 0 }}

        animate={{ scale: 1, opacity: 1 }}

        transition={{ duration: 2.5, type: "spring", stiffness: 70 }}

        className="text-8xl font-black bg-gradient-to-r from-gray-600 via-red-700 to-black bg-clip-text text-transparent mb-12 tracking-widest drop-shadow-2xl"

      >

        AV • STRAND 5

      </motion.h2>



      <div className="flex flex-col gap-6">

        {beads.map((bead) => (

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

              className="w-28 h-28 rounded-full border-8 border-black"

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

            />



            {/* 9th of Av — Temple flames and smoke */}

            {bead.is9Av && (

              <>

                <motion.div

                  animate={{ y: [-20, -60], opacity: [1, 0] }}

                  transition={{ duration: 4, repeat: Infinity }}

                  className="absolute inset-0 rounded-full bg-red-900/60 blur-xl"

                />

                <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-gray-800">

                  Temple

                </div>

              </>

            )}



            {/* Nine Days — increasing darkness */}

            {bead.isPre9Av && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black/60" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-red-600 border-dashed opacity-80"

              />

            )}



            <span className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-2xl font-bold text-gray-400 drop-shadow-2xl">

              {bead.day}

            </span>

          </motion.div>

        ))}

      </div>



      {/* Legend */}

      <div className="mt-24 grid grid-cols-2 gap-12 text-gray-300 text-lg font-medium text-center">

        <div>Yellow = Shabbat (1,8,15,22,29)</div>

        <div>Blackest Red = 9th • Both Temples Destroyed</div>

        <div>Dark Slate = First 8 days • Nine Days of mourning</div>

        <div>Ash Grey = After 9th • Mourning lingers</div>

      </div>



      <motion.p 

        initial={{ opacity: 0, y: 30 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 3 }}

        className="mt-16 text-4xl text-red-500 italic font-light tracking-widest text-center max-w-2xl"

      >

        "By the rivers of Babylon, there we sat and wept…"

      </motion.p>

    </div>

  );

};



const ElulStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Elul = 31 days

  // Global day starts at 152 (30+30+31+30+30+1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const dayInMonth = i + 1;

    const globalDay = 151 + dayInMonth;

    const dayOfWeek = (globalDay - 1) % 7;



    const isSabbath     = dayOfWeek === 6;                     // 6,13,20,27

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

  });



  return (

    <div className="flex flex-col items-center p-16 bg-gradient-to-b from-indigo-950 via-black to-purple-950 rounded-3xl shadow-2xl border-2 border-cyan-700/60">

      <motion.h2 

        initial={{ y: -80, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        transition={{ duration: 2, type: "spring", stiffness: 80 }}

        className="text-8xl font-black bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 bg-clip-text text-transparent mb-14 tracking-widest drop-shadow-2xl"

      >

        ELUL • STRAND 6

      </motion.h2>



      <div className="flex flex-col gap-6">

        {beads.map((bead) => (

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

              className="w-28 h-28 rounded-full border-8 border-black"

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

            />



            {/* 29 Elul — Royal entrance */}

            {bead.is29Elul && (

              <motion.div

                animate={{ scale: [1, 1.4, 1] }}

                transition={{ duration: 4, repeat: Infinity }}

                className="absolute -top-16 left-1/2 -translate-x-1/2 text-6xl"

              >

                Crown

              </motion.div>

            )}



            {/* Last 12 days — rising light */}

            {bead.isLast12Days && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />

            )}



            {/* Daily shofar glow (weekdays) */}

            {bead.isShofarDay && !bead.isLast12Days && !bead.isSabbath && (

              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-pulse" />

            )}



            {/* Today Ring */}

            {bead.isToday && (

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}

                className="absolute inset-0 rounded-full border-8 border-pink-500 border-dashed opacity-80"

              />

            )}



            <span className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-2xl font-bold text-cyan-300 drop-shadow-2xl">

              {bead.day}

            </span>

          </motion.div>

        ))}

      </div>



      {/* Legend */}

      <div className="mt-24 grid grid-cols-2 gap-12 text-cyan-200 text-lg font-medium text-center">

        <div>Yellow = Shabbat (6,13,20,27)</div>

        <div>Royal Pink = 29th • The King Returns</div>

        <div>Turquoise = Days 19–30 • Twelve Tribes Return</div>

        <div>Blue glow = Daily Shofar (weekdays)</div>

      </div>



      <motion.p 

        initial={{ opacity: 0, y: 40 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 3 }}

        className="mt-16 text-4xl text-pink-400 italic font-light tracking-widest text-center"

      >

        "I am my Beloved's, and my Beloved is mine."

      </motion.p>



      <motion.div 

        animate={{ opacity: [0.4, 1, 0.4] }}

        transition={{ duration: 4, repeat: Infinity }}

        className="mt-8 text-2xl text-cyan-300"

      >

        The shofar calls… the King is in the field.

      </motion.div>

    </div>

  );

};



const TishreiStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Tishrei = 31 days

  // Global day starts at 183 (previous 6 months = 182 days)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const day = i + 1;

    const globalDay = 182 + day;

    const dow = (globalDay - 1) % 7;



    const isSabbath     = dow === 6;                    // 4,11,18,25

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

  });



  return (

    <div className="flex flex-col items-center p-20 bg-gradient-to-b from-black via-purple-950 to-amber-950 rounded-3xl shadow-2xl border-4 border-amber-600">

      <motion.h2 

        initial={{ scale: 0, rotate: -180 }}

        animate={{ scale: 1, rotate: 0 }}

        transition={{ duration: 3, type: "spring", stiffness: 60 }}

        className="text-9xl font-black bg-gradient-to-r from-red-600 via-white to-amber-500 bg-clip-text text-transparent mb-16 tracking-widest drop-shadow-2xl"

      >

        TISHREI • STRAND 7

      </motion.h2>



      <div className="flex flex-col gap-7">

        {beads.map((b) => (

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

              className="w-32 h-32 rounded-full border-12 border-black"

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

            />



            {/* Rosh Hashana crown */}

            {b.isRoshHashana && (

              <motion.div animate={{ y: [0, -30, 0] }} transition={{ repeat: Infinity, duration: 4 }}

                className="absolute -top-20 left-1/2 -translate-x-1/2 text-8xl">Crown</motion.div>

            )}



            {/* Yom Kippur white fire */}

            {b.isYomKippur && (

              <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 5, repeat: Infinity }}

                className="absolute inset-0 rounded-full bg-white blur-3xl" />

            )}



            {/* Sukkot lulav spin */}

            {b.isSukkot && (

              <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}

                className="absolute -inset-8 bg-emerald-500/20 rounded-full" />

            )}



            {/* Day number */}

            <span className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-3xl font-bold text-amber-300 drop-shadow-2xl">

              {b.day}

            </span>

          </motion.div>

        ))}

      </div>



      <div className="mt-28 text-center space-y-4 text-2xl text-amber-200">

        <p>1–2 Red • Rosh Hashana – The King is crowned</p>

        <p>10 White • Yom Kippur – Sealed in the Book of Life</p>

        <p>15–21 Emerald • Sukkot – Joy of the clouds of glory</p>

        <p>22–23 Violet • Shemini Atzeret & Simchat Torah</p>

      </div>



      <motion.p className="mt-20 text-5xl font-light text-amber-400 italic">

        "In the seventh month… you shall afflict your souls… and rejoice with the Torah."

      </motion.p>

    </div>

  );

};



const CheshvanStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Cheshvan = 30 days

  // Global day starts at 214 (182 + 31 previous months)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 213 + day;

    const dow = (globalDay - 1) % 7;



    const isSabbath     = dow === 6;                     // 2,9,16,23,30

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

  });



  return (

    <div className="flex flex-col items-center p-20 bg-gradient-to-b from-gray-900 via-slate-950 to-black rounded-3xl shadow-2xl border-2 border-gray-700">

      <motion.h2 

        initial={{ opacity: 0, y: -100 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 2, type: "spring", stiffness: 70 }}

        className="text-8xl font-black text-gray-500 mb-16 tracking-widest"

        style={{ textShadow: '0 0 40px rgba(251,191,36,0.3)' }}

      >

        CHESHVAN • STRAND 8

      </motion.h2>



      <div className="flex flex-col gap-7">

        {beads.map((b) => (

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

              className="w-32 h-32 rounded-full border-12 border-gray-900"

              style={{

                background: `radial-gradient(circle at 30% 30%, #444, ${b.color})`,

                boxShadow: 

                  b.is23Cheshvan ? '0 0 180px #f59e0b, 0 0 300px #ff8c00, inset 0 0 80px #fff' :

                  b.is7Cheshvan   ? '0 0 80px #22d3ee, inset 0 0 40px #67e8f9' :

                  b.isToday       ? '0 0 160px #fff' :

                  '0 20px 70px rgba(0,0,0,0.95), inset 0 10px 30px rgba(255,255,255,0.15)',

                transform: 'translateZ(90px)'

              }}

            />



            {/* 23 Cheshvan – Temple cornerstone fire */}

            {b.is23Cheshvan && (

              <motion.div

                animate={{ scale: [1, 1.6, 1] }}

                transition={{ duration: 5, repeat: Infinity }}

                className="absolute inset-0 rounded-full border-8 border-orange-600 blur-sm"

              />

            )}



            {/* 7 Cheshvan – Rain drops */}

            {b.is7Cheshvan && (

              <>

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity }}

                  className="absolute top-0 left-1/2 w-1 h-12 bg-cyan-400/60 blur-sm" />

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}

                  className="absolute top-0 left-1/3 w-1 h-12 bg-cyan-400/60 blur-sm" />

                <motion.div animate={{ y: [-40, 40] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}

                  className="absolute top-0 right-1/3 w-1 h-12 bg-cyan-400/60 blur-sm" />

              </>

            )}



            {/* Day number */}

            <span className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-3xl font-bold text-gray-400">

              {b.day}

            </span>

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

        className="mt-20 text-4xl text-orange-500 italic font-light tracking-widest"

      >

        "Mar-Cheshvan" … yet the seeds of redemption are planted here.

      </motion.p>

    </div>

  );

};



const KislevStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Kislev = 31 days

  // Global day starts at 244 (182 + 31 + 30 + 1)

  const beads = Array.from({ length: 31 }, (_, i) => {

    const day = i + 1;

    const globalDay = 243 + day;

    const dow = (globalDay - 1) % 7;



    const isSabbath       = dow === 6;                     // 1,8,15,22,29

    const hanukkahDays    = day >= 25 ? day - 24 : 0;      // 25 Kislev = Night 1 → 1 Kislev next month = Night 8

    const isHanukkah      = hanukkahDays >= 1 && hanukkahDays <= 8;

    const is25Kislev      = day === 25;                    // First night – the miracle begins



    let color = '#1f2937';                                 // Deep winter night

    if (isSabbath)               color = '#fbbf24';       // Golden Sabbath

    if (is25Kislev)              color = '#ec4899';       // Pink fire – the first flame

    if (isHanukkah && !is25Kislev) {

      // Flame color progresses: pink → amber → gold → white

      const step = hanukkahDays - 1;

      const colors = ['#ec4899','#ff7b7b','#fbbf24','#ffd700','#ffffff','#a78bfa','#22d3ee','#ffffff'];

      color = colors[step] || '#ffffff';

    }



    return {

      day,

      color,

      isToday: day === dayOfMonth,

      isSabbath,

      isHanukkah,

      is25Kislev,

      candleCount: isHanukkah ? hanukkahDays : 0

    };

  });



  return (

    <div className="flex flex-col items-center p-20 bg-gradient-to-b from-indigo-950 via-black to-amber-950 rounded-3xl shadow-2xl border-4 border-amber-700/50">

      <motion.h2 

        initial={{ scale: 0, rotate: 360 }}

        animate={{ scale: 1, rotate: 0 }}

        transition={{ duration: 3, type: "spring", stiffness: 80 }}

        className="text-9xl font-black bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 bg-clip-text text-transparent mb-16 tracking-widest drop-shadow-2xl"

      >

        KISLEV • STRAND 9

      </motion.h2>



      <div className="flex flex-col gap-8">

        {beads.map((b) => (

          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.3, 1] } :

              b.is25Kislev ? { y: [0, -30, 0], boxShadow: ["0 0 100px #ec4899", "0 0 200px #fff", "0 0 100px #ec4899"] } :

              b.isHanukkah ? { boxShadow: [`0 0 ${60 + b.candleCount*20}px ${b.color}`, `0 0 ${100 + b.candleCount*30}px #fff`] } :

              {}

            }

            transition={{ duration: b.isHanukkah ? 4 : 2, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead → becomes a living flame */}

            <div

              className="relative w-36 h-36 rounded-full border-12 border-black overflow-hidden"

              style={{

                background: `radial-gradient(circle at 40% 20%, #fff, ${b.color})`,

                boxShadow: 

                  b.isHanukkah ? `0 0 ${120 + b.candleCount*40}px ${b.color}, 0 -40px 120px ${b.color}80, inset 0 20px 40px #fff` :

                  b.isToday ? '0 0 200px #ec4899' :

                  '0 30px 100px rgba(0,0,0,0.9), inset 0 15px 50px rgba(255,255,255,0.3)',

                transform: 'translateZ(120px)'

              }}

            >

              {/* Actual flame inside the bead on Hanukkah nights */}

              {b.isHanukkah && (

                <div className="absolute inset-0 flex items-end justify-center pb-8">

                  {Array.from({ length: b.candleCount }, (_, i) => (

                    <motion.div

                      key={i}

                      initial={{ opacity: 0, y: 60 }}

                      animate={{ opacity: [0.6, 1, 0.6], y: 0 }}

                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}

                      className="w-4 mx-1"

                    >

                      <div className="w-4 h-20 bg-gradient-to-t from-yellow-300 via-orange-400 to-pink-500 rounded-full blur-sm" />

                      <div className="w-2 h-8 -mt-8 mx-auto bg-yellow-200 rounded-full blur-md" />

                    </motion.div>

                  ))}

                </div>

              )}

            </div>



            {/* First night miracle spark */}

            {b.is25Kislev && (

              <motion.div

                animate={{ rotate: 360, scale: [1, 2, 1] }}

                transition={{ duration: 8, repeat: Infinity }}

                className="absolute -top-20 left-1/2 -translate-x-1/2 text-8xl text-pink-400"

              >

                ✦

              </motion.div>

            )}



            {/* Day number glowing under the flames */}

            <span className="absolute -bottom-18 left-1/2 -translate-x-1/2 text-3xl font-bold text-amber-300 drop-shadow-2xl">

              {b.day}

            </span>



            {/* Candle count label during Hanukkah */}

            {b.isHanukkah && b.day >= 25 && (

              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-lg font-bold text-white bg-black/50 px-3 py-1 rounded-full">

                Night {b.candleCount}

              </span>

            )}

          </motion.div>

        ))}

      </div>



      <motion.div className="mt-32 text-center space-y-6">

        <p className="text-4xl text-amber-300">25 Kislev → 2 Tevet</p>

        <p className="text-6xl font-bold bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">

          Eight nights of ever-increasing light

        </p>

        <p className="text-3xl italic text-amber-200 mt-10">

          "A little oil that burned for eight days… and still burns."

        </p>

      </motion.div>

    </div>

  );

};



const TevetStrand = ({ dayOfMonth }: { dayOfMonth: number }) => {

  // Tevet = 30 days

  // Global day starts at 275 (182 + 31 + 30 + 31 + 1)

  const beads = Array.from({ length: 30 }, (_, i) => {

    const day = i + 1;

    const globalDay = 274 + day;

    const dow = (globalDay - 1) % 7;



    const isSabbath       = dow === 6;                     // 7,14,21,28

    const is10Tevet       = day === 10;                    // Fast – siege of Jerusalem began

    const isHanukkahFinal = day <= 2;                      // 1–2 Tevet = final two nights of Hanukkah

    const isEndOfHanukkah = day === 2;                     // 8th night



    let color = '#1f2937';                                 // Cold winter night

    if (isSabbath)               color = '#fbbf24';       // Golden Sabbath

    if (is10Tevet)               color = '#374151';       // Iron-grey siege

    if (isHanukkahFinal)         color = '#ffffff';       // Pure white – final miracle lights

    if (isEndOfHanukkah)         color = '#a78bfa';       // Violet-white – climax of light



    return {

      day,

      color,

      isToday: day === dayOfMonth,

      isSabbath,

      is10Tevet,

      isHanukkahFinal,

      isEndOfHanukkah,

      hanukkahNight: isHanukkahFinal ? 7 + day : 0

    };

  });



  return (

    <div className="flex flex-col items-center p-20 bg-gradient-to-b from-slate-900 via-gray-950 to-black rounded-3xl shadow-2xl border-3 border-gray-800">

      <motion.h2 

        initial={{ opacity: 0, y: -80 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 2.5, type: "spring", stiffness: 70 }}

        className="text-8xl font-black text-gray-400 mb-16 tracking-widest"

        style={{ textShadow: '0 0 60px rgba(255,255,255,0.2)' }}

      >

        TEVET • STRAND 10

      </motion.h2>



      <div className="flex flex-col gap-8">

        {beads.map((b) => (

          <motion.div

            key={b.day}

            animate={

              b.isToday ? { scale: [1, 2.2, 1] } :

              b.is10Tevet ? { rotate: [0, 3, -3, 0], boxShadow: ["0 0 120px #1e293b", "0 0 200px #000"] } :

              b.isEndOfHanukkah ? { boxShadow: ["0 0 160px #fff", "0 0 300px #a78bfa"] } :

              {}

            }

            transition={{ duration: b.is10Tevet ? 6 : 3, repeat: Infinity }}

            className="relative"

          >

            {/* Main Bead */}

            <div

              className="w-36 h-36 rounded-full border-12 border-black overflow-hidden"

              style={{

                background: `radial-gradient(circle at 30% 30%, #fff, ${b.color})`,

                boxShadow: 

                  b.is10Tevet ? '0 0 180px #1e293b, 0 0 300px #000, inset 0 0 80px #111' :

                  b.isHanukkahFinal ? `0 0 ${140 + b.hanukkahNight*40}px #fff, 0 -60px 160px #a78bfa` :

                  b.isToday ? '0 0 200px #fff' :

                  '0 30px 100px rgba(0,0,0,0.95), inset 0 15px 50px rgba(255,255,255,0.15)',

                transform: 'translateZ(110px)'

              }}

            >

              {/* Final Hanukkah flames still burning on days 1–2 */}

              {b.isHanukkahFinal && (

                <div className="absolute inset-0 flex items-end justify-center pb-10">

                  {Array.from({ length: b.hanukkahNight }, (_, i) => (

                    <motion.div

                      key={i}

                      animate={{ opacity: [0.7, 1, 0.7] }}

                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}

                      className="w-5 mx-1"

                    >

                      <div className="w-5 h-24 bg-gradient-to-t from-amber-200 via-white to-purple-300 rounded-full blur-sm" />

                    </motion.div>

                  ))}

                </div>

              )}

            </div>



            {/* 10 Tevet – siege walls */}

            {b.is10Tevet && (

              <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-gray-800 rotate-12">

                Walls

              </div>

            )}



            {/* Day number */}

            <span className="absolute -bottom-18 left-1/2 -translate-x-1/2 text-3xl font-bold text-gray-400 drop-shadow-2xl">

              {b.day}

            </span>



            {/* Hanukkah night label */}

            {b.isHanukkahFinal && (

              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-lg font-bold text-white bg-black/60 px-4 py-1 rounded-full">

                Night {b.hanukkahNight}

              </span>

            )}

          </motion.div>

        ))}

      </div>



      <div className="mt-32 text-center space-y-6 text-xl text-gray-400">

        <p>Yellow = Sabbath (7,14,21,28)</p>

        <p>White flames = 1–2 Tevet • Final nights of Hanukkah</p>

        <p>Iron Grey = 10 Tevet • Siege of Jerusalem began</p>

      </div>



      <motion.p 

        initial={{ opacity: 0 }}

        animate={{ opacity: 1 }}

        transition={{ delay: 2 }}

        className="mt-20 text-4xl text-gray-300 italic font-light tracking-widest"

      >

        Even as the walls closed in, the light refused to die.

      </motion.p>

    </div>

  );

};



const EnochianTimepiece = () => {

  const [currentDate, setCurrentDate] = useState(new Date());

  const [enochianDate, setEnochianDate] = useState({

    dayOfYear: 255, month: 9, dayOfMonth: 13, weekOfYear: 37,

    dayOfWeek: 6, dayPart: 'Laylah', eighteenPart: 12, daysInCurrentMonth: 31,

    timelessDay: 0, season: 'Fall'

  });

  const [sunData, setSunData] = useState<any>(null);



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



  const size = 1000;

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



  const getSpringEquinox = (y: number) => new Date(y, 2, 20);

  const convertToEnochian = (d: Date) => {

    const y = d.getFullYear();

    const equinox = getSpringEquinox(y);

    let days = Math.floor((d.getTime() - equinox.getTime()) / 86400000);

    if (days < 0) days += 364;

    if (days >= 364) days = 363;

    let rem = days;

    for (const m of monthStructure) {

      if (rem < m.days) return { ...enochianDate, month: m.num, dayOfMonth: rem + 1, dayOfYear: days + 1, season: m.season };

      rem -= m.days;

    }

    return enochianDate;

  };



  useEffect(() => {

    const timer = setInterval(() => setCurrentDate(new Date()), 1000);

    return () => clearInterval(timer);

  }, []);



  useEffect(() => {

    setEnochianDate(convertToEnochian(currentDate));

  }, [currentDate]);



  useEffect(() => {

    navigator.geolocation.getCurrentPosition(

      async (pos) => {

        const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&formatted=0`);

        const data = await res.json();

        const sr = new Date(data.results.sunrise);

        setSunData({ sunrise: sr });

      },

      () => setSunData({ sunrise: new Date() })

    );

  }, []);



  const seasonRotation = ((enochianDate.dayOfYear - 1) / 91) * 90;

  const zodiacRotation = -((enochianDate.dayOfYear - 1) / 30.333) * 30;

  const greatRotation = -((enochianDate.dayOfYear - 1) / 91) * 90;

  const dayRotation = ((enochianDate.dayOfYear - 1) / 364) * 360;



  return (

    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">

      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950" />

      <div className="absolute inset-0">

        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-purple-900/20 to-transparent" />

      </div>



      <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10">

        <h1 className="text-6xl md:text-9xl font-black bg-gradient-to-r from-amber-300 via-yellow-500 to-pink-600 bg-clip-text text-transparent">

          THE CREATOR'S WHEEL

        </h1>

        <p className="text-3xl text-amber-200 mt-4 tracking-widest">Eternal • 364 • Aligned Forever</p>

      </motion.div>



      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 2 }}>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

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



          <motion.g initial={{ scale: 0 }} animate={{ scale: 1.3 }} transition={{ duration: 3, type: "spring" }}>

            <path d="M 500 20 L 550 160 L 450 160 Z" fill="#ec4899" stroke="#fff" strokeWidth="8" filter="url(#holyFire)"/>

            <text x="500" y="10" textAnchor="middle" className="text-9xl font-black fill-pink-500" filter="url(#holyFire)">

              255

            </text>

          </motion.g>

        </svg>

      </motion.div>



      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">

        <p className="text-4xl font-bold text-amber-300 tracking-widest">

          Year 6028 • Month {enochianDate.month} • Day {enochianDate.dayOfMonth} • Part {enochianDate.eighteenPart}/18

        </p>

        <p className="text-2xl text-amber-200 mt-4">The Creator's wheels never lie • Forever in sync</p>

        <p className="text-yellow-400 mt-4">Day {enochianDate.dayOfYear} → Wheel at {dayRotation.toFixed(2)}°</p>

      </motion.div>



      <Sun className="absolute top-10 right-10 w-24 h-24 text-amber-400 animate-pulse" />

      <Moon className="absolute top-10 left-10 w-20 h-20 text-blue-300 animate-pulse" />

      {/* Nisan Strand - Show when month is Nisan (month 1) */}
      {enochianDate.month === 1 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <NisanStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Iyar Strand - Show when month is Iyar (month 2) */}
      {enochianDate.month === 2 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <IyarStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Sivan Strand - Show when month is Sivan (month 3) */}
      {enochianDate.month === 3 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <SivanStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Tammuz Strand - Show when month is Tammuz (month 4) */}
      {enochianDate.month === 4 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <TammuzStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Av Strand - Show when month is Av (month 5) */}
      {enochianDate.month === 5 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <AvStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Elul Strand - Show when month is Elul (month 6) */}
      {enochianDate.month === 6 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <ElulStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Tishrei Strand - Show when month is Tishrei (month 7) */}
      {enochianDate.month === 7 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <TishreiStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Cheshvan Strand - Show when month is Cheshvan (month 8) */}
      {enochianDate.month === 8 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <CheshvanStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Kislev Strand - Show when month is Kislev (month 9) */}
      {enochianDate.month === 9 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <KislevStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

      {/* Tevet Strand - Show when month is Tevet (month 10) */}
      {enochianDate.month === 10 && (
        <motion.div 
          initial={{ x: -200, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute left-10 top-1/2 -translate-y-1/2 z-20"
        >
          <TevetStrand dayOfMonth={enochianDate.dayOfMonth} />
        </motion.div>
      )}

    </div>

  );

};



export default EnochianTimepiece;
