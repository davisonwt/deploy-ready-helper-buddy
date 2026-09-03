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
import { priceBreakdown, s2gFeeOn, S2G_FEE_RATE } from "../_shared/platformFee.ts";
import { createSolanaIntent } from "../_shared/solanaPayIn.ts";
import { finalizeCompletedOrder } from "../_shared/paypal/capture.ts";
import { isS2GBalanceEnabled } from "../_shared/featureFlags.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

type GiftContext = "live_session" | "radio_session" | "chat_tip";
type Provider = "nowpayments" | "paypal" | "solana" | "balance";

interface RequestPayload {
  recipientId: string;
  amount: number;                 // the value the giver set — recipient nets 100% of this; S2G's 15% and the processor fee are added on top of what the giver pays
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
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
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
    if (
      payload.provider !== "nowpayments" && payload.provider !== "paypal" &&
      payload.provider !== "solana" && payload.provider !== "balance"
    ) {
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
    // S2G's 15% fee is added on top of the base, paid by the giver.
    const pricing = priceBreakdown(baseAmount);
    // Processor fee is on top of the S2G-inclusive total — Sow2Grow golden rule.
    const quote = computeBuyerFee(payload.provider, pricing.total);
    const feePct = quote.feePct;
    const processorFee = quote.fee;
    const buyerTotal = quote.total;
    const currency = "USDC";

    // --- Resolve recipient payout wallet -------------------------------------
    const wallet = await resolveSowerPayout(service, payload.recipientId);
    if (!wallet) {
      return json({
        error: "no_payout_method",
        message: "Recipient has no NOWPayments or PayPal payout wallet configured.",
      }, 409);
    }

    // --- Build slim distribution snapshot (no orchard, no whisperer) --------
    // No whisperer applies to a gift/tip: it isn't attached to a seed, and
    // there is no product/orchard/book link to resolve one from.
    const distribution = await buildGiftDistribution(service, {
      recipientUserId: payload.recipientId,
      baseAmount,
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
          is_fixed_rate: true,
          is_fee_paid_by_user: true,
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
        breakdown: { baseAmount, s2gFee: pricing.s2gFee, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- S2G Balance (one-tap, no wallet) --------------------------------------
    if (payload.provider === "balance") {
      if (!isS2GBalanceEnabled()) return json({ error: "balance_disabled" }, 409);
      const { data: debitRow, error: debitError } = await service.rpc("debit_balance_ledger", {
        _user_id: bestowerId,
        _amount: buyerTotal,
        _kind: "bestow_debit",
        _reference_table: "bestowals",
        _reference_id: bestowal.id,
        _idempotency_key: bestowal.id,
        _created_by: bestowerId,
        _notes: `gift bestowal (${payload.contextKind})`,
      });
      if (debitError) {
        if (debitError.message?.startsWith("insufficient_balance")) {
          const available = Number(debitError.message.split(":")[1] ?? 0);
          await failBestowal(service, bestowal.id, "insufficient_balance");
          return json({ error: "insufficient_balance", available, shortBy: round2(buyerTotal - available) }, 402);
        }
        console.error("balance debit failed", debitError);
        await failBestowal(service, bestowal.id, "balance_debit_failed");
        return json({ error: "balance_debit_failed", detail: debitError.message }, 500);
      }

      await service.from("bestowals")
        .update({ provider_order_id: debitRow.id })
        .eq("id", bestowal.id);

      try {
        await finalizeCompletedOrder(service, "gift", bestowal.id, debitRow.id);
      } catch (err) {
        console.error("balance finalize failed", err);
        return json({ error: "finalize_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
      }

      return json({
        bestowalId: bestowal.id,
        provider: "balance",
        balance: { debited: true, ledgerId: debitRow.id },
        breakdown: { baseAmount, s2gFee: pricing.s2gFee, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
      });
    }

    // --- Solana (direct USDC pay-in) -------------------------------------------
    if (payload.provider === "solana") {
      let solanaPayment;
      try {
        solanaPayment = await createSolanaIntent(service, {
          orderKind: "gift",
          orderId: bestowal.id,
          amountUsdc: buyerTotal,
          label: "Sow2Grow",
          message: `Sow2Grow gift bestowal (${payload.contextKind})`,
        });
      } catch (err) {
        console.error("solana intent creation failed", err);
        await failBestowal(service, bestowal.id, "solana_intent_failed");
        return json({ error: "solana_intent_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
      }
      await service.from("bestowals")
        .update({ provider_order_id: solanaPayment.intentId })
        .eq("id", bestowal.id);
      return json({
        bestowalId: bestowal.id,
        provider: "solana",
        solanaPayment,
        breakdown: { baseAmount, s2gFee: pricing.s2gFee, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
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
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Sow2Grow",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            landing_page: "LOGIN",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: `${redirectBase}/payment-success?bestowal=${bestowal.id}`,
            cancel_url: `${redirectBase}/payment-cancelled?bestowal=${bestowal.id}`,
          },
        },
      },
      application_context: {
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${redirectBase}/payment-success?bestowal=${bestowal.id}`,
        cancel_url: `${redirectBase}/payment-cancelled?bestowal=${bestowal.id}`,
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
      breakdown: { baseAmount, s2gFee: pricing.s2gFee, processorFee, processorFeePct: feePct, buyerTotal, currency: "USD" },
    });
  } catch (err) {
    console.error("create-gift-bestowal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Slim distribution snapshot for gifts (no orchard, no whisperer).
// Same shape as buildDistributionData so dispatchPayouts works unchanged.
// ---------------------------------------------------------------------------

interface GiftDistInput {
  recipientUserId: string;
  /** The value the giver set / recipient is owed — NOT grossed up. */
  baseAmount: number;
  currency: string;
}

async function buildGiftDistribution(supabase: SupabaseClient, ctx: GiftDistInput) {
  const { data: wallets } = await supabase
    .from("organization_wallets")
    .select("wallet_name, wallet_address")
    .in("wallet_name", ["s2gholding", "s2gbestow"])
    .eq("is_active", true);

  const byName: Record<string, string> = {};
  for (const w of wallets ?? []) byName[w.wallet_name] = w.wallet_address;
  if (!byName.s2gholding) throw new Error("Holding wallet (s2gholding) is not configured");
  if (!byName.s2gbestow) throw new Error("Tithing wallet (s2gbestow) is not configured");

  // The recipient's amount is the full base — S2G's 15% was already
  // collected on top of the giver's charge at checkout, not deducted here.
  const base = round2(ctx.baseAmount);
  const tithing = s2gFeeOn(base);

  return {
    total_amount: base,
    currency: ctx.currency,
    holding_wallet: byName.s2gholding,
    tithing_admin_wallet: byName.s2gbestow,
    tithing_admin_amount: tithing,
    sower_wallet: null,                  // resolved via bestowals.payout_destination
    sower_amount: base,
    sower_user_id: ctx.recipientUserId,
    mode: "automatic",
    hold_reason: null,
    orchard_type: null,
    courier_required: false,
    proof_sent_at: null,
    manual_release_at: null,
    manual_release_user_id: null,
    percentages: { holding: 1, tithing_admin: S2G_FEE_RATE, sower: 1 },
    fee_model: "gross_up",
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
