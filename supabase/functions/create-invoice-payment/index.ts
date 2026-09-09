// Member invoicing Phase 1 (MEMBER-INVOICING-PLAN.md section 4): starts a
// USDC payment attempt against one invoice. Public -- no session, no
// Authorization header. The invoice's own unguessable public_token is the
// only credential, exactly like a magic link; a wrong or missing token
// (or an id/token pair that don't match) reads as "not found," never a
// more specific error that would help someone guess a real token.
//
// Solana only in Phase 1 (PayPal rides the same rail from phase 4 -- see
// the plan's build order). Full payment only: `amount` is always the
// invoice's own amount_due, never a client-supplied figure, so nothing
// here trusts the caller for how much is owed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";
import { createSolanaIntent } from "../_shared/solanaPayIn.ts";
import { environmentFromSolanaCluster } from "../_shared/revenueRules.ts";
import { USDC_MINTS } from "../_shared/cryptoNetworks.ts";

interface Payload {
  invoiceId: string;
  publicToken: string;
  rail: "solana" | "paypal";
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
    if (payload.rail !== "solana") {
      // PayPal is phase 4 -- refuse cleanly rather than silently ignore the field.
      return json({ error: "rail_not_supported", message: "Only USDC (Solana) payment is available today." }, 400);
    }

    // Public endpoint -- rate-limit per invoice (not per user; there is
    // none) so repeated calls against the same pay page can't spam
    // solana_payment_intents rows. Fail closed, same as every other
    // money-touching function.
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
    // fresh intent (and a fresh QR) on every page load/poll.
    const { data: existingPayment } = await service
      .from("invoice_payments")
      .select("id, provider_order_id")
      .eq("invoice_id", invoice.id)
      .eq("rail", "solana")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
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
  } catch (err) {
    console.error("create-invoice-payment error", err);
    await logFunctionFailure("create-invoice-payment", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

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
