import { supabase } from '@/integrations/supabase/client';

export const fetchOrchard = async (orchardId) => {
  try {
    const { data, error } = await supabase
      .from('orchards')
      .select(`
        *,
        profiles!orchards_user_id_fkey(
          first_name,
          last_name,
          display_name,
          avatar_url
        )
      `)
      .eq('id', orchardId)
      .eq('status', 'active')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Orchard not found');
    }

    return data;
  } catch (error) {
    console.error('Error fetching orchard:', error);
    throw error;
  }
};

export const fetchOrchards = async (filters = {}) => {
  try {
    let query = supabase
      .from('orchards')
      .select(`
        *,
        profiles!orchards_user_id_fkey(
          first_name,
          last_name,
          display_name,
          avatar_url
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching orchards:', error);
    throw error;
  }
};

export const createBestowal = async (bestowalData) => {
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
        payment_status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error creating bestowal:', error);
    throw error;
  }
};

export const fetchBestowals = async (orchardId) => {
  try {
    const { data, error } = await supabase
      .from('bestowals')
      .select(`
        *,
        profiles!bestowals_bestower_id_fkey(
          first_name,
          last_name,
          display_name,
          avatar_url
        )
      `)
      .eq('orchard_id', orchardId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching bestowals:', error);
    throw error;
  }
};

export const incrementOrchardViews = async (orchardId) => {
  try {
    const { data, error } = await supabase.rpc('increment_orchard_views', {
      orchard_uuid: orchardId
    });

    if (error) {
      console.error('Error incrementing views:', error);
    }

    return data;
  } catch (error) {
    console.error('Error incrementing orchard views:', error);
  }
};