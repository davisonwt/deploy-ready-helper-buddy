// Saves a member's crypto payout destination (USDC on Solana, or XRP).
//
// Why server-side: the payload is validated here (client validation is only a
// typo-catcher), the change is written with the caller's identity so the
// profiles audit trigger records old -> new values, and the account owner is
// notified — payout-redirect is a common account-takeover pattern.
//
// Wallet-hardening audit (2026-09-02) item 2: a valid session token alone is
// no longer enough to change where payouts go. This app is email/password
// only (confirmed live via the project's auth settings -- every OAuth
// provider is disabled) so POST now requires current_password and this
// function does its own fresh signInWithPassword check against it, via a
// throwaway client independent of whatever session token accompanied the
// request. A stolen session token without the password fails here. The
// owner notification is also no longer in-app-only for this one action --
// see the email block below -- an in-app notice is visible to whoever holds
// the session, which is exactly the attacker this defends against; general
// notifications elsewhere in the app stay in-app-only, unchanged, this is a
// narrow, deliberate exception for a security notice specifically. Payouts
// to a freshly-changed address also don't go out immediately any more --
// see payout-earnings' cooling-off check against payout_details_updated_at.
//
// GET  -> returns the caller's current payout details + network mode banner info
// POST -> { payout_network, payout_address, payout_address_confirm,
//           payout_tag (int|null), payout_wallet_type, current_password }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validatePayoutDetails } from "../_shared/cryptoAddress.ts";
import { networkModeSummary } from "../_shared/cryptoNetworks.ts";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice(7).trim();

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const mode = networkModeSummary();

    if (req.method === "GET") {
      const { data, error } = await userClient
        .from("profiles")
        .select("payout_network, payout_address, payout_tag, payout_wallet_type, payout_details_updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return json({ payout: data ?? null, network_mode: mode });
    }

    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    // Wallet-hardening audit item 3: rate-limited per user, fail-closed.
    // Especially important here specifically -- this endpoint now also
    // gates a password check (below), so this is also the brute-force
    // limit on that.
    const rlService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const rlOk = await checkRateLimit(
      rlService, user.id, RateLimitPresets.PAYMENT.limitType,
      RateLimitPresets.PAYMENT.maxAttempts, RateLimitPresets.PAYMENT.timeWindowMinutes, true,
    );
    if (!rlOk) return createRateLimitResponse(RateLimitPresets.PAYMENT.timeWindowMinutes * 60);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "invalid JSON body" }, 400);

    // Re-authentication: prove the caller still knows the password, right
    // now, independent of the session token on this request. A stolen
    // token alone cannot get past this.
    const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
    if (!currentPassword) {
      return json({ error: "Re-enter your password to confirm this change.", code: "reauth_required" }, 401);
    }
    if (!user.email) {
      return json({ error: "This account has no email on file to re-authenticate with." }, 400);
    }
    const reauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error: reauthErr } = await reauthClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthErr) {
      return json({ error: "That password is incorrect.", code: "reauth_failed" }, 401);
    }

    const address = typeof body.payout_address === "string" ? body.payout_address.trim() : "";
    const confirm = typeof body.payout_address_confirm === "string"
      ? body.payout_address_confirm.trim()
      : null;
    if (confirm !== null && confirm !== address) {
      return json({ error: "The two addresses you entered do not match." }, 400);
    }

    const rawTag = body.payout_tag;
    const tag = rawTag === null || rawTag === undefined || rawTag === ""
      ? null
      : Number(rawTag);

    const payload = {
      payout_network: body.payout_network,
      payout_address: address,
      payout_tag: tag,
      payout_wallet_type: body.payout_wallet_type,
    };

    const err = validatePayoutDetails(payload);
    if (err) return json({ error: err }, 400);

    // Write with the caller's JWT so the audit trigger records auth.uid().
    const { data: updated, error: updErr } = await userClient
      .from("profiles")
      .update({ ...payload, payout_details_updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("payout_network, payout_address, payout_tag, payout_wallet_type, payout_details_updated_at")
      .maybeSingle();
    if (updErr) return json({ error: updErr.message }, 400);

    // Notify the owner out-of-band. Never blocks the save.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const masked = address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
    const label = payload.payout_network === "xrp" ? "XRP (Ripple)" : "USDC (Solana)";
    const message =
      `Your Sow2Grow payout destination was changed to ${label} — ${masked}` +
      (tag !== null ? ` (destination tag ${tag})` : "") +
      `. If you did not make this change, contact support immediately and secure your account.`;

    try {
      await admin.from("user_notifications").insert({
        user_id: user.id,
        type: "orchard_update",
        title: "Payout destination changed",
        message,
        action_url: "/settings/payouts",
        is_read: false,
      });
    } catch (e) {
      console.warn("payout change notification insert failed", e);
    }

    // Email is a deliberate, narrow exception to "in-app only" for this one
    // action -- see the file header. Best-effort: a delivery failure here
    // must never undo or block the save that already committed above. Sent
    // via send_brevo_email using the service-role bearer, which that
    // function accepts for exactly this kind of internal, non-self send.
    try {
      const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send_brevo_email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: user.email,
          subject: "Your Sow2Grow payout destination was changed",
          html:
            `<p>Your Sow2Grow payout destination was changed to <strong>${label}</strong> — ${masked}` +
            (tag !== null ? ` (destination tag ${tag})` : "") +
            `.</p><p>New payout addresses have a 48-hour holding period before any payout is sent to them.</p>` +
            `<p><strong>If you did not make this change, contact support immediately and secure your account</strong> ` +
            `(change your password and review your active sessions).</p>`,
        }),
      });
      if (!emailRes.ok) {
        console.warn("payout change email failed", emailRes.status, await emailRes.text().catch(() => ""));
      }
    } catch (e) {
      console.warn("payout change email exception", e);
    }

    return json({ success: true, payout: updated, network_mode: mode });
  } catch (e) {
    console.error("update-crypto-payout error", e);
    return json({ error: "Failed to update payout details" }, 500);
  }
});
