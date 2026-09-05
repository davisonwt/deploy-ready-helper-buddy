// Read-only-in-effect diagnostic: confirms send-resend-email's RESEND_API_KEY
// is actually live/working, by sending one real test email through the exact
// same path paypal-email-verify's "send" action uses internally (service-role
// bearer -> send-resend-email -> Resend). Never touches user_wallets or
// paypal_email_verifications — purely a transport health check.
//
// Why this exists rather than testing paypal-email-verify's "send" directly:
// that action requires a real logged-in browser session (verify_jwt=true,
// plus its own auth.getUser() check) — nothing this session can produce, by
// design (no session-minting capability, consistent all session). This is
// the same read-only-diagnostic pattern as check-paypal-order.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session — same pattern as
// release-escrow / payout-earnings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

    let authorized = false;
    if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && token && token === SERVICE_ROLE_KEY) authorized = true;
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

    const body = await req.json().catch(() => ({}));
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!to || !EMAIL_RE.test(to)) return json({ error: "invalid_to" }, 400);

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-resend-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        to,
        subject: "Sow2Grow email transport check",
        html: "<p>This confirms send-resend-email's RESEND_API_KEY is live. No action needed.</p>",
      }),
    });
    const raw = await emailRes.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch { /* non-JSON error body */ }

    return json({ ok: emailRes.ok, status: emailRes.status, response: parsed ?? raw }, emailRes.ok ? 200 : 502);
  } catch (err) {
    console.error("check-email-transport error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
