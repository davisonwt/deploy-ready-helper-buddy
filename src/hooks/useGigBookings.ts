import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface GigBooking {
  id: string;
  booking_type: 'ride' | 'delivery' | 'service';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_id: string;
  provider_id: string;
  provider_type: 'driver' | 'service_provider';
  pickup_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_datetime?: string;
  dropoff_address?: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_datetime?: string;
  is_round_trip: boolean;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  estimated_fare?: number;
  final_fare?: number;
  service_details?: Record<string, unknown>;
  is_multi_day: boolean;
  booking_dates?: string[];
  payment_status: string;
  platform_fee_amount?: number;
  admin_fee_amount?: number;
  provider_earnings?: number;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  booking_type: 'ride' | 'delivery' | 'service';
  provider_id: string;
  provider_type: 'driver' | 'service_provider';
  pickup_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_datetime?: string;
  dropoff_address?: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_datetime?: string;
  is_round_trip?: boolean;
  return_pickup_datetime?: string;
  return_dropoff_datetime?: string;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  estimated_fare?: number;
  service_details?: Record<string, unknown>;
  is_multi_day?: boolean;
  booking_dates?: string[];
  customer_notes?: string;
}

async function invokeGigFunction(functionName: string, method: string, path: string, body?: unknown, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/${functionName}${path}`;
  
  const url = new URL(baseUrl);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

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

// Hooks
export function useMyBookings(role: 'customer' | 'provider' = 'customer', status?: string) {
  return useQuery({
    queryKey: ['gig-bookings', role, status],
    queryFn: async () => {
      const params: Record<string, string> = { role };
      if (status) params.status = status;
      const result = await invokeGigFunction('gig-bookings', 'GET', '/my-bookings', undefined, params);
      return result.data as GigBooking[];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const result = await invokeGigFunction('gig-bookings', 'POST', '/', input);
      return result.data as GigBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gig-bookings'] });
      toast.success('Booking created successfully!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create booking');
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { booking_id: string; status: string; actual_distance_km?: number; actual_duration_min?: number; final_fare?: number }) => {
      const result = await invokeGigFunction('gig-bookings', 'PUT', '/status', input);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gig-bookings'] });
      toast.success('Booking status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { booking_id: string; reason?: string }) => {
      const result = await invokeGigFunction('gig-bookings', 'PUT', '/cancel', input);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gig-bookings'] });
      toast.success('Booking cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSearchProviders(type: 'driver' | 'service', params?: Record<string, string>) {
  return useQuery({
    queryKey: ['gig-providers', type, params],
    queryFn: async () => {
      const result = await invokeGigFunction('gig-bookings', 'GET', '/search', undefined, { type, ...params });
      return result;
    },
    enabled: !!type,
  });
}

export function useProviderEarnings(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['gig-earnings', dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const result = await invokeGigFunction('gig-bookings', 'GET', '/earnings', undefined, params);
      return result.data;
    },
  });
}
