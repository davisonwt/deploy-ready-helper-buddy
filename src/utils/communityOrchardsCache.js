import { supabase } from "@/integrations/supabase/client";

// 🔥 COMMUNITY ORCHARDS CACHE LAYER - NUCLEAR PERSISTENCE (Supabase Edition)
const communityOrchardsCache = {
  data: [],
  lastUpdated: 0,
  isRefreshing: false,
  subscribers: new Set(),
  
  // Initialize cache
  init() {
    console.log('🔥 CommunityCache: Initializing');
    this.data = [];
    this.lastUpdated = 0;
    this.isRefreshing = false;
    this.subscribers.clear();
    
    // Auto-refresh timer
    setInterval(() => {
      if (Date.now() - this.lastUpdated > 30000) { // 30 seconds
        this.refresh();
      }
    }, 5000); // Check every 5 seconds
    
    console.log('✅ CommunityCache: Initialized');
  },

  // Subscribe to cache updates
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  },

  // Notify subscribers
  notify() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.data);
      } catch (error) {
        console.error('💥 CommunityCache: Subscriber callback failed:', error);
      }
    });
  },

  // Refresh community orchards from Supabase
  async refresh() {
    if (this.isRefreshing) {
      console.log('🔄 CommunityCache: Refresh already in progress');
      return this.data;
    }

    this.isRefreshing = true;
    
    try {
      console.log('🔄 CommunityCache: Refreshing community orchards from Supabase');
      
      // Fetch orchards with user profile information
      const { data: orchards, error } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles!orchards_user_id_fkey (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      // 🔥 FIXED: Handle direct orchard array response
      this.data = Array.isArray(orchards) ? orchards : [];
      this.lastUpdated = Date.now();
      
      console.log(`✅ CommunityCache: Refreshed ${this.data.length} orchards`);
      
      // Preload all orchard details into nuclear store
      if (window.__orchardStore) {
        this.data.forEach(orchard => {
          const record = window.__orchardStore.getOrchard(orchard.id);
          record.data = orchard;
          record.lastSynced = Date.now();
        });
        window.__orchardStore.version++;
      }
      
      this.notify();
      return this.data;
      
    } catch (error) {
      console.error('💥 CommunityCache: Refresh failed:', error);
      return this.data; // Return cached data on failure
    } finally {
      this.isRefreshing = false;
    }
  },

  // Get cached data
  getData() {
    return this.data;
  },

  // Force refresh
  async forceRefresh() {
    this.lastUpdated = 0; // Force refresh
    return await this.refresh();
  },

  // Get cache stats
  getStats() {
    return {
      orchards: this.data.length,
      lastUpdated: new Date(this.lastUpdated).toISOString(),
      age: Date.now() - this.lastUpdated,
      isRefreshing: this.isRefreshing,
      subscribers: this.subscribers.size
    };
  },

  // Set up real-time subscription for live updates
  setupRealtime() {
    console.log('🔄 CommunityCache: Setting up real-time subscription');
    
    const channel = supabase
      .channel('orchards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orchards'
        },
        (payload) => {
          console.log('🔥 CommunityCache: Real-time update received:', payload);
          
          // Refresh cache when orchards change
          setTimeout(() => {
            this.forceRefresh();
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};

// Initialize if in browser
if (typeof window !== 'undefined') {
  communityOrchardsCache.init();
  window.__communityCache = communityOrchardsCache;
  
  // Set up real-time updates
  communityOrchardsCache.setupRealtime();
  
  // Debug helpers
  window.__COMMUNITY_CACHE_DEBUG = {
    stats: () => communityOrchardsCache.getStats(),
    refresh: () => communityOrchardsCache.forceRefresh(),
    data: () => communityOrchardsCache.getData(),
    clear: () => {
      communityOrchardsCache.data = [];
      communityOrchardsCache.lastUpdated = 0;
      communityOrchardsCache.notify();
    },
    supabase: () => supabase // Debug access to supabase client
  };
}

export default communityOrchardsCache;