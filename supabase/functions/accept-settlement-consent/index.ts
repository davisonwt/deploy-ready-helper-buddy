// Records acceptance of the settlement-consent checkbox (non-custodial
// model, legal 2026-09-03). Server-side only, so accepted_at and ip can't
// be spoofed from the client -- settlement_consents has no client INSERT
// policy at all, this service-role write is the only way a row gets
// created. Idempotent per (user_id, version): a double-submit just
// returns the existing row rather than logging two acceptances.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clientIp(req: Request): string | null {
  // Supabase's edge runtime sits behind a proxy -- x-forwarded-for's first
  // entry is the original client. Never trust anything the client itself
  // could set on a header it doesn't control; this one comes from the
  // platform's own proxy, not request.body.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "server_misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = authHeader.slice(7);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const rlOk = await checkRateLimit(
      admin, userId, RateLimitPresets.PAYMENT.limitType,
      RateLimitPresets.PAYMENT.maxAttempts, RateLimitPresets.PAYMENT.timeWindowMinutes, true,
    );
    if (!rlOk) return createRateLimitResponse(RateLimitPresets.PAYMENT.timeWindowMinutes * 60);

    const { data: versionData } = await admin.rpc("get_settlement_consent_version");
    const version = Number(versionData) || 1;

    const { data: existing } = await admin
      .from("settlement_consents")
      .select("id, accepted_at")
      .eq("user_id", userId)
      .eq("version", version)
      .maybeSingle();
    if (existing) return json({ accepted: true, version, already: true });

    const { data: row, error: insErr } = await admin
      .from("settlement_consents")
      .insert({ user_id: userId, version, ip: clientIp(req) })
      .select("id, accepted_at")
      .single();
    if (insErr || !row) {
      console.error("accept-settlement-consent: insert failed", userId, insErr?.message);
      return json({ error: "consent_insert_failed" }, 500);
    }

    return json({ accepted: true, version, acceptedAt: row.accepted_at });
  } catch (err) {
    console.error("accept-settlement-consent error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
