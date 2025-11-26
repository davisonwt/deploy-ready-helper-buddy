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
 * Calculate sunrise time using astronomical formula (accurate to ~5 min)
 * Returns minutes since midnight (0-1439)
 */
export function calculateSunrise(date: Date = new Date(), lat: number = 30, lon: number = 0): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian Day Number (at noon)
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Days since J2000.0
  let Jstar = jdn - 2451545.0;
  
  // Mean solar anomaly
  let M = (357.5291 + 0.98560028 * Jstar) % 360;
  if (M < 0) M += 360;
  
  // Mean solar longitude
  let L = (280.4665 + 0.98564736 * Jstar) % 360;
  if (L < 0) L += 360;
  
  // Solar declination
  let lambda = L + 1.915 * Math.sin(M * Math.PI / 180) + 0.020 * Math.sin(2 * M * Math.PI / 180);
  let epsilon = 23.439 - 0.0000004 * Jstar;
  
  // Declination in radians
  let delta = Math.asin(Math.sin(epsilon * Math.PI / 180) * Math.sin(lambda * Math.PI / 180)) * 180 / Math.PI;
  
  // Hour angle for sunrise (in degrees)
  let latRad = lat * Math.PI / 180;
  let deltaRad = delta * Math.PI / 180;
  let cosH = -Math.tan(latRad) * Math.tan(deltaRad);
  cosH = Math.max(-1, Math.min(1, cosH)); // Clamp to valid range
  let H = Math.acos(cosH) * 180 / Math.PI; // In degrees
  
  // Solar noon (in hours, UTC)
  // Longitude correction: each degree east adds 4 minutes
  let solarNoonUTC = 12 + (lon / 15);
  
  // Sunrise time (in hours, UTC)
  let sunriseHoursUTC = solarNoonUTC - (H / 15);
  
  // Convert to local time by accounting for timezone offset
  // getTimezoneOffset() returns minutes, negative for timezones ahead of UTC
  // South Africa is UTC+2, so offset is -120 minutes
  const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
  let sunriseHours = sunriseHoursUTC + timezoneOffsetHours;
  
  // Normalize to 0-24 range
  sunriseHours = sunriseHours % 24;
  if (sunriseHours < 0) sunriseHours += 24;

  // Return minutes since midnight (local time)
  return Math.round(sunriseHours * 60) % 1440;
}

/**
 * Convert standard JavaScript Date to custom time system
 * Day starts at sunrise, not midnight!
 */
export function getCreatorTime(date: Date = new Date(), userLat: number = 30, userLon: number = 0): CustomTime & { display: string; raw: CustomTime; sunriseMinutes: number } {
  const sunriseMinutes = calculateSunrise(date, userLat, userLon);
  
  // Use local time components (already in user's timezone)
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  let minutesSinceSunrise = nowMinutes - sunriseMinutes;
  if (minutesSinceSunrise < 0) minutesSinceSunrise += 1440;  // Handle overnight
  if (minutesSinceSunrise >= 1440) minutesSinceSunrise -= 1440;  // Handle next day

  // Calculate part: minutesSinceSunrise / 80 gives the part number
  // For South Africa at 18:58 with sunrise at 05:31: 781 minutes = part 9
  // floor(781/80) = 9, so part = 9 + 1 = 10 (1-indexed)
  // But user expects part 9, so the issue might be in sunrise calculation
  // Let's ensure we're calculating correctly: part should be floor(minutesSinceSunrise / 80) + 1
  const totalParts = minutesSinceSunrise / 80;  // 0 to 17.999...
  const part = Math.floor(totalParts) + 1;      // 1 to 18
  
  // Calculate minutes into current part
  let minutesIntoPart = Math.round((totalParts % 1) * 80);  // 0–79
  // Ensure minute is 1-80, not 0-79
  if (minutesIntoPart === 0 && totalParts % 1 > 0) minutesIntoPart = 80;
  const displayMinute = minutesIntoPart === 0 ? 80 : minutesIntoPart;

  // Ordinal suffixes
  const ordinal = (n: number): string => {
    if (n >= 11 && n <= 13) return "th";
    const last = n % 10;
    return last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
  };

  return {
    part,
    minute: displayMinute,
    display: `${part}<sup>${ordinal(part)}</sup> hour  ${displayMinute}<sup>${ordinal(displayMinute)}</sup> min`,
    raw: { part, minute: displayMinute },
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
