/**
 * Build a complete scriptural year as a plain data structure ready for the PDF.
 * Joins the existing primitives in customCalendar.ts and sacredCalendar.ts —
 * no new calendar logic.
 */

import { getDayInfo, type DayInfo } from './sacredCalendar';
import { getDaysInMonth } from './customCalendar';

export const MONTH_LABELS: string[] = [
  'Month 1', 'Month 2', 'Month 3',
  'Month 4', 'Month 5', 'Month 6',
  'Month 7', 'Month 8', 'Month 9',
  'Month 10', 'Month 11', 'Month 12',
];

export const WEEKDAY_LABELS: string[] = [
  'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Sabbath',
];

/** Vernal Equinox 20 Mar 2025 = Year 6028, Month 1, Day 1 (matches customCalendar.ts). */
const EPOCH_YEAR = 6028;
const EPOCH_GREGORIAN = Date.UTC(2025, 2, 20); // 20 Mar 2025 UTC

/**
 * Long-year rule mirrors customCalendar.ts::isLongYear.
 * 6028 carried one day outside the 364-day count before 6029 began.
 */
function yearLengthDays(year: number): number {
  return year === 6028 ? 365 : 364;
}

/** Total elapsed days from epoch to start of `year`. */
function daysToYearStart(year: number): number {
  let total = 0;
  for (let y = EPOCH_YEAR; y < year; y++) total += yearLengthDays(y);
  return total;
}

export interface MonthBuild {
  month: number;            // 1-12
  label: string;            // e.g. "Month 4"
  days: ScripturalDay[];    // ordered day-of-month
  gregorianStart: Date;     // first day of month, midnight UTC
  gregorianEnd: Date;       // last day of month, midnight UTC
}

export interface ScripturalDay {
  dayOfMonth: number;
  weekDay: number;          // 1-7 (7 = Sabbath)
  weekDayLabel: string;
  gregorian: Date;          // midnight UTC
  info: DayInfo;            // sabbath / feast / intercalary etc.
}

export interface YearBuild {
  year: number;
  months: MonthBuild[];
  feastDays: { month: number; day: number; gregorian: Date; name: string; isHighSabbath: boolean }[];
}

export function buildScripturalYear(year: number): YearBuild {
  const dayOffsetToYearStart = daysToYearStart(year);
  const months: MonthBuild[] = [];
  const feastDays: YearBuild['feastDays'] = [];

  let creatorDayCounter = 1; // 1..364 within this year
  let runningOffset = dayOffsetToYearStart;

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = getDaysInMonth(m);
    const days: ScripturalDay[] = [];
    let gregorianStart: Date | null = null;
    let gregorianEnd: Date | null = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const info = getDayInfo(creatorDayCounter);
      const gregorian = new Date(EPOCH_GREGORIAN + runningOffset * 86_400_000);
      if (!gregorianStart) gregorianStart = gregorian;
      gregorianEnd = gregorian;

      days.push({
        dayOfMonth: d,
        weekDay: info.weekDay,
        weekDayLabel: WEEKDAY_LABELS[info.weekDay - 1] ?? `Day ${info.weekDay}`,
        gregorian,
        info,
      });

      if (info.isFeast && info.feastName) {
        feastDays.push({
          month: m,
          day: d,
          gregorian,
          name: info.feastName,
          isHighSabbath: info.isHighSabbath,
        });
      }

      creatorDayCounter++;
      runningOffset++;
    }

    months.push({
      month: m,
      label: MONTH_LABELS[m - 1],
      days,
      gregorianStart: gregorianStart!,
      gregorianEnd: gregorianEnd!,
    });
  }

  return { year, months, feastDays };
}

export function formatGregorian(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
