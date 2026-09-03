// Proxies a live USDC balance lookup for the caller's own connected Solana
// wallet -- browsers can't call api.mainnet-beta.solana.com directly (no
// CORS headers for arbitrary origins), so this same-origin function does
// the RPC call server-side instead. See _shared/liveBalance.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getLiveUsdcBalance } from "../_shared/liveBalance.ts";
import { validateSolanaAddress } from "../_shared/cryptoAddress.ts";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const BodySchema = z.object({ address: z.string().min(1).max(64) });

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

  // Public read-only data, but still worth a generous cap -- this is an
  // open proxy to Solana RPC otherwise. The client hook already caches
  // per-address for 60s and dedupes in-flight requests, so normal usage
  // (dashboard tile + header chip both reading the same address) is well
  // under this regardless.
  const rlOk = await checkRateLimit(service, callerId, "wallet_balance_check", 30, 5, true);
  if (!rlOk) return createRateLimitResponse(300);

  let parsed: z.infer<typeof BodySchema>;
  try {
    const result = BodySchema.safeParse(await req.json());
    if (!result.success) return json({ error: result.error.flatten().fieldErrors }, 400);
    parsed = result.data;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const addrErr = validateSolanaAddress(parsed.address);
  if (addrErr) return json({ error: addrErr }, 400);

  try {
    const balance = await getLiveUsdcBalance(parsed.address);
    return json({ balance });
  } catch (err) {
    console.error("get-wallet-balance error", err);
    await logFunctionFailure("get-wallet-balance", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
