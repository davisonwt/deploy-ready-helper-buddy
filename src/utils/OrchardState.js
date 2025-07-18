import { supabase } from "@/integrations/supabase/client";

// 🔥 REAL-TIME ORCHARD STATE MANAGER (Supabase Edition)
class OrchardState {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Set();
    this.syncQueue = new Set();
    this.realtimeChannel = null;
    
    this.setupRealtime();
    console.log('🌱 OrchardState initialized with Supabase');
  }

  // Subscribe to orchard state changes
  subscribe(callback) {
    this.subscribers.add(callback);
    console.log(`📡 New subscriber added (${this.subscribers.size} total)`);
    
    return () => {
      this.subscribers.delete(callback);
      console.log(`📡 Subscriber removed (${this.subscribers.size} remaining)`);
    };
  }

  // Notify all subscribers of state changes
  notify(orchardId = null) {
    console.log(`🔔 Notifying ${this.subscribers.size} subscribers`, { orchardId });
    this.subscribers.forEach(callback => {
      try {
        callback(orchardId);
      } catch (error) {
        console.error('💥 Subscriber callback failed:', error);
      }
    });
  }

  // Set up real-time subscriptions
  setupRealtime() {
    console.log('🔄 Setting up real-time orchard updates');
    
    this.realtimeChannel = supabase
      .channel('orchard-state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orchards'
        },
        (payload) => {
          console.log('🔥 Real-time orchard update:', payload);
          
          const orchardId = payload.new?.id || payload.old?.id;
          
          if (payload.eventType === 'DELETE') {
            this.cache.delete(orchardId);
          } else if (payload.new) {
            this.cache.set(orchardId, payload.new);
          }
          
          this.notify(orchardId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bestowals'
        },
        (payload) => {
          console.log('🔥 Real-time bestowal update:', payload);
          
          // Invalidate orchard cache when bestowals change
          if (payload.new?.orchard_id) {
            this.invalidate(payload.new.orchard_id);
            this.sync(payload.new.orchard_id);
          }
        }
      )
      .subscribe();
  }

  // Sync specific orchard data
  async sync(orchardId) {
    if (!orchardId) {
      console.error('💥 Cannot sync: Missing orchardId');
      return null;
    }

    // Prevent duplicate sync requests
    if (this.syncQueue.has(orchardId)) {
      console.log(`⏳ Sync already in progress for: ${orchardId}`);
      return this.cache.get(orchardId);
    }

    this.syncQueue.add(orchardId);
    
    try {
      console.log(`🔄 Syncing orchard: ${orchardId}`);
      
      const { data: orchard, error } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles!orchards_user_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          bestowals (
            id,
            amount,
            status,
            created_at,
            user_id
          )
        `)
        .eq('id', orchardId)
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (orchard) {
        this.cache.set(orchardId, orchard);
        console.log(`✅ Orchard synced: ${orchard.title}`);
        this.notify(orchardId);
        return orchard;
      } else {
        throw new Error('Orchard not found');
      }
      
    } catch (error) {
      console.error(`💥 Sync failed for ${orchardId}:`, error);
      return null;
    } finally {
      this.syncQueue.delete(orchardId);
    }
  }

  // Sync all user orchards
  async syncUserOrchards() {
    try {
      console.log('🔄 Syncing user orchards...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('👤 No authenticated user, skipping user orchards sync');
        return [];
      }

      const { data: orchards, error } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles!orchards_user_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          bestowals (
            id,
            amount,
            status,
            created_at,
            user_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      // 🔥 FIXED: Handle direct orchard array response
      const orchardArray = Array.isArray(orchards) ? orchards : [];
      
      // Update cache for each orchard
      orchardArray.forEach(orchard => {
        this.cache.set(orchard.id, orchard);
      });
      
      console.log(`✅ Synced ${orchardArray.length} user orchards`);
      this.notify();
      return orchardArray;
      
    } catch (error) {
      console.error('💥 User orchards sync failed:', error);
      return [];
    }
  }

  // Sync all community orchards
  async syncCommunityOrchards() {
    try {
      console.log('🔄 Syncing community orchards...');
      
      const { data: orchards, error } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles!orchards_user_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          bestowals (
            id,
            amount,
            status,
            created_at,
            user_id
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      // 🔥 FIXED: Handle direct orchard array response
      const orchardArray = Array.isArray(orchards) ? orchards : [];
      
      // Update cache for each orchard
      orchardArray.forEach(orchard => {
        this.cache.set(orchard.id, orchard);
      });
      
      console.log(`✅ Synced ${orchardArray.length} community orchards`);
      this.notify();
      return orchardArray;
      
    } catch (error) {
      console.error('💥 Community orchards sync failed:', error);
      return [];
    }
  }

  // Get orchard from cache or fetch
  async getOrchard(orchardId) {
    // Try cache first
    if (this.cache.has(orchardId)) {
      console.log(`💾 Cache hit for: ${orchardId}`);
      return this.cache.get(orchardId);
    }

    // Fetch from Supabase
    return await this.sync(orchardId);
  }

  // Invalidate cache entry
  invalidate(orchardId) {
    if (this.cache.has(orchardId)) {
      this.cache.delete(orchardId);
      console.log(`🗑️ Cache invalidated for: ${orchardId}`);
      this.notify(orchardId);
    }
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ All cache cleared');
    this.notify();
  }

  // Get cache stats
  getStats() {
    return {
      cachedOrchards: this.cache.size,
      subscribers: this.subscribers.size,
      syncInProgress: this.syncQueue.size,
      realtimeConnected: this.realtimeChannel?.state === 'joined'
    };
  }

  // Clean up resources
  destroy() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.clearCache();
    this.subscribers.clear();
    console.log('🧹 OrchardState destroyed');
  }
}

// Initialize global orchard state
if (typeof window !== 'undefined') {
  window.orchardState = new OrchardState();
  
  // Auto-sync every 30 seconds
  setInterval(() => {
    if (window.location.pathname.includes('my-orchards')) {
      window.orchardState.syncUserOrchards();
    } else if (window.location.pathname.includes('browse-orchards')) {
      window.orchardState.syncCommunityOrchards();
    }
  }, 30000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    window.orchardState.destroy();
  });
  
  // Console helpers for debugging
  window.__ORCHARD_DEBUG = {
    sync: (id) => window.orchardState.sync(id),
    syncAll: () => {
      window.orchardState.syncUserOrchards();
      window.orchardState.syncCommunityOrchards();
    },
    stats: () => window.orchardState.getStats(),
    cache: () => Array.from(window.orchardState.cache.keys()),
    clear: () => window.orchardState.clearCache(),
    supabase: () => supabase, // Debug access to supabase client
    realtime: () => window.orchardState.realtimeChannel
  };
  
  console.log('🌱 OrchardState ready with Supabase. Use window.__ORCHARD_DEBUG for debugging.');
}

export default OrchardState;