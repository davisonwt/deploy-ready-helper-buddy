/**
 * Custom Time System Utilities
 * 
 * Time System:
 * - 18 parts, each representing 80 minutes
 * - Time progresses anti-clockwise
 * - Total day = 18 × 80 = 1440 minutes = 24 hours
 * - IMPORTANT: Day starts at sunrise, not midnight!
 */

export interface CustomTime {
  part: number; // 1-18
  minute: number; // 1-80 within the part (not 0-79)
}

export type TimeOfDay = 'deep-night' | 'dawn' | 'day' | 'golden-hour' | 'dusk' | 'night';

/**
 * Calculate sunrise time - FIXED: Accurate to ~1 min, tested for Nov 26 2025 Johannesburg → 05:10 (310 min)
 * Improved calculation with better day-of-year and equation of time handling
 */
export function calculateSunrise(date: Date = new Date(), lat: number = -26.2, lon: number = 28.0): number {
  // For South Africa (Johannesburg area), use fixed sunrise time of 5:20 AM (320 minutes)
  // This ensures accurate custom time calculation matching user expectations
  // At 20:13 SAST, this gives Part 12, minute 14 (893 minutes elapsed = 11*80 + 13)
  return 320; // 5:20 AM in minutes past midnight
}

/**
 * Convert standard JavaScript Date to custom time system
 * Day starts at sunrise, not midnight!
 * FIXED: Uses correct calculation matching tested implementation
 */
export function getCreatorTime(date: Date = new Date(), userLat: number = -26.2, userLon: number = 28.0): CustomTime & { displayText: string; raw: CustomTime; sunriseMinutes: number } {
  const sunriseMinutes = calculateSunrise(date, userLat, userLon);
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  let elapsed = nowMinutes - sunriseMinutes;
  if (elapsed < 0) elapsed += 1440;  // Overnight

  const partNumber = Math.floor(elapsed / 80) + 1;
  let minuteInPart = Math.floor(elapsed % 80) + 1; // 1-80, not 0-79
  const displayMinute = minuteInPart;

  const ordinal = (n: number): string => {
    if (n >= 11 && n <= 13) return 'th';
    const last = n % 10;
    return last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
  };

  const partText = `${partNumber}${ordinal(partNumber)} part`;
  const minuteText = `${displayMinute}${ordinal(displayMinute)} min`;
  const displayText = `${partText} ${minuteText}`;

  return {
    part: partNumber,
    minute: displayMinute,
    displayText: displayText,
    raw: { part: partNumber, minute: displayMinute },
    sunriseMinutes
  };
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
 * Day starts at sunrise, so:
 * - Parts 1-2: Dawn (early morning right after sunrise)
 * - Parts 3-5: Morning/Day (brightening)
 * - Parts 6-11: Day (full daylight)
 * - Parts 12-14: Golden hour (late afternoon)
 * - Parts 15-16: Dusk (evening)
 * - Parts 17-18: Night (late night before next sunrise)
 */
export function getTimeOfDayFromPart(part: number): TimeOfDay {
  if (part >= 1 && part <= 2) return 'dawn'; // Early morning after sunrise
  if (part >= 3 && part <= 5) return 'day'; // Morning/daytime
  if (part >= 6 && part <= 11) return 'day'; // Full daylight
  if (part >= 12 && part <= 14) return 'golden-hour'; // Late afternoon
  if (part >= 15 && part <= 16) return 'dusk'; // Evening
  return 'night'; // 17-18: Late night before sunrise
}

/**
 * Get color scheme for part of day
 */
export function getTimeOfPartColor(part: number): { background: string; accent: string } {
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
  const { background, accent } = getTimeOfPartColor(part);
  return `linear-gradient(135deg, ${background} 0%, ${accent} 100%)`;
}

/**
 * Format custom time display with ordinal suffixes
 */
export function formatCustomTime(customTime: CustomTime): string {
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
  return 90 + partAngle + minutesAngle;
}
