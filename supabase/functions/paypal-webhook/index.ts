// PayPal webhook handler.
// Verifies signature via PayPal's verify-webhook-signature API (requires
// PAYPAL_WEBHOOK_ID secret). Updates the matching order row and, on
// terminal capture success, finalizes it (via _shared/paypal/capture.ts)
// for whichever of the five order kinds it is.
//
// Idempotency: processed_webhooks(provider='paypal', webhook_id=<event.id>).
//
// Event coverage:
//   - CHECKOUT.ORDER.APPROVED                    -> mark 'processing', then
//                                                    capture + finalize (all
//                                                    five kinds — PayPal
//                                                    never auto-captures on
//                                                    approval, so this is
//                                                    the only place any kind
//                                                    other than 'basket' has
//                                                    ever had a capture call
//                                                    made on its behalf)
//   - PAYMENT.CAPTURE.COMPLETED                  -> finalize (idempotent —
//                                                    may be a no-op if
//                                                    ORDER.APPROVED already
//                                                    finalized this order)
//   - PAYMENT.CAPTURE.DENIED / VOIDED / DECLINED -> mark 'failed'
//   - PAYMENT.PAYOUTS-ITEM.SUCCEEDED             -> the payouts row (found
//     by sender_item_id = payouts.id, set at dispatch by payout-earnings)
//     and every row it covers are marked paid.
//   - PAYMENT.PAYOUTS-ITEM.{DENIED|FAILED|BLOCKED|RETURNED|UNCLAIMED}
//                                                -> payouts row 'failed',
//     covered rows revert to owed (picked up by the next weekly run).
//   - PAYMENT.PAYOUTSBATCH.{SUCCESS|DENIED}      -> logged only. A batch
//     now covers many recipients (payout-earnings), so a batch-level ping
//     says nothing about any one recipient — item-level events are the only
//     authoritative per-recipient signal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { captureAndFinalize, finalizeCompletedOrder, type PaypalOrderKind } from "../_shared/paypal/capture.ts";
import {
  extractPaypalWebhookHeaders,
  verifyPaypalWebhookSig,
} from "../_shared/paypal/client.ts";
import { markCoveredRowsPaid, markCoveredRowsPending, type CoveredRow } from "../_shared/payoutLedger.ts";

type PaypalEvent = {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown> & {
    id?: string;
    custom_id?: string;
    sender_item_id?: string;
    payout_batch_id?: string;
    payout_item_id?: string;
    transaction_status?: string;
    payout_item?: {
      sender_item_id?: string;
      receiver?: string;
      amount?: { value?: string; currency?: string };
    };
    payout_item_fee?: { value?: string; currency?: string };
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
    purchase_units?: Array<{ custom_id?: string; reference_id?: string }>;
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!supabaseUrl || !serviceRoleKey || !webhookId) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const rawBody = await req.text();
  const sigHeaders = extractPaypalWebhookHeaders(req);

  const verified = await verifyPaypalWebhookSig(sigHeaders, rawBody);
  if (!verified) {
    console.warn("paypal-webhook signature mismatch", {
      transmissionId: sigHeaders.transmissionId,
    });
    return json({ error: "invalid_signature" }, 401);
  }

  let event: PaypalEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!event.id || !event.event_type) {
    return json({ error: "missing_event_fields" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Idempotency — a failed check here is not "not a duplicate": if we can't
  // read processed_webhooks, we must not fall through and reprocess, since
  // PayPal retries deliveries routinely and that would double-run payouts.
  const { data: existing, error: dedupeError } = await supabase
    .from("processed_webhooks")
    .select("id")
    .eq("provider", "paypal")
    .eq("webhook_id", event.id)
    .maybeSingle();
  if (dedupeError) {
    console.error("paypal-webhook: idempotency check failed", dedupeError);
    return json({ error: "idempotency_check_failed" }, 500);
  }
  if (existing) {
    return json({ ok: true, deduped: true });
  }

  try {
    await handleEvent(supabase, event);

    await supabase.from("processed_webhooks").insert({
      provider: "paypal",
      webhook_id: event.id,
      payload_hash: event.event_type,
    });

    return json({ ok: true });
  } catch (err) {
    console.error("paypal-webhook handler error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

interface ParsedOrder {
  kind: PaypalOrderKind;
  recordId: string;
}

// The one place a custom_id string is decoded into a kind + record id.
// Matches the prefixes each create-*-order function writes into custom_id;
// an orchard bestowal has no prefix at all (custom_id IS the bestowal id) —
// gift bestowals are the only bestowals-table order with a prefix, since
// they need to be told apart from orchard ones for readability even though
// both finalize identically (see _shared/paypal/capture.ts).
function parseCustomId(customId: string): ParsedOrder {
  if (customId.startsWith("topup:")) {
    return { kind: "topup", recordId: customId.slice("topup:".length) };
  }
  if (customId.startsWith("basket:")) {
    return { kind: "basket", recordId: customId.slice("basket:".length) };
  }
  if (customId.startsWith("content:")) {
    return { kind: "content", recordId: customId.slice("content:".length) };
  }
  if (customId.startsWith("gift:")) {
    return { kind: "gift", recordId: customId.slice("gift:".length) };
  }
  return { kind: "orchard", recordId: customId };
}

async function markProcessing(
  supabase: ReturnType<typeof createClient>,
  order: ParsedOrder,
): Promise<void> {
  switch (order.kind) {
    case "topup":
      await supabase.from("topups").update({ status: "processing" }).eq("id", order.recordId);
      return;
    case "basket":
      await supabase.from("basket_orders").update({ status: "processing" }).eq("id", order.recordId);
      return;
    case "content":
      await supabase.from("content_purchases")
        .update({ payment_status: "processing" })
        .eq("id", order.recordId);
      return;
    case "gift":
    case "orchard":
      await supabase.from("bestowals")
        .update({ payment_status: "processing" })
        .eq("id", order.recordId);
      return;
  }
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  order: ParsedOrder,
  reason: string,
): Promise<void> {
  switch (order.kind) {
    case "topup":
      await supabase.from("topups").update({ status: "failed" }).eq("id", order.recordId);
      return;
    case "basket":
      await supabase.from("basket_orders").update({ status: "failed" }).eq("id", order.recordId);
      return;
    case "content":
      await supabase.from("content_purchases")
        .update({ payment_status: "failed", payout_error: reason })
        .eq("id", order.recordId);
      return;
    case "gift":
    case "orchard":
      await supabase.from("bestowals")
        .update({ payment_status: "failed", payout_status: "failed", payout_error: reason })
        .eq("id", order.recordId);
      return;
  }
}

async function handleEvent(
  supabase: ReturnType<typeof createClient>,
  event: PaypalEvent,
) {
  const type = event.event_type ?? "";
  const resource = event.resource ?? {};

  // ------- Order approved (buyer accepted; capture pending) --------------------
  if (type === "CHECKOUT.ORDER.APPROVED") {
    const customId = extractOrderCustomId(resource);
    if (!customId) {
      console.warn("ORDER.APPROVED missing custom_id", event.id);
      return;
    }
    const order = parseCustomId(customId);
    await markProcessing(supabase, order);

    // PayPal never auto-captures on approval — capture here so completion
    // never depends on the buyer keeping the return page open, for every
    // kind, not just baskets.
    const paypalOrderId = typeof resource.id === "string" ? resource.id : undefined;
    if (!paypalOrderId) throw new Error("approved_paypal_order_id_missing");
    await captureAndFinalize(supabase, order.kind, order.recordId, paypalOrderId);
    return;
  }

  // ------- Capture completed -> finalize (idempotent) -------------------------
  if (type === "PAYMENT.CAPTURE.COMPLETED") {
    const customId = (resource.custom_id as string | undefined) ??
      extractOrderCustomId(resource);
    if (!customId) {
      console.warn("CAPTURE.COMPLETED missing custom_id", event.id);
      return;
    }
    const order = parseCustomId(customId);
    const paymentReference = (resource.id as string | undefined) ?? null;
    await finalizeCompletedOrder(supabase, order.kind, order.recordId, paymentReference);
    return;
  }

  // ------- Capture failure variants ------------------------------------------
  if (
    type === "PAYMENT.CAPTURE.DENIED" ||
    type === "PAYMENT.CAPTURE.DECLINED" ||
    type === "PAYMENT.CAPTURE.REVERSED" ||
    type === "CHECKOUT.PAYMENT-APPROVAL.REVERSED" ||
    type === "CHECKOUT.ORDER.VOIDED"
  ) {
    const customId = (resource.custom_id as string | undefined) ??
      extractOrderCustomId(resource);
    if (!customId) return;
    const order = parseCustomId(customId);
    await markFailed(supabase, order, `paypal_${type.toLowerCase()}`);
    return;
  }

  // ------- Payouts batch events: logged only, see file header ----------------
  if (type === "PAYMENT.PAYOUTSBATCH.SUCCESS" || type === "PAYMENT.PAYOUTSBATCH.DENIED") {
    console.log("paypal-webhook payouts batch event", type, event.id);
    return;
  }

  // Item-level events identify the payouts row via sender_item_id, which
  // payout-earnings sets to that row's own id at dispatch.
  if (type.startsWith("PAYMENT.PAYOUTS-ITEM.")) {
    const senderItemId = (resource.sender_item_id as string | undefined) ??
      resource.payout_item?.sender_item_id;
    if (!senderItemId) {
      console.warn("payouts-item event missing sender_item_id", event.id);
      return;
    }
    const status = type.substring("PAYMENT.PAYOUTS-ITEM.".length).toLowerCase();

    const { data: payout, error: payoutErr } = await supabase
      .from("payouts")
      .select("id, covered_rows, status")
      .eq("id", senderItemId)
      .maybeSingle();
    if (payoutErr || !payout) {
      console.warn("payouts-item event: no matching payouts row", senderItemId, event.id);
      return;
    }
    if (payout.status === "paid" || payout.status === "failed") {
      return; // already terminal — a retried delivery of the same event
    }

    const coveredRows = (payout.covered_rows ?? []) as CoveredRow[];
    const itemId = (resource.payout_item_id as string | undefined) ?? null;

    if (status === "succeeded") {
      await supabase
        .from("payouts")
        .update({ status: "paid", paypal_item_id: itemId, completed_at: new Date().toISOString() })
        .eq("id", senderItemId);
      await markCoveredRowsPaid(supabase, coveredRows);
    } else if (
      status === "denied" ||
      status === "failed" ||
      status === "blocked" ||
      status === "returned" ||
      status === "refunded" ||
      status === "reversed"
    ) {
      const reason = `paypal_payout_${status}`;
      await supabase
        .from("payouts")
        .update({ status: "failed", paypal_item_id: itemId, error: reason })
        .eq("id", senderItemId);
      await markCoveredRowsPending(supabase, coveredRows, reason);
    } else if (status === "unclaimed" || status === "held" || status === "onhold") {
      // Still in flight — leave the payouts row and covered rows as-is
      // ('processing'), just record the item id once we have it.
      if (itemId) {
        await supabase.from("payouts").update({ paypal_item_id: itemId }).eq("id", senderItemId);
      }
    } else {
      console.warn("payouts-item unknown status", status, event.id);
    }
    return;
  }

  console.log("paypal-webhook ignored event", type, event.id);
}

function extractOrderCustomId(
  resource: NonNullable<PaypalEvent["resource"]>,
): string | undefined {
  // CHECKOUT.ORDER.APPROVED has purchase_units[].custom_id
  if (Array.isArray(resource.purchase_units)) {
    for (const pu of resource.purchase_units) {
      if (pu?.custom_id) return pu.custom_id;
      if (pu?.reference_id) return pu.reference_id;
    }
  }
  // CAPTURE objects can carry custom_id on the resource itself
  if (typeof resource.custom_id === "string") return resource.custom_id;
  return undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
