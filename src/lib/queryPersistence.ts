import { QueryClient } from '@tanstack/react-query';

/**
 * Enhanced Query Client with optimized defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      
      // Consider data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Don't refetch on window focus by default (opt-in per query)
      refetchOnWindowFocus: false,
      
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
      
      // Retry failed requests up to 3 times (except auth errors)
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      
      // Exponential backoff for mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

/**
 * Cache invalidation helpers
 */
export const cacheUtils = {
  /**
   * Invalidate all queries for a specific entity type
   */
  invalidateEntity: (entity: string) => {
    queryClient.invalidateQueries({ queryKey: [entity] });
  },

  /**
   * Invalidate queries matching a pattern
   */
  invalidatePattern: (pattern: string) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(
          (key) => typeof key === 'string' && key.includes(pattern)
        );
      },
    });
  },

  /**
   * Clear all cached data
   */
  clearAll: () => {
    queryClient.clear();
  },

  /**
   * Remove queries older than specified time
   */
  removeStaleQueries: (maxAgeMs: number) => {
    const now = Date.now();
    queryClient.getQueryCache().getAll().forEach((query) => {
      const lastUpdated = query.state.dataUpdatedAt;
      if (now - lastUpdated > maxAgeMs) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: new Blob([JSON.stringify(queries.map(q => q.state.data))]).size,
    };
  },
};

/**
 * Optimized query configurations for common use cases
 */
export const queryConfigs = {
  /**
   * For real-time data that changes frequently
   */
  realtime: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 30 seconds
  },

  /**
   * For static data that rarely changes
   */
  static: {
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  /**
   * For user-specific data
   */
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: true,
  },

  /**
   * For infinite scroll queries
   */
  infinite: {
    staleTime: 5 * 60 * 1000,
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage: any) => firstPage.previousCursor,
  },
};
