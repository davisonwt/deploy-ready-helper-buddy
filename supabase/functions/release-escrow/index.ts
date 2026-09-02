// Releases escrowed product bestowals whose auto-release window has elapsed.
//
// Physical seeds are held (release_status = 'held') by finalize_basket_order
// until the buyer confirms delivery (instant release via the confirm_delivery
// RPC) or the sower/courier marks the parcel delivered, which starts a 3-day
// auto-release clock. This job sweeps that clock.
//
// Disputed lines are never touched — only a GoSat can resolve those.
//
// Auth: service role token, or a CRON_SECRET in `x-cron-secret`, or an
// admin/gosat user JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    // apikey header carries the service-role key (not a JWT under new-style
    // keys) -- Authorization stays reserved for a real user session.
    const apikeyHeader = req.headers.get("apikey") ?? "";

    let authorized = false;
    let rateLimitId: string | null = null;
    // Cron auth: prefer Authorization: Bearer <CRON_SECRET>; legacy x-cron-secret still accepted.
    if (CRON_SECRET && token && token === CRON_SECRET) { authorized = true; rateLimitId = "cron:release-escrow"; }
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) { authorized = true; rateLimitId = "cron:release-escrow"; }
    if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) { authorized = true; rateLimitId = "service:release-escrow"; }

    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
        if (authorized) rateLimitId = u.user.id;
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    // Wallet-hardening audit item 3: rate-limited even for cron/service
    // callers -- a leaked CRON_SECRET or a compromised admin session
    // shouldn't be able to hammer this without limit. Generous relative to
    // the tight per-user PAYMENT preset since a legitimate cron calls this
    // routinely on its own schedule.
    const rlOk = await checkRateLimit(admin, rateLimitId!, "escrow_release_job", 60, 60, true);
    if (!rlOk) return createRateLimitResponse(3600);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit ?? 200), 1), 1000);

    const { data, error } = await admin.rpc("release_due_escrow", { _limit: limit });
    if (error) return json({ error: "release_failed", detail: error.message }, 500);

    return json({ success: true, ...(typeof data === "object" ? data : { data }) });
  } catch (err) {
    console.error("release-escrow error", err);
    await logFunctionFailure("release-escrow", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
