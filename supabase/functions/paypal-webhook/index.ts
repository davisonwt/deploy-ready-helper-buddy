// PayPal webhook handler.
// Verifies signature via PayPal's verify-webhook-signature API (requires
// PAYPAL_WEBHOOK_ID secret). Updates the matching bestowals row and, on
// terminal capture success, triggers dispatchPayouts().
//
// Idempotency: processed_webhooks(provider='paypal', webhook_id=<event.id>).
//
// Event coverage:
//   - CHECKOUT.ORDER.APPROVED                    -> payment_status='processing'
//   - PAYMENT.CAPTURE.COMPLETED                  -> payment_status='completed' + dispatchPayouts
//   - PAYMENT.CAPTURE.DENIED / VOIDED / DECLINED -> payment_status='failed'
//   - PAYMENT.PAYOUTSBATCH.SUCCESS
//     PAYMENT.PAYOUTS-ITEM.SUCCEEDED             -> payout_status='sent'
//   - PAYMENT.PAYOUTS-ITEM.{DENIED|FAILED|BLOCKED|RETURNED|UNCLAIMED}
//                                                -> payout_status='failed'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { dispatchPayouts } from "../_shared/distribution.ts";
import {
  extractPaypalWebhookHeaders,
  verifyPaypalWebhookSig,
} from "../_shared/paypal/client.ts";

type PaypalEvent = {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown> & {
    id?: string;
    custom_id?: string;
    sender_item_id?: string;
    payout_batch_id?: string;
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

  // Idempotency
  const { data: existing } = await supabase
    .from("processed_webhooks")
    .select("id")
    .eq("provider", "paypal")
    .eq("webhook_id", event.id)
    .maybeSingle();
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
    if (customId.startsWith("topup:")) {
      await supabase.from("topups").update({ status: "processing" })
        .eq("id", customId.slice("topup:".length));
      return;
    }
    if (customId.startsWith("basket:")) {
      await supabase.from("basket_orders").update({ status: "processing" })
        .eq("id", customId.slice("basket:".length));
      return;
    }
    const bestowalId = customId.startsWith("gift:")
      ? customId.slice("gift:".length)
      : customId;
    await supabase
      .from("bestowals")
      .update({ payment_status: "processing" })
      .eq("id", bestowalId);
    return;
  }

  // ------- Capture completed -> mark paid + dispatch payouts ------------------
  if (type === "PAYMENT.CAPTURE.COMPLETED") {
    const customId = (resource.custom_id as string | undefined) ??
      extractOrderCustomId(resource);
    if (!customId) {
      console.warn("CAPTURE.COMPLETED missing custom_id", event.id);
      return;
    }
    if (customId.startsWith("topup:")) {
      const topupId = customId.slice("topup:".length);
      const { error: rpcErr } = await supabase.rpc("credit_sower_balance_from_topup", { _topup_id: topupId });
      if (rpcErr) console.error("credit_sower_balance_from_topup failed", topupId, rpcErr);
      return;
    }
    if (customId.startsWith("basket:")) {
      const basketOrderId = customId.slice("basket:".length);
      const { error: rpcErr } = await supabase.rpc("finalize_basket_order", { _basket_order_id: basketOrderId });
      if (rpcErr) console.error("finalize_basket_order failed", basketOrderId, rpcErr);
      return;
    }
    const bestowalId = customId;
    const { data: bestowal } = await supabase
      .from("bestowals")
      .select("id, payment_status")
      .eq("id", bestowalId)
      .maybeSingle();
    if (!bestowal) {
      console.warn("CAPTURE.COMPLETED: bestowal not found", bestowalId);
      return;
    }
    if (
      bestowal.payment_status === "completed" ||
      bestowal.payment_status === "distributed"
    ) {
      return;
    }
    await supabase
      .from("bestowals")
      .update({
        payment_status: "completed",
        payment_reference: (resource.id as string | undefined) ?? null,
      })
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
    if (customId.startsWith("topup:")) {
      await supabase.from("topups").update({ status: "failed" })
        .eq("id", customId.slice("topup:".length));
      return;
    }
    if (customId.startsWith("basket:")) {
      await supabase.from("basket_orders").update({ status: "failed" })
        .eq("id", customId.slice("basket:".length));
      return;
    }
    const bestowalId = customId;
    await supabase
      .from("bestowals")
      .update({
        payment_status: "failed",
        payout_status: "failed",
        payout_error: `paypal_${type.toLowerCase()}`,
      })
      .eq("id", bestowalId);
    return;
  }

  // ------- Payouts batch / item events ---------------------------------------
  if (type === "PAYMENT.PAYOUTSBATCH.SUCCESS") {
    const batchId = resource.payout_batch_id as string | undefined ??
      (resource as Record<string, unknown>).batch_header
        ? ((resource as { batch_header?: { payout_batch_id?: string } })
          .batch_header?.payout_batch_id)
        : undefined;
    if (!batchId) return;
    await supabase
      .from("bestowals")
      .update({
        payout_status: "sent",
        payout_completed_at: new Date().toISOString(),
      })
      .eq("payout_reference", batchId);
    return;
  }

  if (type === "PAYMENT.PAYOUTSBATCH.DENIED") {
    const batchId = (resource as { batch_header?: { payout_batch_id?: string } })
      .batch_header?.payout_batch_id ??
      (resource.payout_batch_id as string | undefined);
    if (!batchId) return;
    await supabase
      .from("bestowals")
      .update({
        payout_status: "failed",
        payout_error: "paypal_payoutsbatch_denied",
      })
      .eq("payout_reference", batchId);
    return;
  }

  // Item-level events identify the bestowal via sender_item_id we set at dispatch.
  if (type.startsWith("PAYMENT.PAYOUTS-ITEM.")) {
    const senderItemId = (resource.sender_item_id as string | undefined) ??
      resource.payout_item?.sender_item_id;
    if (!senderItemId) {
      console.warn("payouts-item event missing sender_item_id", event.id);
      return;
    }
    const status = type.substring("PAYMENT.PAYOUTS-ITEM.".length).toLowerCase();

    const update: Record<string, unknown> = {};
    if (status === "succeeded") {
      update.payout_status = "sent";
      update.payout_completed_at = new Date().toISOString();
      const feeStr = resource.payout_item_fee?.value;
      const fee = feeStr != null ? Number(feeStr) : null;
      if (fee != null && Number.isFinite(fee)) {
        update.payout_fee_amount = fee;
      }
    } else if (
      status === "denied" ||
      status === "failed" ||
      status === "blocked" ||
      status === "returned" ||
      status === "refunded" ||
      status === "reversed"
    ) {
      update.payout_status = "failed";
      update.payout_error = `paypal_payout_${status}`;
    } else if (status === "unclaimed" || status === "held" || status === "onhold") {
      update.payout_status = "processing";
    } else {
      console.warn("payouts-item unknown status", status, event.id);
      return;
    }

    await supabase.from("bestowals").update(update).eq("id", senderItemId);
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
