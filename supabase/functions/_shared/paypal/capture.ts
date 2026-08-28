// Shared PayPal capture-and-finalize logic for every order kind.
//
// PayPal's Orders v2 API never auto-captures on buyer approval — an explicit
// POST /v2/checkout/orders/{id}/capture is always required, no matter what
// experience_context flags a create-*-order function sets. Before this
// module existed, only the basket flow (create-basket-bestowal-order) ever
// made that call; content purchases, gift bestowals, orchard bestowals, and
// wallet top-ups created a valid, approvable PayPal order and then left it
// uncaptured forever. This is the one place that call now lives, reused by
// paypal-webhook (on CHECKOUT.ORDER.APPROVED) and capture-paypal-order (the
// client-triggered recovery call from PaymentSuccessPage) for all five
// kinds, instead of being copied per kind.
//
// Each finalize step below is idempotent — safe to call twice, since a
// single order's lifecycle can call it from more than one place:
// CHECKOUT.ORDER.APPROVED capturing inline, PAYMENT.CAPTURE.COMPLETED
// arriving independently, and/or the buyer's return-page recovery call
// racing either one.

import { dispatchPayouts } from "../distribution.ts";
import { deliverFinalizeMessages } from "../postFinalize/messaging.ts";
import { syncBooksEntries } from "../postFinalize/books.ts";
import { paypalFetch } from "./client.ts";

export type PaypalOrderKind = "basket" | "content" | "gift" | "orchard" | "topup";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface CaptureResult {
  /** true once PayPal confirms COMPLETED and finalize has run (or had already run). */
  completed: boolean;
}

/**
 * Calls PayPal's /capture for `paypalOrderId` (or, on a 422 "already
 * captured" — a concurrent capture call racing this one — falls back to a
 * GET on the order to read its authoritative status), then — only once
 * PayPal's own response says COMPLETED — runs the finalize step for `kind`.
 * Never marks anything paid based on anything but PayPal's own response.
 *
 * Throws on a genuine capture failure (any non-422 non-ok response, or a
 * finalize RPC error) so callers that should retry on failure (the webhook,
 * via a non-2xx response back to PayPal) do, and callers that should surface
 * an error to the caller (the client recovery endpoint) can catch it.
 */
export async function captureAndFinalize(
  supabase: SupabaseLike,
  kind: PaypalOrderKind,
  recordId: string,
  paypalOrderId: string,
): Promise<CaptureResult> {
  const capture = await paypalFetch<{ status?: string; id?: string }>(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { method: "POST", body: {} },
  );

  if (!capture.ok && capture.status !== 422) {
    throw new Error(`paypal_capture_failed:${capture.status}`);
  }

  let completed = capture.ok && String(capture.data?.status ?? "").toUpperCase() === "COMPLETED";
  let paymentReference: string | null = capture.ok ? (capture.data?.id ?? null) : null;

  if (!completed) {
    const lookup = await paypalFetch<{ status?: string; id?: string }>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { method: "GET" },
    );
    completed = lookup.ok && String(lookup.data?.status ?? "").toUpperCase() === "COMPLETED";
    if (completed) paymentReference = lookup.data?.id ?? paypalOrderId;
  }

  if (!completed) return { completed: false };

  await finalize(supabase, kind, recordId, paymentReference);
  return { completed: true };
}

/**
 * Runs the finalize step directly, without calling PayPal's capture API —
 * for PAYMENT.CAPTURE.COMPLETED, where PayPal's event itself is already the
 * authoritative confirmation. Idempotent like captureAndFinalize's finalize
 * step, so it's safe to call even if captureAndFinalize already finalized
 * this same order moments earlier from CHECKOUT.ORDER.APPROVED.
 */
export async function finalizeCompletedOrder(
  supabase: SupabaseLike,
  kind: PaypalOrderKind,
  recordId: string,
  paymentReference: string | null,
): Promise<void> {
  await finalize(supabase, kind, recordId, paymentReference);
}

async function finalize(
  supabase: SupabaseLike,
  kind: PaypalOrderKind,
  recordId: string,
  paymentReference: string | null,
): Promise<void> {
  switch (kind) {
    case "basket": {
      // finalize_basket_order is idempotent — locks the row, short-circuits
      // if status is already 'completed'. It derives its own payment
      // reference from the order row, so none is passed here.
      const { error } = await supabase.rpc("finalize_basket_order", { _basket_order_id: recordId });
      if (error) throw new Error(`finalize_basket_order_failed:${error.message}`);
      break;
    }
    case "content": {
      // finalize_content_purchase is idempotent — locks the row,
      // short-circuits if payment_status is already 'completed'.
      const { error } = await supabase.rpc("finalize_content_purchase", { _purchase_id: recordId });
      if (error) throw new Error(`finalize_content_purchase_failed:${error.message}`);
      await supabase.from("content_purchases")
        .update({ payment_reference: paymentReference })
        .eq("id", recordId);
      break;
    }
    case "topup": {
      // credit_sower_balance_from_topup is idempotent — locks the row,
      // short-circuits if credited_at is already set.
      const { error } = await supabase.rpc("credit_sower_balance_from_topup", { _topup_id: recordId });
      if (error) throw new Error(`credit_sower_balance_from_topup_failed:${error.message}`);
      break;
    }
    case "gift":
    case "orchard": {
      await finalizeBestowal(supabase, recordId, paymentReference);
      break;
    }
  }

  // Best-effort — neither call throws, so a messaging or bookkeeping
  // failure can never roll back or mask a successful payment finalize.
  await deliverFinalizeMessages(supabase, kind, recordId);
  await syncBooksEntries(supabase, kind, recordId);
}

/**
 * Gift and orchard bestowals share this: both are rows in `bestowals`, both
 * mark paid + dispatch payouts the same way. There is no DB-side RPC for
 * this (unlike basket/content/topup) — this mirrors the idempotency check
 * (payment_status already completed/distributed short-circuits) that
 * previously lived inline in paypal-webhook's PAYMENT.CAPTURE.COMPLETED
 * handler, now shared by both entry points.
 */
async function finalizeBestowal(
  supabase: SupabaseLike,
  bestowalId: string,
  paymentReference: string | null,
): Promise<void> {
  const { data: bestowal, error: lookupError } = await supabase
    .from("bestowals")
    .select("id, payment_status")
    .eq("id", bestowalId)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`bestowal_lookup_failed:${lookupError.message}`);
  }
  if (!bestowal) {
    console.warn("finalizeBestowal: bestowal not found", bestowalId);
    return;
  }
  if (bestowal.payment_status === "completed" || bestowal.payment_status === "distributed") {
    return;
  }

  await supabase
    .from("bestowals")
    .update({ payment_status: "completed", payment_reference: paymentReference })
    .eq("id", bestowalId);

  try {
    await dispatchPayouts(supabase, bestowalId);
  } catch (err) {
    console.error("dispatchPayouts failed", bestowalId, err);
    await supabase
      .from("bestowals")
      .update({
        payout_status: "manual_required",
        payout_error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", bestowalId);
  }
}
