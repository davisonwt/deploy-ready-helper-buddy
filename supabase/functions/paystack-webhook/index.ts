// Paystack webhook handler.
//
// Verifies x-paystack-signature locally (HMAC-SHA512 of the raw body, keyed
// with PAYSTACK_SECRET_KEY) -- unlike PayPal, no round trip to the
// processor's own API is needed to check a signature.
//
// Idempotency: processed_webhooks(provider='paystack', webhook_id=<event>:<reference>).
// Paystack events don't carry a stable top-level event id the way PayPal's
// do (event.id) -- the transaction reference (globally unique, one per
// initialize call) combined with the event type is the natural key here.
//
// Event coverage:
//   - charge.success          -> look up paystack_transactions by
//                                 reference, decode kind/recordId (from the
//                                 stored row, falling back to the event's
//                                 own metadata), run finalizeCompletedOrder()
//                                 -- the exact same provider-agnostic
//                                 finalize every PayPal-funded order kind
//                                 uses (same 15% split, same ledger writes).
//   - charge.failed / .abandoned -> mark the transaction failed.
//   - charge.dispute.create    -> recorded to paystack_disputes for GoSat.
//   - anything else            -> logged and ignored.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { finalizeCompletedOrder, type PaypalOrderKind } from "../_shared/paypal/capture.ts";
import { verifyPaystackSignature } from "../_shared/paystack/client.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

interface PaystackEvent {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    reason?: string;
    metadata?: { kind?: string; recordId?: string; [k: string]: unknown } | null;
    customer?: { email?: string };
  };
}

const KNOWN_KINDS: PaypalOrderKind[] = ["basket", "content", "gift", "orchard", "topup", "booking", "invoice"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const rawBody = await req.text();
  const verified = await verifyPaystackSignature(rawBody, req.headers.get("x-paystack-signature"));
  if (!verified) {
    console.warn("paystack-webhook: signature mismatch");
    return json({ error: "invalid_signature" }, 401);
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!event.event || !event.data?.reference) {
    return json({ error: "missing_event_fields" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const webhookId = `${event.event}:${event.data.reference}`;

  // Idempotency -- a failed check here is not "not a duplicate": if we
  // can't read processed_webhooks, we must not fall through and reprocess,
  // same reasoning paypal-webhook uses (Paystack retries deliveries too).
  const { data: existing, error: dedupeError } = await supabase
    .from("processed_webhooks")
    .select("id")
    .eq("provider", "paystack")
    .eq("webhook_id", webhookId)
    .maybeSingle();
  if (dedupeError) {
    console.error("paystack-webhook: idempotency check failed", dedupeError);
    return json({ error: "idempotency_check_failed" }, 500);
  }
  if (existing) {
    return json({ ok: true, deduped: true });
  }

  try {
    await handleEvent(supabase, event);

    // The event is already processed at this point -- a failed insert here
    // must not throw (that would surface as a 500, and Paystack would retry
    // an event that already ran, risking a double-process).
    const { error: insertErr } = await supabase.from("processed_webhooks").insert({
      provider: "paystack",
      webhook_id: webhookId,
      payload_hash: event.event,
    });
    if (insertErr) {
      console.error("paystack-webhook: processed_webhooks insert failed", webhookId, insertErr);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("paystack-webhook handler error", err);
    await logFunctionFailure("paystack-webhook", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function handleEvent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  event: PaystackEvent,
) {
  const reference = event.data!.reference!;

  if (event.event === "charge.success") {
    const { data: txn, error: txnErr } = await supabase
      .from("paystack_transactions")
      .select("id, status, kind, record_id")
      .eq("reference", reference)
      .maybeSingle();
    if (txnErr) throw new Error(`paystack_transactions_lookup_failed:${txnErr.message}`);
    if (!txn) {
      console.warn("paystack-webhook: charge.success for an unknown reference", reference);
      return;
    }

    const metaKind = event.data?.metadata?.kind;
    const metaRecordId = event.data?.metadata?.recordId;
    const kind = (KNOWN_KINDS.includes(txn.kind as PaypalOrderKind) ? txn.kind : metaKind) as
      | PaypalOrderKind
      | undefined;
    const recordId: string | undefined = txn.record_id ?? metaRecordId;
    if (!kind || !recordId || !KNOWN_KINDS.includes(kind)) {
      console.warn("paystack-webhook: charge.success missing/unknown kind or recordId", reference, kind, recordId);
      return;
    }

    await supabase
      .from("paystack_transactions")
      .update({ status: "success", raw_payload: event, completed_at: new Date().toISOString() })
      .eq("reference", reference);

    await finalizeCompletedOrder(supabase, kind, recordId, reference);
    return;
  }

  if (event.event === "charge.failed" || event.event === "charge.abandoned") {
    await supabase
      .from("paystack_transactions")
      .update({ status: "failed", raw_payload: event })
      .eq("reference", reference);
    return;
  }

  if (event.event === "charge.dispute.create") {
    const { error: insertErr } = await supabase.from("paystack_disputes").insert({
      dispute_reference: String(event.data?.id ?? reference),
      transaction_reference: reference,
      status: event.data?.status ?? "pending",
      amount_zar: typeof event.data?.amount === "number" ? event.data.amount / 100 : null,
      currency: event.data?.currency ?? "ZAR",
      reason: event.data?.reason ?? null,
      raw_payload: event,
    });
    if (insertErr) throw new Error(`paystack_disputes_insert_failed:${insertErr.message}`);
    console.log("paystack-webhook: dispute recorded for GoSat", reference);
    return;
  }

  console.log("paystack-webhook ignored event", event.event, reference);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
