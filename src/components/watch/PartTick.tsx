'use client';

interface PartTickProps {
  partNum: number; // 1-18
  watchSize: number;
  innerRadius: number;
  outerRadius: number;
}

/**
 * Part major tick - widest, amber glow, embossed
 * One tick per part (18 total)
 * Positioned at 20° intervals anti-clockwise from Part 1 (90°)
 */
export function PartTick({ partNum, watchSize, innerRadius, outerRadius }: PartTickProps) {
  // Part 1 at 90° (top), each part steps 20° anti-clockwise
  const partAngle = 90 + (partNum - 1) * 20;
  const rad = (partAngle * Math.PI) / 180;

  const centerX = 50; // 50% of watchSize
  const centerY = 50;

  // Calculate tick endpoints
  const innerX = centerX + Math.cos(rad) * innerRadius;
  const innerY = centerY - Math.sin(rad) * innerRadius;
  const outerX = centerX + Math.cos(rad) * outerRadius;
  const outerY = centerY - Math.sin(rad) * outerRadius;

  const tickWidth = watchSize * 0.012;
  const tickHeight = watchSize * 0.06;

  return (
    <line
      x1={`${innerX}%`}
      y1={`${innerY}%`}
      x2={`${outerX}%`}
      y2={`${outerY}%`}
      stroke="url(#partTickGradient)"
      strokeWidth={tickWidth}
      strokeLinecap="round"
      style={{
        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
      }}
      aria-hidden="true"
    />
  );
}

