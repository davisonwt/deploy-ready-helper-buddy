/**
 * Custom Calendar System Utilities
 * 
 * Calendar has 12 months with varying days: 30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31
 * Year starts on the 4th day of the week (announced by Tequvah in the 7th month)
 * Epoch: Autumnal equinox 2024-09-22 ≈ Creator Year 6027 Month 7 Day 1
 */

export interface CustomDate {
  year: number;
  month: number; // 1-12
  day: number;
  weekDay: number; // 1-7
}

// Days per month: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

// Day names (assuming 7-day week)
const DAY_NAMES = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

// Epoch: Autumnal equinox 2024-09-22 (Creator Year 6027 Month 7 Day 1)
const CREATOR_EPOCH = new Date('2024-09-22T00:00:00Z');

/**
 * Check if a year is a long Sabbath year (simplified - adjust based on actual rules)
 */
function isLongSabbathYear(year: number): boolean {
  // Simplified: every 7th year is a long Sabbath year
  // Adjust this based on your actual calendar rules
  return year % 7 === 0;
}

/**
 * Get the number of days in a specific month
 */
export function getDaysInMonth(month: number): number {
  if (month < 1 || month > 12) return 30;
  return DAYS_PER_MONTH[month - 1];
}

/**
 * Convert Gregorian date to Creator's calendar date
 */
export function getCreatorDate(gregorianDate: Date = new Date()): CustomDate {
  const msDiff = gregorianDate.getTime() - CREATOR_EPOCH.getTime();
  const creatorDays = Math.floor(msDiff / (24 * 60 * 60 * 1000));
  
  const monthLengths = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let year = 6027;
  let dayOfYear = creatorDays;
  
  // Calculate year
  while (dayOfYear >= 365 + (isLongSabbathYear(year) ? 1 : 0)) {
    dayOfYear -= 365 + (isLongSabbathYear(year) ? 1 : 0);
    year++;
  }
  
  // Calculate month and day
  let month = 0;
  while (dayOfYear >= monthLengths[month]) {
    dayOfYear -= monthLengths[month];
    month++;
    if (month >= 12) {
      month = 0;
      year++;
      dayOfYear -= 365 + (isLongSabbathYear(year) ? 1 : 0);
    }
  }
  
  // Calculate weekday (Day 4 = week day 4, year starts on Day 4)
  const weekDay = ((creatorDays % 7) + 4) % 7 || 7;
  
  return {
    year: year + 1, // because epoch is start of 6027
    month: month + 1,
    day: dayOfYear + 1,
    weekDay,
  };
}

/**
 * Convert standard JavaScript Date to custom calendar date (legacy support)
 */
export function toCustomDate(standardDate: Date, startYear: number = 6028): CustomDate {
  return getCreatorDate(standardDate);
}

/**
 * Format custom date as "Y6028 M9 D10"
 */
export function formatCustomDate(date: CustomDate): string {
  return `Year ${date.year} Month ${date.month} Day ${date.day}`;
}

/**
 * Format custom date compactly
 */
export function formatCustomDateCompact(date: CustomDate): string {
  return `Y${date.year} M${date.month} D${date.day}`;
}

/**
 * Get day of week for a custom date
 */
export function getDayOfWeek(date: CustomDate): string {
  return DAY_NAMES[date.weekDay - 1] || `Day ${date.weekDay}`;
}

/**
 * Check if it's the 7th month (Tequvah announcement month)
 */
export function isTequvahMonth(month: number): boolean {
  return month === 7;
}
