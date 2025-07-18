import { supabase } from "@/integrations/supabase/client";

// 🔥 BULLETPROOF ORCHARD STORE - NUCLEAR IMPLEMENTATION (Supabase Edition)
const orchardStore = {
  cache: new Map(),
  version: 0,
  subscribers: new Set(),
  isInitialized: false,
  realtimeChannel: null,

  // Initialize store with proper cleanup
  init() {
    if (this.isInitialized) return;
    
    console.log('🔥 OrchardStore: Nuclear initialization with Supabase');
    
    // Clear any existing garbage
    this.cache.clear();
    this.subscribers.clear();
    this.version = 0;
    
    // Set up real-time subscriptions
    this.setupRealtime();
    
    // Prevent memory leaks
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    this.isInitialized = true;
  },

  // Set up real-time subscriptions
  setupRealtime() {
    console.log('🔥 OrchardStore: Setting up real-time subscriptions');
    
    this.realtimeChannel = supabase
      .channel('orchard-store-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orchards'
        },
        (payload) => {
          console.log('🔥 OrchardStore: Real-time orchard update:', payload);
          
          const orchardId = payload.new?.id || payload.old?.id;
          
          if (payload.eventType === 'DELETE') {
            this.invalidate(orchardId);
          } else if (payload.new && this.cache.has(orchardId)) {
            // Update existing cached record
            const record = this.cache.get(orchardId);
            record.data = payload.new;
            record.lastSynced = Date.now();
            this.version++;
            this.notifySubscribers(orchardId);
          }
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
          console.log('🔥 OrchardStore: Real-time bestowal update:', payload);
          
          // Invalidate and refresh orchard when bestowals change
          if (payload.new?.orchard_id && this.cache.has(payload.new.orchard_id)) {
            setTimeout(() => {
              this.sync(payload.new.orchard_id);
            }, 100);
          }
        }
      )
      .subscribe();
  },

  // Get orchard record (creates if not exists)
  getOrchard(id) {
    if (!this.cache.has(id)) {
      this.cache.set(id, { 
        data: null, 
        loading: false,
        version: this.version,
        lastAccessed: Date.now(),
        error: null
      });
    }
    
    // Update last accessed time
    const record = this.cache.get(id);
    record.lastAccessed = Date.now();
    
    return record;
  },

  // Sync specific orchard with anti-spam protection
  async sync(id) {
    if (!id) {
      console.error('🔥 OrchardStore: Cannot sync without ID');
      return null;
    }

    const record = this.getOrchard(id);
    
    // Prevent spam syncing
    if (record.loading) {
      console.log(`🔥 OrchardStore: Sync already in progress for ${id}`);
      return record.data;
    }

    // Rate limiting - don't sync more than once per 5 seconds
    const timeSinceLastSync = Date.now() - (record.lastSynced || 0);
    if (timeSinceLastSync < 5000 && record.data) {
      console.log(`🔥 OrchardStore: Rate limited sync for ${id}`);
      return record.data;
    }

    record.loading = true;
    record.error = null;
    
    try {
      console.log(`🔥 OrchardStore: Syncing ${id} via Supabase`);
      
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
            user_id,
            pocket_numbers
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (orchard) {
        record.data = orchard;
        record.lastSynced = Date.now();
        this.version++;
        
        console.log(`✅ OrchardStore: Synced ${orchard.title}`);
        this.notifySubscribers(id);
        
        return orchard;
      } else {
        throw new Error('Orchard not found');
      }
      
    } catch (error) {
      console.error(`💥 OrchardStore: Sync failed for ${id}:`, error);
      record.error = error.message;
      return null;
    } finally {
      record.loading = false;
    }
  },

  // Subscribe to store changes
  subscribe(callback) {
    this.subscribers.add(callback);
    console.log(`🔥 OrchardStore: Subscriber added (${this.subscribers.size} total)`);
    
    return () => {
      this.subscribers.delete(callback);
      console.log(`🔥 OrchardStore: Subscriber removed (${this.subscribers.size} remaining)`);
    };
  },

  // Notify all subscribers
  notifySubscribers(orchardId = null) {
    this.subscribers.forEach(callback => {
      try {
        callback(orchardId, this.version);
      } catch (error) {
        console.error('💥 OrchardStore: Subscriber callback failed:', error);
      }
    });
  },

  // Get user's orchards with stable filtering
  getUserOrchards(userId) {
    if (!userId) return [];
    
    return Array.from(this.cache.values())
      .filter(record => record.data && record.data.user_id === userId)
      .map(record => record.data)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Get community orchards with stable filtering
  getCommunityOrchards() {
    return Array.from(this.cache.values())
      .filter(record => record.data && record.data.status === 'active')
      .map(record => record.data)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Invalidate specific orchard
  invalidate(id) {
    if (this.cache.has(id)) {
      this.cache.delete(id);
      this.version++;
      console.log(`🗑️ OrchardStore: Invalidated ${id}`);
      this.notifySubscribers(id);
    }
  },

  // Garbage collection - remove stale entries
  cleanup() {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    
    let cleaned = 0;
    for (const [id, record] of this.cache.entries()) {
      if (now - record.lastAccessed > staleThreshold) {
        this.cache.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 OrchardStore: Cleaned ${cleaned} stale entries`);
      this.version++;
      this.notifySubscribers();
    }
    
    // Clean up real-time channel if needed
    if (this.realtimeChannel) {
      console.log('🧹 OrchardStore: Real-time channel status:', this.realtimeChannel.state);
    }
  },

  // Get store statistics
  getStats() {
    return {
      cachedOrchards: this.cache.size,
      subscribers: this.subscribers.size,
      version: this.version,
      memoryUsage: JSON.stringify(Array.from(this.cache.keys())).length,
      realtimeConnected: this.realtimeChannel?.state === 'joined'
    };
  },

  // Force refresh all data
  async refreshAll() {
    console.log('🔄 OrchardStore: Force refreshing all data via Supabase');
    
    // Clear cache
    this.cache.clear();
    this.version++;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch user orchards if authenticated
      if (user) {
        const { data: userOrchards, error: userError } = await supabase
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
              user_id,
              pocket_numbers
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!userError && userOrchards) {
          // 🔥 FIXED: Handle direct orchard array response
          const orchards = Array.isArray(userOrchards) ? userOrchards : [];
          orchards.forEach(orchard => {
            const record = this.getOrchard(orchard.id);
            record.data = orchard;
            record.lastSynced = Date.now();
          });
        }
      }
      
      // Fetch community orchards
      const { data: communityOrchards, error: communityError } = await supabase
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
            user_id,
            pocket_numbers
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (!communityError && communityOrchards) {
        // 🔥 FIXED: Handle direct orchard array response
        const orchards = Array.isArray(communityOrchards) ? communityOrchards : [];
        orchards.forEach(orchard => {
          const record = this.getOrchard(orchard.id);
          if (!record.data) {  // Don't overwrite user orchards
            record.data = orchard;
            record.lastSynced = Date.now();
          }
        });
      }
      
      this.version++;
      this.notifySubscribers();
      
      console.log(`✅ OrchardStore: Refreshed ${this.cache.size} orchards via Supabase`);
      
    } catch (error) {
      console.error('💥 OrchardStore: Refresh failed:', error);
    }
  },

  // Destroy and clean up all resources
  destroy() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.cache.clear();
    this.subscribers.clear();
    this.isInitialized = false;
    console.log('🧹 OrchardStore: Nuclear cleanup complete');
  }
};

// Initialize and make globally available
if (typeof window !== 'undefined') {
  orchardStore.init();
  window.__orchardStore = orchardStore;
  
  // Auto cleanup every 5 minutes
  setInterval(() => {
    orchardStore.cleanup();
  }, 5 * 60 * 1000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    orchardStore.destroy();
  });
  
  // Debug helpers
  window.__ORCHARD_STORE_DEBUG = {
    stats: () => orchardStore.getStats(),
    sync: (id) => orchardStore.sync(id),
    refresh: () => orchardStore.refreshAll(),
    cleanup: () => orchardStore.cleanup(),
    cache: () => Array.from(orchardStore.cache.keys()),
    version: () => orchardStore.version,
    clear: () => {
      orchardStore.cache.clear();
      orchardStore.version++;
      orchardStore.notifySubscribers();
    },
    supabase: () => supabase, // Debug access to supabase client
    realtime: () => orchardStore.realtimeChannel,
    destroy: () => orchardStore.destroy()
  };
  
  console.log('🔥 OrchardStore: Nuclear implementation ready with Supabase');
}

export default orchardStore;