// Create a free-will gift bestowal order on either NOWPayments or PayPal.
//
// Mirrors create-nowpayments-invoice / create-paypal-order but the recipient is
// an arbitrary user (live-session host, radio DJ, or chat counterpart) rather
// than an orchard owner. Inserts a bestowals row with orchard_id=NULL,
// context_kind/context_id set, then returns the buyer-redirect URL.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveSowerPayout } from "../_shared/resolveSowerPayout.ts";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

type GiftContext = "live_session" | "radio_session" | "chat_tip";
type Provider = "nowpayments" | "paypal";

interface RequestPayload {
  recipientId: string;
  amount: number;                 // base amount the recipient should net (before processor fee)
  contextKind: GiftContext;
  contextId: string;              // session id, schedule id, or chat room id
  provider: Provider;
  payCurrency?: string;           // NOWPayments only (e.g. 'usdttrc20')
  message?: string;
  redirectBaseUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const bestowerId = userData.user.id;

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (
      !payload?.recipientId ||
      typeof payload.amount !== "number" ||
      payload.amount <= 0 ||
      !payload.contextKind ||
      !payload.contextId ||
      !payload.provider
    ) {
      return json({
        error: "missing_fields",
        required: ["recipientId", "amount", "contextKind", "contextId", "provider"],
      }, 400);
    }
    if (!["live_session", "radio_session", "chat_tip"].includes(payload.contextKind)) {
      return json({ error: "invalid_context_kind" }, 400);
    }
    if (payload.provider !== "nowpayments" && payload.provider !== "paypal") {
      return json({ error: "invalid_provider" }, 400);
    }
    if (payload.recipientId === bestowerId) {
      return json({ error: "cannot_gift_self" }, 400);
    }
    if (payload.provider === "nowpayments" && !payload.payCurrency) {
      return json({ error: "missing_pay_currency" }, 400);
    }

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // --- Pricing -------------------------------------------------------------
    const baseAmount = round2(payload.amount);
    const feeEnv = payload.provider === "paypal" ? "PAYPAL_FEE_PCT" : "NOWPAYMENTS_FEE_PCT";
    const feePct = Number(Deno.env.get(feeEnv) ?? "0.01");
    const processorFee = ceil2(baseAmount * (Number.isFinite(feePct) ? feePct : 0.01));
    const buyerTotal = round2(baseAmount + processorFee);
    const currency = "USDC";

    // --- Resolve recipient payout wallet -------------------------------------
    const wallet = await resolveSowerPayout(service, payload.recipientId);
    if (!wallet) {
      return json({
        error: "no_payout_method",
        message: "Recipient has no NOWPayments or PayPal payout wallet configured.",
      }, 409);
    }

    // --- Build slim distribution snapshot (no orchard, no grower) -----------
    const distribution = await buildGiftDistribution(service, {
      recipientUserId: payload.recipientId,
      totalAmount: baseAmount,
      currency,
    });

    // --- Insert bestowal row -------------------------------------------------
    const { data: bestowal, error: insertError } = await service
      .from("bestowals")
      .insert({
        orchard_id: null,
        bestower_id: bestowerId,
        amount: buyerTotal,
        currency,
        pockets_count: 1,
        message: payload.message ?? null,
        payment_method: payload.provider,
        payment_status: "pending",
        distribution_data: distribution,
        provider: payload.provider,
        base_amount: baseAmount,
        processor_fee_amount: processorFee,
        processor_fee_currency: "USD",
        buyer_total_amount: buyerTotal,
        payout_provider: wallet.payout_provider,
        payout_destination: wallet.wallet_address,
        payout_currency:
          wallet.payout_currency ?? (wallet.payout_provider === "paypal" ? "USD" : null),
        payout_status: "pending",
        context_kind: payload.contextKind,
        context_id: payload.contextId,
      })
      .select("id")
      .single();
    if (insertError || !bestowal) {
      console.error("gift bestowal insert failed", insertError);
      return json({ error: "bestowal_insert_failed", detail: insertError?.message }, 500);
    }

    // --- Create provider order -----------------------------------------------
    const redirectBase = payload.redirectBaseUrl ?? "https://sow2growapp.com";
    const orderId = `gift:${bestowal.id}`;

    if (payload.provider === "nowpayments") {
      const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
      if (!apiKey) {
        await failBestowal(service, bestowal.id, "nowpayments_misconfigured");
        return json({ error: "nowpayments_misconfigured" }, 500);
      }

      const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;
      const invoiceRes = await fetch(`${NOWPAYMENTS_API}/invoice`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: buyerTotal,
          price_currency: "usd",
          pay_currency: payload.payCurrency,
          order_id: orderId,
          order_description: `Sow2Grow gift bestowal (${payload.contextKind})`,
          ipn_callback_url: ipnUrl,
          success_url: `${redirectBase}/bestowals/${bestowal.id}?status=success`,
          cancel_url: `${redirectBase}/bestowals/${bestowal.id}?status=cancelled`,
        }),
      });

      if (!invoiceRes.ok) {
        const body = await invoiceRes.text();
        console.error("nowpayments gift invoice failed", invoiceRes.status, body);
        await failBestowal(service, bestowal.id, `invoice_failed:${invoiceRes.status}`);
        return json({ error: "invoice_failed", status: invoiceRes.status, body }, 502);
      }

      const invoice = await invoiceRes.json() as {
        id?: string;
        invoice_url?: string;
        expiration_date?: string;
      };

      await service.from("bestowals")
        .update({ provider_order_id: invoice.id ?? null })
        .eq("id", bestowal.id);

      return json({
        bestowalId: bestowal.id,
        provider: "nowpayments",
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoice_url,
        expiresAt: invoice.expiration_date ?? null,
        breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- PayPal path ---------------------------------------------------------
    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: orderId,
        custom_id: orderId,
        description: `Sow2Grow gift bestowal (${payload.contextKind})`.slice(0, 127),
        amount: { currency_code: "USD", value: buyerTotal.toFixed(2) },
      }],
      application_context: {
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
        return_url: `${redirectBase}/bestowals/${bestowal.id}?status=success`,
        cancel_url: `${redirectBase}/bestowals/${bestowal.id}?status=cancelled`,
      },
    };

    const { ok, status, data, raw } = await paypalFetch<{
      id?: string;
      links?: Array<{ href: string; rel: string }>;
    }>("/v2/checkout/orders", { method: "POST", body: orderBody });

    if (!ok || !data?.id) {
      console.error("paypal gift order failed", status, raw);
      await failBestowal(service, bestowal.id, `paypal_order_failed:${status}`);
      return json({ error: "paypal_order_failed", status, body: raw }, 502);
    }

    const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    await service.from("bestowals")
      .update({ provider_order_id: data.id })
      .eq("id", bestowal.id);

    return json({
      bestowalId: bestowal.id,
      provider: "paypal",
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { baseAmount, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
    });
  } catch (err) {
    console.error("create-gift-bestowal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Slim distribution snapshot for gifts (no orchard, no grower).
// Same shape as buildDistributionData so dispatchPayouts works unchanged.
// ---------------------------------------------------------------------------

interface GiftDistInput {
  recipientUserId: string;
  totalAmount: number;
  currency: string;
}

async function buildGiftDistribution(supabase: SupabaseClient, ctx: GiftDistInput) {
  const tithingPercent = clamp(Number(Deno.env.get("BESTOWAL_TITHING_PERCENT") ?? "0.15"));
  const sowerPercent = clamp(1 - tithingPercent);

  const { data: wallets } = await supabase
    .from("organization_wallets")
    .select("wallet_name, wallet_address")
    .in("wallet_name", ["s2gholding", "s2gbestow"])
    .eq("is_active", true);

  const byName: Record<string, string> = {};
  for (const w of wallets ?? []) byName[w.wallet_name] = w.wallet_address;
  if (!byName.s2gholding) throw new Error("Holding wallet (s2gholding) is not configured");
  if (!byName.s2gbestow) throw new Error("Tithing wallet (s2gbestow) is not configured");

  const total = round2(ctx.totalAmount);
  const tithing = round2(total * tithingPercent);
  const sower = round2(total - tithing);

  return {
    total_amount: total,
    currency: ctx.currency,
    holding_wallet: byName.s2gholding,
    tithing_admin_wallet: byName.s2gbestow,
    tithing_admin_amount: tithing,
    sower_wallet: null,                  // resolved via bestowals.payout_destination
    sower_amount: sower,
    sower_user_id: ctx.recipientUserId,
    grower_wallet: null,
    grower_amount: null,
    grower_user_id: null,
    mode: "automatic",
    hold_reason: null,
    orchard_type: null,
    courier_required: false,
    proof_sent_at: null,
    manual_release_at: null,
    manual_release_user_id: null,
    percentages: { holding: 1, tithing_admin: tithingPercent, sower: sowerPercent },
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------

async function failBestowal(supabase: SupabaseClient, id: string, reason: string) {
  await supabase
    .from("bestowals")
    .update({ payment_status: "failed", payout_error: reason })
    .eq("id", id);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function ceil2(n: number): number {
  return Math.ceil((n - Number.EPSILON) * 100) / 100;
}
function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
