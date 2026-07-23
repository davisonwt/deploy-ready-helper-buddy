// Create a wallet top-up: opens a NOWPayments invoice or PayPal order
// whose order_id / custom_id encodes "topup:<topupId>" so the existing
// webhook handlers can credit sower_balances when payment completes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

interface Payload {
  provider: "nowpayments" | "paypal";
  amount: number; // USD base amount the user wants credited
  payCurrency?: string; // for nowpayments, defaults to usdcsol
  redirectBaseUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    let payload: Payload;
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

    if (!payload?.provider || !["nowpayments","paypal"].includes(payload.provider)) {
      return json({ error: "invalid_provider" }, 400);
    }
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return json({ error: "invalid_amount", message: "Amount must be between $1 and $10,000." }, 400);
    }
    const base = round2(amount);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Fee estimate so the row stores what was shown to the user.
    // Buyer pays the processor fee — Sow2Grow golden rule.
    const quote = computeBuyerFee(payload.provider, base);
    const feePct = quote.feePct;
    const fee = quote.fee;
    const buyerTotal = quote.total;

    // 1. Create topups row
    const { data: topup, error: topupErr } = await service
      .from("topups")
      .insert({
        user_id: userId,
        provider: payload.provider,
        amount: base,
        fee_amount: fee,
        currency: "USD",
        status: "pending",
        metadata: { buyer_total: buyerTotal, fee_pct: feePct },
      })
      .select("id")
      .single();
    if (topupErr || !topup) {
      console.error("topups insert failed", topupErr);
      return json({ error: "topup_insert_failed", detail: topupErr?.message }, 500);
    }

    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";

    if (payload.provider === "nowpayments") {
      const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
      if (!apiKey) return json({ error: "nowpayments_not_configured" }, 500);
      const payCurrency = (payload.payCurrency ?? "usdcsol").toLowerCase();
      const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

      const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: buyerTotal,
          price_currency: "usd",
          pay_currency: payCurrency,
          order_id: `topup:${topup.id}`,
          order_description: `Sow2Grow wallet top-up`,
          ipn_callback_url: ipnUrl,
          success_url: `${redirectBase}/wallet?topup=success`,
          cancel_url: `${redirectBase}/wallet?topup=cancelled`,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("nowpayments invoice failed", res.status, body);
        await service.from("topups").update({ status: "failed", metadata: { error: body } }).eq("id", topup.id);
        return json({ error: "invoice_failed", status: res.status, body }, 502);
      }
      const invoice = await res.json() as { id?: string; invoice_url?: string };
      await service.from("topups").update({ provider_order_id: invoice.id ?? null }).eq("id", topup.id);

      return json({
        topupId: topup.id,
        provider: "nowpayments",
        invoiceUrl: invoice.invoice_url,
        breakdown: { base, fee, buyerTotal, currency: "USD" },
      });
    }

    // PayPal
    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: `topup:${topup.id}`,
        custom_id: `topup:${topup.id}`,
        description: "Sow2Grow wallet top-up",
        amount: { currency_code: "USD", value: buyerTotal.toFixed(2) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Sow2Grow",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            landing_page: "LOGIN",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: `${redirectBase}/wallet?topup=success`,
            cancel_url: `${redirectBase}/wallet?topup=cancelled`,
          },
        },
      },
      application_context: {
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${redirectBase}/wallet?topup=success`,
        cancel_url: `${redirectBase}/wallet?topup=cancelled`,
      },
    };
    const { ok, status, data, raw } = await paypalFetch<{ id?: string; links?: Array<{ href: string; rel: string }> }>(
      "/v2/checkout/orders",
      { method: "POST", body: orderBody },
    );
    if (!ok || !data?.id) {
      console.error("paypal topup order failed", status, raw);
      await service.from("topups").update({ status: "failed", metadata: { error: raw } }).eq("id", topup.id);
      return json({ error: "paypal_order_failed", status, body: raw }, 502);
    }
    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    await service.from("topups").update({ provider_order_id: data.id }).eq("id", topup.id);

    return json({
      topupId: topup.id,
      provider: "paypal",
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { base, fee, buyerTotal, currency: "USD" },
    });
  } catch (err) {
    console.error("create-wallet-topup error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function ceil2(n: number) { return Math.ceil((n - Number.EPSILON) * 100) / 100; }
