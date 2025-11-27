import { useState, useEffect } from 'react';

export interface UserLocation {
  lat: number | null;
  lon: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get user's geolocation
 * Falls back to Johannesburg, South Africa if permission denied
 */
export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    lat: null,
    lon: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      // Fallback to Johannesburg
      setLocation({
        lat: -26.2,
        lon: 28.0,
        loading: false,
        error: null,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        // Fallback to Johannesburg on error
        setLocation({
          lat: -26.2,
          lon: 28.0,
          loading: false,
          error: error.message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  return location;
}

