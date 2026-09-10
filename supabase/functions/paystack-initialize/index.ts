// Starts a Paystack (card / EFT via Ozow) payment attempt against a public
// invoice -- the same "public token, no session" shape as
// create-invoice-payment's solana/paypal branches (MEMBER-INVOICING-PLAN.md
// section 4). Paystack settles in ZAR (converted from the invoice's stored
// USD amount at the live exchange_rates rate) and verifies locally via HMAC
// rather than PayPal's verify-API round trip, so it gets its own function
// here rather than a third branch bolted onto create-invoice-payment.
//
// Orchard and gift bestowals get their own paystack branch inline in
// create-orchard-bestowal-order / create-gift-bestowal-order instead (same
// pattern those functions already use for their paypal branch) -- both call
// the same _shared/paystack/initialize.ts this function calls, so every
// surface talks to Paystack through identical code.
//
// Full payment only: amount is always the invoice's own amount_due, never
// client-supplied -- same rule as every other create-*-order function.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { computeBuyerFee } from "../_shared/paypal/fees.ts";
import { initializePaystackTransaction } from "../_shared/paystack/initialize.ts";
import { paystackEnvironmentFromKey } from "../_shared/paystack/client.ts";

interface Payload {
  invoiceId: string;
  publicToken: string;
  redirectBaseUrl?: string;
}

interface InvoiceRef {
  id: string;
  number: string;
  customer_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);
    if (!Deno.env.get("PAYSTACK_SECRET_KEY")) return json({ error: "paystack_credentials_missing" }, 500);
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!payload?.invoiceId || !payload?.publicToken) {
      return json({ error: "invoiceId and publicToken are required" }, 400);
    }

    // Public endpoint -- rate-limit per invoice, same guard
    // create-invoice-payment uses for its own two rails.
    const rlOk = await checkRateLimit(service, `invoice:${payload.invoiceId}`, "invoice_payment", 20, 15, true);
    if (!rlOk) return createRateLimitResponse(15 * 60);

    const { data: invoice, error: invoiceErr } = await service
      .from("invoices")
      .select("id, business_id, status, total, amount_paid, amount_due, number, customer_id")
      .eq("id", payload.invoiceId)
      .eq("public_token", payload.publicToken)
      .maybeSingle();
    if (invoiceErr) {
      console.error("paystack-initialize: invoice lookup failed", invoiceErr);
      return json({ error: "lookup_failed" }, 500);
    }
    // Same "not found" for a wrong token as for a wrong id -- never reveals
    // which half was wrong (matches create-invoice-payment).
    if (!invoice) return json({ error: "invoice_not_found" }, 404);
    if (invoice.status !== "sent") {
      return json({
        error: "invoice_not_payable",
        message: `This invoice is ${invoice.status === "paid" ? "already paid" : invoice.status}.`,
      }, 409);
    }
    const amountDue = Number(invoice.amount_due);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      return json({ error: "nothing_due" }, 409);
    }

    // Reuse a still-pending Paystack attempt rather than minting a fresh
    // reference on every page load/poll -- mirrors create-invoice-payment's
    // own reuse checks for solana/paypal.
    const { data: existingPayment } = await service
      .from("invoice_payments")
      .select("id, provider_order_id")
      .eq("invoice_id", invoice.id)
      .eq("rail", "paystack")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingPayment?.provider_order_id) {
      const { data: existingTxn } = await service
        .from("paystack_transactions")
        .select("reference, raw_payload, status")
        .eq("reference", existingPayment.provider_order_id)
        .maybeSingle();
      if (existingTxn && existingTxn.status === "pending") {
        const authUrl = (existingTxn.raw_payload as { data?: { authorization_url?: string } } | null)
          ?.data?.authorization_url ?? null;
        if (authUrl) {
          return json({
            paymentId: existingPayment.id,
            paystackPayment: { reference: existingTxn.reference, authorization_url: authUrl },
          });
        }
      }
      // Anything else (already succeeded elsewhere, or no authorization_url
      // on the stored payload) falls through to minting a fresh attempt.
    }

    // Golden rule: the buyer pays the processor fee, not the sower/member --
    // same computeBuyerFee call every other create-*-order function makes.
    const quote = computeBuyerFee("paystack", amountDue);
    const processorFee = quote.fee;
    const buyerCharge = quote.total;

    const { data: payment, error: paymentErr } = await service
      .from("invoice_payments")
      .insert({
        invoice_id: invoice.id,
        amount: amountDue,
        rail: "paystack",
        environment: paystackEnvironmentFromKey(),
        status: "pending",
        processor_fee: processorFee,
      })
      .select("id")
      .single();
    if (paymentErr || !payment) {
      console.error("paystack-initialize: invoice_payments insert failed", paymentErr);
      return json({ error: "payment_insert_failed" }, 500);
    }

    let init;
    try {
      init = await initializePaystackTransaction({
        supabase: service,
        kind: "invoice",
        recordId: payment.id,
        amountUsd: buyerCharge,
        email: await resolveInvoiceEmail(service, invoice as InvoiceRef),
        description: `Sow2Grow invoice ${invoice.number}`,
        redirectBaseUrl: payload.redirectBaseUrl,
        metadataExtra: { invoiceId: invoice.id, paymentId: payment.id },
      });
    } catch (err) {
      console.error("paystack-initialize: initialize failed", err);
      await service.from("invoice_payments").update({ status: "failed" }).eq("id", payment.id);
      return json({ error: "paystack_initialize_failed", detail: err instanceof Error ? err.message : String(err) }, 502);
    }

    await service.from("invoice_payments").update({ provider_order_id: init.reference }).eq("id", payment.id);

    return json({
      paymentId: payment.id,
      paystackPayment: {
        reference: init.reference,
        authorization_url: init.authorizationUrl,
        breakdown: {
          amountDue,
          processorFee,
          buyerCharge,
          amountZar: init.amountZar,
          fxRate: init.fxRate,
          currency: "USD",
        },
      },
    });
  } catch (err) {
    console.error("paystack-initialize error", err);
    await logFunctionFailure("paystack-initialize", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function resolveInvoiceEmail(service: SupabaseClient, invoice: InvoiceRef): Promise<string> {
  try {
    if (invoice.customer_id) {
      const { data } = await service.from("customers").select("email").eq("id", invoice.customer_id).maybeSingle();
      if (data?.email) return data.email as string;
    }
  } catch (err) {
    console.warn("paystack-initialize: customer email lookup failed", err);
  }
  return `invoice-${invoice.id}@pay.sow2growapp.com`;
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
