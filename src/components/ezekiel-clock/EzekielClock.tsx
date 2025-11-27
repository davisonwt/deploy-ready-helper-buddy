'use client';

import { useState } from 'react';
import { ThroneCenter } from './ThroneCenter';
import { BreathWheel } from './wheels/BreathWheel';
import { SolarMinuteWheel } from './wheels/SolarMinuteWheel';
import { SacredDayWheel } from './wheels/SacredDayWheel';
import { YearWheel } from './wheels/YearWheel';
import { useSacredTime } from './hooks/useSacredTime';
import { useUserLocation } from './hooks/useUserLocation';
import { PartDetailModal } from './modals/PartDetailModal';

/**
 * Ezekiel Clock - Sacred Time Visualization
 * 
 * A multi-layered clock representing:
 * - Year Wheel: Enochian calendar (364 days, 4 seasons/creatures)
 * - Sacred Day Wheel: 18 parts (12 tribes + 6 night watches)
 * - Solar Minute Wheel: 1440 minutes per day
 * - Breath Wheel: 86400 seconds per day
 */
export const EzekielClock = () => {
  const { lat, lon } = useUserLocation();
  const sacred = useSacredTime(lat, lon);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);

  if (!sacred) {
    return (
      <div className="fixed top-4 right-4 z-50 pointer-events-auto">
        <div className="relative w-80 h-80 bg-black/30 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 flex items-center justify-center">
          <div className="text-white/60 text-sm">Loading sacred time...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative pointer-events-auto">
        <div className="relative w-80 h-80 bg-black/30 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 overflow-hidden">
          {/* Layer 4 – Year Wheel (outermost) */}
          <YearWheel dayOfYear={sacred.dayOfYear} creature={sacred.creature} />

          {/* Layer 3 – Sacred Day Wheel (18 parts) */}
          <SacredDayWheel
            sacredPart={sacred.sacredPart}
            isDaytime={sacred.isDaytime}
            onPartClick={setSelectedPart}
          />

          {/* Layer 2 – Solar Minute Wheel (1440 minutes) */}
          <SolarMinuteWheel minutesToday={sacred.minutesToday} isDaytime={sacred.isDaytime} />

          {/* Layer 1 – Breath Wheel (innermost, seconds) */}
          <BreathWheel secondsToday={sacred.secondsToday} />

          {/* Central Throne */}
          <ThroneCenter sacred={sacred} />
        </div>

        {/* Info text below clock */}
        <div className="text-center mt-3 text-white/80 font-light text-sm max-w-[320px]">
          <div className="font-semibold text-amber-300">Ezekiel&apos;s Wheels</div>
          <div className="text-xs mt-1">{sacred.formatted}</div>
          <div className="text-xs mt-1 text-amber-400/70">
            {sacred.season} • {sacred.creature}
          </div>
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

