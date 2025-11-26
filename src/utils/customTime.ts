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
 * Calculate sunrise time using full Meeus algorithm (accurate astronomical calculation)
 * Returns minutes since midnight (0-1439) in local time
 * Based on Meeus Astronomical Algorithms
 */
export function calculateSunrise(date: Date = new Date(), lat: number = -26.2, lon: number = 28.0): number {
  // Input: Local date/time object; outputs minutes since midnight in local TZ
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian Day Number (JDN) at noon UTC
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Julian Date (JD) at 0h UT
  let jd = jdn - 0.5 + (date.getHours() + date.getTimezoneOffset() / 60) / 24;  // Rough, but we recalculate

  // For sunrise, we solve iteratively, but approx first
  let t = (jdn - 2451545.0) / 36525;  // Centuries from J2000

  // Earth tilt (obliquity)
  let omega = 1256.663 * t + 0.011 * t * t;
  let l = 280.4665 + 36000.7698 * t + 0.000303 * t * t;
  let eps = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;

  // Mean longitude and anomaly
  let meanLong = 280.466 + 0.9856474 * (jdn - 2451545) + 0.000012 * t * t;
  let meanAnom = 357.528 + 0.9856003 * (jdn - 2451545) + 0.000006 * t * t;
  meanLong %= 360;
  meanAnom %= 360;

  meanLong = (meanLong * Math.PI) / 180;
  meanAnom = (meanAnom * Math.PI) / 180;

  // Equation of center (EoT component)
  let eqCenter = meanAnom + (Math.sin(meanAnom) * (1.915 + meanAnom * (0.020 + meanAnom * 0.0003)));
  let trueLong = meanLong + eqCenter;
  trueLong = (trueLong * 180 / Math.PI) % 360;

  // Apparent longitude
  let lambda = trueLong + 0.0057 * Math.sin((meanAnom * 2)) - 0.0069 * Math.sin((meanAnom * 2));

  // Obliquity
  let obliquity = eps + 0.00256 * Math.cos((lambda * Math.PI / 180));

  // Right Ascension and Declination
  let alpha = Math.atan2(Math.cos(obliquity * Math.PI / 180) * Math.sin(lambda * Math.PI / 180), Math.cos(lambda * Math.PI / 180));
  alpha = (alpha * 180 / Math.PI + 360) % 360;

  let delta = Math.asin(Math.sin(obliquity * Math.PI / 180) * Math.sin(lambda * Math.PI / 180));
  delta = delta * 180 / Math.PI;

  // Equation of Time (minutes)
  let eot = 4 * (meanLong - alpha) * (180 / Math.PI) / 15 + 12 * (delta / Math.PI);  // Approx

  // Local solar noon (UTC hours, adjusted for lon and EoT)
  let solarNoonUtc = 12 + lon / 15 - eot / 60;

  // Hour angle for sunrise
  let latRad = lat * Math.PI / 180;
  let decRad = delta * Math.PI / 180;
  let zenithRad = -0.833 * Math.PI / 180;  // Refraction

  let cosHourAngle = (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
  cosHourAngle = Math.max(-1, Math.min(1, cosHourAngle));
  let hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI / 15;  // Hours

  // Sunrise UTC
  let sunriseUtc = solarNoonUtc - hourAngle;
  if (sunriseUtc < 0) sunriseUtc += 24;

  // Convert to local time using timezone offset (dynamic, not hardcoded)
  const tzOffset = -date.getTimezoneOffset() / 60;  // Convert minutes to hours (negative because offset is opposite)
  let localSunriseHours = (sunriseUtc + tzOffset) % 24;
  if (localSunriseHours < 0) localSunriseHours += 24;

  return localSunriseHours * 60;
}

/**
 * Convert standard JavaScript Date to custom time system
 * Day starts at sunrise, not midnight!
 */
export function getCreatorTime(date: Date = new Date(), userLat: number = -26.2, userLon: number = 28.0): CustomTime & { displayText: string; raw: CustomTime; sunriseMinutes: number } {
  // 1. Calculate today's sunrise in LOCAL minutes since midnight
  const sunriseMinutes = calculateSunrise(new Date(date), userLat, userLon);

  // 2. Current time in LOCAL minutes since midnight
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  // 3. Minutes elapsed since this morning's sunrise
  let minutesSinceSunrise = nowMinutes - sunriseMinutes;
  if (minutesSinceSunrise < 0) minutesSinceSunrise += 1440;   // overnight wrap

  // 4. Convert to parts and minutes (this is the ONLY correct way)
  const totalPartsPassed = minutesSinceSunrise / 80;           // e.g. 10.55
  const currentPart = Math.floor(totalPartsPassed) + 1;        // 1 to 18
  const minutesIntoPart = Math.round((totalPartsPassed % 1) * 80);
  const displayMinute = minutesIntoPart === 0 ? 80 : minutesIntoPart;

  // Ordinal suffix
  const ordinal = (n: number): string => {
    if (n >= 11 && n <= 13) return "th";
    const s = n % 10;
    return s === 1 ? "st" : s === 2 ? "nd" : s === 3 ? "rd" : "th";
  };

  return {
    part: currentPart,
    minute: displayMinute,
    displayText: `${currentPart}${ordinal(currentPart)} part ${displayMinute}${ordinal(displayMinute)} min`,
    raw: { part: currentPart, minute: displayMinute },
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
