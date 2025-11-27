import { useMemo } from 'react';

interface TickRange {
  startIndex: number;
  endIndex: number;
  visibleTicks: number[];
}

/**
 * Calculate visible tick indices based on viewport and zoom level
 * Optimized for rendering only visible ticks
 */
export function useVisibleTicks(
  totalTicks: number,
  tickSpacing: number, // degrees per tick
  viewportAngle: number = 360, // visible angle range
  centerAngle: number = 0 // center of viewport
): TickRange {
  return useMemo(() => {
    const halfViewport = viewportAngle / 2;
    const startAngle = centerAngle - halfViewport;
    const endAngle = centerAngle + halfViewport;

    // Normalize angles to 0-360
    const normalizeAngle = (angle: number) => {
      let normalized = angle % 360;
      if (normalized < 0) normalized += 360;
      return normalized;
    };

    const normalizedStart = normalizeAngle(startAngle);
    const normalizedEnd = normalizeAngle(endAngle);

    const visibleTicks: number[] = [];

    // Handle wrap-around case
    if (normalizedStart > normalizedEnd) {
      // Wraps around 0°
      for (let i = 0; i < totalTicks; i++) {
        const tickAngle = normalizeAngle(90 - i * tickSpacing);
        if (tickAngle >= normalizedStart || tickAngle <= normalizedEnd) {
          visibleTicks.push(i);
        }
      }
    } else {
      // Normal case
      for (let i = 0; i < totalTicks; i++) {
        const tickAngle = normalizeAngle(90 - i * tickSpacing);
        if (tickAngle >= normalizedStart && tickAngle <= normalizedEnd) {
          visibleTicks.push(i);
        }
      }
    }

    return {
      startIndex: visibleTicks[0] ?? 0,
      endIndex: visibleTicks[visibleTicks.length - 1] ?? totalTicks - 1,
      visibleTicks,
    };
  }, [totalTicks, tickSpacing, viewportAngle, centerAngle]);
}

