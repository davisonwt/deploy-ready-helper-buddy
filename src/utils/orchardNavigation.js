import { supabase } from "@/integrations/supabase/client";

// 🔥 NUCLEAR ORCHARD NAVIGATION SYSTEM 🔥 (Supabase Edition)

// Bulletproof orchard navigation
export function navigateToOrchard(orchardId, source = 'unknown') {
  console.log("🚀 NUCLEAR NAVIGATION START", { orchardId, source, timestamp: Date.now() });
  
  // Validation Layer 1
  if (!orchardId || orchardId === 'undefined' || orchardId === 'null') {
    console.error("💥 INVALID ORCHARD ID:", orchardId);
    throw new Error(`Invalid orchard ID: ${orchardId}`);
  }
  
  // Purge cache
  const cacheKey = `orchard_${orchardId}_cache`;
  window.sessionStorage.removeItem(cacheKey);
  console.log("🧹 Purged cache for:", cacheKey);
  
  // Nuclear option: Full page load as last resort
  const fallback = () => {
    console.log("☢️ NUCLEAR FALLBACK ACTIVATED");
    const url = `/animated-orchard/${orchardId}?force_reload=${Date.now()}&source=${source}`;
    window.location.href = url;
  };

  // Attempt SPA navigation first
  try {
    console.log("🎯 Attempting SPA navigation to:", orchardId);
    
    // Check if we're already on the orchard page
    if (window.location.pathname === `/animated-orchard/${orchardId}`) {
      console.log("🔄 Already on orchard page, forcing reload");
      window.location.reload();
      return;
    }
    
    // For React Router, we'll use the fallback since SPA routing is glitching
    fallback();
    
  } catch (e) {
    console.error("💥 SPA Navigation failed:", e);
    fallback();
  }
}

// Enhanced orchard existence checker with Supabase
export async function verifyOrchardExists(orchardId) {
  try {
    console.log("🔍 Verifying orchard exists via Supabase:", orchardId);
    
    const { data, error } = await supabase
      .from('orchards')
      .select(`
        id,
        title,
        description,
        status,
        goal_amount,
        current_amount,
        user_id,
        created_at,
        profiles!orchards_user_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', orchardId)
      .single();

    if (error) {
      console.error("❌ Supabase error verifying orchard:", error.message);
      return null;
    }

    if (data) {
      console.log("✅ Orchard verified via Supabase:", data.title);
      return {
        ...data,
        success: true // Maintain API compatibility
      };
    } else {
      console.error("❌ Orchard not found in Supabase:", orchardId);
      return null;
    }
  } catch (error) {
    console.error("💥 Orchard verification failed:", error);
    return null;
  }
}

// Enhanced orchard preload with Supabase
export async function preloadOrchardData(orchardId) {
  try {
    console.log("🔄 Preloading orchard data from Supabase:", orchardId);
    
    const { data, error } = await supabase
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
      .eq('id', orchardId)
      .single();

    if (error) {
      console.error("💥 Preload failed:", error.message);
      return null;
    }

    if (data) {
      // Cache the full data
      cacheOrchard(orchardId, data);
      console.log("✅ Orchard data preloaded and cached:", data.title);
      return data;
    }

    return null;
  } catch (error) {
    console.error("💥 Preload error:", error);
    return null;
  }
}

// Nuclear orchard cache system
export function cacheOrchard(orchardId, data) {
  const cacheKey = `orchard_${orchardId}_cache`;
  const cacheData = {
    data,
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000, // 5 minutes
    source: 'supabase'
  };
  
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log("💾 Cached orchard data from Supabase:", orchardId);
  } catch (error) {
    console.error("💥 Failed to cache orchard:", error);
  }
}

export function getCachedOrchard(orchardId) {
  const cacheKey = `orchard_${orchardId}_cache`;
  
  try {
    const cached = window.sessionStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const isExpired = Date.now() - cacheData.timestamp > cacheData.ttl;
    
    if (isExpired) {
      window.sessionStorage.removeItem(cacheKey);
      console.log("🗑️ Expired cache removed:", orchardId);
      return null;
    }
    
    console.log("📦 Using cached orchard:", orchardId, "source:", cacheData.source || 'unknown');
    return cacheData.data;
  } catch (error) {
    console.error("💥 Cache read failed:", error);
    return null;
  }
}

// Nuclear batch verification for multiple orchards
export async function batchVerifyOrchards(orchardIds) {
  try {
    console.log("🔍 Batch verifying orchards via Supabase:", orchardIds);
    
    const { data, error } = await supabase
      .from('orchards')
      .select('id, title, status')
      .in('id', orchardIds);

    if (error) {
      console.error("💥 Batch verification failed:", error.message);
      return {};
    }

    const results = {};
    orchardIds.forEach(id => {
      const found = data?.find(orchard => orchard.id === id);
      results[id] = found ? { exists: true, title: found.title, status: found.status } : { exists: false };
    });

    console.log("✅ Batch verification complete:", results);
    return results;
  } catch (error) {
    console.error("💥 Batch verification error:", error);
    return {};
  }
}

// Smart navigation with existence check
export async function smartNavigateToOrchard(orchardId, source = 'unknown') {
  console.log("🧠 SMART NAVIGATION START:", orchardId);
  
  // Check cache first
  const cached = getCachedOrchard(orchardId);
  if (cached) {
    console.log("💨 Fast navigation using cache");
    navigateToOrchard(orchardId, `${source}-cached`);
    return;
  }
  
  // Verify existence before navigation
  const orchardData = await verifyOrchardExists(orchardId);
  if (!orchardData) {
    console.error("❌ Cannot navigate to non-existent orchard:", orchardId);
    throw new Error(`Orchard ${orchardId} does not exist`);
  }
  
  // Cache and navigate
  cacheOrchard(orchardId, orchardData);
  navigateToOrchard(orchardId, `${source}-verified`);
}

// Cache cleanup utility
export function clearOrchardNavigationCache() {
  try {
    const keys = Object.keys(window.sessionStorage);
    const orchardKeys = keys.filter(key => key.startsWith('orchard_') && key.endsWith('_cache'));
    
    orchardKeys.forEach(key => {
      window.sessionStorage.removeItem(key);
    });
    
    console.log("🧹 Cleared navigation cache for", orchardKeys.length, "orchards");
  } catch (error) {
    console.error("💥 Cache cleanup failed:", error);
  }
}

// Get navigation cache stats
export function getNavigationCacheStats() {
  try {
    const keys = Object.keys(window.sessionStorage);
    const orchardKeys = keys.filter(key => key.startsWith('orchard_') && key.endsWith('_cache'));
    
    const stats = {
      totalCached: orchardKeys.length,
      cacheSize: 0,
      oldestEntry: null,
      newestEntry: null,
      entries: []
    };
    
    orchardKeys.forEach(key => {
      try {
        const data = JSON.parse(window.sessionStorage.getItem(key));
        const orchardId = key.replace('orchard_', '').replace('_cache', '');
        
        stats.cacheSize += JSON.stringify(data).length;
        
        const entry = {
          orchardId,
          timestamp: data.timestamp,
          age: Date.now() - data.timestamp,
          title: data.data?.title || 'Unknown',
          source: data.source || 'unknown'
        };
        
        stats.entries.push(entry);
        
        if (!stats.oldestEntry || data.timestamp < stats.oldestEntry.timestamp) {
          stats.oldestEntry = entry;
        }
        
        if (!stats.newestEntry || data.timestamp > stats.newestEntry.timestamp) {
          stats.newestEntry = entry;
        }
      } catch (e) {
        // Skip invalid entries
      }
    });
    
    return stats;
  } catch (error) {
    console.error("💥 Stats generation failed:", error);
    return { error: error.message };
  }
}

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.__orchardNavigation = {
    navigate: navigateToOrchard,
    smartNavigate: smartNavigateToOrchard,
    verify: verifyOrchardExists,
    batchVerify: batchVerifyOrchards,
    preload: preloadOrchardData,
    cache: cacheOrchard,
    getCached: getCachedOrchard,
    clearCache: clearOrchardNavigationCache,
    stats: getNavigationCacheStats,
    supabase: () => supabase // Debug access
  };
  
  console.log("🔥 Nuclear Orchard Navigation System ready with Supabase");
}