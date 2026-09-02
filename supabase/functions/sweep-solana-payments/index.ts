// Cron sweep for pending Solana payment intents (every 2 minutes -- see
// the migration this shipped with). spec-payments.md section 3: "poll, do
// not rely on a callback" -- this is the safety net for a grower who
// closes the payment screen tab before check-solana-payment's client-side
// polling confirms the payment; without this, that order would sit
// 'pending' forever even though the money genuinely arrived on-chain.
//
// Auth: CRON_SECRET only (invoke_money_job's bearer token) -- this never
// needs a user session or an ownership check, unlike check-solana-payment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkAndFinalizeSolanaIntent, type SolanaIntentRow } from "../_shared/solanaPayIn.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const authorized = !!CRON_SECRET && (token === CRON_SECRET || cronHeader === CRON_SECRET);
  if (!authorized) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    // Every still-pending intent, oldest first -- including ones already
    // past expires_at, since those still need one positive on-chain check
    // before expireSolanaIntent() (inside checkAndFinalizeSolanaIntent) is
    // allowed to mark them 'expired'. Capped at 200/run so one slow RPC
    // provider outage can't make a single sweep run indefinitely.
    const { data: intents, error } = await service
      .from("solana_payment_intents")
      .select("id, order_kind, order_id, amount_usdc, reference_pubkey, hot_wallet_address, status, cluster, expires_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(`intents_lookup_failed:${error.message}`);

    const results = { checked: 0, paid: 0, underpaid: 0, expired: 0, errors: 0 };
    for (const intent of (intents ?? []) as SolanaIntentRow[]) {
      results.checked++;
      try {
        const result = await checkAndFinalizeSolanaIntent(service, intent);
        if (result.status === "paid") results.paid++;
        else if (result.status === "underpaid") results.underpaid++;
        else if (result.status === "expired") results.expired++;
      } catch (err) {
        results.errors++;
        console.error("sweep-solana-payments: intent check failed", intent.id, err);
      }
    }

    return json({ success: true, ...results });
  } catch (err) {
    console.error("sweep-solana-payments error", err);
    await logFunctionFailure("sweep-solana-payments", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
