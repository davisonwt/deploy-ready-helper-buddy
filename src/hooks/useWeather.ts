import { useState, useEffect, useCallback } from 'react';

export interface WeatherData {
  temperature: number;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  description: string;
  icon: string;
  isDay: boolean;
}

// Map timezone to approximate coordinates
const TIMEZONE_COORDS: Record<string, { lat: number; lon: number; city: string }> = {
  'Africa/Johannesburg': { lat: -26.2, lon: 28.0, city: 'Johannesburg' },
  'Africa/Cairo': { lat: 30.0, lon: 31.2, city: 'Cairo' },
  'Africa/Lagos': { lat: 6.5, lon: 3.4, city: 'Lagos' },
  'Africa/Nairobi': { lat: -1.3, lon: 36.8, city: 'Nairobi' },
  'Africa/Casablanca': { lat: 33.6, lon: -7.6, city: 'Casablanca' },
  'America/New_York': { lat: 40.7, lon: -74.0, city: 'New York' },
  'America/Chicago': { lat: 41.9, lon: -87.6, city: 'Chicago' },
  'America/Denver': { lat: 39.7, lon: -105.0, city: 'Denver' },
  'America/Los_Angeles': { lat: 34.1, lon: -118.2, city: 'Los Angeles' },
  'America/Toronto': { lat: 43.7, lon: -79.4, city: 'Toronto' },
  'America/Sao_Paulo': { lat: -23.6, lon: -46.6, city: 'São Paulo' },
  'America/Mexico_City': { lat: 19.4, lon: -99.1, city: 'Mexico City' },
  'Europe/London': { lat: 51.5, lon: -0.1, city: 'London' },
  'Europe/Paris': { lat: 48.9, lon: 2.3, city: 'Paris' },
  'Europe/Berlin': { lat: 52.5, lon: 13.4, city: 'Berlin' },
  'Europe/Moscow': { lat: 55.8, lon: 37.6, city: 'Moscow' },
  'Europe/Istanbul': { lat: 41.0, lon: 29.0, city: 'Istanbul' },
  'Asia/Dubai': { lat: 25.3, lon: 55.3, city: 'Dubai' },
  'Asia/Kolkata': { lat: 28.6, lon: 77.2, city: 'New Delhi' },
  'Asia/Shanghai': { lat: 31.2, lon: 121.5, city: 'Shanghai' },
  'Asia/Tokyo': { lat: 35.7, lon: 139.7, city: 'Tokyo' },
  'Asia/Singapore': { lat: 1.4, lon: 103.8, city: 'Singapore' },
  'Asia/Seoul': { lat: 37.6, lon: 127.0, city: 'Seoul' },
  'Asia/Jerusalem': { lat: 31.8, lon: 35.2, city: 'Jerusalem' },
  'Australia/Sydney': { lat: -33.9, lon: 151.2, city: 'Sydney' },
  'Australia/Melbourne': { lat: -37.8, lon: 145.0, city: 'Melbourne' },
  'Pacific/Auckland': { lat: -36.9, lon: 174.8, city: 'Auckland' },
};

// WMO weather codes to description and emoji
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Light rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Light snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '🌨️' },
  75: { description: 'Heavy snow', icon: '❄️' },
  77: { description: 'Snow grains', icon: '❄️' },
  80: { description: 'Light showers', icon: '🌦️' },
  81: { description: 'Moderate showers', icon: '🌧️' },
  82: { description: 'Violent showers', icon: '⛈️' },
  85: { description: 'Light snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '🌨️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

export function getTimezoneCoords(timezone: string | null) {
  if (timezone && TIMEZONE_COORDS[timezone]) {
    return TIMEZONE_COORDS[timezone];
  }
  return TIMEZONE_COORDS['Africa/Johannesburg']; // default
}

export function getAvailableTimezones() {
  return Object.entries(TIMEZONE_COORDS).map(([tz, data]) => ({
    value: tz,
    label: `${data.city} (${tz})`,
    city: data.city,
  }));
}

export function useWeather(timezone: string | null) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    const coords = getTimezoneCoords(timezone);
    setLoading(true);
    setError(null);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(timezone || 'Africa/Johannesburg')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch weather');
      const data = await res.json();

      const code = data.current.weather_code;
      const weatherInfo = WEATHER_CODES[code] || { description: 'Unknown', icon: '🌡️' };

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        temperatureMax: Math.round(data.daily.temperature_2m_max[0]),
        temperatureMin: Math.round(data.daily.temperature_2m_min[0]),
        weatherCode: code,
        windSpeed: Math.round(data.current.wind_speed_10m),
        humidity: data.current.relative_humidity_2m,
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        isDay: data.current.is_day === 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return { weather, loading, error, refetch: fetchWeather };
}
