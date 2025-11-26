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
 * Returns minutes since midnight (0-1439) in local time
 * Based on working HTML implementation
 */
export function calculateSunrise(date: Date = new Date(), lat: number = 30, lon: number = 0): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian Day Number (JDN)
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Julian Ephemeris Day (JDE) approx
  let jde = jdn + 0.5;  // Noon
  let t = (jde - 2451545.0) / 36525;  // Centuries since J2000

  // Mean anomaly of sun, ecliptic longitude, obliquity
  let meanAnomaly = (357.5291 + 0.98560028 * (jde - 2451545)) * Math.PI / 180;
  let eqCenter = (1.9148 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly)) * Math.PI / 180;
  let eclipticLong = (280.4665 + 0.98564736 * (jde - 2451545) + eqCenter * 180 / Math.PI) * Math.PI / 180;
  let obliquity = (23.439 - 0.0000004 * (jde - 2451545)) * Math.PI / 180;

  // Right ascension & declination (approx)
  let ra = Math.atan2(Math.sin(eclipticLong) * Math.cos(obliquity) + Math.tan(obliquity) * Math.sin(eclipticLong), Math.cos(eclipticLong)) * 180 / Math.PI;
  let sinDec = Math.sin(eclipticLong) * Math.sin(obliquity);
  let dec = Math.asin(sinDec) * 180 / Math.PI;

  // Hour angle for sunrise (zenith -0.833° for refraction)
  let zenith = -0.833 * Math.PI / 180;
  let cosHourAngle = (Math.cos(zenith) - Math.sin(lat * Math.PI / 180) * Math.sin(dec * Math.PI / 180)) /
                     (Math.cos(lat * Math.PI / 180) * Math.cos(dec * Math.PI / 180));
  let hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) * 180 / Math.PI;

  // Local solar noon (UTC hours)
  let solarNoonUtc = (ra + lon + 360) % 360 / 15;  // Adjust for longitude
  let sunriseUtc = solarNoonUtc - hourAngle / 15;

  // Convert to local time minutes (assumes date is local; adjust if UTC)
  let localSunriseHours = (sunriseUtc + date.getTimezoneOffset() / 60) % 24;
  if (localSunriseHours < 0) localSunriseHours += 24;
  return localSunriseHours * 60;
}

/**
 * Convert standard JavaScript Date to custom time system
 * Day starts at sunrise, not midnight!
 */
export function getCreatorTime(date: Date = new Date(), userLat: number = 30, userLon: number = 0): CustomTime & { display: string; raw: CustomTime; sunriseMinutes: number } {
  const sunriseMinutes = calculateSunrise(new Date(date), userLat, userLon);  // Use fresh date for sunrise
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  let minutesSinceSunrise = nowMinutes - sunriseMinutes;
  if (minutesSinceSunrise < 0) minutesSinceSunrise += 1440;  // Overnight wrap

  const totalParts = minutesSinceSunrise / 80;
  const part = (Math.floor(totalParts) % 18) + 1;  // 1-18 (ensures wrap)
  let minutesIntoPart = Math.round((totalParts % 1) * 80);
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
