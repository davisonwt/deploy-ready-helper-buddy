import SunCalc from 'suncalc';
import { getDaysOutOfTimeCount } from './customCalendar';

/**
 * Dashboard/Journal Creator Calendar Utilities
 *
 * Canonical rules implemented here:
 * - Day starts at local sunrise (sunrise-to-sunrise)
 * - Year 6028 starts on 2025-03-20 (Month 1 Day 1)
 * - Regular count is 364 days
 * - Days Out of Time (DOT) are inserted after Month 12 Day 28 and do NOT advance weekday
 */

export interface CreatorCalendarDate {
  year: number;
  month: number;
  day: number;
  weekDay: number;
  dayOfYear: number; // regular 1..364 (DOT excluded)
  isDayOutOfTime?: boolean;
  dotDay?: number; // 1..N when in DOT window
}

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
const EPOCH_YEAR = 2025;
const EPOCH_MONTH_INDEX = 2; // March (0-indexed)
const EPOCH_DAY = 20;

function getDateAtNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function getEffectiveDateBySunrise(date: Date, lat: number, lon: number): Date {
  // IMPORTANT: SunCalc can return previous-day events when called with early-night timestamps.
  // Normalize to local noon first so sunrise lookup is always for the intended local date.
  const localNoon = getDateAtNoon(date);
  const sunrise = SunCalc.getTimes(localNoon, lat, lon).sunrise;

  const effective = getDateAtNoon(date);
  if (date < sunrise) {
    effective.setDate(effective.getDate() - 1);
  }
  return effective;
}

function getDaysSinceEpoch(localDate: Date): number {
  const currentUtcMidnight = Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
  const epochUtcMidnight = Date.UTC(EPOCH_YEAR, EPOCH_MONTH_INDEX, EPOCH_DAY);
  return Math.floor((currentUtcMidnight - epochUtcMidnight) / 86400000);
}

function mapAbsoluteDayToRegularDay(absoluteDayInYear: number, dotDays: number): {
  regularDayOfYear: number;
  isDayOutOfTime: boolean;
  dotDay: number;
} {
  // Day 361 = Month 12 Day 28 (last regular Sabbath)
  if (absoluteDayInYear > 361 && absoluteDayInYear <= 361 + dotDays) {
    return {
      regularDayOfYear: 361,
      isDayOutOfTime: true,
      dotDay: absoluteDayInYear - 361,
    };
  }

  if (absoluteDayInYear > 361 + dotDays) {
    return {
      regularDayOfYear: absoluteDayInYear - dotDays,
      isDayOutOfTime: false,
      dotDay: 0,
    };
  }

  return {
    regularDayOfYear: absoluteDayInYear,
    isDayOutOfTime: false,
    dotDay: 0,
  };
}

/**
 * Canonical Creator calendar calculation.
 *
 * @param date Gregorian date/time
 * @param lat Latitude used for sunrise rollover
 * @param lon Longitude used for sunrise rollover
 */
export function calculateCreatorDate(
  date: Date = new Date(),
  lat: number = -26.2,
  lon: number = 28.0
): CreatorCalendarDate {
  const effectiveDate = getEffectiveDateBySunrise(date, lat, lon);
  let totalDaysSinceEpoch = getDaysSinceEpoch(effectiveDate);

  // Resolve Creator year using per-year DOT counts
  let year = 6028;
  while (totalDaysSinceEpoch >= 364 + getDaysOutOfTimeCount(year)) {
    totalDaysSinceEpoch -= 364 + getDaysOutOfTimeCount(year);
    year++;
  }

  const absoluteDayInYear = totalDaysSinceEpoch + 1; // includes DOT window
  const dotDaysThisYear = getDaysOutOfTimeCount(year);

  const { regularDayOfYear, isDayOutOfTime, dotDay } =
    mapAbsoluteDayToRegularDay(absoluteDayInYear, dotDaysThisYear);

  // Convert regular day-of-year (1..364) -> month/day
  let month = 1;
  let day = regularDayOfYear;
  while (day > DAYS_PER_MONTH[month - 1]) {
    day -= DAYS_PER_MONTH[month - 1];
    month++;
  }

  // Weekday follows regular count only (DOT does not advance weekday)
  // Month 1 Day 1 = weekday 4
  const weekDay = ((regularDayOfYear - 1 + 3) % 7) + 1;

  return {
    year,
    month,
    day,
    weekDay,
    dayOfYear: regularDayOfYear,
    isDayOutOfTime,
    dotDay,
  };
}
