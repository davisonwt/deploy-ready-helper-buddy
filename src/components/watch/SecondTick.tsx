'use client';

interface SecondTickProps {
  secondIndex: number; // 0-86399 (18 parts × 80 minutes × 60 seconds)
  watchSize: number;
  innerRadius: number;
  outerRadius: number;
}

/**
 * Second micro tick - hair-line, subtle glow
 * 60 ticks per Creator minute (86,400 total)
 * Positioned at 0.00416667° intervals (20° / 4800) within each part wedge
 * 
 * Note: Rendered at reduced density (every 5th tick) for performance
 */
export function SecondTick({ secondIndex, watchSize, innerRadius, outerRadius }: SecondTickProps) {
  // Calculate which part this second belongs to
  const partNum = Math.floor(secondIndex / 4800) + 1;
  const secondsIntoPart = secondIndex % 4800;
  
  // Calculate which Creator minute within the part
  const minuteInPart = Math.floor(secondsIntoPart / 60);
  const secondInMinute = secondsIntoPart % 60;

  // Part major tick angle
  const partAngle = 90 + (partNum - 1) * 20;
  // Minute offset within part (0.25° per minute)
  const minuteOffset = (minuteInPart / 80) * 20;
  // Second offset within minute (0.00416667° per second)
  const secondOffset = (secondInMinute / 4800) * 20;
  // Total offset anti-clockwise
  const totalOffset = minuteOffset + secondOffset;
  const secondAngle = partAngle - totalOffset;

  const rad = (secondAngle * Math.PI) / 180;

  const centerX = 50;
  const centerY = 50;

  // Calculate tick endpoints (very short, near inner edge)
  const tickStartRadius = innerRadius + (outerRadius - innerRadius) * 0.1;
  const tickEndRadius = innerRadius + (outerRadius - innerRadius) * 0.25;

  const innerX = centerX + Math.cos(rad) * tickStartRadius;
  const innerY = centerY - Math.sin(rad) * tickStartRadius;
  const outerX = centerX + Math.cos(rad) * tickEndRadius;
  const outerY = centerY - Math.sin(rad) * tickEndRadius;

  const tickWidth = watchSize * 0.002; // Hair-line

  return (
    <line
      x1={`${innerX}%`}
      y1={`${innerY}%`}
      x2={`${outerX}%`}
      y2={`${outerY}%`}
      stroke="rgba(255, 255, 255, 0.6)"
      strokeWidth={tickWidth}
      strokeLinecap="round"
      style={{
        filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))',
        opacity: 0.5,
      }}
      aria-hidden="true"
    />
  );
}

