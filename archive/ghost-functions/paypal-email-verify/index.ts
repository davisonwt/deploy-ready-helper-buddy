// PayPal email OTP verification — the gate payout-earnings checks before
// ever paying anyone (user_wallets.verified_at IS NOT NULL). Self-service:
// caller must be the wallet's own owner, real user session only (no
// admin/service-role bypass — nobody verifies an email on someone else's
// behalf).
//
// action: 'send'   — generate a 6-digit code, email it via send-resend-
//                     email (the platform's existing transactional-email
//                     path), store its hash. 60s resend cooldown.
// action: 'verify' — check the code against the stored hash. 10-minute
//                     expiry, 3 attempts, then the code is dead (a fresh
//                     "send" is required — attempts don't reset on their
//                     own). On success, stamps user_wallets.verified_at.
//
// Codes are hashed (SHA-256) before storage — never kept or logged in
// plaintext — and a send replaces any prior unconsumed code for the same
// (user, email) rather than leaving it valid alongside the new one.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  // crypto.getRandomValues, not Math.random — this gates real money.
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const n = arr[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);

    // The email must already be saved as this user's own paypal_email
    // wallet — verification attaches to an existing entry, it never
    // creates one.
    const { data: wallet } = await admin
      .from("user_wallets")
      .select("id, verified_at")
      .eq("user_id", userId)
      .eq("wallet_type", "paypal_email")
      .eq("wallet_address", email)
      .eq("is_active", true)
      .maybeSingle();
    if (!wallet) return json({ error: "wallet_not_found" }, 404);

    if (action === "send") {
      const { data: existing } = await admin
        .from("paypal_email_verifications")
        .select("id, last_sent_at")
        .eq("user_id", userId)
        .eq("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const elapsedMs = Date.now() - new Date(existing.last_sent_at).getTime();
        if (elapsedMs < RESEND_COOLDOWN_MS) {
          return json({
            error: "resend_too_soon",
            retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000),
          }, 429);
        }
        // Replace rather than accumulate — only the newest code is ever valid.
        await admin.from("paypal_email_verifications").delete().eq("id", existing.id);
      }

      const code = generateCode();
      const codeHash = await sha256Hex(code);
      const now = Date.now();
      const { error: insertErr } = await admin.from("paypal_email_verifications").insert({
        user_id: userId,
        email,
        code_hash: codeHash,
        attempts: 0,
        expires_at: new Date(now + CODE_TTL_MS).toISOString(),
        last_sent_at: new Date(now).toISOString(),
      });
      if (insertErr) return json({ error: "send_failed", detail: insertErr.message }, 500);

      const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-resend-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          to: email,
          subject: "Your Sow2Grow PayPal verification code",
          html: `
            <p>Your Sow2Grow PayPal verification code is:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
            <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          `,
        }),
      });
      if (!emailRes.ok) {
        const detail = await emailRes.text().catch(() => "");
        console.error("paypal-email-verify: send-resend-email failed", emailRes.status, detail);
        return json({ error: "email_send_failed" }, 502);
      }

      return json({ success: true, expiresInSeconds: CODE_TTL_MS / 1000 });
    }

    if (action === "verify") {
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      if (!/^\d{6}$/.test(code)) return json({ error: "invalid_code_format" }, 400);

      const { data: pending } = await admin
        .from("paypal_email_verifications")
        .select("id, code_hash, attempts, expires_at")
        .eq("user_id", userId)
        .eq("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pending) return json({ error: "no_pending_code" }, 404);

      if (new Date(pending.expires_at).getTime() < Date.now()) {
        return json({ error: "code_expired" }, 410);
      }
      if (pending.attempts >= MAX_ATTEMPTS) {
        return json({ error: "too_many_attempts" }, 429);
      }

      const suppliedHash = await sha256Hex(code);
      if (suppliedHash !== pending.code_hash) {
        const newAttempts = pending.attempts + 1;
        await admin
          .from("paypal_email_verifications")
          .update({ attempts: newAttempts })
          .eq("id", pending.id);
        return json({
          error: "invalid_code",
          attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newAttempts),
        }, 400);
      }

      await admin
        .from("paypal_email_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);

      const { data: updated, error: updateErr } = await admin
        .from("user_wallets")
        .update({ verified_at: new Date().toISOString(), verification_method: "email_otp" })
        .eq("id", wallet.id)
        .select("id")
        .maybeSingle();
      if (updateErr || !updated) {
        console.error("paypal-email-verify: wallet update failed", wallet.id, updateErr);
        return json({ error: "wallet_update_failed" }, 500);
      }

      return json({ success: true, verified: true });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("paypal-email-verify error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
