/**
 * Rate Limiting Utility for Edge Functions
 * 
 * This module provides rate limiting functionality to prevent abuse
 * of edge functions and protect backend resources.
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit } from '../_shared/rateLimiter.ts';
 * 
 * // In your edge function
 * const allowed = await checkRateLimit(supabase, userId, 'function_name', 10, 15);
 * if (!allowed) {
 *   return new Response('Rate limit exceeded', { status: 429 });
 * }
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitConfig {
  identifier: string;
  limitType: string;
  maxAttempts?: number;
  timeWindowMinutes?: number;
  failClosed?: boolean; // If true, deny requests when rate limiter fails (default: false for backward compatibility)
}

/**
 * Check if a request is within rate limits using Supabase RPC
 * 
 * @param supabase - Supabase client instance
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param limitType - Type of limit (e.g., 'payment', 'ai_generation')
 * @param maxAttempts - Maximum attempts allowed (default: 10)
 * @param timeWindowMinutes - Time window in minutes (default: 15)
 * @returns boolean - true if allowed, false if rate limit exceeded
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  limitType: string,
  maxAttempts: number = 10,
  timeWindowMinutes: number = 15,
  failClosed: boolean = false
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit_enhanced', {
      identifier,
      limit_type: limitType,
      max_attempts: maxAttempts,
      time_window_minutes: timeWindowMinutes
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // For critical operations (payments, etc.), fail closed to prevent abuse
      // For general operations, fail open to prevent blocking legitimate users
      if (failClosed) {
        console.warn('Rate limiter failed closed due to error - denying request');
        return false;
      }
      // Fail open: allow request if rate limit check fails
      // This prevents legitimate requests from being blocked due to system errors
      return true;
    }

    return data === true;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // For critical operations, fail closed
    if (failClosed) {
      console.warn('Rate limiter exception - failing closed, denying request');
      return false;
    }
    // Fail open for backward compatibility
    return true;
  }
}

/**
 * Create a rate limit response with appropriate headers and message
 * 
 * @param retryAfterSeconds - Seconds to wait before retrying (default: 900 = 15 minutes)
 * @returns Response object with 429 status
 */
export function createRateLimitResponse(retryAfterSeconds: number = 900): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: retryAfterSeconds
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfterSeconds.toString(),
        'X-RateLimit-Exceeded': 'true'
      }
    }
  );
}

/**
 * Decorator-style rate limiter for edge functions
 * Wraps an edge function handler with rate limiting
 * 
 * @param handler - The edge function handler to wrap
 * @param config - Rate limit configuration
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  config: {
    limitType: string;
    maxAttempts?: number;
    timeWindowMinutes?: number;
    getIdentifier?: (req: Request) => Promise<string>;
    failClosed?: boolean; // If true, deny requests when rate limiter fails
  }
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Get identifier (default: extract from Authorization header)
      const identifier = config.getIdentifier 
        ? await config.getIdentifier(req)
        : await getDefaultIdentifier(req);

      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check rate limit
      const allowed = await checkRateLimit(
        supabase,
        identifier,
        config.limitType,
        config.maxAttempts,
        config.timeWindowMinutes,
        config.failClosed || false
      );

      if (!allowed) {
        return createRateLimitResponse(
          (config.timeWindowMinutes || 15) * 60
        );
      }

      // If allowed, proceed with the original handler
      return await handler(req);
    } catch (error) {
      console.error('Rate limit wrapper error:', error);
      // For critical operations, fail closed
      if (config.failClosed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit check failed',
            message: 'Unable to verify rate limits. Request denied for security.'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Fail open: proceed with request if rate limiter fails (backward compatibility)
      return await handler(req);
    }
  };
}

/**
 * Extract user identifier from request
 * Tries to get user ID from JWT token, falls back to IP address
 */
async function getDefaultIdentifier(req: Request): Promise<string> {
  try {
    // Try to get user ID from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Decode JWT without verification (just for rate limiting identifier)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sub) {
        return payload.sub;
      }
    }

    // Fallback to IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `ip:${ip}`;
  } catch (error) {
    console.error('Error extracting identifier:', error);
    return 'anonymous';
  }
}

/**
 * Pre-configured rate limit configs for common use cases
 */
export const RateLimitPresets = {
  /** Payment operations: 5 attempts per hour - FAILS CLOSED for security */
  PAYMENT: {
    limitType: 'payment',
    maxAttempts: 5,
    timeWindowMinutes: 60,
    failClosed: true // Critical: fail closed to prevent abuse
  },
  
  /** AI generation: 10 attempts per 5 minutes */
  AI_GENERATION: {
    limitType: 'ai_generation',
    maxAttempts: 10,
    timeWindowMinutes: 5
  },
  
  /** Email sending: 20 attempts per hour */
  EMAIL: {
    limitType: 'email_send',
    maxAttempts: 20,
    timeWindowMinutes: 60
  },
  
  /** General API: 100 attempts per 15 minutes */
  GENERAL_API: {
    limitType: 'general_api',
    maxAttempts: 100,
    timeWindowMinutes: 15
  }
};
