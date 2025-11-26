/**
 * Custom Calendar System Utilities
 * 
 * Calendar has 12 months with varying days: 30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31
 * Year starts on the 4th day of the week (announced by Tequvah in the 7th month)
 * Epoch: Tequvah (Vernal Equinox) March 20, 2025 = Creator Year 6028, Month 1, Day 1
 */

export interface CustomDate {
  year: number;
  month: number; // 1-12
  day: number;
  weekDay: number; // 1-7 (1-6 work days, 7 = Sabbath)
}

// Days per month: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

// Day names (assuming 7-day week)
const DAY_NAMES = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

// Epoch: Tequvah (Vernal Equinox) March 20, 2025 = Year 6028, Month 1, Day 1
const CREATOR_EPOCH = new Date('2025-03-20T00:00:00Z');

/**
 * Check if a year is a long Sabbath year (simplified - adjust based on actual rules)
 * Placeholder: Set true for years needing 1-2 extra days post-52nd Sabbath
 */
function isLongYear(year: number): boolean {
  // Based on tequvah observation—update annually
  // Example: 6028 is common year
  return false;
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
 * Epoch: March 20, 2025 = Year 6028, Month 1, Day 1
 */
export function getCreatorDate(gregorianDate: Date = new Date()): CustomDate {
  const msDiff = gregorianDate.getTime() - CREATOR_EPOCH.getTime();
  const totalDays = Math.floor(msDiff / (24 * 60 * 60 * 1000));

  let year = 6028;
  let remainingDays = totalDays;

  // Calculate year
  while (remainingDays >= (365 + (isLongYear(year) ? 1 : 0))) {
    remainingDays -= 365 + (isLongYear(year) ? 1 : 0);
    year++;
  }

  // Calculate month and day
  let month = 1;
  let day = remainingDays + 1;  // Day 1-based

  while (day > getDaysInMonth(month)) {
    day -= getDaysInMonth(month);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  // Weekday: Year starts on "Day 4" (your rule). Sabbath = 7
  const weekDay = ((totalDays % 7) + 4) % 7 || 7;  // 1-6 work, 7=Sabbath

  return {
    year,
    month,
    day,
    weekDay,  // 1-7
  };
}

/**
 * Convert standard JavaScript Date to custom calendar date (legacy support)
 */
export function toCustomDate(standardDate: Date, startYear: number = 6028): CustomDate {
  return getCreatorDate(standardDate);
}

/**
 * Format custom date as "Year 6028 Month 9 Day 10"
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
  if (date.weekDay === 7) return 'Sabbath';
  return DAY_NAMES[date.weekDay - 1] || `Day ${date.weekDay}`;
}

/**
 * Check if it's the 7th month (Tequvah announcement month)
 */
export function isTequvahMonth(month: number): boolean {
  return month === 7;
}
