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
 * Get sunrise time for a given date and location
 * Uses sunrise-sunset API or fallback calculation
 */
async function getSunriseTime(date: Date, lat: number, lon: number): Promise<Date> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dateStr}&formatted=0`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      // Sunrise API returns UTC time in ISO format (e.g., "2025-12-01T05:13:00+00:00")
      // JavaScript Date constructor automatically converts UTC to local timezone
      // So sunriseUTC represents the sunrise time at the location, converted to user's local timezone
      const sunriseUTC = new Date(data.results.sunrise);
      
      // The Date object now represents the sunrise time in the user's local timezone
      // This is correct because we want to compare with the user's local current time
      return sunriseUTC;
    }
  } catch (error) {
    console.warn('Sunrise API failed, using fallback:', error);
  }
  
  // Fallback: Use calculateSunrise from customTime (already in local time)
  const { calculateSunrise } = await import('./customTime');
  const sunriseMinutes = calculateSunrise(date, lat, lon);
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseMinutes / 60), sunriseMinutes % 60, 0, 0);
  return sunrise;
}

/**
 * Get sunrise time synchronously (for backwards compatibility)
 */
function getSunriseTimeSync(date: Date, lat: number, lon: number): Date {
  const { calculateSunrise } = require('./customTime');
  const sunriseMinutes = calculateSunrise(date, lat, lon);
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseMinutes / 60), sunriseMinutes % 60, 0, 0);
  return sunrise;
}

/**
 * Get effective date considering sunrise-based day start
 * If current time is before sunrise, use previous day
 */
async function getEffectiveDate(
  gregorianDate: Date,
  lat: number = -26.2,
  lon: number = 28.0
): Promise<Date> {
  const today = new Date(gregorianDate);
  today.setHours(0, 0, 0, 0);
  
  const sunrise = await getSunriseTime(today, lat, lon);
  
  // If current time is before sunrise, we're still on the previous calendar day
  if (gregorianDate < sunrise) {
    const prevDay = new Date(today);
    prevDay.setDate(prevDay.getDate() - 1);
    return prevDay;
  }
  
  return today;
}

/**
 * Convert Gregorian date to Creator's calendar date
 * Epoch: March 20, 2025 = Year 6028, Month 1, Day 1
 * 
 * @param gregorianDate - The Gregorian date to convert
 * @param useSunrise - If true, day starts at sunrise instead of midnight
 * @param lat - Latitude for sunrise calculation (default: -26.2, South Africa)
 * @param lon - Longitude for sunrise calculation (default: 28.0, South Africa)
 */
export async function getCreatorDate(
  gregorianDate: Date = new Date(),
  useSunrise: boolean = false,
  lat: number = -26.2,
  lon: number = 28.0
): Promise<CustomDate> {
  let effectiveDate = gregorianDate;
  
  if (useSunrise) {
    effectiveDate = await getEffectiveDate(gregorianDate, lat, lon);
  }
  
  const msDiff = effectiveDate.getTime() - CREATOR_EPOCH.getTime();
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
 * Synchronous version for backwards compatibility
 * Uses midnight-based day start
 */
export function getCreatorDateSync(gregorianDate: Date = new Date()): CustomDate {
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
  return getCreatorDateSync(standardDate);
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
