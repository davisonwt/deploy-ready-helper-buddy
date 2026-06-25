import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { getSecureCorsHeaders } from '../_shared/security.ts';

// SECURITY: This function previously auto-marked purchases as delivered without
// any verified payment call, then issued a 30-day signed URL to the buyer.
// Short-circuited until a real provider webhook (PayPal/NOWPayments) flips
// live_session_media_purchases rows from pending -> completed and triggers delivery.
serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Live-session media purchases are temporarily disabled while payment verification is being upgraded. Please check back soon.',
    }),
    {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
