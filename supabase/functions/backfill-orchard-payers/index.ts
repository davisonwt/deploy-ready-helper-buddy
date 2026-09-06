// P0-5 Phase C1: write the payer wallet onto every Solana orchard holding
// that lacks one, read from the confirmed transaction on the holding's own
// cluster. Idempotent; reports per holding; never guesses (a holding whose
// readings disagree or whose transaction cannot be found is marked
// payer_source = 'unknown' for a gosat to resolve by hand).
//
// Auth: CRON_SECRET bearer (invoke_money_job), the service-role apikey, or
// an admin/gosat session. Body: { holdingId?: string, force?: boolean }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveSenderForSignature } from "../_shared/solanaSender.ts";
import type { SolanaCluster } from "../_shared/cryptoNetworks.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) return json({ error: "server_misconfigured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const apikeyHeader = req.headers.get("apikey") ?? "";

  let authorized = false;
  let actor = "cron";
  if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
  if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) { authorized = true; actor = "service"; }
  if (!authorized && token) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userClient.auth.getUser();
    if (u?.user) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      authorized = !!roles?.some((r: { role: string }) => ["admin", "gosat"].includes(r.role));
      if (authorized) actor = u.user.id;
    }
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  let body: { holdingId?: string; force?: boolean } = {};
  try { body = await req.json(); } catch { body = {}; }

  let q = admin
    .from("orchard_holdings")
    .select("id, orchard_id, bestowal_id, rail, rail_reference, payer_address, payer_source, status")
    .eq("rail", "solana");
  if (body.holdingId) q = q.eq("id", body.holdingId);
  else if (!body.force) q = q.is("payer_address", null);
  const { data: holdings, error } = await q.order("created_at");
  if (error) return json({ error: "holdings_read_failed", detail: error.message }, 500);

  const report: Array<Record<string, unknown>> = [];
  for (const h of holdings ?? []) {
    const { data: intent } = await admin
      .from("solana_payment_intents")
      .select("id, cluster, hot_wallet_address, signature, status")
      .eq("order_kind", "orchard")
      .eq("order_id", h.bestowal_id)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const signature: string | null = h.rail_reference ?? intent?.signature ?? null;
    const cluster = (intent?.cluster ?? "devnet") as SolanaCluster;
    const hotWallet: string | null = intent?.hot_wallet_address ?? Deno.env.get("SOLANA_HOT_WALLET_ADDRESS") ?? null;
    if (!signature || !hotWallet) {
      report.push({ holding: h.id, result: "unknown", reason: !signature ? "no signature stored" : "no hot wallet address" });
      await admin.rpc("orchard_record_payer", { _holding_id: h.id, _address: null, _source: "unknown", _detail: !signature ? "no signature stored" : "no hot wallet address", _actor: actor });
      continue;
    }
    try {
      const r = await resolveSenderForSignature(signature, cluster, hotWallet);
      const { error: recErr } = await admin.rpc("orchard_record_payer", {
        _holding_id: h.id,
        _address: r.payer,
        _source: r.source,
        _detail: r.reason ?? `authority=${r.authority} preBalanceOwner=${r.preBalanceOwner} accountOwner=${r.accountOwner ?? "-"} via ${cluster}`,
        _actor: actor,
      });
      report.push({ holding: h.id, orchard: h.orchard_id, status: h.status, cluster, signature: signature.slice(0, 12), payer: r.payer, source: r.source, reason: r.reason, recorded: !recErr, error: recErr?.message ?? null });
    } catch (err) {
      report.push({ holding: h.id, result: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }
  return json({ ok: true, count: report.length, report });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
