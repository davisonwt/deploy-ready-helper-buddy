import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LocationVerification } from '@/components/calendar/LocationVerification';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sun, Leaf, Snowflake, Flower, MapPin } from 'lucide-react';
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

export default function EnochianCalendarDesignPage() {
  const { location, loading: locationLoading } = useUserLocation();
  const [enochianDate, setEnochianDate] = useState({
    year: 6028, month: 1, dayOfMonth: 1, part: 1, dayOfYear: 1
  });

  // Update calendar based on location
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const creatorDate = calculateCreatorDate(now);
      const creatorTime = getCreatorTime(now, location.lat, location.lon);
      
      setEnochianDate({
        year: creatorDate.year,
        month: creatorDate.month,
        dayOfMonth: creatorDate.day,
        part: creatorTime.part,
        dayOfYear: creatorDate.dayOfYear
      });
    };
    
    updateDate();
    const interval = setInterval(updateDate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [location.lat, location.lon]);

  // Reorder seasons to put current month's season first
  const orderedSeasons = useMemo(() => {
    const currentSeasonIndex = BASE_SEASONS.findIndex(
      season => season.months.includes(enochianDate.month)
    );
    
    if (currentSeasonIndex === -1) return BASE_SEASONS;
    
    // Rotate array so current season is first
    const reordered = [
      ...BASE_SEASONS.slice(currentSeasonIndex),
      ...BASE_SEASONS.slice(0, currentSeasonIndex)
    ];
    
    return reordered;
  }, [enochianDate.month]);

  const handleRefresh = () => {
    window.location.reload();
  };

  // Determine hemisphere based on latitude
  const isNorthernHemisphere = location.lat >= 0;

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
          className="flex flex-col items-center gap-4 mb-6"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl">
            Ed's Beads
          </h1>
          <p className="text-lg md:text-xl text-amber-200/80 tracking-widest">
            364 Days • Eternal Alignment • Sunrise to Sunrise
          </p>
          
          {/* Current Time Info */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <div className="bg-black/40 px-4 py-2 rounded-full border border-amber-500/30">
              <span className="text-amber-300 font-bold">
                Year {enochianDate.year} • Month {enochianDate.month} • Day {enochianDate.dayOfMonth}
              </span>
            </div>
            <div className="bg-black/40 px-4 py-2 rounded-full border border-cyan-500/30">
              <span className="text-cyan-300 font-bold">
                Part {enochianDate.part}/18 • {PART_NAMES[enochianDate.part - 1] || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Location Status */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className={`w-4 h-4 ${location.verified ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className={location.verified ? 'text-green-300' : 'text-yellow-300'}>
              {location.verified ? 'Location verified' : 'Location not verified'} 
              ({location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°)
              {isNorthernHemisphere ? ' • Northern Hemisphere' : ' • Southern Hemisphere'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/30 hover:border-amber-500/60 text-amber-300"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </motion.div>
        <LocationVerification />
      </div>

      {/* Current Month Indicator */}
      <div className="container mx-auto px-4 mb-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-4 bg-pink-500/20 rounded-2xl border border-pink-500/40"
        >
          <p className="text-pink-300 font-bold text-lg">
            📍 Current: Month {enochianDate.month} • Day {enochianDate.dayOfMonth} • Part {enochianDate.part}
          </p>
          <p className="text-pink-200/60 text-sm mt-1">
            Current season shown first below
          </p>
        </motion.div>
      </div>

      {/* Seasonal Grid - Current season first */}
      <div className="container mx-auto px-4 pb-12 relative z-10">
        {orderedSeasons.map((season, seasonIndex) => {
          const NorthIcon = season.northIcon;
          const SouthIcon = season.southIcon;
          const isCurrentSeason = season.months.includes(enochianDate.month);
          
          return (
            <motion.div
              key={season.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: seasonIndex * 0.1 }}
              className={`mb-8 rounded-3xl overflow-hidden border-2 ${season.borderColor} shadow-2xl ${
                isCurrentSeason ? 'ring-4 ring-pink-500/50 shadow-pink-500/30' : ''
              }`}
            >
              {/* Current Season Badge */}
              {isCurrentSeason && (
                <div className="bg-pink-500 text-white text-center py-2 font-bold tracking-wider">
                  ✨ CURRENT SEASON ✨
                </div>
              )}

              {/* Season Header - Split Hemisphere Display */}
              <div className={`bg-gradient-to-r ${season.gradient} p-4 md:p-6`}>
                <div className="flex items-center justify-between">
                  {/* Northern Hemisphere */}
                  <div className="flex items-center gap-3">
                    <NorthIcon className={`w-8 h-8 ${season.textColor}`} />
                    <div>
                      <p className="text-sm text-white/60 uppercase tracking-wider">Northern</p>
                      <p className={`text-xl md:text-2xl font-bold ${season.textColor} ${
                        isNorthernHemisphere ? 'underline decoration-2' : ''
                      }`}>{season.northern}</p>
                    </div>
                  </div>

                  {/* Month Range - reversed to match bead placement */}
                  <div className="text-center">
                    <p className="text-white/40 text-sm">Months</p>
                    <p className="text-2xl md:text-3xl font-black text-white">
                      {season.months[2]} - {season.months[0]}
                    </p>
                  </div>

                  {/* Southern Hemisphere */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-white/60 uppercase tracking-wider">Southern</p>
                      <p className={`text-xl md:text-2xl font-bold ${season.textColor} ${
                        !isNorthernHemisphere ? 'underline decoration-2' : ''
                      }`}>{season.southern}</p>
                    </div>
                    <SouthIcon className={`w-8 h-8 ${season.textColor}`} />
                  </div>
                </div>
              </div>

              {/* Three Months Grid - Right to Left (1 on right) */}
              <div className={`${season.bgAccent} p-4 md:p-6`}>
                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  {/* Reversed order: month 3, 2, 1 so month 1 is on the right */}
                  {[...season.months].reverse().map((monthNum) => {
                    const MonthComponent = MonthComponents[monthNum];
                    const isCurrentMonth = monthNum === enochianDate.month;
                    
                    return (
                      <motion.div
                        key={monthNum}
                        className={`relative rounded-2xl overflow-hidden ${
                          isCurrentMonth 
                            ? 'ring-4 ring-pink-500/50 shadow-lg shadow-pink-500/30' 
                            : ''
                        }`}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Current Month Indicator */}
                        {isCurrentMonth && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-b from-pink-500/20 to-transparent pointer-events-none z-10"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        
                        {/* Month Bead Strand - Compact uniform height */}
                        <div className="h-[200px] overflow-hidden rounded-xl bg-gradient-to-b from-black/40 to-black/60 relative">
                          <div className="w-full h-full flex justify-center overflow-hidden">
                            <div className="transform scale-[0.32] origin-top -mt-4">
                              <MonthComponent 
                                dayOfMonth={isCurrentMonth ? enochianDate.dayOfMonth : 0} 
                                year={enochianDate.year}
                              />
                            </div>
                          </div>
                          {/* Fade out at bottom */}
                          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Days Out of Time Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 p-8 rounded-3xl bg-gradient-to-b from-purple-900/40 via-black to-purple-900/40 border-2 border-purple-500/30 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-black text-purple-300 mb-4">
            Days Outside Time
          </h2>
          <p className="text-purple-200/70 mb-8 text-lg">
            The sacred days that exist between years
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            {/* Helo-Yaseph */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="text-center"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-gray-900 to-black border-4 border-gray-700 shadow-2xl flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-gray-400">אֱלוֹיָסֵף</span>
              </div>
              <p className="text-lg text-gray-300">Helo-Yaseph</p>
              <p className="text-sm text-gray-500">Yah is adding</p>
            </motion.div>

            {/* Asfa'el */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="text-center"
            >
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
          transition={{ delay: 1 }}
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
          transition={{ delay: 1.2 }}
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
