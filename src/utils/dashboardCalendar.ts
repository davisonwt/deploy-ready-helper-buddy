/**
 * Dashboard Calendar Calculation Utilities
 * 
 * This module provides the exact same calendar calculation logic used in DashboardPage
 * to ensure consistency across all pages.
 * 
 * Key features:
 * - Uses hardcoded sunrise time (05:13) for day start
 * - Pure local date arithmetic (no UTC conversion)
 * - Epoch: March 20, 2025 = Year 6028, Month 1, Day 1
 */

export interface CreatorCalendarDate {
  year: number;
  month: number;
  day: number;
  weekDay: number;
  dayOfYear: number;
}

/**
 * Calculate Creator calendar date using the exact same logic as DashboardPage
 * Uses hardcoded sunrise time (05:13) and pure local date arithmetic
 */
export function calculateCreatorDate(date: Date = new Date()): CreatorCalendarDate {
  // Get current LOCAL time - no UTC conversion
  const localYear = date.getFullYear();
  const localMonth = date.getMonth();
  const localDate = date.getDate();
  const localHour = date.getHours();
  const localMinute = date.getMinutes();
  
  // IMPORTANT: Day starts at sunrise (05:13), not midnight!
  const currentTimeMinutes = localHour * 60 + localMinute;
  const sunriseTimeMinutes = 5 * 60 + 13; // 05:13 = 313 minutes
  
  // If current time is before sunrise, we're still on the previous calendar day
  let effectiveYear = localYear;
  let effectiveMonth = localMonth;
  let effectiveDate = localDate;
  
  if (currentTimeMinutes < sunriseTimeMinutes) {
    // Still on previous day - go back one day using date arithmetic
    const prevDayDate = new Date(localYear, localMonth, localDate);
    prevDayDate.setDate(prevDayDate.getDate() - 1);
    effectiveYear = prevDayDate.getFullYear();
    effectiveMonth = prevDayDate.getMonth();
    effectiveDate = prevDayDate.getDate();
  }
  
  // Calculate Creator date using PURE LOCAL date arithmetic (NO UTC, NO getTime())
  // Epoch: March 20, 2025 = Year 6028, Month 1, Day 1 (LOCAL time)
  const epochYear = 2025;
  const epochMonth = 2; // March (0-indexed)
  const epochDate = 20;
  
  // Calculate days difference using PURE date arithmetic (no milliseconds, no UTC)
  let totalDays = 0;
  
  // Count days from epoch to effective date using local date components only
  let currentYear = epochYear;
  let currentMonth = epochMonth;
  let currentDate = epochDate;
  
  const gregorianDaysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap years
  const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  
  while (currentYear < effectiveYear || 
         (currentYear === effectiveYear && currentMonth < effectiveMonth) ||
         (currentYear === effectiveYear && currentMonth === effectiveMonth && currentDate < effectiveDate)) {
    totalDays++;
    currentDate++;
    
    let daysInCurrentMonth = gregorianDaysPerMonth[currentMonth];
    if (currentMonth === 1 && isLeapYear(currentYear)) {
      daysInCurrentMonth = 29; // February in leap year
    }
    
    if (currentDate > daysInCurrentMonth) {
      currentDate = 1;
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }
  
  // Calculate Creator calendar date
  const daysPerMonth = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let year = 6028;
  let remainingDays = totalDays;
  
  // Calculate year
  while (remainingDays >= 365) {
    remainingDays -= 365;
    year++;
  }
  
  // Calculate month and day
  let month = 1;
  let day = remainingDays + 1;
  
  while (day > daysPerMonth[month - 1]) {
    day -= daysPerMonth[month - 1];
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  
  // Calculate day of year
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let dayOfYear = 0;
  for (let i = 0; i < month - 1; i++) {
    dayOfYear += monthDays[i];
  }
  dayOfYear += day;
  
  // Weekday calculation:
  // The sacred calendar has Month 1 Day 1 = Day 4 of the week
  // Each week has 7 days, year has 364 days (52 complete weeks)
  // Month 9 Day 1 should be Day 1 of the week (beginning of week)
  // Month 9 starts at day 244 (30+30+31+30+30+31+30+30+1 = 244)
  // Formula: weekDay = ((dayOfYear - 1 + 3) % 7) + 1
  // This ensures: Day 1 = weekDay 4, Day 4 = weekDay 7 (sabbath), etc.
  // Verification: Day 244 (Month 9 Day 1) = ((244 - 1 + 3) % 7) + 1 = (246 % 7) + 1 = 1 ✓
  const weekDay = ((dayOfYear - 1 + 3) % 7) + 1;
  
  return {
    year,
    month,
    day,
    weekDay,
    dayOfYear,
  };
}

