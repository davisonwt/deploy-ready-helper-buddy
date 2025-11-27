'use client';

import { useMemo } from 'react';
import { PartTick } from './PartTick';
import { MinuteTick } from './MinuteTick';
import { SecondTick } from './SecondTick';

interface HashMarksProps {
  watchSize: number;
  innerRadius: number; // Radius of dial edge
  outerRadius: number; // Radius of bezel outer edge
}

/**
 * ETERNAL HASH-MARKS
 * 
 * Renders all tick marks on the bezel:
 * - 18 major ticks (parts) - every 20°
 * - 1,440 minor ticks (Creator minutes) - 80 per part
 * - 86,400 micro ticks (real seconds) - 60 per Creator minute
 * 
 * All ticks rotate anti-clockwise from Part 1 at top (90°)
 */
export function HashMarks({ watchSize, innerRadius, outerRadius }: HashMarksProps) {
  // Calculate tick positions
  const partTicks = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => i + 1);
  }, []);

  const minuteTicks = useMemo(() => {
    // 18 parts × 80 minutes = 1,440 ticks
    return Array.from({ length: 1440 }, (_, i) => i);
  }, []);

  const secondTicks = useMemo(() => {
    // 18 parts × 80 minutes × 60 seconds = 86,400 ticks
    // Only render every 5th tick for performance (17,280 visible ticks)
    return Array.from({ length: 86400 }, (_, i) => i).filter((_, i) => i % 5 === 0);
  }, []);

  return (
    <g className="hash-marks" aria-hidden="true" role="presentation">
      {/* Part major ticks - 18 ticks */}
      {partTicks.map((partNum) => (
        <PartTick
          key={`part-${partNum}`}
          partNum={partNum}
          watchSize={watchSize}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
        />
      ))}

      {/* Minute minor ticks - 1,440 ticks */}
      {minuteTicks.map((minuteIndex) => (
        <MinuteTick
          key={`minute-${minuteIndex}`}
          minuteIndex={minuteIndex}
          watchSize={watchSize}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
        />
      ))}

      {/* Second micro ticks - 86,400 ticks (rendered at reduced density) */}
      {secondTicks.map((secondIndex) => (
        <SecondTick
          key={`second-${secondIndex}`}
          secondIndex={secondIndex}
          watchSize={watchSize}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
        />
      ))}
    </g>
  );
}

