import { supabase } from "@/integrations/supabase/client";

// 🛠️ BULLETPROOF ORCHARD LOADER UTILITY (Supabase Edition)
const orchardCache = new Map();

export async function loadOrchard(orchardId) {
  console.log(`🔍 Loading orchard: ${orchardId}`);
  
  // Check cache first
  if (orchardCache.has(orchardId)) {
    const cached = orchardCache.get(orchardId);
    console.log(`💾 Cache hit for orchard: ${orchardId}`);
    return cached;
  }

  try {
    console.log(`📡 Fetching orchard ${orchardId} from Supabase`);

    const { data, error } = await supabase
      .from('orchards')
      .select(`
        *,
        profiles!orchards_profile_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', orchardId)
      .single();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Orchard not found');
    }

    // Calculate derived values from bestowals
    const completedBestowals = data.bestowals?.filter(b => b.status === 'completed') || [];
    const totalAmount = completedBestowals.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    const filledPockets = completedBestowals.reduce((sum, b) => sum + (b.pocket_numbers?.length || 0), 0);
    const totalPockets = Math.ceil((data.goal_amount || 0) / 150); // Assuming 150 per pocket
    const completionRate = totalPockets > 0 ? (filledPockets / totalPockets) * 100 : 0;
    const supportersCount = new Set(completedBestowals.map(b => b.user_id)).size;

    // Validate required fields and create normalized structure
    const validatedData = {
      id: data.id,
      title: data.title || 'Untitled Orchard',
      description: data.description || 'No description available',
      category: data.category || 'General',
      currency: 'USD', // Default currency
      seed_value: parseFloat(data.goal_amount) || 0,
      pocket_price: 150, // Standard pocket price
      total_pockets: totalPockets,
      filled_pockets: filledPockets,
      completion_rate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
      views: 0, // Not tracked in current schema
      supporters: supportersCount,
      status: data.status || 'active',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      user_id: data.user_id,
      location: 'Unknown', // Not in current schema
      images: data.image_url ? [data.image_url] : [],
      pockets: data.pocket_numbers || [],
      // User profile information
      user_profile: data.profiles ? {
        first_name: data.profiles.first_name,
        last_name: data.profiles.last_name,
        avatar_url: data.profiles.avatar_url,
        email: data.profiles.email
      } : null,
      // Bestowal information
      bestowals: completedBestowals,
      current_amount: totalAmount,
      goal_amount: parseFloat(data.goal_amount) || 0,
      // Additional validation fields
      _loaded: true,
      _loadedAt: new Date().toISOString(),
      _source: 'supabase'
    };

    // Cache with 5 minute expiration
    orchardCache.set(orchardId, validatedData);
    setTimeout(() => {
      orchardCache.delete(orchardId);
      console.log(`🗑️ Cache expired for orchard: ${orchardId}`);
    }, 300000);

    console.log(`✅ Orchard loaded successfully: ${validatedData.title}`);
    return validatedData;

  } catch (error) {
    console.error(`💥 Failed to load orchard ${orchardId}:`, error);
    
    // Return fallback data
    const fallbackData = {
      id: orchardId,
      title: "Orchard Preview",
      description: "This orchard is currently unavailable. Please try again later.",
      category: "General",
      currency: "USD",
      seed_value: 0,
      pocket_price: 150,
      total_pockets: 0,
      filled_pockets: 0,
      completion_rate: 0,
      views: 0,
      supporters: 0,
      status: "unavailable",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      location: "Unknown",
      images: [],
      pockets: [],
      bestowals: [],
      current_amount: 0,
      goal_amount: 0,
      user_profile: null,
      // Error metadata
      _isFallback: true,
      _error: error.message,
      _lastSeen: new Date().toISOString(),
      _source: 'fallback'
    };

    // Cache fallback for 1 minute only
    orchardCache.set(orchardId, fallbackData);
    setTimeout(() => orchardCache.delete(orchardId), 60000);

    return fallbackData;
  }
}

// Load orchard with real-time updates
export async function loadOrchardWithRealtime(orchardId, onUpdate) {
  const initialData = await loadOrchard(orchardId);
  
  if (onUpdate && typeof onUpdate === 'function') {
    // Set up real-time subscription
    const channel = supabase
      .channel(`orchard-${orchardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orchards',
          filter: `id=eq.${orchardId}`
        },
        () => {
          // Invalidate cache and reload
          clearOrchardCache(orchardId);
          loadOrchard(orchardId).then(onUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bestowals',
          filter: `orchard_id=eq.${orchardId}`
        },
        () => {
          // Invalidate cache and reload when bestowals change
          clearOrchardCache(orchardId);
          loadOrchard(orchardId).then(onUpdate);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }
  
  return initialData;
}

// Clear cache utility
export function clearOrchardCache(orchardId) {
  if (orchardId) {
    orchardCache.delete(orchardId);
    console.log(`🗑️ Cache cleared for orchard: ${orchardId}`);
  } else {
    orchardCache.clear();
    console.log('🗑️ All orchard cache cleared');
  }
}

// Get cache stats
export function getOrchardCacheStats() {
  return {
    size: orchardCache.size,
    keys: Array.from(orchardCache.keys()),
    timestamp: Date.now(),
    entries: Array.from(orchardCache.entries()).map(([key, value]) => ({
      id: key,
      title: value.title,
      loaded: value._loadedAt,
      isFallback: value._isFallback || false,
      source: value._source || 'unknown'
    }))
  };
}

// Preload multiple orchards
export async function preloadOrchards(orchardIds) {
  console.log(`🔄 Preloading ${orchardIds.length} orchards via Supabase`);
  
  const promises = orchardIds.map(id => loadOrchard(id));
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ Preloaded ${successful} orchards, ${failed} failed`);
  
  return results.map(r => r.status === 'fulfilled' ? r.value : null);
}

// Bulk load orchards (more efficient for multiple orchards)
export async function bulkLoadOrchards(orchardIds) {
  console.log(`🔄 Bulk loading ${orchardIds.length} orchards from Supabase`);
  
  try {
    const { data: orchards, error } = await supabase
      .from('orchards')
      .select(`
        *,
        profiles!orchards_user_id_fkey (
          first_name,
          last_name,
          avatar_url,
          email
        ),
        bestowals (
          id,
          amount,
          pocket_numbers,
          status,
          created_at,
          user_id
        )
      `)
      .in('id', orchardIds);

    if (error) {
      throw new Error(`Supabase bulk load error: ${error.message}`);
    }

    const processedOrchards = (orchards || []).map(data => {
      // Process each orchard similar to loadOrchard
      const completedBestowals = data.bestowals?.filter(b => b.status === 'completed') || [];
      const totalAmount = completedBestowals.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      const filledPockets = completedBestowals.reduce((sum, b) => sum + (b.pocket_numbers?.length || 0), 0);
      const totalPockets = Math.ceil((data.goal_amount || 0) / 150);
      const completionRate = totalPockets > 0 ? (filledPockets / totalPockets) * 100 : 0;
      const supportersCount = new Set(completedBestowals.map(b => b.user_id)).size;

      const validatedData = {
        id: data.id,
        title: data.title || 'Untitled Orchard',
        description: data.description || 'No description available',
        category: data.category || 'General',
        currency: 'USD',
        seed_value: parseFloat(data.goal_amount) || 0,
        pocket_price: 150,
        total_pockets: totalPockets,
        filled_pockets: filledPockets,
        completion_rate: Math.round(completionRate * 10) / 10,
        views: 0,
        supporters: supportersCount,
        status: data.status || 'active',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        user_id: data.user_id,
        location: 'Unknown',
        images: data.image_url ? [data.image_url] : [],
        pockets: data.pocket_numbers || [],
        user_profile: data.profiles ? {
          first_name: data.profiles.first_name,
          last_name: data.profiles.last_name,
          avatar_url: data.profiles.avatar_url,
          email: data.profiles.email
        } : null,
        bestowals: completedBestowals,
        current_amount: totalAmount,
        goal_amount: parseFloat(data.goal_amount) || 0,
        _loaded: true,
        _loadedAt: new Date().toISOString(),
        _source: 'supabase-bulk'
      };

      // Cache each orchard
      orchardCache.set(data.id, validatedData);
      setTimeout(() => {
        orchardCache.delete(data.id);
      }, 300000);

      return validatedData;
    });

    console.log(`✅ Bulk loaded ${processedOrchards.length} orchards successfully`);
    return processedOrchards;

  } catch (error) {
    console.error('💥 Bulk load failed:', error);
    // Fallback to individual loads
    return await preloadOrchards(orchardIds);
  }
}

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.__orchardLoader = {
    load: loadOrchard,
    loadWithRealtime: loadOrchardWithRealtime,
    clear: clearOrchardCache,
    stats: getOrchardCacheStats,
    preload: preloadOrchards,
    bulkLoad: bulkLoadOrchards,
    supabase: () => supabase // Debug access
  };
  
  console.log('🛠️ OrchardLoader: Bulletproof utility ready with Supabase');
}