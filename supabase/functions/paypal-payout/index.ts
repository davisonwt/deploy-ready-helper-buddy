// PayPal Payouts API wrapper.
// Invoked internally from _shared/payouts/paypal.ts via supabase.functions.invoke.
// External callers are rejected (requires service role).
//
// Returns a PayoutResult-shaped JSON body matching _shared/payouts/types.ts.
// If PAYPAL_PAYOUTS_ENABLED !== 'true', returns 'manual_required' (caller
// records that on bestowals.payout_status; no funds move).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalFetch } from "../_shared/paypal/client.ts";

interface PayoutRequest {
  bestowalId: string;
  role: "sower" | "tithing" | "grower";
  receiverEmail: string;
  amount: number;
  currency?: string; // defaults to USD
  note?: string;
}

interface PaypalPayoutsResponse {
  batch_header?: {
    payout_batch_id?: string;
    batch_status?: string;
  };
  items?: Array<{
    payout_item_id?: string;
    transaction_status?: string;
    sender_item_id?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const paypalSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!serviceRoleKey) {
    return json({ status: "manual_required", error: "server_misconfigured" }, 500);
  }

  // Service-role gate: only accept internal calls.
  const authHeader = req.headers.get("Authorization") ?? "";
  const apikeyHeader = req.headers.get("apikey") ?? "";
  const presentedToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (presentedToken !== serviceRoleKey && apikeyHeader !== serviceRoleKey) {
    return json(
      { status: "manual_required", error: "forbidden_external_call" },
      403,
    );
  }

  let body: PayoutRequest;
  try {
    body = await req.json();
  } catch {
    return json({ status: "manual_required", error: "invalid_json" }, 400);
  }

  if (
    !body?.bestowalId ||
    !body.receiverEmail ||
    typeof body.amount !== "number" ||
    body.amount <= 0
  ) {
    return json({ status: "manual_required", error: "missing_fields" }, 400);
  }

  if (!paypalClientId || !paypalSecret) {
    return json({
      status: "manual_required",
      error: "paypal_credentials_missing",
    });
  }

  const payoutsEnabled =
    (Deno.env.get("PAYPAL_PAYOUTS_ENABLED") ?? "").toLowerCase() === "true";
  if (!payoutsEnabled) {
    return json({
      status: "manual_required",
      error: "payouts_not_enabled",
    });
  }

  const currency = (body.currency ?? "USD").toUpperCase();
  const senderBatchId = `s2g-${body.bestowalId}-${body.role}-${Date.now()}`;
  // sender_item_id == bestowalId so the webhook can update the row directly.
  const senderItemId = body.bestowalId;

  try {
    const { ok, status, data, raw } = await paypalFetch<PaypalPayoutsResponse>(
      "/v1/payments/payouts",
      {
        method: "POST",
        body: {
          sender_batch_header: {
            sender_batch_id: senderBatchId,
            email_subject: "You have a Sow2Grow payout",
            email_message:
              "Your Sow2Grow bestowal payout has been sent. Thank you for sowing.",
          },
          items: [
            {
              recipient_type: "EMAIL",
              receiver: body.receiverEmail,
              sender_item_id: senderItemId,
              note: (body.note ?? "Sow2Grow bestowal payout").slice(0, 4000),
              amount: {
                value: body.amount.toFixed(2),
                currency,
              },
            },
          ],
        },
      },
    );

    if (!ok) {
      console.error("paypal /payouts failed", status, raw);
      return json({
        status: "manual_required",
        error: `paypal_payouts_http_${status}`,
        raw: data,
      });
    }

    const batchId = data?.batch_header?.payout_batch_id;
    const batchStatus = (data?.batch_header?.batch_status ?? "").toUpperCase();
    const item = data?.items?.[0];
    const itemStatus = (item?.transaction_status ?? "").toUpperCase();

    // Map PayPal lifecycle -> our PayoutStatus.
    // Terminal "sent" only comes via the webhook (PAYMENT.PAYOUTS-ITEM.SUCCEEDED);
    // the initial POST almost always returns PENDING/UNCLAIMED.
    const resultStatus: "sent" | "processing" | "failed" =
      itemStatus === "SUCCESS" || itemStatus === "SUCCEEDED"
        ? "sent"
        : itemStatus === "DENIED" ||
            itemStatus === "FAILED" ||
            itemStatus === "BLOCKED" ||
            batchStatus === "DENIED"
        ? "failed"
        : "processing";

    return json({
      status: resultStatus,
      reference: batchId,
      raw: data,
    });
  } catch (err) {
    console.error("paypal-payout exception", err);
    return json({
      status: "manual_required",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
