import { getDaysOutOfTimeCount } from '@/utils/customCalendar';

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
const EPOCH_UTC_MIDNIGHT = Date.UTC(2025, 2, 20); // 2025-03-20

export interface JournalYhwhDate {
  year: number;
  month: number;
  day: number;
  weekDay: number;
  dayOfYear: number;
}

export const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const parseLocalDateKey = (dateKey?: string | null): Date | null => {
  if (!dateKey || typeof dateKey !== 'string') return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export function calculateYhwhDateFromCivilDate(date: Date): JournalYhwhDate {
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  let totalDaysSinceEpoch = Math.floor(
    (Date.UTC(normalizedDate.getFullYear(), normalizedDate.getMonth(), normalizedDate.getDate()) - EPOCH_UTC_MIDNIGHT) /
      86400000
  );

  let year = 6028;
  while (totalDaysSinceEpoch >= 364 + getDaysOutOfTimeCount(year)) {
    totalDaysSinceEpoch -= 364 + getDaysOutOfTimeCount(year);
    year += 1;
  }

  const absoluteDayInYear = totalDaysSinceEpoch + 1;
  const dotDays = getDaysOutOfTimeCount(year);

  let regularDayOfYear = absoluteDayInYear;
  if (absoluteDayInYear > 361 && absoluteDayInYear <= 361 + dotDays) {
    regularDayOfYear = 361;
  } else if (absoluteDayInYear > 361 + dotDays) {
    regularDayOfYear = absoluteDayInYear - dotDays;
  }

  let month = 1;
  let day = regularDayOfYear;
  while (day > DAYS_PER_MONTH[month - 1]) {
    day -= DAYS_PER_MONTH[month - 1];
    month += 1;
  }

  const weekDay = ((regularDayOfYear - 1 + 3) % 7) + 1;

  return {
    year,
    month,
    day,
    weekDay,
    dayOfYear: regularDayOfYear,
  };
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasMeaningfulJournalEntry(entry: {
  content?: string | null;
  gratitude?: string | null;
  images?: unknown;
  voice_notes?: unknown;
  videos?: unknown;
  recipes?: unknown;
  tags?: unknown;
}): boolean {
  const hasText = Boolean(entry.content?.trim()) || Boolean(entry.gratitude?.trim());
  const hasMedia =
    toArray(entry.images).length > 0 ||
    toArray(entry.voice_notes).length > 0 ||
    toArray(entry.videos).length > 0 ||
    toArray(entry.recipes).length > 0;
  const hasTags = toArray(entry.tags).length > 0;

  return hasText || hasMedia || hasTags;
}
