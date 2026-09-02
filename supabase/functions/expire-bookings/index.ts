// expire-bookings — thin wrapper around the expire_bookings() RPC, scheduled
// every 15 minutes (see the 20260829280000 migration). Same shape as
// expire-stale-orders: exists purely so invoke_money_job's cron call has an
// HTTP endpoint whose real return value (expired_count) lands in
// net._http_response instead of a generic cron "1 row".
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session — same pattern as
// expire-stale-orders / release-escrow / reconcile-paypal-orders.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] ?? "";
const SERVICE_ROLE_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    // apikey header carries the service-role key (not a JWT under new-style
    // keys) -- Authorization stays reserved for a real user session.
    const apikeyHeader = req.headers.get("apikey") ?? "";

    let authorized = false;
    if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) authorized = true;
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await service.rpc("expire_bookings");
    if (error) return json({ error: "expire_failed", detail: error.message }, 500);

    return json({ ok: true, ...(typeof data === "object" ? data : { data }) });
  } catch (err) {
    console.error("expire-bookings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
