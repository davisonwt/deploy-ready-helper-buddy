import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackingPoint {
  id: string;
  booking_id: string;
  provider_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  status: string;
  recorded_at: string;
}

async function invokeTracking(method: string, path: string, body?: unknown, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = new URL(`https://${projectId}.supabase.co/functions/v1/gig-tracking${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Request failed');
  return result;
}

export function useLatestTracking(bookingId?: string) {
  return useQuery({
    queryKey: ['gig-tracking', bookingId],
    queryFn: async () => {
      const result = await invokeTracking('GET', '/latest', undefined, { booking_id: bookingId! });
      return result.data as TrackingPoint | null;
    },
    enabled: !!bookingId,
    refetchInterval: 5000, // Poll every 5s
  });
}

// Real-time tracking via Supabase Realtime
export function useRealtimeTracking(bookingId?: string) {
  const [location, setLocation] = useState<TrackingPoint | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`tracking:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gig_live_tracking',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setLocation(payload.new as TrackingPoint);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return location;
}

// For drivers: send location updates
export async function sendLocationUpdate(data: {
  booking_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  status: string;
}) {
  return invokeTracking('POST', '/update', data);
}
