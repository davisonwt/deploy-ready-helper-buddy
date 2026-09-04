// Shared CORS headers for functions that browsers call through third-party
// SDKs which attach their own request headers. Extends the standard
// supabase-js set (the convention every payment function uses) rather than
// hand-rolling a new policy.
//
// "solana-client": @solana/web3.js's browser Connection stamps a
// `solana-client: js/<version>` header on every JSON-RPC fetch. A preflight
// that doesn't allowlist it fails with "Request header field solana-client
// is not allowed" before the request ever reaches the function -- which is
// exactly how the first real desktop Phantom attempt died at
// solana-rpc-proxy (2026-09-04). Verified against the installed web3.js
// browser build: solana-client is the only extra header it sends.
import { corsHeaders as baseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Re-exported so other _shared modules (e.g. rateLimiter's 429 builder) can
// attach the standard CORS set without importing the npm module themselves.
export { baseCorsHeaders };

export const corsHeadersWithSolanaClient: Record<string, string> = {
  ...baseCorsHeaders,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": `${
    (baseCorsHeaders as Record<string, string>)["Access-Control-Allow-Headers"] ??
      "authorization, x-client-info, apikey, content-type"
  }, solana-client`,
};
