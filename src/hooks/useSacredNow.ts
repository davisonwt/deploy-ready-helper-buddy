/**
 * useSacredNow — single source of truth for the current sacred date.
 *
 * Ticks every 60 seconds. The day rolls at the USER'S local sunrise (not midnight).
 * Exposes Creator date (Year/Month/Day), weekday, 50-day feast count, and next feast.
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
  /** Current 50-day feast count 1..50 if currently in a count window, else null. */
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
 * Chained 50-day feast counts.
 * Shavu'ot's 50th day (doy 75) is also day 1 toward Feast of New Wine.
 * Feast of New Wine (doy 124) begins the count toward Feast of New Oil.
 */
const OMER_START_DOY = 26;
const SHAVUOT_DOY = 75;
const NEW_WINE_DOY = 124;
const NEW_OIL_DOY = 173;

function computeOmer(dayOfYear: number): number | null {
  if (dayOfYear >= SHAVUOT_DOY && dayOfYear <= NEW_WINE_DOY) {
    return dayOfYear - SHAVUOT_DOY + 1;
  }
  if (dayOfYear > NEW_WINE_DOY && dayOfYear <= NEW_OIL_DOY) {
    return dayOfYear - NEW_WINE_DOY + 1;
  }
  if (dayOfYear >= OMER_START_DOY && dayOfYear < SHAVUOT_DOY) {
    return dayOfYear - OMER_START_DOY + 1;
  }
  return null;
}

/** Very small "what's next" feast lookup so the dashboard can show context. */
function nextFeastFor(dayOfYear: number): string {
  if (dayOfYear < 1) return 'New Year';
  if (dayOfYear < 15) return 'Pesach';
  if (dayOfYear < SHAVUOT_DOY) return "Shavu'ot";
  if (dayOfYear <= NEW_WINE_DOY) return 'Feast of New Wine';
  if (dayOfYear <= NEW_OIL_DOY) return 'Feast of New Oil';
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
