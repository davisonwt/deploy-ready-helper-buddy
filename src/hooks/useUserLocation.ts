import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface UserLocation {
  lat: number;
  lon: number;
  verified: boolean;
  lastUpdated?: Date;
  source?: 'profile' | 'auth-profile' | 'browser' | 'default' | 'manual';
}

const DEFAULT_LOCATION: UserLocation = {
  lat: -26.2, // Johannesburg, South Africa
  lon: 28.0,
  verified: false,
  source: 'default',
};

const KNOWN_LOCATIONS: Record<string, Pick<UserLocation, 'lat' | 'lon'>> = {
  'south africa': { lat: -26.2, lon: 28.0 },
  za: { lat: -26.2, lon: 28.0 },
  johannesburg: { lat: -26.2, lon: 28.0 },
  pretoria: { lat: -25.7479, lon: 28.2293 },
  'cape town': { lat: -33.9249, lon: 18.4241 },
  durban: { lat: -29.8587, lon: 31.0218 },
};

function locationFromText(text?: string | null): UserLocation | null {
  const key = (text || '').trim().toLowerCase();
  if (!key) return null;
  const exact = KNOWN_LOCATIONS[key];
  if (exact) return { ...exact, verified: false, source: 'auth-profile' };
  const foundKey = Object.keys(KNOWN_LOCATIONS).find((name) => key.includes(name));
  return foundKey ? { ...KNOWN_LOCATIONS[foundKey], verified: false, source: 'auth-profile' } : null;
}

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
          // Use type assertion since location columns may not be in generated types yet
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle() as any;

          if (profile?.latitude != null && profile?.longitude != null) {
            setLocation({
              lat: Number(profile.latitude),
              lon: Number(profile.longitude),
              verified: Boolean(profile.location_verified) || false,
              source: 'profile',
            });
            setLoading(false);
            return;
          }

          const textLocation = locationFromText(profile?.location || profile?.country || user?.location || user?.country || user?.user_metadata?.location || user?.user_metadata?.country);
          if (textLocation) {
            setLocation(textLocation);
            await saveLocationToProfile(textLocation);
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
                source: 'browser',
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

  /**
   * Persists a location to the profile -- but only a REAL one.
   *
   * This used to save whatever locationFromText() returned for a member
   * whose profile merely said "South Africa", stamping the Johannesburg
   * centroid (-26.2, 28.0) into profiles.latitude/longitude as though it
   * were their position. 13 of 98 profiles carry that exact pair.
   * RegisterWanderingPage then copies those columns onto the member's
   * wandering_roles row, which is how a Wandering Pillow based in Stilbay
   * and a Wandering Wheel based in Mossel Bay both ended up plotted in
   * Johannesburg, ~1,000 km and ~400 km from their own stated towns.
   *
   * A guess is fine to display; it is not fine to store as fact. Only a
   * browser fix or a manual entry is written now, and unknown stays null.
   */
  const saveLocationToProfile = async (loc: UserLocation) => {
    if (!user?.id) return;
    if (loc.source !== 'browser' && loc.source !== 'manual') return;

    try {
      const { error } = await (supabase.from('profiles') as any)
        .upsert({
          user_id: user.id,
          latitude: loc.lat,
          longitude: loc.lon,
          location_verified: loc.verified,
          location_updated_at: new Date().toISOString(),
          // Only a browser or manual fix reaches here now, so the old
          // `source === 'default' ? 'South Africa'` branch is unreachable --
          // and writing that string back was half of how a country name
          // became a set of coordinates in the first place.
          location: user.location || user.user_metadata?.location || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
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
      source: 'manual',
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

