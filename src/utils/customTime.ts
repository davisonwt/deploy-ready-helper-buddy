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
  minutes: number; // 0-79 within the part
}

export type TimeOfDay = 'sunrise' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'evening' | 'night';

/**
 * Convert standard minutes (0-1439) to custom time system
 */
export function toCustomTime(standardMinutes: number): CustomTime {
  const totalMinutes = standardMinutes % 1440; // Ensure within 24 hours
  const part = Math.floor(totalMinutes / 80) + 1; // 1-18
  const minutes = totalMinutes % 80; // 0-79
  
  return { part, minutes };
}

/**
 * Convert custom time to standard minutes (0-1439)
 */
export function toStandardMinutes(customTime: CustomTime): number {
  return (customTime.part - 1) * 80 + customTime.minutes;
}

/**
 * Get time of day based on standard hours (0-23)
 */
export function getTimeOfDay(hours: number): TimeOfDay {
  if (hours >= 5 && hours < 7) return 'sunrise';
  if (hours >= 7 && hours < 10) return 'morning';
  if (hours >= 10 && hours < 13) return 'midday';
  if (hours >= 13 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 19) return 'sunset';
  if (hours >= 19 && hours < 22) return 'evening';
  return 'night';
}

/**
 * Get color scheme for time of day
 */
export function getTimeOfDayColor(timeOfDay: TimeOfDay): string {
  const colors = {
    sunrise: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 50%, #ffd700 100%)',
    morning: 'linear-gradient(135deg, #ffd700 0%, #87ceeb 50%, #98d8c8 100%)',
    midday: 'linear-gradient(135deg, #87ceeb 0%, #4facfe 50%, #00f2fe 100%)',
    afternoon: 'linear-gradient(135deg, #4facfe 0%, #43e97b 50%, #38f9d7 100%)',
    sunset: 'linear-gradient(135deg, #ff6b6b 0%, #ff8c42 50%, #ff6b6b 100%)',
    evening: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    night: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
  };
  return colors[timeOfDay];
}

/**
 * Format custom time display
 */
export function formatCustomTime(customTime: CustomTime): string {
  return `Part ${customTime.part}, minute ${customTime.minutes}`;
}

/**
 * Calculate anti-clockwise angle for watch hand
 * Part 1 starts at top (0°), progresses anti-clockwise
 */
export function getAntiClockwiseAngle(customTime: CustomTime): number {
  // Each part is 20 degrees (360 / 18)
  const partAngle = (customTime.part - 1) * 20;
  // Minutes within part add proportional angle
  const minutesAngle = (customTime.minutes / 80) * 20;
  // Total angle (anti-clockwise means we subtract from 360)
  return 360 - (partAngle + minutesAngle);
}

