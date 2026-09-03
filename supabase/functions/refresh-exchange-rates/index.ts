// Refreshes public.exchange_rates from a live FX API. Scheduled hourly via
// invoke_money_job (see 20260903120000_exchange_rates.sql). USD is the
// app's stored base currency everywhere -- this only ever writes
// USD-per-currency rates, never touches a money table.
//
// On any fetch/parse failure this leaves the table exactly as it was --
// the last-known rate is the fallback, not an error surfaced to a user
// mid-checkout.
//
// Auth: CRON_SECRET only (invoke_money_job's bearer token), same pattern
// as sweep-solana-payments.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const RATES_URL = "https://open.er-api.com/v6/latest/USD";

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
    const resp = await fetch(RATES_URL, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error(`fx_api_status_${resp.status}`);
    const body = await resp.json();
    if (body?.result !== "success" || !body?.rates || typeof body.rates !== "object") {
      throw new Error("fx_api_bad_response");
    }

    const rows = Object.entries(body.rates as Record<string, number>)
      .filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && typeof rate === "number" && rate > 0)
      .map(([currency, usd_rate]) => ({ currency, usd_rate, updated_at: new Date().toISOString() }));
    // The API's own base row (USD:1) is already included in `rates` -- no
    // need to special-case it.

    if (rows.length === 0) throw new Error("fx_api_empty_rates");

    const { error } = await service.from("exchange_rates").upsert(rows, { onConflict: "currency" });
    if (error) throw new Error(`upsert_failed:${error.message}`);

    return json({ success: true, updated: rows.length });
  } catch (err) {
    console.error("refresh-exchange-rates error", err);
    await logFunctionFailure("refresh-exchange-rates", err);
    // Last-known rates remain in place -- this is the documented fallback,
    // not a 500 that should page anyone. Still report non-2xx so cron
    // monitoring can see the miss.
    return json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
