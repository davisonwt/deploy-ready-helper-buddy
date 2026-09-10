// Optional recovery verification for the Paystack return page
// (/pay/paystack/return): calls GET /transaction/verify/:reference and, if
// Paystack confirms success but the webhook hasn't finalized yet (a slow or
// dropped delivery), finalizes it here -- the same recovery role
// capture-paypal-order plays for the PayPal rail. Never marks anything paid
// based on anything but Paystack's own verify response.
//
// Public -- no session. The reference itself (a Paystack-generated,
// unguessable transaction reference) is the only thing needed, same trust
// model as the PayPal return flow's order id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paystackFetch } from "../_shared/paystack/client.ts";
import { finalizeCompletedOrder, type PaypalOrderKind } from "../_shared/paypal/capture.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

interface Payload {
  reference: string;
}

interface VerifyResponse {
  status?: boolean;
  data?: {
    status?: string;
    reference?: string;
    metadata?: { kind?: string; recordId?: string } | null;
  };
}

const KNOWN_KINDS: PaypalOrderKind[] = ["basket", "content", "gift", "orchard", "topup", "booking", "invoice"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!payload?.reference) return json({ error: "reference_required" }, 400);

    const { data: txn, error: txnErr } = await service
      .from("paystack_transactions")
      .select("id, status, kind, record_id")
      .eq("reference", payload.reference)
      .maybeSingle();
    if (txnErr) {
      console.error("paystack-verify: transaction lookup failed", txnErr);
      return json({ error: "lookup_failed" }, 500);
    }
    if (!txn) return json({ error: "transaction_not_found" }, 404);
    if (txn.status === "success") return json({ status: "success", alreadyFinalized: true });

    const { ok, status, data, raw } = await paystackFetch<VerifyResponse>(
      `/transaction/verify/${encodeURIComponent(payload.reference)}`,
      { method: "GET" },
    );
    if (!ok || !data?.status) {
      console.error("paystack-verify: verify call failed", status, raw);
      return json({ error: "verify_failed", status }, 502);
    }

    const paystackStatus = data.data?.status;
    if (paystackStatus !== "success") {
      return json({ status: paystackStatus ?? "unknown" });
    }

    const kind = (KNOWN_KINDS.includes(txn.kind as PaypalOrderKind) ? txn.kind : data.data?.metadata?.kind) as
      | PaypalOrderKind
      | undefined;
    const recordId: string | undefined = txn.record_id ?? data.data?.metadata?.recordId;
    if (!kind || !recordId || !KNOWN_KINDS.includes(kind)) {
      console.warn("paystack-verify: missing/unknown kind or recordId", payload.reference);
      return json({ error: "unresolvable_order" }, 500);
    }

    await service
      .from("paystack_transactions")
      .update({ status: "success", raw_payload: data, completed_at: new Date().toISOString() })
      .eq("reference", payload.reference);

    await finalizeCompletedOrder(service, kind, recordId, payload.reference);

    return json({ status: "success", finalized: true });
  } catch (err) {
    console.error("paystack-verify error", err);
    await logFunctionFailure("paystack-verify", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
