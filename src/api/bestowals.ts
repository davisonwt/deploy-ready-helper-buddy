import { supabase } from '@/integrations/supabase/client';

/**
 * Bestowals data-access layer.
 * Pure functions — no React, no local state. Throw on error.
 *
 * Note: src/api/orchards.ts also contains createBestowal/fetchBestowals with a
 * narrower shape (no profile join). Consolidation is intentionally deferred
 * to a separate slice to keep this change scoped.
 */

export interface CreateBestowalInput {
  orchard_id: string;
  amount: number;
  currency?: string;
  pockets_count?: number;
  pocket_numbers?: number[];
  message?: string | null;
  [key: string]: any;
}

export const createBestowal = async (
  input: CreateBestowalInput,
  bestowerId: string
) => {
  const { data, error } = await supabase
    .from('bestowals')
    .insert([{
      ...input,
      bestower_id: bestowerId,
      payment_status: 'pending',
    }] as any)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateBestowalStatus = async (
  bestowalId: string,
  status: string,
  paymentReference: string | null = null
) => {
  const updateData: Record<string, any> = { payment_status: status };
  if (paymentReference) {
    updateData.payment_reference = paymentReference;
  }

  const { data, error } = await supabase
    .from('bestowals')
    .update(updateData as any)
    .eq('id', bestowalId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchUserBestowals = async (userId: string) => {
  const { data, error } = await supabase
    .from('bestowals')
    .select(`
      *,
      orchards:orchard_id (
        title,
        category,
        images
      )
    `)
    .eq('bestower_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchOrchardBestowalsWithProfiles = async (orchardId: string) => {
  const { data, error } = await supabase
    .from('bestowals')
    .select(`
      *,
      profiles:bestower_id (
        first_name,
        last_name,
        display_name,
        avatar_url
      )
    `)
    .eq('orchard_id', orchardId)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/** Plain bestowals for an orchard — no profile join. Mirrors the old api/orchards.ts shape. */
export const fetchOrchardBestowals = async (orchardId: string) => {
  const { data, error } = await supabase
    .from('bestowals')
    .select(`*`)
    .eq('orchard_id', orchardId)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

