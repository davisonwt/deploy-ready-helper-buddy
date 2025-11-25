/**
 * Rate Limiting Utility for Edge Functions
 * 
 * This module provides rate limiting functionality to prevent abuse
 * of edge functions and protect backend resources.
 * 
 * SECURITY: By default, rate limiter fails CLOSED (denies requests) when checks fail.
 * This prevents abuse during system outages. Only fail-open behavior is available
 * for legacy compatibility via explicit configuration.
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit, RateLimitPresets } from '../_shared/rateLimiter.ts';
 * 
 * // Recommended: Use presets (fail-closed by default)
 * const allowed = await checkRateLimit(
 *   supabase, 
 *   userId, 
 *   RateLimitPresets.AI_GENERATION.limitType,
 *   RateLimitPresets.AI_GENERATION.maxAttempts,
 *   RateLimitPresets.AI_GENERATION.timeWindowMinutes
 * );
 * 
 * // Or explicitly set fail-closed (default)
 * const allowed = await checkRateLimit(supabase, userId, 'function_name', 10, 15, true);
 * 
 * if (!allowed) {
 *   return new Response('Rate limit exceeded', { status: 429 });
 * }
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { recordRateLimiterFailure } from './rateLimiterMonitoring.ts';

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
/**
 * Log rate limiter failure for monitoring/alerting
 * Delegates to the monitoring module for consistent logging
 */
function logRateLimiterFailure(
  identifier: string,
  limitType: string,
  error: any,
  failClosed: boolean
): void {
  recordRateLimiterFailure(identifier, limitType, error, failClosed);
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  limitType: string,
  maxAttempts: number = 10,
  timeWindowMinutes: number = 15,
  failClosed: boolean = true // Changed default to true for better security
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit_enhanced', {
      identifier,
      limit_type: limitType,
      max_attempts: maxAttempts,
      time_window_minutes: timeWindowMinutes
    });

    if (error) {
      logRateLimiterFailure(identifier, limitType, error, failClosed);
      
      // Fail closed by default to prevent abuse during outages
      // Only fail open if explicitly requested (for backward compatibility)
      if (failClosed) {
        const severity = determineFailureSeverity(limitType, failClosed);
        console.warn(`Rate limiter failed closed due to error - denying request for ${limitType} (severity: ${severity})`);
        
        // For critical operations, log additional details
        if (severity === 'critical' || severity === 'high') {
          console.error(`CRITICAL: Rate limiter failure for ${limitType}`, {
            identifier,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }
        
        return false;
      }
      // Fail open: only for non-critical operations that explicitly request it
      console.warn(`Rate limiter failed open due to error - allowing request for ${limitType} (legacy behavior)`);
      return true;
    }

    return data === true;
  } catch (error) {
    logRateLimiterFailure(identifier, limitType, error, failClosed);
    
    // Fail closed by default to prevent abuse
    if (failClosed) {
      console.warn(`Rate limiter exception - failing closed, denying request for ${limitType}`);
      return false;
    }
    // Fail open only if explicitly requested
    console.warn(`Rate limiter exception - failing open for ${limitType} (legacy behavior)`);
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

      // Check rate limit (default to fail-closed for security)
      const allowed = await checkRateLimit(
        supabase,
        identifier,
        config.limitType,
        config.maxAttempts,
        config.timeWindowMinutes,
        config.failClosed !== undefined ? config.failClosed : true // Default to fail-closed
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
      logRateLimiterFailure(
        await getDefaultIdentifier(req).catch(() => 'unknown'),
        config.limitType,
        error,
        config.failClosed !== undefined ? config.failClosed : true
      );
      
      // Default to fail-closed for security (only fail open if explicitly requested)
      const shouldFailClosed = config.failClosed !== undefined ? config.failClosed : true;
      if (shouldFailClosed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit check failed',
            message: 'Unable to verify rate limits. Request denied for security.',
            code: 'RATE_LIMIT_CHECK_FAILED'
          }),
          { 
            status: 503, 
            headers: { 
              'Content-Type': 'application/json',
              'X-RateLimit-Status': 'check-failed',
              'Retry-After': '60' // Suggest retry after 60 seconds
            } 
          }
        );
      }
      // Fail open: only for legacy compatibility
      console.warn(`Rate limiter wrapper failing open for ${config.limitType} (legacy behavior)`);
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
  
  /** AI generation: 10 attempts per 5 minutes - FAILS CLOSED to prevent abuse of expensive operations */
  AI_GENERATION: {
    limitType: 'ai_generation',
    maxAttempts: 10,
    timeWindowMinutes: 5,
    failClosed: true // Fail closed: AI operations are expensive and should be rate-limited
  },
  
  /** Email sending: 20 attempts per hour - FAILS CLOSED to prevent spam */
  EMAIL: {
    limitType: 'email_send',
    maxAttempts: 20,
    timeWindowMinutes: 60,
    failClosed: true // Fail closed: prevent spam during outages
  },
  
  /** General API: 100 attempts per 15 minutes - FAILS CLOSED by default */
  GENERAL_API: {
    limitType: 'general_api',
    maxAttempts: 100,
    timeWindowMinutes: 15,
    failClosed: true // Fail closed: prevent abuse during outages
  },
  
  /** Credential verification: 3 attempts per 15 minutes - FAILS CLOSED for security */
  CREDENTIAL_VERIFICATION: {
    limitType: 'credential_verification',
    maxAttempts: 3,
    timeWindowMinutes: 15,
    failClosed: true // Fail closed: security-critical operation
  },
  
  /** Legacy: General API that fails open (for backward compatibility only) */
  GENERAL_API_LEGACY: {
    limitType: 'general_api',
    maxAttempts: 100,
    timeWindowMinutes: 15,
    failClosed: false // Explicitly fail open for legacy compatibility
  }
};
