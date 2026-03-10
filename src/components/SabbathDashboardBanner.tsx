import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { calculateSunrise } from '@/utils/customTime';
import { getCreatorDateSync } from '@/utils/customCalendar';
import { getDayInfo } from '@/utils/sacredCalendar';

type SacredBannerState = {
  loading: boolean;
  isSabbath: boolean;
  isFeast: boolean;
  feastName: string | null;
};

const MONTH_DAYS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
const DEFAULT_LAT = -26.2;
const DEFAULT_LON = 28.0;

function getCreatorDayOfYear(month: number, day: number): number {
  return MONTH_DAYS.slice(0, Math.max(0, month - 1)).reduce((sum, days) => sum + days, 0) + day;
}

/**
 * Shows a sacred-day banner only on active sacred days:
 * - Sabbath: Sabbath message
 * - Feast day: feast-specific message
 */
export const SabbathDashboardBanner: React.FC = () => {
  const [state, setState] = useState<SacredBannerState>({
    loading: true,
    isSabbath: false,
    isFeast: false,
    feastName: null,
  });

  useEffect(() => {
    let mounted = true;

    const computeSacredStatus = (lat: number, lon: number) => {
      const now = new Date();
      const sunriseMinutes = calculateSunrise(now, lat, lon);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const effectiveDate = new Date(now);
      if (nowMinutes < sunriseMinutes) {
        effectiveDate.setDate(effectiveDate.getDate() - 1);
      }

      const creatorDate = getCreatorDateSync(effectiveDate);
      const creatorDay = getCreatorDayOfYear(creatorDate.month, creatorDate.day);
      const dayInfo = getDayInfo(creatorDay);

      if (!mounted) return;
      setState({
        loading: false,
        isSabbath: dayInfo.isSabbath,
        isFeast: dayInfo.isFeast,
        feastName: dayInfo.feastName ?? null,
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => computeSacredStatus(position.coords.latitude, position.coords.longitude),
        () => computeSacredStatus(DEFAULT_LAT, DEFAULT_LON),
        { timeout: 5000 }
      );
    } else {
      computeSacredStatus(DEFAULT_LAT, DEFAULT_LON);
    }

    const interval = setInterval(() => computeSacredStatus(DEFAULT_LAT, DEFAULT_LON), 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (state.loading || (!state.isSabbath && !state.isFeast)) return null;

  const title = state.isSabbath ? 'Shabbat Shalom' : state.feastName || 'Feast Day';
  const description = state.isSabbath
    ? 'It is the Sabbath — a day set apart for rest. All commerce, harvests, and bestowals are paused until the next sunrise.'
    : `Today is ${state.feastName || 'a Feast Day'}. Set-apart feast-day observance is now active.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border border-border/60 overflow-hidden mb-6 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10"
    >
      <div className="px-6 py-5 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-12 bg-border" />
          <span className="text-2xl" aria-hidden>
            {state.isSabbath ? '🕊️' : '✨'}
          </span>
          <div className="h-px w-12 bg-border" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-foreground/80 max-w-2xl mx-auto">{description}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {state.isSabbath ? (
            <>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80">
                ✅ Free content & studies
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80">
                ✅ Chat & community
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80">
                🚫 Commerce paused
              </span>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80">
              🎉 Feast-day banner active only for today
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SabbathDashboardBanner;
