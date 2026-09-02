// Mints a locked XRP/USD quote for a USD-priced payment, and reports the live
// rate for display.
//
// USD is the unit of account. A quote answers exactly one question: "right now,
// how many XRP satisfy $X?" — and holds that answer for 10 minutes. After that
// the bestower must re-quote. Nothing downstream ever stores an XRP balance.
//
// POST { mode: 'preview' }                       -> live rate only, nothing stored
// POST { mode: 'lock', usd_amount, purpose?, reference?,
//        destination_address?, destination_tag? }  -> stored, expiring quote
//
// Requires a signed-in caller for 'lock' (quotes belong to a member).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getXrpUsdRate, usdToXrp, QUOTE_TTL_MS } from "../_shared/xrpRate.ts";
import { getXrpNetwork } from "../_shared/cryptoNetworks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "lock" ? "lock" : "preview";

    const quote = await getXrpUsdRate();

    if (mode === "preview") {
      const usd = Number(body?.usd_amount);
      return json({
        rate: quote.rate,
        sources: quote.sources,
        observed_at: quote.observedAt,
        is_override: quote.isOverride,
        network: getXrpNetwork(),
        quote_ttl_seconds: QUOTE_TTL_MS / 1000,
        xrp_amount: Number.isFinite(usd) && usd > 0 ? usdToXrp(usd, quote.rate) : null,
      });
    }

    // ---- lock ----
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice(7).trim();

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const usdAmount = Number(body?.usd_amount);
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
      return json({ error: "usd_amount must be greater than 0" }, 400);
    }
    if (usdAmount > 1_000_000) return json({ error: "usd_amount is out of range" }, 400);

    const xrpAmount = usdToXrp(usdAmount, quote.rate);
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: row, error } = await admin
      .from("xrp_quotes")
      .insert({
        user_id: u.user.id,
        purpose: typeof body?.purpose === "string" ? body.purpose.slice(0, 40) : "bestowal",
        reference: typeof body?.reference === "string" ? body.reference.slice(0, 200) : null,
        usd_amount: usdAmount,
        xrp_usd_rate: quote.rate,
        xrp_amount: xrpAmount,
        rate_sources: quote.sources,
        destination_address: body?.destination_address ?? null,
        destination_tag: body?.destination_tag ?? null,
        expires_at: expiresAt,
      })
      .select("id, usd_amount, xrp_usd_rate, xrp_amount, expires_at, status")
      .single();
    if (error) return json({ error: error.message }, 400);

    return json({
      quote: row,
      sources: quote.sources,
      observed_at: quote.observedAt,
      network: getXrpNetwork(),
      quote_ttl_seconds: QUOTE_TTL_MS / 1000,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("xrp-quote error", message);
    return json({ error: message }, 500);
  }
});
