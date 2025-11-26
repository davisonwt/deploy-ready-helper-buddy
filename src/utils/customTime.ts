/**
 * Custom Time System Utilities
 * 
 * Time System:
 * - 18 parts, each representing 80 minutes
 * - Time progresses anti-clockwise
 * - Total day = 18 × 80 = 1440 minutes = 24 hours
 */

export interface CustomTime {
  part: number; // 1-18
  minute: number; // 1-80 within the part (not 0-79)
}

export type TimeOfDay = 'deep-night' | 'dawn' | 'day' | 'golden-hour' | 'dusk' | 'night';

/**
 * Convert standard JavaScript Date to custom time system
 */
export function getCreatorTime(realDate: Date = new Date()): CustomTime {
  const msPerPart = 80 * 60 * 1000; // 80 minutes in ms
  const msInDay = 24 * 60 * 60 * 1000;
  const msSinceMidnight = realDate.getTime() - new Date(realDate).setHours(0, 0, 0, 0);
  const totalParts = msSinceMidnight / msPerPart;
  const currentPart = Math.floor(totalParts) + 1; // 1–18
  const minutesInPart = Math.floor((totalParts % 1) * 80) + 1; // 1–80
  
  return { part: currentPart, minute: minutesInPart };
}

/**
 * Convert standard minutes (0-1439) to custom time system (legacy support)
 */
export function toCustomTime(standardMinutes: number): CustomTime {
  const totalMinutes = standardMinutes % 1440; // Ensure within 24 hours
  const part = Math.floor(totalMinutes / 80) + 1; // 1-18
  const minute = (totalMinutes % 80) + 1; // 1-80 (was 0-79)
  
  return { part, minute };
}

/**
 * Convert custom time to standard minutes (0-1439)
 */
export function toStandardMinutes(customTime: CustomTime): number {
  return (customTime.part - 1) * 80 + (customTime.minute - 1);
}

/**
 * Get time of day category based on part number
 */
export function getTimeOfDayFromPart(part: number): TimeOfDay {
  if (part >= 1 && part <= 3) return 'deep-night';
  if (part >= 4 && part <= 5) return 'dawn';
  if (part >= 6 && part <= 11) return 'day';
  if (part >= 12 && part <= 14) return 'golden-hour';
  if (part >= 15 && part <= 16) return 'dusk';
  return 'night'; // 17-18
}

/**
 * Get color scheme for part of day
 */
export function getPartColor(part: number): { background: string; accent: string } {
  const colors = {
    'deep-night': { background: '#0b0e17', accent: '#232940' },
    'dawn': { background: '#2b1b3d', accent: '#d96b66' },
    'day': { background: '#f0f4f8', accent: '#4a90e2' },
    'golden-hour': { background: '#fff4e6', accent: '#f5a76c' },
    'dusk': { background: '#2c1b3d', accent: '#9b6fcc' },
    'night': { background: '#0f1423', accent: '#00d4ff' },
  };
  
  const timeOfDay = getTimeOfDayFromPart(part);
  return colors[timeOfDay];
}

/**
 * Get background gradient for part
 */
export function getTimeOfPartGradient(part: number): string {
  const { background, accent } = getPartColor(part);
  return `linear-gradient(135deg, ${background} 0%, ${accent} 100%)`;
}

/**
 * Format custom time display with ordinal suffixes
 */
export function formatCustomTime(customTime: CustomTime): string {
  const partOrdinal = getOrdinalSuffix(customTime.part);
  const minuteOrdinal = getOrdinalSuffix(customTime.minute);
  return `Part ${customTime.part}, minute ${customTime.minute}`;
}

/**
 * Format custom time for center display
 */
export function formatCustomTimeCenter(customTime: CustomTime): { part: string; minute: string } {
  const partOrdinal = getOrdinalSuffix(customTime.part);
  const minuteOrdinal = getOrdinalSuffix(customTime.minute);
  return {
    part: `${customTime.part}${partOrdinal} hour`,
    minute: `${customTime.minute}${minuteOrdinal} min`
  };
}

/**
 * Get ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(num: number): string {
  if (num >= 11 && num <= 13) return 'th';
  const lastDigit = num % 10;
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';
  return 'th';
}

/**
 * Calculate anti-clockwise angle for watch hand
 * Part 1 starts at top (90°), progresses anti-clockwise (left)
 */
export function getAntiClockwiseAngle(customTime: CustomTime): number {
  // Each part is 20 degrees (360 / 18)
  const partAngle = (customTime.part - 1) * 20;
  // Minutes within part add proportional angle
  const minutesAngle = ((customTime.minute - 1) / 80) * 20;
  // Start at 90° (top), add angle for anti-clockwise movement
  // Then convert to standard rotation (subtract from 360 for anti-clockwise visual)
  return 90 + partAngle + minutesAngle;
}
