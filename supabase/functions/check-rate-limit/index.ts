import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitRequest {
  action: string;
  user_id?: string;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Rate limit configurations for different actions
const rateLimits: Record<string, RateLimitConfig> = {
  'payment': { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  'upload': { maxRequests: 10, windowMs: 60000 }, // 10 uploads per minute
  'api_call': { maxRequests: 30, windowMs: 60000 }, // 30 API calls per minute
  'auth': { maxRequests: 5, windowMs: 300000 }, // 5 auth attempts per 5 minutes
  'default': { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Rate limit check request received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data
    const { action, user_id }: RateLimitRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking rate limit for action: ${action}, user: ${user_id || 'anonymous'}`);

    // Get rate limit config for this action
    const config = rateLimits[action] || rateLimits.default;
    const { maxRequests, windowMs } = config;

    // Calculate window start time
    const windowStart = new Date(Date.now() - windowMs);

    // Get identifier (user_id or IP address)
    const identifier = user_id || req.headers.get('x-forwarded-for') || 'unknown';

    // Check existing rate limit records
    const { data: existingRecords, error: selectError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (selectError) {
      console.error('Error fetching rate limit records:', selectError);
      throw selectError;
    }

    const currentCount = existingRecords?.length || 0;
    console.log(`Current count: ${currentCount}/${maxRequests} for ${action}`);

    // Check if rate limit exceeded
    if (currentCount >= maxRequests) {
      const oldestRecord = existingRecords[existingRecords.length - 1];
      const resetTime = new Date(new Date(oldestRecord.created_at).getTime() + windowMs);
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);

      console.log(`Rate limit exceeded for ${identifier}. Retry after ${retryAfter}s`);

      return new Response(
        JSON.stringify({
          allowed: false,
          error: 'Rate limit exceeded',
          retryAfter,
          limit: maxRequests,
          remaining: 0,
          reset: resetTime.toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toISOString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Record this request
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        identifier,
        action,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error recording rate limit:', insertError);
      // Don't fail the request if we can't record it
    }

    const remaining = maxRequests - currentCount - 1;
    console.log(`Rate limit check passed. Remaining: ${remaining}/${maxRequests}`);

    return new Response(
      JSON.stringify({
        allowed: true,
        limit: maxRequests,
        remaining,
        reset: new Date(Date.now() + windowMs).toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Rate limit check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        allowed: true // Fail open - allow request if rate limiting fails
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
