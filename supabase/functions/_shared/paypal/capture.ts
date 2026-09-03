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

import { deliverFinalizeMessages } from "../postFinalize/messaging.ts";
import { syncBooksEntries } from "../postFinalize/books.ts";
import { paypalFetch } from "./client.ts";

export type PaypalOrderKind = "basket" | "content" | "gift" | "orchard" | "topup" | "booking";

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

  let completed = capture.ok && String(capture.data?.status ?? "").toUpperCase() === "COMPLETED";
  let paymentReference: string | null = capture.ok ? (capture.data?.id ?? null) : null;

  if (!completed) {
    // A non-ok /capture response doesn't necessarily mean the payment
    // failed — PayPal returns a re-capture attempt on an order that's
    // already COMPLETED as a range of error codes depending on account/API
    // version, not just the documented 422 (a live incident on
    // 2026-08-26/28 hit 404 for exactly this). Always check the
    // authoritative GET before concluding anything; never throw purely off
    // the capture call's own status code.
    const lookup = await paypalFetch<{ status?: string; id?: string }>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { method: "GET" },
    );
    completed = lookup.ok && String(lookup.data?.status ?? "").toUpperCase() === "COMPLETED";
    if (completed) paymentReference = lookup.data?.id ?? paypalOrderId;
  }

  if (!completed && !capture.ok) {
    throw new Error(`paypal_capture_failed:${capture.status}`);
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
      // credit_balance_ledger_from_topup is idempotent — locks the row,
      // short-circuits if credited_at is already set. Credits the S2G
      // Balance ledger (balance_ledger), not sower_balances — see
      // spec-payments.md's S2G Balance section.
      const { error } = await supabase.rpc("credit_balance_ledger_from_topup", { _topup_id: recordId });
      if (error) throw new Error(`credit_balance_ledger_from_topup_failed:${error.message}`);
      break;
    }
    case "gift":
    case "orchard": {
      await finalizeBestowal(supabase, recordId, paymentReference);
      break;
    }
    case "booking": {
      await finalizeBooking(supabase, recordId, paymentReference);
      break;
    }
  }

  // Best-effort — neither call throws, so a messaging or bookkeeping
  // failure can never roll back or mask a successful payment finalize.
  await deliverFinalizeMessages(supabase, kind, recordId);
  await syncBooksEntries(supabase, kind, recordId);
}

/**
 * Gift and orchard bestowals share this: both are rows in `bestowals`. There
 * is no DB-side RPC for this (unlike basket/content/topup) — this mirrors
 * the idempotency check (payment_status already completed/distributed
 * short-circuits) that previously lived inline in paypal-webhook's
 * PAYMENT.CAPTURE.COMPLETED handler, now shared by both entry points.
 *
 * Payout is no longer dispatched here — payout_status stays at its
 * 'pending' default, and the weekly payout-earnings run (see
 * owed_payout_balances()) picks it up from there, same as every other
 * source table. Immediate per-bestowal dispatch (dispatchPayouts(),
 * distribution.ts) is retired; that function is left in place, unused.
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

  if (bestowal.payment_status !== "completed" && bestowal.payment_status !== "distributed") {
    await supabase
      .from("bestowals")
      .update({ payment_status: "completed", payment_reference: paymentReference })
      .eq("id", bestowalId);
  }

  // Always attempted, regardless of whether payment_status was already
  // completed above — idempotent via its own payout_status='pending' check,
  // so a retry after a mid-way failure (payment_status flipped, credit
  // call never reached) still reaches this instead of the early return
  // above permanently skipping it.
  const { error: creditError } = await supabase.rpc("credit_earning_for_gift_bestowal", {
    _bestowal_id: bestowalId,
    _actor_id: null,
  });
  if (creditError) {
    throw new Error(`credit_earning_for_gift_bestowal_failed:${creditError.message}`);
  }
}

/**
 * A booking's payment, spec-service-seeds.md §7 step 3. Smallest change
 * set per the prior report: `bookings` stays lightweight (a request/
 * accept/decline record with its own amount/s2g_fee/total already
 * computed by priceBreakdown() at request time) — the actual financial
 * record is ONE `product_bestowals` row, inserted here, so every
 * downstream system that already understands that table (payout,
 * sower_earnings_v, release-escrow) needs zero changes to also cover a
 * paid booking.
 *
 * IMPORTANT column-name trap: `bookings.amount` is the sower's BASE rate
 * (pre-fee) — matches priceBreakdown().base. `product_bestowals.amount`
 * is the GROSS buyer-paid total — matches priceBreakdown().total. Same
 * column name, opposite meaning; this function reads `booking.total` for
 * `product_bestowals.amount`, never `booking.amount`.
 *
 * Whisperer resolution mirrors finalize_basket_order exactly
 * (resolve_whisperer_by_ref_code, sharing the same "share comes out of
 * the sower's base" rule) — but the booking-request flow never captures
 * a ref_code or live_session_id today, so this always resolves to "no
 * whisperer" in practice until that's added. Implemented for parity
 * anyway, since the moment ref_code capture exists on /sow/hand's
 * booking Sheet, this path already handles it correctly with no further
 * change here.
 */
async function finalizeBooking(
  supabase: SupabaseLike,
  bookingId: string,
  paymentReference: string | null,
): Promise<void> {
  const { data: booking, error: lookupError } = await supabase
    .from("bookings")
    .select("id, status, product_id, grower_user_id, sower_user_id, amount, s2g_fee, total")
    .eq("id", bookingId)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`booking_lookup_failed:${lookupError.message}`);
  }
  if (!booking) {
    console.warn("finalizeBooking: booking not found", bookingId);
    return;
  }
  if (booking.status === "paid") {
    return; // already finalized — idempotent short-circuit, same pattern as finalizeBestowal
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, sower_id")
    .eq("id", booking.product_id)
    .maybeSingle();
  if (productError) throw new Error(`booking_product_lookup_failed:${productError.message}`);
  if (!product) {
    console.warn("finalizeBooking: product not found", booking.product_id);
    return;
  }

  const { data: whispererRows } = await supabase.rpc("resolve_whisperer_by_ref_code", {
    _product_id: booking.product_id,
    _ref_code: null,
    _buyer_id: booking.grower_user_id,
    _live_session_id: null,
    _source: "last_touch",
  });
  const assignment = Array.isArray(whispererRows) && whispererRows.length > 0 ? whispererRows[0] : null;

  const base = Number(booking.amount); // sower's base, pre-fee
  let whispererAmount = 0;
  let sowerAmount = base;
  if (assignment?.assignment_id) {
    whispererAmount = round2(base * (Number(assignment.commission_percent) / 100));
    sowerAmount = round2(base - whispererAmount);
  }

  const { data: bestowal, error: insertError } = await supabase
    .from("product_bestowals")
    .insert({
      bestower_id: booking.grower_user_id,
      product_id: booking.product_id,
      sower_id: product.sower_id,
      amount: Number(booking.total), // gross buyer-paid total — see the column-name trap note above
      s2g_fee: Number(booking.s2g_fee),
      sower_amount: sowerAmount,
      grower_amount: whispererAmount, // legacy column name — actually the whisperer's cut, matching finalize_basket_order's own convention
      whisperer_id: assignment?.whisperer_id ?? null,
      whisperer_amount: whispererAmount,
      ref_link_id: assignment?.ref_link_id ?? null,
      status: "completed",
      payment_method: "paypal",
      payment_reference: paymentReference,
      delivery_type: null, // a service has nothing to physically deliver — releases immediately, never held
      release_status: "released",
      hold_reason: null,
      released_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertError || !bestowal) {
    throw new Error(`booking_product_bestowal_insert_failed:${insertError?.message}`);
  }

  await supabase
    .from("bookings")
    .update({ status: "paid", payment_reference: paymentReference })
    .eq("id", bookingId);

  if (assignment?.assignment_id && whispererAmount > 0) {
    await supabase.from("whisperer_earnings").insert({
      whisperer_id: assignment.whisperer_id,
      assignment_id: assignment.assignment_id,
      bestowal_id: bestowal.id,
      amount: whispererAmount,
      commission_percent: assignment.commission_percent,
      status: "payable",
    });

    await supabase.from("whisperer_conversions").insert({
      ref_link_id: assignment.ref_link_id,
      whisperer_id: assignment.whisperer_id,
      product_id: booking.product_id,
      bestowal_id: bestowal.id,
      bestower_id: booking.grower_user_id,
      bestowal_amount: Number(booking.total),
      commission_percent: assignment.commission_percent,
      commission_amount: whispererAmount,
      attribution_type: assignment.attribution_type,
      live_session_id: assignment.live_session_id,
    });

    // finalize_basket_order does these as a single SQL `SET x = x + 1`;
    // the JS client has no increment operator, so read-then-write instead
    // — acceptable here since a booking finalizes at most once (this whole
    // block is behind the `status === 'paid'` idempotency short-circuit
    // above), unlike a high-concurrency counter.
    const { data: link } = await supabase
      .from("whisperer_referral_links")
      .select("total_conversions, total_earned")
      .eq("id", assignment.ref_link_id)
      .maybeSingle();
    await supabase
      .from("whisperer_referral_links")
      .update({
        total_conversions: (Number(link?.total_conversions) || 0) + 1,
        total_earned: round2((Number(link?.total_earned) || 0) + whispererAmount),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.ref_link_id);

    const { data: waRow } = await supabase
      .from("product_whisperer_assignments")
      .select("total_bestowals, total_earned")
      .eq("id", assignment.assignment_id)
      .maybeSingle();
    await supabase
      .from("product_whisperer_assignments")
      .update({
        total_bestowals: (Number(waRow?.total_bestowals) || 0) + 1,
        total_earned: round2((Number(waRow?.total_earned) || 0) + whispererAmount),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.assignment_id);
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
