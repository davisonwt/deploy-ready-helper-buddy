/**
 * Custom Calendar System Utilities
 * 
 * Calendar has 12 months with varying days: 30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31
 * Year starts on the 4th day of the week (announced by Tequvah in the 7th month)
 */

export interface CustomDate {
  year: number;
  month: number; // 1-12
  day: number;
}

// Days per month: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

// Day names (assuming 7-day week)
const DAY_NAMES = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

/**
 * Get the number of days in a specific month
 */
export function getDaysInMonth(month: number): number {
  if (month < 1 || month > 12) return 30;
  return DAYS_PER_MONTH[month - 1];
}

/**
 * Convert standard JavaScript Date to custom calendar date
 * This is a simplified conversion - you may need to adjust based on your specific epoch
 */
export function toCustomDate(standardDate: Date, startYear: number = 6028): CustomDate {
  // Convert Gregorian date (2025-11-26) to custom calendar date (Y6028 M9 D10)
  // Epoch: Gregorian 2025-11-26 = Custom Y6028 M9 D10
  const epoch = new Date('2025-11-26T00:00:00Z');
  const diffTime = standardDate.getTime() - epoch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let year = startYear;
  let month = 9; // Start at month 9
  let day = 10; // Start at day 10
  let remainingDays = diffDays;
  
  // Calculate year
  const daysPerYear = DAYS_PER_MONTH.reduce((sum, days) => sum + days, 0);
  const yearsToAdd = Math.floor(remainingDays / daysPerYear);
  year += yearsToAdd;
  remainingDays -= yearsToAdd * daysPerYear;
  
  // Calculate month and day (starting from month 9, day 10)
  let currentMonth = month;
  let currentDay = day;
  
  // Move forward or backward based on remainingDays
  while (remainingDays !== 0) {
    const daysInCurrentMonth = getDaysInMonth(currentMonth);
    
    if (remainingDays > 0) {
      // Moving forward
      const daysToEndOfMonth = daysInCurrentMonth - currentDay + 1;
      if (remainingDays >= daysToEndOfMonth) {
        remainingDays -= daysToEndOfMonth;
        currentDay = 1;
        currentMonth = (currentMonth % 12) + 1;
        if (currentMonth === 1) year++;
      } else {
        currentDay += remainingDays;
        remainingDays = 0;
      }
    } else {
      // Moving backward
      if (currentDay + remainingDays >= 1) {
        currentDay += remainingDays;
        remainingDays = 0;
      } else {
        remainingDays += currentDay;
        currentMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        if (currentMonth === 12) year--;
        currentDay = getDaysInMonth(currentMonth);
      }
    }
  }
  
  return { year, month: currentMonth, day: currentDay };
}

/**
 * Format custom date as "Y6028 M9 D10"
 */
export function formatCustomDate(date: CustomDate): string {
  return `Y${date.year} M${date.month} D${date.day}`;
}

/**
 * Get day of week for a custom date
 * Year starts on day 4 of the week
 */
export function getDayOfWeek(date: CustomDate): string {
  // Calculate total days since year start
  let totalDays = date.day - 1;
  for (let m = 1; m < date.month; m++) {
    totalDays += getDaysInMonth(m);
  }
  
  // Year starts on day 4 (index 3)
  const dayIndex = (totalDays + 3) % 7;
  return DAY_NAMES[dayIndex];
}

/**
 * Check if it's the 7th month (Tequvah announcement month)
 */
export function isTequvahMonth(month: number): boolean {
  return month === 7;
}

