// Member invoicing Phase 2 (MEMBER-INVOICING-PLAN.md section 4): starts a
// payment attempt against one invoice, on either the USDC (Solana) or
// PayPal rail. Public -- no session, no Authorization header. The invoice's
// own unguessable public_token is the only credential, exactly like a magic
// link; a wrong or missing token (or an id/token pair that don't match)
// reads as "not found," never a more specific error that would help someone
// guess a real token.
//
// Full payment only: `amount` is always the invoice's own amount_due, never
// a client-supplied figure, so nothing here trusts the caller for how much
// is owed. The PayPal order charges the buyer amount_due plus the processor
// fee on top (computeBuyerFee) -- the same "buyer pays the processor fee,
// not the sower" rule every other create-*-order function follows. The
// invoice_payments row itself still records `amount` as the invoice's own
// amount_due (fee-exclusive), so finalize_invoice_payment's flat 15% S2G cut
// and the invoice's own amount_paid stay exactly what the member invoiced.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { createSolanaIntent } from "../_shared/solanaPayIn.ts";
import { environmentFromSolanaCluster } from "../_shared/revenueRules.ts";
import { USDC_MINTS } from "../_shared/cryptoNetworks.ts";
import { paypalFetch } from "../_shared/paypal/client.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";
import { paypalEnvironment } from "../_shared/revenue.ts";

interface Payload {
  invoiceId: string;
  publicToken: string;
  rail: "solana" | "paypal";
  redirectBaseUrl?: string;
}

interface PaypalOrderResponse {
  id?: string;
  status?: string;
  links?: Array<{ href: string; rel: string; method: string }>;
}

interface InvoiceRef {
  id: string;
  number: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    let payload: Payload;
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (!payload?.invoiceId || !payload?.publicToken) return json({ error: "invoiceId and publicToken are required" }, 400);
    if (payload.rail !== "solana" && payload.rail !== "paypal") {
      return json({ error: "rail_not_supported", message: "Only USDC (Solana) or PayPal payment is available." }, 400);
    }

    // Public endpoint -- rate-limit per invoice (not per user; there is
    // none) so repeated calls against the same pay page can't spam
    // solana_payment_intents rows or mint PayPal orders. Fail closed, same
    // as every other money-touching function.
    const rlOk = await checkRateLimit(service, `invoice:${payload.invoiceId}`, "invoice_payment", 20, 15, true);
    if (!rlOk) return createRateLimitResponse(15 * 60);

    const { data: invoice, error: invoiceErr } = await service
      .from("invoices")
      .select("id, business_id, status, total, amount_paid, amount_due, number")
      .eq("id", payload.invoiceId)
      .eq("public_token", payload.publicToken)
      .maybeSingle();
    if (invoiceErr) {
      console.error("create-invoice-payment: invoice lookup failed", invoiceErr);
      return json({ error: "lookup_failed" }, 500);
    }
    // Same "not found" for a wrong token as for a wrong id -- never reveals
    // which half was wrong.
    if (!invoice) return json({ error: "invoice_not_found" }, 404);
    if (invoice.status !== "sent") {
      return json({ error: "invoice_not_payable", message: `This invoice is ${invoice.status === "paid" ? "already paid" : invoice.status}.` }, 409);
    }
    const amountDue = Number(invoice.amount_due);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      return json({ error: "nothing_due" }, 409);
    }

    // Reuse a still-pending attempt on the same rail rather than minting a
    // fresh intent (and a fresh QR) or a fresh PayPal order on every page
    // load/poll.
    const { data: existingPayment } = await service
      .from("invoice_payments")
      .select("id, provider_order_id")
      .eq("invoice_id", invoice.id)
      .eq("rail", payload.rail)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payload.rail === "solana") {
      if (existingPayment?.provider_order_id) {
        const { data: intent } = await service
          .from("solana_payment_intents")
          .select("id, reference_pubkey, hot_wallet_address, amount_usdc, cluster, expires_at, status")
          .eq("id", existingPayment.provider_order_id)
          .maybeSingle();
        if (intent && (intent.status === "pending" || intent.status === "expired") && new Date(intent.expires_at).getTime() > Date.now()) {
          // Rebuilds the same URL buildSolanaIntentPricing would have made at
          // creation time -- must reuse the intent's OWN reference_pubkey,
          // never generate a fresh one, or the QR would point at a reference
          // nothing is watching for.
          return json({
            paymentId: existingPayment.id,
            solanaPayment: {
              intentId: intent.id,
              referencePubkey: intent.reference_pubkey,
              hotWalletAddress: intent.hot_wallet_address,
              amountUsdc: intent.amount_usdc,
              cluster: intent.cluster,
              expiresAt: intent.expires_at,
              solanaPayUrl: buildSolanaPayUrl(intent.hot_wallet_address, intent.amount_usdc, intent.reference_pubkey, intent.cluster, invoice.number),
            },
          });
        }
      }
      return await createSolanaPaymentAttempt(service, invoice, amountDue);
    }

    return await createPaypalPaymentAttempt(service, invoice, amountDue, existingPayment, payload.redirectBaseUrl);
  } catch (err) {
    console.error("create-invoice-payment error", err);
    await logFunctionFailure("create-invoice-payment", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function createSolanaPaymentAttempt(
  service: SupabaseClient,
  invoice: InvoiceRef,
  amountDue: number,
) {
  const { data: payment, error: paymentErr } = await service
    .from("invoice_payments")
    .insert({
      invoice_id: invoice.id,
      amount: amountDue,
      rail: "solana",
      environment: "devnet", // corrected below once the intent's real cluster is known
      status: "pending",
    })
    .select("id")
    .single();
  if (paymentErr || !payment) {
    console.error("create-invoice-payment: insert failed", paymentErr);
    return json({ error: "payment_insert_failed" }, 500);
  }

  let solanaPayment;
  try {
    solanaPayment = await createSolanaIntent(service, {
      orderKind: "invoice",
      orderId: payment.id,
      amountUsdc: amountDue,
      label: "Sow2Grow",
      message: `Invoice ${invoice.number}`,
    });
  } catch (err) {
    console.error("create-invoice-payment: solana intent failed", err);
    await service.from("invoice_payments").update({ status: "failed" }).eq("id", payment.id);
    return json({ error: "solana_intent_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }

  await service.from("invoice_payments").update({
    provider_order_id: solanaPayment.intentId,
    environment: environmentFromSolanaCluster(solanaPayment.cluster),
  }).eq("id", payment.id);

  return json({ paymentId: payment.id, solanaPayment });
}

async function createPaypalPaymentAttempt(
  service: SupabaseClient,
  invoice: InvoiceRef,
  amountDue: number,
  existingPayment: { id: string; provider_order_id: string | null } | null | undefined,
  redirectBaseUrl?: string,
) {
  const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const paypalSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!paypalClientId || !paypalSecret) {
    return json({ error: "paypal_credentials_missing" }, 500);
  }

  // Reuse a still-open order rather than minting a fresh one on every page
  // load/poll -- mirrors the Solana branch's own reuse check above.
  if (existingPayment?.provider_order_id) {
    const lookup = await paypalFetch<PaypalOrderResponse>(
      `/v2/checkout/orders/${encodeURIComponent(existingPayment.provider_order_id)}`,
      { method: "GET" },
    );
    const status = String(lookup.data?.status ?? "").toUpperCase();
    if (lookup.ok && (status === "CREATED" || status === "APPROVED")) {
      const approveLink = lookup.data?.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
      return json({
        paymentId: existingPayment.id,
        paypalPayment: {
          orderId: existingPayment.provider_order_id,
          approveUrl: approveLink?.href ?? null,
        },
      });
    }
    // Anything else (already captured elsewhere, voided, or the lookup
    // itself failed) falls through to minting a fresh order below.
  }

  // Golden rule: the buyer pays the processor fee, not the sower/member --
  // same computeBuyerFee call every other create-*-order function makes.
  // `amountDue` itself (fee-exclusive) is what gets recorded on the
  // invoice_payments row and against the invoice's own amount_paid;
  // `buyerCharge` (fee-inclusive) is what PayPal actually charges the payer.
  const quote = computeBuyerFee("paypal", amountDue);
  const processorFee = quote.fee;
  const buyerCharge = quote.total;

  const { data: payment, error: paymentErr } = await service
    .from("invoice_payments")
    .insert({
      invoice_id: invoice.id,
      amount: amountDue,
      rail: "paypal",
      environment: paypalEnvironment(),
      status: "pending",
      processor_fee: processorFee,
    })
    .select("id")
    .single();
  if (paymentErr || !payment) {
    console.error("create-invoice-payment: insert failed", paymentErr);
    return json({ error: "payment_insert_failed" }, 500);
  }

  const redirectBase = redirectBaseUrl ?? "https://sow2growapp.com";
  const customId = `invoice:${payment.id}`;

  const { ok, status, data, raw } = await paypalFetch<PaypalOrderResponse>(
    "/v2/checkout/orders",
    {
      method: "POST",
      body: {
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: customId,
          custom_id: customId,
          description: `Sow2Grow invoice ${invoice.number}`.slice(0, 127),
          amount: { currency_code: "USD", value: buyerCharge.toFixed(2) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Sow2Grow",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              landing_page: "LOGIN",
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              return_url: `${redirectBase}/payment-success?invoicePayment=${payment.id}`,
              cancel_url: `${redirectBase}/payment-cancelled?invoicePayment=${payment.id}`,
            },
          },
        },
      },
    },
  );

  if (!ok || !data?.id) {
    console.error("create-invoice-payment: paypal order failed", status, raw);
    await service.from("invoice_payments").update({ status: "failed" }).eq("id", payment.id);
    return json({ error: "paypal_order_failed", status, body: raw }, 502);
  }

  await service.from("invoice_payments").update({ provider_order_id: data.id }).eq("id", payment.id);

  const approveLink = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
  return json({
    paymentId: payment.id,
    paypalPayment: {
      orderId: data.id,
      approveUrl: approveLink?.href ?? null,
      breakdown: { amountDue, processorFee, buyerCharge, currency: "USD" },
    },
  });
}

function buildSolanaPayUrl(
  hotWalletAddress: string,
  amountUsdc: number,
  referencePubkey: string,
  cluster: "mainnet-beta" | "devnet",
  invoiceNumber: string,
): string {
  const url = new URL(`solana:${hotWalletAddress}`);
  url.searchParams.set("amount", amountUsdc.toFixed(6).replace(/\.?0+$/, "") || "0");
  url.searchParams.set("spl-token", USDC_MINTS[cluster]);
  url.searchParams.set("reference", referencePubkey);
  url.searchParams.set("label", "Sow2Grow");
  url.searchParams.set("message", `Invoice ${invoiceNumber}`);
  return url.toString();
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
