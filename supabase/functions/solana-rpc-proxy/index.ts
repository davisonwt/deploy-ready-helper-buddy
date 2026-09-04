// Authenticated pass-through to the server-config Solana RPC, for the two
// JSON-RPC calls the desktop "Pay with Phantom" flow makes from the browser
// (@solana/web3.js Connection pointed at this function's URL):
//
//   getLatestBlockhash   -- buildUsdcTransferTransaction (solanaWallet.ts)
//   simulateTransaction  -- useSolanaWalletPay's pre-flight check
//
// Exists because api.mainnet-beta.solana.com sends no CORS headers for
// arbitrary browser origins -- the same wall that made the balance
// pre-check report a fake 0.00 (fixed via get-wallet-balance) would stop
// the transaction builder cold at the blockhash fetch. Cluster and RPC URL
// come from the same server config every other Solana function uses
// (SOLANA_CLUSTER / SOLANA_RPC_URL via _shared/cryptoNetworks.ts) and are
// never revealed to the client.
//
// Phantom's signAndSendTransaction broadcasts and confirms the signed
// transaction itself, so send/broadcast methods are deliberately NOT
// allowed here -- this proxy can read chain state for building a
// transaction, nothing else. Anything outside the allowlist is a 400.
//
// I/O only: one fetch, no @solana/web3.js, well under the edge runtime's
// 2s CPU ceiling.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// Extended CORS set: web3.js's Connection sends a `solana-client` header
// the standard supabase-js corsHeaders don't allowlist -- see _shared/cors.ts.
import { corsHeadersWithSolanaClient as corsHeaders } from "../_shared/cors.ts";
import { getSolanaRpcUrl } from "../_shared/cryptoNetworks.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const ALLOWED_METHODS = new Set(["getLatestBlockhash", "simulateTransaction"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
  if (!supabaseUrl || !anonKey) return json({ error: "server_misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = authHeader.slice(7);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
  const callerId = authData.user.id;

  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!serviceRoleKey) return json({ error: "server_misconfigured" }, 500);
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // A pay click makes one blockhash + one simulate call; 60/5min leaves
  // ample retry headroom without being an open relay.
  const rlOk = await checkRateLimit(service, callerId, "solana_rpc_proxy", 60, 5, true);
  if (!rlOk) {
    // Inline rather than the shared createRateLimitResponse: that helper
    // carries no CORS headers, and a 429 without them reads to the browser
    // as a CORS failure instead of a rate limit.
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", message: "Too many requests. Please try again later.", retryAfter: 300 }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" } },
    );
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  // Single JSON-RPC request objects only -- web3.js sends these calls
  // unbatched, and refusing arrays keeps the allowlist airtight.
  if (Array.isArray(body) || typeof body?.method !== "string") {
    return json({ error: "invalid_request" }, 400);
  }
  if (!ALLOWED_METHODS.has(body.method)) {
    return json({ error: "method_not_allowed", method: body.method }, 400);
  }

  try {
    const upstream = await fetch(getSolanaRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: body.id ?? 1, method: body.method, params: body.params ?? [] }),
    });
    const payload = await upstream.text();
    return new Response(payload, {
      status: upstream.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("solana-rpc-proxy upstream failure", body.method, err);
    await logFunctionFailure("solana-rpc-proxy", err);
    // Never echo the upstream URL back to the client.
    return json({ error: "rpc_unavailable" }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
