/**
 * Sunrise/Sunset Utilities
 * Calculates sunrise times for determining day changes
 */

export interface SunriseData {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  dayLength: number;
}

/**
 * Calculate sunrise time using a free API (sunrise-sunset.org)
 * Falls back to calculation if API fails
 */
export async function getSunriseSunset(
  date: Date,
  lat: number,
  lon: number
): Promise<SunriseData> {
  try {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dateStr}&formatted=0`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      const sunrise = new Date(data.results.sunrise);
      const sunset = new Date(data.results.sunset);
      const solarNoon = new Date(data.results.solar_noon);
      const dayLength = data.results.day_length;
      
      return {
        sunrise,
        sunset,
        solarNoon,
        dayLength
      };
    }
  } catch (error) {
    console.warn('Sunrise API failed, using calculation fallback:', error);
  }
  
  // Fallback: Calculate sunrise using simplified formula
  return calculateSunriseFallback(date, lat, lon);
}

/**
 * Fallback sunrise calculation
 * Uses simplified solar position algorithm
 */
function calculateSunriseFallback(
  date: Date,
  lat: number,
  lon: number
): SunriseData {
  // Day of year (1-366)
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  // Solar declination (approximate)
  const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
  
  // Hour angle for sunrise
  const latRad = lat * Math.PI / 180;
  const declRad = declination * Math.PI / 180;
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declRad));
  
  // Sunrise time in hours (from midnight)
  const sunriseHours = 12 - (hourAngle * 180 / Math.PI) / 15 - lon / 15;
  
  // Create sunrise date
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHours), Math.floor((sunriseHours % 1) * 60), 0, 0);
  
  // Sunset time
  const sunsetHours = 12 + (hourAngle * 180 / Math.PI) / 15 - lon / 15;
  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHours), Math.floor((sunsetHours % 1) * 60), 0, 0);
  
  // Solar noon
  const solarNoon = new Date(date);
  solarNoon.setHours(12, 0, 0, 0);
  
  const dayLength = (sunset.getTime() - sunrise.getTime()) / 1000 / 60; // minutes
  
  return {
    sunrise,
    sunset,
    solarNoon,
    dayLength
  };
}

/**
 * Get current day based on sunrise
 * Day changes at sunrise, not midnight
 */
export function getCurrentDayBySunrise(
  now: Date,
  lat: number,
  lon: number,
  sunriseCache: Map<string, SunriseData>
): Promise<number> {
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  
  // Check if we have cached sunrise data
  const todaySunrise = sunriseCache.get(todayStr);
  const yesterdaySunrise = sunriseCache.get(yesterdayStr);
  
  if (todaySunrise && yesterdaySunrise) {
    // If current time is before today's sunrise, we're still on yesterday's day
    if (now < todaySunrise.sunrise) {
      // Use yesterday's date for day calculation
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return Promise.resolve(calculateDayOfYear(yesterday));
    }
    return Promise.resolve(calculateDayOfYear(now));
  }
  
  // Fetch sunrise data if not cached
  return Promise.all([
    getSunriseSunset(now, lat, lon),
    getSunriseSunset(new Date(now.getTime() - 86400000), lat, lon)
  ]).then(([today, yesterday]) => {
    sunriseCache.set(todayStr, today);
    sunriseCache.set(yesterdayStr, yesterday);
    
    if (now < today.sunrise) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return calculateDayOfYear(yesterday);
    }
    return calculateDayOfYear(now);
  });
}

/**
 * Calculate day of year for sacred calendar
 */
function calculateDayOfYear(date: Date): number {
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  // This is a simplified version - you may need to use getCreatorDate instead
  // For now, using Gregorian day of year as placeholder
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const days = Math.floor(diff / 86400000) + 1;
  return days;
}

