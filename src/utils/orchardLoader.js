import { supabase } from "@/integrations/supabase/client";

// Simple orchard loader that returns actual database data
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
      .select(`*`)
      .eq('id', orchardId)
      .single();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Orchard not found');
    }

    console.log(`✅ Orchard loaded successfully: ${data.title}`);
    
    // Cache for 5 minutes
    orchardCache.set(orchardId, data);
    setTimeout(() => {
      orchardCache.delete(orchardId);
    }, 300000);

    return data;

  } catch (error) {
    console.error(`💥 Failed to load orchard ${orchardId}:`, error);
    throw error;
  }
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

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.__orchardLoader = {
    load: loadOrchard,
    clear: clearOrchardCache,
  };
  
  console.log('🛠️ OrchardLoader: Bulletproof utility ready with Supabase');
}