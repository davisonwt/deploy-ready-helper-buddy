import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { getSecureCorsHeaders, createErrorResponse } from '../_shared/security.ts';

// Library bestowals are temporarily disabled.
//
// The previous implementation accepted any authenticated request and wrote
// payment_status='completed' with no provider verification, granting library
// access for free. That code path has been removed.
//
// A rebuilt flow (pending insert → verified provider webhook flips to
// completed → access grant only after verification) is tracked as a separate
// backlog task. Until that lands, this function short-circuits with 503.
serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return createErrorResponse(
    'Library bestowals are temporarily disabled while the payment verification flow is rebuilt.',
    503,
    req
  );
});
