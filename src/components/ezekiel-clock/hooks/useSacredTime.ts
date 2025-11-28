import { useEffect, useState } from 'react';
import SunCalc from 'suncalc';

const EPOCH_STRAIGHT_SHADOW = new Date('2024-03-20T12:00:00Z'); // User can reset
const DAYS_PER_YEAR = 364;

export interface SacredTime {
  year: number;
  dayOfYear: number;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  creature: 'Lion' | 'Ox' | 'Man' | 'Eagle';
  sacredPart: number; // 1–18
  isDaytime: boolean;
  secondsToday: number;
  minutesToday: number;
  formatted: string;
}

export const useSacredTime = (lat: number | null, lon: number | null) => {
  const [now, setNow] = useState(new Date());
  const [sacred, setSacred] = useState<SacredTime | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 100); // Update every 100ms for smooth rotation
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Use default location (Johannesburg) if lat/lon not provided
    const currentLat = lat ?? -26.2;
    const currentLon = lon ?? 28.0;

    try {
      const times = SunCalc.getTimes(now, currentLat, currentLon);
      const sunrise = times.sunrise.getTime();
      const sunset = times.sunset.getTime();
      const nowMs = now.getTime();

      const dayMs = sunset - sunrise;
      const nightMs = 24 * 60 * 60 * 1000 - dayMs;

      let sacredPart: number;
      let isDaytime: boolean;

      if (nowMs < sunrise) {
        // Pre-dawn night (parts 13–18)
        const progress = (nowMs + 24 * 3600000 - sunset) / nightMs;
        sacredPart = 12 + Math.floor(progress * 6) + 1;
        isDaytime = false;
      } else if (nowMs < sunset) {
        // Day (parts 1–12)
        const progress = (nowMs - sunrise) / dayMs;
        sacredPart = Math.floor(progress * 12) + 1;
        isDaytime = true;
      } else {
        // Post-sunset night
        const progress = (nowMs - sunset) / nightMs;
        sacredPart = 12 + Math.floor(progress * 6) + 1;
        isDaytime = false;
      }

      // Enochian Year
      const deltaDays = Math.floor((now.getTime() - EPOCH_STRAIGHT_SHADOW.getTime()) / 86400000);
      const year = Math.floor(deltaDays / DAYS_PER_YEAR) + 1;
      const dayOfYear = (deltaDays % DAYS_PER_YEAR) + 1;

      const quadrant = Math.floor((dayOfYear - 1) / 91);
      const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
      const creatures = ['Lion', 'Ox', 'Man', 'Eagle'] as const;

      const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const minutesToday = now.getHours() * 60 + now.getMinutes();

      setSacred({
        year,
        dayOfYear,
        season: seasons[quadrant],
        creature: creatures[quadrant],
        sacredPart,
        isDaytime,
        secondsToday,
        minutesToday,
        formatted: `Year ${year} • Day ${dayOfYear} • Part ${sacredPart}`,
      });
    } catch (error) {
      console.error('Error calculating sacred time:', error);
    }
  }, [now, lat, lon]);

  return sacred;
};

