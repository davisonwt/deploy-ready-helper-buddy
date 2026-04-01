import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Broadcasts the driver's GPS location to community_drivers every 15 seconds
 * while they have an active (in_progress) booking.
 */
export function useDriverLocationBroadcast(isActive: boolean, userId?: string) {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPos = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isActive || !userId || !navigator.geolocation) return;

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPos.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Push to DB every 15 seconds
    const pushLocation = async () => {
      if (!latestPos.current) return;
      const { lat, lng } = latestPos.current;
      await supabase
        .from('community_drivers')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', userId);
    };

    // Push immediately, then every 15s
    pushLocation();
    intervalRef.current = setInterval(pushLocation, 15000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, userId]);
}
