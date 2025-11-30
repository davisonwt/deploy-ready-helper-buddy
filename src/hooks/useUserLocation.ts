import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface UserLocation {
  lat: number;
  lon: number;
  verified: boolean;
  lastUpdated?: Date;
}

const DEFAULT_LOCATION: UserLocation = {
  lat: -26.2, // Johannesburg, South Africa
  lon: 28.0,
  verified: false,
};

/**
 * Hook to manage user location for calendar calculations
 * Stores location in user profile and allows verification
 */
export function useUserLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load location from profile or geolocation
  useEffect(() => {
    const loadLocation = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to get from profile first
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('latitude, longitude, location_verified')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile?.latitude && profile?.longitude) {
            setLocation({
              lat: profile.latitude,
              lon: profile.longitude,
              verified: profile.location_verified || false,
            });
            setLoading(false);
            return;
          }
        }

        // Fallback to browser geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const newLocation: UserLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                verified: false,
                lastUpdated: new Date(),
              };
              setLocation(newLocation);
              
              // Save to profile if user is logged in
              if (user?.id) {
                await saveLocationToProfile(newLocation);
              }
              
              setLoading(false);
            },
            (err) => {
              console.warn('Geolocation error:', err);
              setLocation(DEFAULT_LOCATION);
              setError('Could not get your location. Using default.');
              setLoading(false);
            }
          );
        } else {
          setLocation(DEFAULT_LOCATION);
          setError('Geolocation not supported. Using default location.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading location:', err);
        setLocation(DEFAULT_LOCATION);
        setError('Error loading location');
        setLoading(false);
      }
    };

    loadLocation();
  }, [user?.id]);

  const saveLocationToProfile = async (loc: UserLocation) => {
    if (!user?.id) return;

    try {
      // Check if profiles table has latitude/longitude columns
      // If not, we'll need to add them via migration
      const { error } = await supabase
        .from('profiles')
        .update({
          latitude: loc.lat,
          longitude: loc.lon,
          location_verified: loc.verified,
          location_updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        // If columns don't exist, just log and continue
        console.warn('Could not save location to profile:', error);
      }
    } catch (err) {
      console.error('Error saving location:', err);
    }
  };

  const updateLocation = async (lat: number, lon: number, verified: boolean = false) => {
    const newLocation: UserLocation = {
      lat,
      lon,
      verified,
      lastUpdated: new Date(),
    };
    
    setLocation(newLocation);
    setError(null);
    
    if (user?.id) {
      await saveLocationToProfile(newLocation);
    }
  };

  const verifyLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateLocation(
          position.coords.latitude,
          position.coords.longitude,
          true
        );
        setLoading(false);
      },
      (err) => {
        setError('Could not verify location: ' + err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return {
    location,
    loading,
    error,
    updateLocation,
    verifyLocation,
  };
}

