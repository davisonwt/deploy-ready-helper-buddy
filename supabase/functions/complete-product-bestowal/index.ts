// DISABLED: This endpoint previously recorded "completed" bestowals with no
// payment proof, allowing anyone to fake bestowals for any amount.
// Real bestowals must go through verified webhook flows
// (create-binance-pay-order / Cryptomus). Re-enable only after this function
// is rebuilt to require a webhook-confirmed payment_transaction_id.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { getSecureCorsHeaders, createErrorResponse } from '../_shared/security.ts';

serve((req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return createErrorResponse(
    'This bestowal path has been disabled. Please use Binance Pay or Cryptomus checkout.',
    410,
    req,
  );
});
