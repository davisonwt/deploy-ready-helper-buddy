// NOWPayments Mass Payouts — CREATE step only.
//
// Reality of the NOWPayments payout API (verified against their docs):
//   1. POST /v1/auth {email,password} -> short-lived JWT (~5 min). No static
//      "payout JWT" secret exists; the one we previously plumbed as
//      NOWPAYMENTS_PAYOUT_JWT was a misread of the docs.
//   2. POST /v1/payout with x-api-key + Bearer <jwt> -> creates the batch in
//      status 'creating'/'waiting'. Funds do NOT move yet.
//   3. POST /v1/payout/{batch_id}/verify {verification_code} -> a human types
//      the 2FA code (email or authenticator) and only THEN funds move.
//
// This function does steps 1 and 2 only. It writes payout_status='awaiting_2fa'
// and stores the batch id in payout_reference. Step 3 is handled by the
// nowpayments-verify-payout function, driven by an admin from the UI.
//
// Service-role gated: only callable from _shared/payouts/nowpayments.ts via
// supabase.functions.invoke (which forwards the service-role key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

// In-memory JWT cache. Edge function instances are reused for a short window,
// so this saves a round-trip when multiple legs dispatch close together.
let cachedJwt: { token: string; expiresAt: number } | null = null;
const JWT_TTL_MS = 4 * 60 * 1000; // refresh well before the ~5min expiry

async function getNowPaymentsJwt(email: string, password: string): Promise<string> {
  const now = Date.now();
  if (cachedJwt && cachedJwt.expiresAt > now) return cachedJwt.token;

  const res = await fetch(`${NOWPAYMENTS_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`nowpayments_auth_http_${res.status}: ${text}`);
  }
  let parsed: { token?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("nowpayments_auth_invalid_response");
  }
  if (!parsed.token) throw new Error("nowpayments_auth_no_token");
  cachedJwt = { token: parsed.token, expiresAt: now + JWT_TTL_MS };
  return parsed.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ status: "manual_required", error: "method_not_allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
  const email = Deno.env.get("NOWPAYMENTS_EMAIL");
  const password = Deno.env.get("NOWPAYMENTS_PASSWORD");

  if (!serviceRoleKey || !supabaseUrl || !apiKey) {
    return json({ status: "manual_required", error: "server_misconfigured" }, 500);
  }

  // Service-role gate.
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

  if (!email || !password) {
    // Credentials not configured yet — fall through to manual.
    return json({
      status: "manual_required",
      error: "nowpayments_credentials_missing",
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

  try {
    const jwt = await getNowPaymentsJwt(email, password);

    const res = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Authorization": `Bearer ${jwt}`,
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
      /* keep raw */
    }

    if (!res.ok) {
      // Invalidate cached JWT on auth failures so the next call re-authenticates.
      if (res.status === 401 || res.status === 403) cachedJwt = null;
      console.error("nowpayments /payout failed", res.status, text);
      return json({
        status: "manual_required",
        error: `nowpayments_payout_http_${res.status}`,
        raw: parsed,
      });
    }

    // Response shape: { id: <batch_id>, withdrawals: [ { id, status, ... } ] }
    const batchId = parsed.id != null ? String(parsed.id) : undefined;
    if (!batchId) {
      return json({
        status: "manual_required",
        error: "nowpayments_payout_no_batch_id",
        raw: parsed,
      });
    }

    // Persist the awaiting-2fa state directly on the bestowal so the admin UI
    // can list it and operators can verify per leg.
    const { error: updateError } = await admin
      .from("bestowals")
      .update({
        payout_status: "awaiting_2fa",
        payout_reference: batchId,
        payout_error: null,
      })
      .eq("id", body.bestowalId);

    if (updateError) {
      console.error("bestowal update failed", updateError);
      // Payout was created at the provider, but our row didn't update — flag
      // loudly so an operator investigates rather than silently retrying.
      return json({
        status: "awaiting_2fa",
        reference: batchId,
        error: `bestowal_update_failed: ${updateError.message}`,
        raw: parsed,
      });
    }

    return json({
      status: "awaiting_2fa",
      reference: batchId,
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
