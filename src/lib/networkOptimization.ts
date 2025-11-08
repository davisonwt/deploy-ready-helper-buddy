/**
 * Network Optimization Utilities
 * Debouncing, caching, and request batching for optimal performance
 */

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const requestCache = new RequestCache();

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Batch multiple API requests
 */
export class RequestBatcher {
  private pending = new Map<string, Promise<any>>();

  async batch<T>(key: string, executor: () => Promise<T>): Promise<T> {
    // If same request is already pending, return that promise
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = executor().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

export const requestBatcher = new RequestBatcher();

/**
 * Cached fetch with automatic deduplication
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options)}`;

  // Check cache first
  const cached = requestCache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Batch identical requests
  return requestBatcher.batch(cacheKey, async () => {
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Cache successful responses
    if (response.ok) {
      requestCache.set(cacheKey, data, ttl);
    }
    
    return data as T;
  });
}

/**
 * Clear all network caches (call on logout)
 */
export function clearAllCaches() {
  requestCache.clear();
}
