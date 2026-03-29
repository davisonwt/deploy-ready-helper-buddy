import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  user_type: 'driver' | 'provider';
  available_date: string;
  time_slots: Array<{ start_time: string; end_time: string; is_booked: boolean; booking_id?: string }>;
  max_distance_km_remaining: number;
  estimated_hours_remaining: number;
  location_zone?: string;
  is_available: boolean;
}

async function invokeAvailability(method: string, path: string, body?: unknown, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = new URL(`https://${projectId}.supabase.co/functions/v1/gig-availability${path}`);
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

export function useAvailabilityCalendar(userId?: string, month?: number, year?: number) {
  return useQuery({
    queryKey: ['gig-availability', userId, month, year],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (userId) params.user_id = userId;
      if (month) params.month = String(month);
      if (year) params.year = String(year);
      const result = await invokeAvailability('GET', '/calendar', undefined, params);
      return result.data as AvailabilitySlot[];
    },
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dates: string[];
      user_type: 'driver' | 'provider';
      time_slots?: Array<{ start_time: string; end_time: string }>;
      max_distance_km?: number;
      max_hours?: number;
      location_zone?: string;
    }) => {
      const result = await invokeAvailability('POST', '/set-dates', input);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gig-availability'] });
      toast.success('Availability updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCheckAvailability(providerId?: string, date?: string, durationMin?: number, distanceKm?: number) {
  return useQuery({
    queryKey: ['gig-availability-check', providerId, date, durationMin, distanceKm],
    queryFn: async () => {
      const params: Record<string, string> = {
        provider_id: providerId!,
        date: date!,
      };
      if (durationMin) params.duration_min = String(durationMin);
      if (distanceKm) params.distance_km = String(distanceKm);
      const result = await invokeAvailability('GET', '/check', undefined, params);
      return result.data;
    },
    enabled: !!providerId && !!date,
  });
}
