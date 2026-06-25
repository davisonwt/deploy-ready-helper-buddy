// NOWPayments IPN webhook.
// Verifies x-nowpayments-sig (HMAC-SHA512 of canonical sorted JSON) and
// updates the matching bestowals row. On terminal success, triggers
// dispatchPayouts() (provider-agnostic dispatcher added in Part 2 step 2).
//
// Idempotency: processed_webhooks(provider='nowpayments', webhook_id=<payment_id:status>).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { dispatchPayouts } from "../_shared/distribution.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !ipnSecret) {
    return json({ error: "server_misconfigured" }, 500);
  }

  // Raw body for signature verification — must NOT re-stringify before HMAC.
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // NOWPayments signs the canonical JSON form: keys sorted alphabetically,
  // recursively, no whitespace. Reproduce that here.
  const canonical = canonicalJson(parsed);
  const expected = await hmacSha512Hex(ipnSecret, canonical);
  if (!signature || !timingSafeEqual(signature, expected)) {
    console.warn("nowpayments-webhook signature mismatch", {
      received: signature?.slice(0, 12),
      expected: expected.slice(0, 12),
    });
    return json({ error: "invalid_signature" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Two event families: payment IPN (payment_status) vs payout IPN (withdrawal_id).
  const isPayoutEvent =
    typeof parsed.withdrawal_id !== "undefined" ||
    typeof parsed.batch_withdrawal_id !== "undefined";

  // Idempotency
  const dedupeKey = isPayoutEvent
    ? `payout:${String(parsed.withdrawal_id ?? parsed.batch_withdrawal_id)}:${String(parsed.status ?? "")}`
    : `payment:${String(parsed.payment_id ?? parsed.invoice_id ?? "")}:${String(parsed.payment_status ?? "")}`;

  const { data: existing } = await supabase
    .from("processed_webhooks")
    .select("id")
    .eq("provider", "nowpayments")
    .eq("webhook_id", dedupeKey)
    .maybeSingle();
  if (existing) {
    return json({ ok: true, deduped: true });
  }

  try {
    if (isPayoutEvent) {
      await handlePayoutEvent(supabase, parsed);
    } else {
      await handlePaymentEvent(supabase, parsed);
    }

    await supabase.from("processed_webhooks").insert({
      provider: "nowpayments",
      webhook_id: dedupeKey,
      payload_hash: expected,
    });

    return json({ ok: true });
  } catch (err) {
    console.error("nowpayments-webhook handler error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function handlePaymentEvent(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const orderId = body.order_id as string | undefined;
  const paymentStatus = String(body.payment_status ?? "").toLowerCase();
  if (!orderId) {
    console.warn("payment IPN missing order_id", body);
    return;
  }

  // Wallet top-up path: order_id = "topup:<topup_uuid>"
  if (orderId.startsWith("topup:")) {
    const topupId = orderId.slice("topup:".length);
    if (paymentStatus === "waiting" || paymentStatus === "confirming" || paymentStatus === "sending") {
      await supabase.from("topups").update({ status: "processing" }).eq("id", topupId);
      return;
    }
    if (paymentStatus === "finished" || paymentStatus === "partially_paid") {
      const { error: rpcErr } = await supabase.rpc("credit_sower_balance_from_topup", { _topup_id: topupId });
      if (rpcErr) console.error("credit_sower_balance_from_topup failed", topupId, rpcErr);
      return;
    }
    if (paymentStatus === "failed" || paymentStatus === "expired" || paymentStatus === "refunded") {
      await supabase.from("topups").update({ status: "failed" }).eq("id", topupId);
      return;
    }
    console.warn("topup IPN: unknown status", paymentStatus, topupId);
    return;
  }

  // Basket bestowal path: order_id = "basket:<basket_order_uuid>"
  if (orderId.startsWith("basket:")) {
    const basketOrderId = orderId.slice("basket:".length);
    if (paymentStatus === "waiting" || paymentStatus === "confirming" || paymentStatus === "sending") {
      await supabase.from("basket_orders").update({ status: "processing" }).eq("id", basketOrderId);
      return;
    }
    if (paymentStatus === "finished" || paymentStatus === "partially_paid") {
      const { error: rpcErr } = await supabase.rpc("finalize_basket_order", { _basket_order_id: basketOrderId });
      if (rpcErr) console.error("finalize_basket_order failed", basketOrderId, rpcErr);
      return;
    }
    if (paymentStatus === "failed" || paymentStatus === "refunded") {
      await supabase.from("basket_orders").update({ status: "failed" }).eq("id", basketOrderId);
      return;
    }
    if (paymentStatus === "expired") {
      await supabase.from("basket_orders").update({ status: "expired" }).eq("id", basketOrderId);
      return;
    }
    console.warn("basket IPN: unknown status", paymentStatus, basketOrderId);
    return;
  }

  // Fixed-price content purchase path: order_id = "content:<content_purchases.id>".
  if (orderId.startsWith("content:")) {
    const purchaseId = orderId.slice("content:".length);
    if (paymentStatus === "waiting" || paymentStatus === "confirming" || paymentStatus === "sending") {
      await supabase.from("content_purchases").update({ payment_status: "processing" }).eq("id", purchaseId);
      return;
    }
    if (paymentStatus === "finished" || paymentStatus === "partially_paid") {
      const { error: rpcErr } = await supabase.rpc("finalize_content_purchase", { _purchase_id: purchaseId });
      if (rpcErr) console.error("finalize_content_purchase failed", purchaseId, rpcErr);
      return;
    }
    if (paymentStatus === "failed" || paymentStatus === "expired" || paymentStatus === "refunded") {
      await supabase.from("content_purchases")
        .update({ payment_status: "failed", payout_error: `nowpayments_${paymentStatus}` })
        .eq("id", purchaseId);
      return;
    }
    console.warn("content IPN: unknown status", paymentStatus, purchaseId);
    return;
  }

  // Gift bestowal path: order_id = "gift:<bestowals.id>". Same downstream logic
  // as orchard bestowals — fall through after stripping the prefix.
  const bestowalId = orderId.startsWith("gift:")
    ? orderId.slice("gift:".length)
    : orderId;

  // order_id was set to the bestowals.id when the invoice was created.
  const { data: bestowal } = await supabase
    .from("bestowals")
    .select("id, payment_status")
    .eq("id", bestowalId)
    .maybeSingle();
  if (!bestowal) {
    console.warn("payment IPN: bestowal not found", bestowalId);
    return;
  }

  if (paymentStatus === "waiting" || paymentStatus === "confirming" || paymentStatus === "sending") {
    await supabase
      .from("bestowals")
      .update({ payment_status: "processing" })
      .eq("id", bestowalId);
    return;
  }

  if (paymentStatus === "finished" || paymentStatus === "partially_paid") {
    if (bestowal.payment_status === "completed" || bestowal.payment_status === "distributed") {
      return; // already finalised
    }
    await supabase
      .from("bestowals")
      .update({ payment_status: "completed" })
      .eq("id", bestowalId);
    // Trigger provider-agnostic payout dispatch.
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

  if (paymentStatus === "failed" || paymentStatus === "expired" || paymentStatus === "refunded") {
    await supabase
      .from("bestowals")
      .update({
        payment_status: "failed",
        payout_status: "failed",
        payout_error: `nowpayments_${paymentStatus}`,
      })
      .eq("id", bestowalId);
    return;
  }

  console.warn("payment IPN: unknown status", paymentStatus, bestowalId);
}

async function handlePayoutEvent(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const ref = String(body.withdrawal_id ?? body.batch_withdrawal_id ?? "");
  const status = String(body.status ?? "").toLowerCase();
  const fee = body.fee != null ? Number(body.fee) : null;
  if (!ref) {
    console.warn("payout IPN missing withdrawal_id", body);
    return;
  }

  const update: Record<string, unknown> = {};
  if (status === "finished" || status === "sent" || status === "ok") {
    update.payout_status = "sent";
    update.payout_completed_at = new Date().toISOString();
    if (fee != null) update.payout_fee_amount = fee;
  } else if (status === "failed" || status === "rejected") {
    update.payout_status = "failed";
    update.payout_error = `nowpayments_payout_${status}`;
  } else {
    update.payout_status = "processing";
  }

  await supabase
    .from("bestowals")
    .update(update)
    .eq("payout_reference", ref);
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
