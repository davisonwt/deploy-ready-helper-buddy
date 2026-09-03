// Client-triggered Solana payment check. Called by the checkout screen's
// 5s poll while the QR/deep-link is on screen. Also the same core logic
// sweep-solana-payments runs on a cron for growers who close the tab.
//
// Given an intent id: looks up its on-chain reference via
// getSignaturesForAddress, verifies a matching finalized USDC transfer to
// the hot wallet, and on success finalizes the underlying order through
// the exact same path PayPal capture uses (finalizeCompletedOrder).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  checkAndFinalizeSolanaIntent,
  ORDER_OWNER_COLUMN,
  ORDER_TABLE,
  type SolanaIntentRow,
  type SolanaOrderKind,
} from "../_shared/solanaPayIn.ts";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const BodySchema = z.object({ intentId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = authHeader.slice(7);

  const isServiceRole = token === serviceRoleKey;
  let callerId: string | null = null;
  if (!isServiceRole) {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
    callerId = authData.user.id;
  }

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  if (callerId) {
    // Polled every 5s while the payment screen is open -- a higher ceiling
    // than the once-per-checkout PAYMENT preset, same shape of "money
    // touching, per-user, fail-closed" requirement, just a lot more calls.
    const rlOk = await checkRateLimit(service, callerId, "solana_payment_check", 120, 10, true);
    if (!rlOk) return createRateLimitResponse(600);
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const result = BodySchema.safeParse(await req.json());
    if (!result.success) return json({ error: result.error.flatten().fieldErrors }, 400);
    parsed = result.data;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { data: intent, error: intentErr } = await service
    .from("solana_payment_intents")
    .select("id, order_kind, order_id, amount_usdc, reference_pubkey, hot_wallet_address, status, cluster, created_at, expires_at")
    .eq("id", parsed.intentId)
    .maybeSingle();
  if (intentErr) return json({ error: "intent_lookup_failed" }, 500);
  if (!intent) return json({ error: "intent_not_found" }, 404);

  const orderKind = intent.order_kind as SolanaOrderKind;
  const ownerColumn = ORDER_OWNER_COLUMN[orderKind];
  if (!isServiceRole) {
    const { data: order } = await service
      .from(ORDER_TABLE[orderKind])
      .select(ownerColumn)
      .eq("id", intent.order_id)
      .maybeSingle();
    const ownerId = (order as Record<string, unknown> | null)?.[ownerColumn];
    if (ownerId !== callerId) {
      const [{ data: isAdmin }, { data: isGosat }] = await Promise.all([
        service.rpc("has_role", { _user_id: callerId, _role: "admin" }),
        service.rpc("has_role", { _user_id: callerId, _role: "gosat" }),
      ]);
      if (!isAdmin && !isGosat) return json({ error: "forbidden" }, 403);
    }
  }

  try {
    const result = await checkAndFinalizeSolanaIntent(service, intent as SolanaIntentRow);
    return json({
      status: result.status,
      signature: result.signature ?? null,
      receivedAmountUsdc: result.receivedAmountUsdc ?? null,
      amountUsdc: intent.amount_usdc,
      expiresAt: intent.expires_at,
    });
  } catch (err) {
    console.error("check-solana-payment error", err);
    await logFunctionFailure("check-solana-payment", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
