// Shared "talk to Paystack" logic reused by every pay-in surface: the
// standalone paystack-initialize edge function (invoices) calls this, and
// create-orchard-bestowal-order / create-gift-bestowal-order call it
// in-process for their own paystack branches -- mirroring how
// _shared/paypal/client.ts's paypalFetch is inlined by each create-*-order
// function rather than routed through a separate "create-paypal-order" HTTP
// call.

import { paystackFetch, paystackEnvironmentFromKey, getZarRate } from "./client.ts";
import type { PaypalOrderKind } from "../paypal/capture.ts";

export interface PaystackInitializeParams {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  /** Which finalize() branch this order is -- same vocabulary _shared/paypal/capture.ts switches on. */
  kind: PaypalOrderKind;
  /** The order's own row id (bestowals.id for gift/orchard, invoice_payments.id for invoice) -- stored on paystack_transactions and in Paystack's metadata for the webhook to look up. */
  recordId: string;
  /** Buyer-total charge, in USD (base + S2G 15% where applicable + processor fee) -- converted to ZAR here, never trusted from the client. */
  amountUsd: number;
  email: string;
  description: string;
  redirectBaseUrl?: string;
  /** Extra fields merged into Paystack's metadata alongside kind/recordId. */
  metadataExtra?: Record<string, unknown>;
}

export interface PaystackInitializeResult {
  reference: string;
  authorizationUrl: string | null;
  amountZar: number;
  fxRate: number;
}

interface PaystackInitResponse {
  status?: boolean;
  message?: string;
  data?: { authorization_url?: string; access_code?: string; reference?: string };
}

/**
 * Converts amountUsd to ZAR at the currently stored rate, calls Paystack's
 * /transaction/initialize with channels restricted to card + EFT (Ozow),
 * records a paystack_transactions row, and returns the checkout URL.
 * Throws on any failure -- callers are responsible for marking their own
 * order row failed, same convention as every create-*-order PayPal branch.
 */
export async function initializePaystackTransaction(
  params: PaystackInitializeParams,
): Promise<PaystackInitializeResult> {
  const { supabase, kind, recordId, amountUsd, email, description, redirectBaseUrl, metadataExtra } = params;

  const { rate: fxRate } = await getZarRate(supabase);
  const amountZar = Math.round(amountUsd * fxRate * 100) / 100;
  const amountKobo = Math.round(amountZar * 100); // Paystack amounts are the smallest currency unit (cents)

  const redirectBase = redirectBaseUrl ?? "https://sow2growapp.com";
  const callbackUrl = `${redirectBase}/pay/paystack/return`;

  const { ok, status, data, raw } = await paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: amountKobo,
      currency: "ZAR",
      channels: ["card", "eft"],
      callback_url: callbackUrl,
      metadata: { kind, recordId, description, ...metadataExtra },
    },
  });

  if (!ok || !data?.status || !data.data?.reference) {
    console.error("paystack initialize failed", status, raw);
    throw new Error(`paystack_initialize_failed:${status}`);
  }

  const reference = data.data.reference;
  const environment = paystackEnvironmentFromKey();

  const { error: insertErr } = await supabase.from("paystack_transactions").insert({
    reference,
    status: "pending",
    kind,
    record_id: recordId,
    amount_usd: amountUsd,
    amount_zar: amountZar,
    fx_rate: fxRate,
    environment,
    raw_payload: data,
  });
  if (insertErr) {
    // Not fatal to the checkout itself (the webhook can still finalize via
    // its own lookup once the row exists on retry), but idempotency and the
    // gosat transaction list both depend on this row, so this is loud.
    console.error("paystack_transactions insert failed", insertErr);
  }

  return {
    reference,
    authorizationUrl: data.data.authorization_url ?? null,
    amountZar,
    fxRate,
  };
}
