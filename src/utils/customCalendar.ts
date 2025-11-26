/**
 * Custom Calendar System Utilities
 * 
 * Calendar has 12 months with varying days: 30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31
 * Year starts on the 4th day of the week (announced by Tequvah in the 7th month)
 * Epoch: Gregorian 2025-11-26 = Creator Y6028 M9 D10 Weekday 3
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

// Epoch: Gregorian 2025-11-26 = Creator Y6028 M9 D10 Weekday 3
const CREATOR_EPOCH = new Date('2025-11-26T00:00:00Z');
const EPOCH_CREATOR_DATE = { year: 6028, month: 9, day: 10, weekDay: 3 };

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
  const diffDays = Math.floor(msDiff / (24 * 60 * 60 * 1000));
  
  let year = EPOCH_CREATOR_DATE.year;
  let month = EPOCH_CREATOR_DATE.month;
  let day = EPOCH_CREATOR_DATE.day;
  let weekDay = EPOCH_CREATOR_DATE.weekDay;
  
  let remainingDays = diffDays;
  
  // Move forward or backward based on remainingDays
  while (remainingDays !== 0) {
    const daysInCurrentMonth = getDaysInMonth(month);
    
    if (remainingDays > 0) {
      // Moving forward
      const daysToEndOfMonth = daysInCurrentMonth - day + 1;
      if (remainingDays >= daysToEndOfMonth) {
        remainingDays -= daysToEndOfMonth;
        day = 1;
        month = (month % 12) + 1;
        if (month === 1) year++;
        weekDay = ((weekDay - 1 + daysToEndOfMonth) % 7) + 1;
      } else {
        day += remainingDays;
        weekDay = ((weekDay - 1 + remainingDays) % 7) + 1;
        remainingDays = 0;
      }
    } else {
      // Moving backward
      if (day + remainingDays >= 1) {
        day += remainingDays;
        weekDay = ((weekDay - 1 + remainingDays + 7) % 7) + 1;
        remainingDays = 0;
      } else {
        remainingDays += day;
        month = month === 1 ? 12 : month - 1;
        if (month === 12) year--;
        day = getDaysInMonth(month);
        weekDay = ((weekDay - 1 + remainingDays + 7) % 7) + 1;
      }
    }
  }
  
  return { year, month, day, weekDay };
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
