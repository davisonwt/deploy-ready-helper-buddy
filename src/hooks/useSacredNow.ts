/**
 * useSacredNow — single source of truth for the current sacred date.
 *
 * Ticks every 60 seconds. The day rolls at the USER'S local sunrise (not midnight).
 * Exposes Creator date (Year/Month/Day), weekday, Omer count, and next feast.
 *
 * Foundation for the 364yhvh bead calendar, dashboard "Today" widget, and
 * anywhere else that needs to know "what sacred day is it right now?".
 */

import { useEffect, useState } from 'react';
import { useUserLocation } from './useUserLocation';
import { getCreatorDate, getCreatorDateSync, type CustomDate } from '@/utils/customCalendar';
import { getDayInfo } from '@/utils/sacredCalendar';

export interface SacredNow {
  /** Creator date (sunrise-based when location is available). */
  date: CustomDate;
  /** Day-of-year 1..364 (computed from month/day). */
  dayOfYear: number;
  /** Weekday 1-7 (7 = Sabbath). */
  weekDay: number;
  isSabbath: boolean;
  isFeast: boolean;
  feastName?: string;
  /** Omer count 1..50 if currently in the Omer window, else null. */
  omer: number | null;
  omerTotal: 50;
  nextFeast: string;
  /** Whether the date is sunrise-aware (true) or fell back to midnight. */
  sunriseAware: boolean;
  loading: boolean;
}

/** Days-in-month lookup for the 364-day pattern (30/30/31 × 4). */
const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

function toDayOfYear(d: CustomDate): number {
  let total = 0;
  for (let m = 1; m < d.month; m++) total += DAYS_PER_MONTH[m - 1];
  return total + d.day;
}

/**
 * Omer counting starts the day after Pesach (Month 1, Day 16) and runs 50 days
 * to Shavuot (Month 3, Day 6 in this calendar — the "Feast of Weeks").
 */
/**
 * Omer counting in this calendar: Omer 1 = doy 26 (the day after the
 * Wave-Sheaf / first Sunday after Unleavened Bread). Omer 50 = doy 75 = Shavu'ot.
 * Anchored from observed reality: 2026-04-30 = M2D12 = doy 42 = Omer 17.
 */
const OMER_START_DOY = 26;
const OMER_END_DOY = OMER_START_DOY + 49; // inclusive day 50 = doy 75

function computeOmer(dayOfYear: number): number | null {
  if (dayOfYear < OMER_START_DOY || dayOfYear > OMER_END_DOY) return null;
  return dayOfYear - OMER_START_DOY + 1;
}

/** Very small "what's next" feast lookup so the dashboard can show context. */
function nextFeastFor(dayOfYear: number): string {
  if (dayOfYear < 1) return 'New Year';
  if (dayOfYear < 15) return 'Pesach';
  if (dayOfYear <= OMER_END_DOY) return "Shavu'ot";
  if (dayOfYear < 184) return 'Yom Teruah';
  if (dayOfYear < 191) return 'Yom Kippur';
  if (dayOfYear < 196) return 'Sukkot';
  return 'New Year';
}

export function useSacredNow(tickMs = 60_000): SacredNow {
  const { location } = useUserLocation();
  const [now, setNow] = useState<Date>(() => new Date());
  const [date, setDate] = useState<CustomDate>(() => getCreatorDateSync(new Date()));
  const [sunriseAware, setSunriseAware] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tick clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  // Recompute sunrise-based date whenever the clock ticks or location changes
  useEffect(() => {
    let cancelled = false;
    // Don't pre-set midnight date — it would flash the wrong (post-midnight)
    // day before the sunrise-aware calc returns. Wait for the real answer.
    const run = async () => {
      try {
        const d = await getCreatorDate(now, true, location.lat, location.lon);
        if (cancelled) return;
        // Trust the sunrise-aware date. Before local sunrise, this correctly
        // returns YESTERDAY's sacred day. The previous "max(midnight, sunrise)"
        // guard defeated the whole point of sunrise rollover.
        setDate(d);
        setSunriseAware(true);
      } catch {
        if (cancelled) return;
        setDate(getCreatorDateSync(now));
        setSunriseAware(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [now, location.lat, location.lon]);

  const dayOfYear = toDayOfYear(date);
  const info = getDayInfo(Math.min(Math.max(dayOfYear, 1), 364));
  const omer = computeOmer(dayOfYear);

  return {
    date,
    dayOfYear,
    weekDay: date.weekDay,
    isSabbath: date.weekDay === 7,
    isFeast: info.isFeast,
    feastName: info.feastName,
    omer,
    omerTotal: 50,
    nextFeast: nextFeastFor(dayOfYear),
    sunriseAware,
    loading,
  };
}
