/**
 * Omer / 50-Day Count Utility
 *
 * Three overlapping 50-day cycles where the 50th day of one cycle
 * is simultaneously the 1st day of the next:
 *
 *   1. Omer → Shavu'ot   (M1 D19 → 50 days)
 *   2. Count → New Wine   (Shavu'ot day 1 → 50 days)
 *   3. Count → New Oil    (New Wine day 1 → 50 days)
 *
 * Uses the 364-day sacred calendar (30/30/31 pattern).
 */

import { calculateCreatorDate, type CreatorCalendarDate } from './dashboardCalendar';

const MONTH_DAYS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

/** Convert month/day to absolute day of year (1-based). */
function toDayOfYear(month: number, day: number): number {
  let d = 0;
  for (let m = 0; m < month - 1; m++) d += MONTH_DAYS[m];
  return d + day;
}

// Omer starts on M1 D26 (day 26)
const OMER_START = toDayOfYear(1, 26);        // day 26
const SHAVUOT_START = OMER_START + 49;        // day 75  (M3 D15 — Omer day 50 = Wine day 1)
const NEW_WINE_START = SHAVUOT_START;         // day 75
const NEW_OIL_START = NEW_WINE_START + 49;    // day 124 (M5 D3 — Wine day 50 = Oil day 1)

export interface OmerCycle {
  count: number;   // 1-50
  total: 50;
  label: string;   // 'Omer → Shavu\'ot' | etc.
  shortLabel: string;
  feast: string;   // destination feast
  color: string;   // tailwind text color
  emoji: string;
}

/**
 * Get all active 50-day cycle counts for a given sacred month/day.
 * Returns an empty array if outside any count window.
 */
export function getOmerCounts(month: number, day: number): OmerCycle[] {
  const doy = toDayOfYear(month, day);
  const results: OmerCycle[] = [];

  if (doy >= OMER_START && doy < OMER_START + 50) {
    results.push({
      count: doy - OMER_START + 1,
      total: 50,
      label: 'Omer → Shavu\'ot',
      shortLabel: 'Omer',
      feast: 'Shavu\'ot',
      color: 'text-amber-400',
      emoji: '🌾',
    });
  }

  if (doy >= NEW_WINE_START && doy < NEW_WINE_START + 50) {
    results.push({
      count: doy - NEW_WINE_START + 1,
      total: 50,
      label: 'Count → New Wine',
      shortLabel: 'Wine',
      feast: 'New Wine',
      color: 'text-rose-400',
      emoji: '🍷',
    });
  }

  if (doy >= NEW_OIL_START && doy < NEW_OIL_START + 50) {
    results.push({
      count: doy - NEW_OIL_START + 1,
      total: 50,
      label: 'Count → New Oil',
      shortLabel: 'Oil',
      feast: 'New Oil',
      color: 'text-emerald-400',
      emoji: '🫒',
    });
  }

  return results;
}

/**
 * Get Omer counts for today using the Creator calendar.
 */
export function getTodayOmerCounts(): OmerCycle[] {
  const today = calculateCreatorDate();
  return getOmerCounts(today.month, today.day);
}
