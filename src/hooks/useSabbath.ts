import { useState, useEffect } from 'react';
import SunCalc from 'suncalc';

/**
 * YHVH Calendar Sabbath Detection
 * 
 * Sabbath = every 7th day from Tequvah (March 20, 2025)
 * Day begins at sunrise, not midnight.
 * Uses user's geolocation for sunrise calculation.
 */

const TEQUVAH_DATE = new Date('2025-03-20T00:00:00');

// Default coords (Jerusalem) if geolocation unavailable
const DEFAULT_LAT = 31.7683;
const DEFAULT_LON = 35.2137;

interface SabbathState {
  isSabbath: boolean;
  loading: boolean;
  sacredDayNumber: number;
  nextSabbathIn: number; // days until next sabbath
}

function getSunrise(date: Date, lat: number, lon: number): Date {
  const times = SunCalc.getTimes(date, lat, lon);
  return times.sunrise;
}

function calculateSacredDay(now: Date, lat: number, lon: number): number {
  const todaySunrise = getSunrise(now, lat, lon);
  
  // If before today's sunrise, we're still in the previous sacred day
  const effectiveDate = now < todaySunrise
    ? new Date(now.getTime() - 86400000) // go back one calendar day
    : now;
  
  const tequvahSunrise = getSunrise(TEQUVAH_DATE, lat, lon);
  const msDiff = effectiveDate.getTime() - tequvahSunrise.getTime();
  const dayNumber = Math.floor(msDiff / 86400000) + 1;
  
  return dayNumber;
}

export function useSabbath(): SabbathState {
  const [state, setState] = useState<SabbathState>({
    isSabbath: false,
    loading: true,
    sacredDayNumber: 0,
    nextSabbathIn: 0,
  });

  useEffect(() => {
    let lat = DEFAULT_LAT;
    let lon = DEFAULT_LON;

    const compute = (latitude: number, longitude: number) => {
      const now = new Date();
      const dayNumber = calculateSacredDay(now, latitude, longitude);
      const isSabbath = dayNumber > 0 && dayNumber % 7 === 0;
      const daysUntilNext = isSabbath ? 0 : 7 - (dayNumber % 7);

      setState({
        isSabbath,
        loading: false,
        sacredDayNumber: dayNumber,
        nextSabbathIn: daysUntilNext,
      });
    };

    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          compute(lat, lon);
        },
        () => compute(lat, lon), // fallback to Jerusalem
        { timeout: 5000 }
      );
    } else {
      compute(lat, lon);
    }

    // Re-check every 5 minutes (sunrise boundary crossings)
    const interval = setInterval(() => {
      compute(lat, lon);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return state;
}

/**
 * Utility: Check Sabbath without hook (for one-off checks)
 */
export function checkIsSabbathNow(lat = DEFAULT_LAT, lon = DEFAULT_LON): boolean {
  const now = new Date();
  const dayNumber = calculateSacredDay(now, lat, lon);
  return dayNumber > 0 && dayNumber % 7 === 0;
}
