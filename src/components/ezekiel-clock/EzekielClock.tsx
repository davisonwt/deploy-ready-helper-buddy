'use client';

import { motion } from 'framer-motion';
import { useSacredTime } from './hooks/useSacredTime';
import { BreathWheel } from './wheels/BreathWheel';
import { SacredDayWheel } from './wheels/SacredDayWheel';
import { YearWheel } from './wheels/YearWheel';
import { SolarMinuteWheel as MinuteWheel } from './wheels/SolarMinuteWheel';
import { useUserLocation } from './hooks/useUserLocation';
import { PartDetailModal } from './modals/PartDetailModal';
import { useState } from 'react';

/**
 * Ezekiel Clock - Sacred Time Visualization
 * 
 * Updated with TRUE ROTATION SPEEDS:
 * - Year Wheel: 0.986° per day (364-day cycle)
 * - Sacred Day Wheel: 18 parts (jumps on part change)
 * - Minute Wheel: Smooth 24h rotation (1440 minutes)
 * - Breath Wheel: 86,400-second rotation
 */
export const EzekielClock = () => {
  const { lat, lon } = useUserLocation();
  const sacred = useSacredTime(lat, lon);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);

  if (!sacred) return null;

  // Calculate rotation angles - ensure they're always valid numbers
  const secondsAngle = isNaN(sacred.secondsToday) ? 0 : (sacred.secondsToday / 86400) * 360;
  const minutesAngle = isNaN(sacred.minutesToday) ? 0 : (sacred.minutesToday / 1440) * 360;
  const dayProgress = isNaN(sacred.dayOfYear) ? 0 : (sacred.dayOfYear - 1) / 364;
  const yearAngle = dayProgress * 360;

  return (
    <>
      <div className="relative pointer-events-auto">
        <div className="relative w-96 h-96">
          {/* Outermost: 364-day Year Wheel – turns 0.986° per day */}
          <motion.div
            key="year-wheel"
            className="absolute inset-0"
            style={{ transformOrigin: '50% 50%' }}
            animate={{ rotate: `${yearAngle}deg` }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
          >
            <YearWheel creature={sacred.creature} dayOfYear={sacred.dayOfYear} />
          </motion.div>

          {/* 18-Part Sacred Day Wheel – jumps on part change */}
          <SacredDayWheel 
            sacredPart={sacred.sacredPart} 
            isDaytime={sacred.isDaytime}
            onPartClick={setSelectedPart}
          />

          {/* 1440-Minute Solar Wheel – smooth 24h rotation */}
          <motion.div
            key="minute-wheel"
            className="absolute inset-0"
            style={{ transformOrigin: '50% 50%' }}
            animate={{ rotate: `${minutesAngle}deg` }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
          >
            <MinuteWheel isDaytime={sacred.isDaytime} minutesToday={sacred.minutesToday} />
          </motion.div>

          {/* Innermost Breath Wheel – 86,400-second rotation */}
          <motion.div
            key="breath-wheel"
            className="absolute inset-0"
            style={{ transformOrigin: '50% 50%' }}
            animate={{ rotate: `${secondsAngle}deg` }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
          >
            <BreathWheel secondsToday={sacred.secondsToday} />
          </motion.div>

          {/* Central Throne */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-5xl font-bold text-amber-400 drop-shadow-2xl">
                {sacred.sacredPart}
              </div>
              <div className="text-amber-300 text-lg mt-2">{sacred.creature}</div>
            </div>
          </div>
        </div>

        {/* Info text below clock */}
        <div className="text-center mt-4 text-amber-200 font-light text-sm">
          Year {sacred.year} • Day {sacred.dayOfYear} • Part {sacred.sacredPart}
        </div>
      </div>

      {/* Part detail modal */}
      <PartDetailModal
        part={selectedPart}
        isOpen={!!selectedPart}
        onClose={() => setSelectedPart(null)}
      />
    </>
  );
};
