import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationVerification } from '@/components/calendar/LocationVerification';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sun, Leaf, Snowflake, Flower, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
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
} from '@/components/watch/EnochianWheelCalendar';

// Season data with hemisphere info
const BASE_SEASONS = [
  {
    id: 1,
    months: [1, 2, 3],
    northern: 'Spring',
    southern: 'Fall',
    northIcon: Flower,
    southIcon: Leaf,
    gradient: 'from-emerald-900/60 via-green-800/40 to-teal-900/60',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-300',
    bgAccent: 'bg-emerald-500/10'
  },
  {
    id: 2,
    months: [4, 5, 6],
    northern: 'Summer',
    southern: 'Winter',
    northIcon: Sun,
    southIcon: Snowflake,
    gradient: 'from-amber-900/60 via-orange-800/40 to-yellow-900/60',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-300',
    bgAccent: 'bg-amber-500/10'
  },
  {
    id: 3,
    months: [7, 8, 9],
    northern: 'Fall',
    southern: 'Spring',
    northIcon: Leaf,
    southIcon: Flower,
    gradient: 'from-orange-900/60 via-red-800/40 to-amber-900/60',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-300',
    bgAccent: 'bg-orange-500/10'
  },
  {
    id: 4,
    months: [10, 11, 12],
    northern: 'Winter',
    southern: 'Summer',
    northIcon: Snowflake,
    southIcon: Sun,
    gradient: 'from-blue-900/60 via-indigo-800/40 to-cyan-900/60',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-300',
    bgAccent: 'bg-blue-500/10'
  }
];

const MonthComponents = {
  1: Month1Strand,
  2: Month2Strand,
  3: Month3Strand,
  4: Month4Strand,
  5: Month5Strand,
  6: Month6Strand,
  7: Month7Strand,
  8: Month8Strand,
  9: Month9Strand,
  10: Month10Strand,
  11: Month11Strand,
  12: Month12Strand
};

// Part of day names
const PART_NAMES = [
  'Boker 1', 'Boker 2', 'Boker 3', 
  'Tzohorayim 1', 'Tzohorayim 2', 'Tzohorayim 3',
  'Tzohorayim 4', 'Tzohorayim 5', 'Tzohorayim 6',
  'Erev 1', 'Erev 2', 'Erev 3',
  'Laylah 1', 'Laylah 2', 'Laylah 3',
  'Laylah 4', 'Laylah 5', 'Laylah 6'
];

function getSeasonForMonth(monthNum) {
  return BASE_SEASONS.find(s => s.months.includes(monthNum)) || BASE_SEASONS[0];
}

export default function EnochianCalendarDesignPage() {
  const { location, loading: locationLoading } = useUserLocation();
  const [enochianDate, setEnochianDate] = useState({
    year: 6028, month: 1, dayOfMonth: 1, part: 1, dayOfYear: 1
  });
  const [activeMonth, setActiveMonth] = useState(1);
  const [direction, setDirection] = useState(0); // -1 left, 1 right
  const touchStartX = useRef(0);

  // Update calendar based on location
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const creatorDate = calculateCreatorDate(now);
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      
      const newDate = {
        year: creatorDate.year,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        part: creatorTime.part,
        dayOfYear: creatorDate.dayOfYear
      };
      setEnochianDate(newDate);
    };
    
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Set activeMonth to current month on first load
  useEffect(() => {
    if (enochianDate.month >= 1 && enochianDate.month <= 12) {
      setActiveMonth(enochianDate.month);
    }
  }, [enochianDate.month]);

  const goToMonth = useCallback((month) => {
    if (month < 1 || month > 12) return;
    setDirection(month > activeMonth ? 1 : -1);
    setActiveMonth(month);
  }, [activeMonth]);

  const goPrev = useCallback(() => {
    if (activeMonth > 1) {
      setDirection(-1);
      setActiveMonth(prev => prev - 1);
    }
  }, [activeMonth]);

  const goNext = useCallback(() => {
    if (activeMonth < 12) {
      setDirection(1);
      setActiveMonth(prev => prev + 1);
    }
  }, [activeMonth]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const isNorthernHemisphere = location.lat >= 0;
  const currentSeason = getSeasonForMonth(activeMonth);
  const NorthIcon = currentSeason.northIcon;
  const SouthIcon = currentSeason.southIcon;
  const MonthComponent = MonthComponents[activeMonth];
  const isCurrentMonth = activeMonth === enochianDate.month;

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0a15] via-[#1a1a2e] to-[#0a0a15] overflow-x-hidden">
      {/* Animated Background Stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="container mx-auto pt-6 pb-4 relative z-10">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center gap-3 mb-4"
        >
          <h1 className="text-4xl md:text-5xl font-black text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl">
            Ed's Beads
          </h1>
          <p className="text-sm md:text-base text-amber-200/80 tracking-widest">
            364 Days • Eternal Alignment • Sunrise to Sunrise
          </p>
          
          {/* Current Time Info */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            <div className="bg-black/40 px-3 py-1.5 rounded-full border border-amber-500/30">
              <span className="text-amber-300 font-bold text-sm">
                Year {enochianDate.year} • Month {enochianDate.month} • Day {enochianDate.dayOfMonth}
              </span>
            </div>
            <div className="bg-black/40 px-3 py-1.5 rounded-full border border-cyan-500/30">
              <span className="text-cyan-300 font-bold text-sm">
                Part {enochianDate.part}/18 • {PART_NAMES[enochianDate.part - 1] || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Location Status */}
          <div className="flex items-center gap-2 text-xs">
            <MapPin className={`w-3 h-3 ${location.verified ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className={location.verified ? 'text-green-300' : 'text-yellow-300'}>
              {location.verified ? 'Verified' : 'Not verified'} 
              ({location.lat.toFixed(1)}°, {location.lon.toFixed(1)}°)
              {isNorthernHemisphere ? ' • N' : ' • S'}
            </span>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="h-6 px-2 gap-1 text-amber-300/60 hover:text-amber-300"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
        <LocationVerification />
      </div>

      {/* Season Header */}
      <div className="container mx-auto px-4 mb-3 relative z-10">
        <div className={`bg-gradient-to-r ${currentSeason.gradient} p-3 rounded-2xl border ${currentSeason.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NorthIcon className={`w-5 h-5 ${currentSeason.textColor}`} />
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Northern</p>
                <p className={`text-sm font-bold ${currentSeason.textColor} ${
                  isNorthernHemisphere ? 'underline decoration-2' : ''
                }`}>{currentSeason.northern}</p>
              </div>
            </div>

            <div className="text-center">
              <p className={`text-lg font-black ${currentSeason.textColor}`}>
                Month {activeMonth}
              </p>
              {isCurrentMonth && (
                <span className="text-[10px] text-pink-300 font-medium">● NOW</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Southern</p>
                <p className={`text-sm font-bold ${currentSeason.textColor} ${
                  !isNorthernHemisphere ? 'underline decoration-2' : ''
                }`}>{currentSeason.southern}</p>
              </div>
              <SouthIcon className={`w-5 h-5 ${currentSeason.textColor}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Single Month Carousel */}
      <div className="container mx-auto px-4 pb-4 relative z-10">
        <div
          className="relative flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left Arrow */}
          <button
            onClick={goPrev}
            disabled={activeMonth <= 1}
            className={`absolute left-0 z-20 p-2 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm transition-all ${
              activeMonth <= 1 ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:scale-110'
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          {/* Bead Strand */}
          <div className="w-full max-w-md mx-auto overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeMonth}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex justify-center"
              >
                <MonthComponent
                  dayOfMonth={isCurrentMonth ? enochianDate.dayOfMonth : 0}
                  year={enochianDate.year}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Arrow */}
          <button
            onClick={goNext}
            disabled={activeMonth >= 12}
            className={`absolute right-0 z-20 p-2 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm transition-all ${
              activeMonth >= 12 ? 'opacity-20 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:scale-110'
            }`}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Month Dot Indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: 12 }, (_, i) => {
            const monthNum = i + 1;
            const isActive = monthNum === activeMonth;
            const isCurrent = monthNum === enochianDate.month;
            return (
              <button
                key={monthNum}
                onClick={() => goToMonth(monthNum)}
                className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? 'w-8 h-8 bg-amber-400 text-black font-black text-xs'
                    : 'w-7 h-7 bg-white/10 hover:bg-white/25 text-white/50 hover:text-white/80 text-[10px] font-semibold'
                } ${isCurrent && !isActive ? 'ring-2 ring-pink-400' : ''}`}
                title={`Month ${monthNum}`}
              >
                {monthNum}
                {isCurrent && !isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] text-pink-300">●</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-center text-white/30 text-[10px] mt-1">Swipe or tap to navigate months</p>
      </div>

      {/* Days Out of Time Section */}
      <div className="container mx-auto px-4 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-8 rounded-3xl bg-gradient-to-b from-purple-900/40 via-black to-purple-900/40 border-2 border-purple-500/30 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-black text-purple-300 mb-4">
            Days Outside Time
          </h2>
          <p className="text-purple-200/70 mb-8 text-lg">
            The sacred days that exist between years
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <motion.div whileHover={{ scale: 1.1 }} className="text-center">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-gray-900 to-black border-4 border-gray-700 shadow-2xl flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-gray-400">אֱלוֹיָסֵף</span>
              </div>
              <p className="text-lg text-gray-300">Helo-Yaseph</p>
              <p className="text-sm text-gray-500">Yah is adding</p>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} className="text-center">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border-4 border-zinc-600 shadow-2xl flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-zinc-400">אַסְפָּעֵאל</span>
              </div>
              <p className="text-lg text-zinc-300">Asfa'el</p>
              <p className="text-sm text-zinc-500">El is adding (leap years)</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-6 rounded-2xl bg-black/40 border border-white/10"
        >
          <h3 className="text-xl font-bold text-amber-300 mb-4 text-center">Bead Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#fbbf24] shadow-lg" />
              <span className="text-amber-200">Sabbath (7th Day)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#22d3ee] shadow-lg" />
              <span className="text-cyan-200">Feast Day</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#1f2937] border border-white/30 shadow-lg" />
              <span className="text-gray-300">Regular Day</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg animate-pulse" />
              <span className="text-pink-200">Today</span>
            </div>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-amber-200/60">
            Day begins at sunrise, not midnight • Location determines sunrise time
          </p>
        </motion.div>
      </div>
    </div>
  );
}
