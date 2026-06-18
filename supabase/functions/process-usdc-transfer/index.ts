// DISABLED: This endpoint previously marked USDC bestowals as "completed"
// based on a client-supplied signature with no on-chain verification.
// Re-enable only after adding real Solana/Ethereum RPC verification of the
// transaction signature, recipient wallet, and amount.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { getSecureCorsHeaders, createErrorResponse } from '../_shared/security.ts';

serve((req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return createErrorResponse(
    'Direct USDC transfers are temporarily disabled pending on-chain verification.',
    410,
    req,
  );
});
