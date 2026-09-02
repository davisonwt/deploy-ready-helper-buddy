// check-paypal-order — admin-only, READ-ONLY. GETs a PayPal order's live
// status directly from PayPal (no capture, no finalize, no writes anywhere)
// so a stuck/expired order can be diagnosed before deciding whether to
// repair it. Built for the 2026-08-26 Ed/davison incident (see
// SESSION-STATE.md) but generically useful for any paypalOrderId.
//
// Auth: internal (service-role bearer, matching grove-dispatch/
// backfill-post-finalize's existing pattern) or a real admin's session
// (has_role 'admin'). verify_jwt false, own auth inside.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalFetch } from "../_shared/paypal/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);

    const isServiceRole = token === serviceRoleKey;
    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
      const { data: userData, error: userError } = await authClient.auth.getUser(token);
      if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

      const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      const { data: isAdmin } = await service.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    let payload: { paypalOrderId?: string };
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const paypalOrderId = payload?.paypalOrderId;
    if (!paypalOrderId) return json({ error: "missing_paypal_order_id" }, 400);

    const { ok, status, data } = await paypalFetch<any>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { method: "GET" },
    );

    return json({
      paypalOrderId,
      httpStatus: status,
      ok,
      orderStatus: data?.status ?? null,
      captures: (data?.purchase_units ?? []).flatMap((pu: any) =>
        (pu?.payments?.captures ?? []).map((c: any) => ({
          id: c.id,
          status: c.status,
          amount: c.amount,
          create_time: c.create_time,
          update_time: c.update_time,
        }))
      ),
      raw: data,
    });
  } catch (err) {
    console.error("check-paypal-order error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
