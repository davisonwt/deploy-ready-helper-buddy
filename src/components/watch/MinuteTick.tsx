'use client';

interface MinuteTickProps {
  minuteIndex: number; // 0-1439 (18 parts × 80 minutes)
  watchSize: number;
  innerRadius: number;
  outerRadius: number;
}

/**
 * Minute minor tick - medium width, white-gold, no glow
 * 80 ticks per part (1,440 total)
 * Positioned at 0.25° intervals (20° / 80) within each part wedge
 */
export function MinuteTick({ minuteIndex, watchSize, innerRadius, outerRadius }: MinuteTickProps) {
  // Calculate which part this minute belongs to
  const partNum = Math.floor(minuteIndex / 80) + 1;
  const minuteInPart = minuteIndex % 80;

  // Part major tick angle
  const partAngle = 90 + (partNum - 1) * 20;
  // Minute tick angle within the part wedge (0.25° per minute)
  const minuteOffset = (minuteInPart / 80) * 20;
  // Anti-clockwise: subtract from part angle
  const minuteAngle = partAngle - minuteOffset;

  const rad = (minuteAngle * Math.PI) / 180;

  const centerX = 50;
  const centerY = 50;

  // Calculate tick endpoints (shorter than part ticks)
  const tickStartRadius = innerRadius + (outerRadius - innerRadius) * 0.3;
  const tickEndRadius = innerRadius + (outerRadius - innerRadius) * 0.6;

  const innerX = centerX + Math.cos(rad) * tickStartRadius;
  const innerY = centerY - Math.sin(rad) * tickStartRadius;
  const outerX = centerX + Math.cos(rad) * tickEndRadius;
  const outerY = centerY - Math.sin(rad) * tickEndRadius;

  const tickWidth = watchSize * 0.006;

  return (
    <line
      x1={`${innerX}%`}
      y1={`${innerY}%`}
      x2={`${outerX}%`}
      y2={`${outerY}%`}
      stroke="#f4e4bc"
      strokeWidth={tickWidth}
      strokeLinecap="round"
      opacity={0.7}
      aria-hidden="true"
    />
  );
}

