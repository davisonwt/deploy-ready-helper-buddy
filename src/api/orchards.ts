import { supabase } from '@/integrations/supabase/client';

/**
 * Orchards data-access layer.
 * Single source of truth for all orchard/bestowal queries.
 * Pure functions — no React, no local state.
 *
 * Two error conventions are intentionally preserved to match existing callers:
 *  - Functions that THROW on error: fetchOrchard, fetchOrchards, createBestowal,
 *    fetchBestowals, incrementOrchardViews (used by api/orchards.js consumers).
 *  - Functions consumed by useOrchards return raw data / throw; the hook wraps
 *    them in its existing {success,error} envelope.
 */

// ---------- Types ----------

export interface OrchardFilters {
  category?: string;
  location?: string;
  search?: string;
  limit?: number;
}

export interface BestowalInput {
  orchard_id: string;
  bestower_id: string;
  amount: number;
  currency?: string;
  pockets_count?: number;
  pocket_numbers?: number[];
  message?: string | null;
}

// ---------- Orchards: read ----------

/** Throws on error. Used by OrchardErrorPage / OrchardCreatedPage. */
export const fetchOrchard = async (orchardId: string) => {
  try {
    const { data, error } = await supabase
      .from('orchards')
      .select(`*`)
      .eq('id', orchardId)
      .eq('status', 'active')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Orchard not found');
    return data;
  } catch (error) {
    console.error('Error fetching orchard:', error);
    throw error;
  }
};

/** Throws on error. List active orchards with optional filters. */
export const fetchOrchardsList = async (filters: OrchardFilters = {}) => {
  try {
    let query = supabase
      .from('orchards')
      .select(`*`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  } catch (error) {
    console.error('Error fetching orchards:', error);
    throw error;
  }
};

/**
 * Fetch single orchard with session check + best-effort view increment.
 * Returns the raw data row, or null if not found / unauthorized.
 * Throws on session-missing or database error so the hook can branch.
 */
export const fetchOrchardByIdWithSession = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔍 fetchOrchardById session check:', {
    hasSession: !!session,
    userId: session?.user?.id,
    orchardId: id,
  });

  if (!session) {
    const err: any = new Error('Authentication session expired. Please log in again.');
    err.code = 'NO_SESSION';
    throw err;
  }

  const { data, error: fetchError } = await supabase
    .from('orchards')
    .select(`*`)
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  console.log('🔍 Orchard fetch result:', {
    hasData: !!data,
    error: fetchError?.message,
    orchardUserId: (data as any)?.user_id,
    currentUserId: session?.user?.id,
  });

  if (fetchError) {
    console.error('❌ Database error:', fetchError);
    const err: any = new Error(`Database error: ${fetchError.message}`);
    err.code = 'DB_ERROR';
    throw err;
  }

  if (!data) {
    console.warn('⚠️ No orchard found with ID:', id);
    return null;
  }

  // Best-effort view-count bump
  try {
    await supabase.rpc('increment_orchard_views', { orchard_uuid: id });
    console.log('✅ View count incremented for orchard:', id);
  } catch (viewError) {
    console.warn('⚠️ Failed to increment view count:', viewError);
  }

  return data;
};

// ---------- Orchards: write ----------

export const createOrchard = async (
  orchardData: Record<string, any>,
  userId: string
) => {
  const { data, error } = await supabase
    .from('orchards')
    .insert([{ ...orchardData, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateOrchard = async (
  id: string,
  updates: Record<string, any>,
  userId: string,
  isGosat: boolean
) => {
  let query = supabase.from('orchards').update(updates).eq('id', id);
  if (!isGosat) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
};

export const deleteOrchard = async (id: string) => {
  const { error } = await supabase.from('orchards').delete().eq('id', id);
  if (error) throw error;
};

// ---------- Bestowals ----------

export const createBestowal = async (bestowalData: BestowalInput) => {
  try {
    const { data, error } = await supabase
      .from('bestowals')
      .insert([{
        orchard_id: bestowalData.orchard_id,
        bestower_id: bestowalData.bestower_id,
        amount: bestowalData.amount,
        currency: bestowalData.currency || 'USD',
        pockets_count: bestowalData.pockets_count || 0,
        pocket_numbers: bestowalData.pocket_numbers || [],
        message: bestowalData.message || null,
        payment_status: 'pending',
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error('Error creating bestowal:', error);
    throw error;
  }
};

export const fetchBestowals = async (orchardId: string) => {
  try {
    const { data, error } = await supabase
      .from('bestowals')
      .select(`*`)
      .eq('orchard_id', orchardId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  } catch (error) {
    console.error('Error fetching bestowals:', error);
    throw error;
  }
};

// ---------- RPCs ----------

export const incrementOrchardViews = async (orchardId: string) => {
  try {
    const { data, error } = await supabase.rpc('increment_orchard_views', {
      orchard_uuid: orchardId,
    });
    if (error) console.error('Error incrementing views:', error);
    return data;
  } catch (error) {
    console.error('Error incrementing orchard views:', error);
  }
};

// Legacy alias kept for backwards compatibility with prior `fetchOrchards` import name.
export const fetchOrchards = fetchOrchardsList;
