import { useCallback, useRef } from 'react';

interface ThrottleOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Custom throttle hook that doesn't require lodash
 * Prevents function from being called more than once within the specified delay
 */
export const useThrottledApi = <T extends (...args: any[]) => any>(
  apiFn: T,
  options: ThrottleOptions = {}
) => {
  const { delay = 1000, leading = true, trailing = true } = options;
  
  const lastCallTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime.current;

      const callFunction = () => {
        lastCallTime.current = now;
        lastArgsRef.current = null;
        return apiFn(...args);
      };

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Leading edge: call immediately if enough time has passed
      if (leading && timeSinceLastCall >= delay) {
        return callFunction();
      }

      // Trailing edge: schedule a call after delay
      if (trailing) {
        lastArgsRef.current = args;
        timeoutRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            callFunction();
          }
        }, delay - timeSinceLastCall);
      }
    },
    [apiFn, delay, leading, trailing]
  );

  return throttled;
};

/**
 * Debounce hook - waits for delay of inactivity before calling function
 */
export const useDebouncedApi = <T extends (...args: any[]) => any>(
  apiFn: T,
  delay: number = 500
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        apiFn(...args);
      }, delay);
    },
    [apiFn, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debounced, cancel };
};

/**
 * Rate limiter that tracks calls and prevents exceeding limit
 */
export const useRateLimiter = (maxCalls: number, windowMs: number) => {
  const callTimestamps = useRef<number[]>([]);

  const canMakeCall = useCallback(() => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old timestamps outside the window
    callTimestamps.current = callTimestamps.current.filter(
      (timestamp) => timestamp > windowStart
    );

    return callTimestamps.current.length < maxCalls;
  }, [maxCalls, windowMs]);

  const recordCall = useCallback(() => {
    callTimestamps.current.push(Date.now());
  }, []);

  const getRemainingCalls = useCallback(() => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    callTimestamps.current = callTimestamps.current.filter(
      (timestamp) => timestamp > windowStart
    );

    return maxCalls - callTimestamps.current.length;
  }, [maxCalls, windowMs]);

  return {
    canMakeCall,
    recordCall,
    getRemainingCalls
  };
};
