// NOWPayments Mass Payouts API wrapper.
// Invoked internally from _shared/payouts/nowpayments.ts via supabase.functions.invoke.
// External callers are rejected (requires service role).
//
// Returns a PayoutResult-shaped JSON body matching _shared/payouts/types.ts.
// If NOWPAYMENTS_PAYOUT_JWT is missing, returns 'manual_required' (caller
// records that on bestowals.payout_status; no funds move).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

interface PayoutRequest {
  bestowalId: string;
  role: "sower" | "tithing" | "grower";
  address: string;
  currency: string;
  network?: string | null;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
  const payoutJwt = Deno.env.get("NOWPAYMENTS_PAYOUT_JWT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !apiKey || !supabaseUrl) {
    return json({ status: "manual_required", error: "server_misconfigured" }, 500);
  }

  // Service-role gate: only accept internal calls. supabase.functions.invoke
  // forwards Authorization: Bearer <key>; we accept the service-role key OR
  // an apikey header matching it.
  const authHeader = req.headers.get("Authorization") ?? "";
  const apikeyHeader = req.headers.get("apikey") ?? "";
  const presentedToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (presentedToken !== serviceRoleKey && apikeyHeader !== serviceRoleKey) {
    return json({ status: "manual_required", error: "forbidden_external_call" }, 403);
  }

  let body: PayoutRequest;
  try {
    body = await req.json();
  } catch {
    return json({ status: "manual_required", error: "invalid_json" }, 400);
  }

  if (
    !body?.bestowalId ||
    !body.address ||
    !body.currency ||
    typeof body.amount !== "number" ||
    body.amount <= 0
  ) {
    return json({ status: "manual_required", error: "missing_fields" }, 400);
  }

  if (!payoutJwt) {
    return json({
      status: "manual_required",
      error: "payout_jwt_missing",
    });
  }

  const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

  try {
    const res = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Authorization": `Bearer ${payoutJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ipn_callback_url: ipnUrl,
        withdrawals: [
          {
            address: body.address,
            currency: body.currency.toLowerCase(),
            amount: body.amount,
            ...(body.network ? { network: body.network } : {}),
            unique_external_id: `${body.bestowalId}-${body.role}`,
          },
        ],
      }),
    });

    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      // keep raw text
    }

    if (!res.ok) {
      console.error("nowpayments /payout failed", res.status, text);
      return json({
        status: "manual_required",
        error: `nowpayments_payout_http_${res.status}`,
        raw: parsed,
      });
    }

    // Response shape (single-item batch):
    // { id: <batch_id>, withdrawals: [ { id, status, currency, address, ... } ] }
    const batchId = parsed.id != null ? String(parsed.id) : undefined;
    const withdrawals = Array.isArray((parsed as { withdrawals?: unknown }).withdrawals)
      ? (parsed as { withdrawals: Array<Record<string, unknown>> }).withdrawals
      : [];
    const w = withdrawals[0] ?? {};
    const wid = w.id != null ? String(w.id) : undefined;
    const wstatus = String(w.status ?? "").toLowerCase();

    const status: "sent" | "processing" | "failed" =
      wstatus === "finished" || wstatus === "sent" || wstatus === "ok"
        ? "sent"
        : wstatus === "failed" || wstatus === "rejected"
        ? "failed"
        : "processing";

    return json({
      status,
      reference: wid ?? batchId,
      raw: parsed,
    });
  } catch (err) {
    console.error("nowpayments-payout exception", err);
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
