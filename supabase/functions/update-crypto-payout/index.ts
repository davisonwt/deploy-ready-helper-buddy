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
// request. A stolen session token without the password fails here.
//
// Policy correction (2026-09-02): S2G does not use email at all -- see
// spec-payments.md. This function no longer sends any email (it previously
// called send_brevo_email as a deliberate exception to in-app-only; that
// exception is retired, not replaced). In its place, POST now ALSO requires
// a correct answer to one of the member's own security questions (same
// store as password reset, verified via verify_own_security_answer) --
// current_password AND a security answer, both required, neither
// sufficient alone. The owner notification stays in-app only, same as
// every other notification in this app. Payouts to a freshly-changed
// address still don't go out immediately -- see payout-earnings' cooling-off
// check against payout_details_updated_at.
//
// GET  -> returns the caller's current payout details, network mode banner
//         info, and (if set up) their security question labels for the UI
//         to build a picker -- never the answers or hashes.
// POST -> { payout_network, payout_address, payout_address_confirm,
//           payout_tag (int|null), payout_wallet_type, current_password,
//           security_question_index (1|2|3), security_answer }

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
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";

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

      // Question text only, via the caller's own JWT -- RLS scopes this to
      // their own row same as everything else here. Never the answers/hashes.
      const { data: secQ } = await userClient
        .from("user_security_questions")
        .select("question_1, question_2, question_3")
        .eq("user_id", user.id)
        .maybeSingle();
      const securityQuestions = secQ
        ? [
            { index: 1, label: secQ.question_1 },
            { index: 2, label: secQ.question_2 },
            { index: 3, label: secQ.question_3 },
          ]
        : null;

      return json({ payout: data ?? null, network_mode: mode, security_questions: securityQuestions });
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

    // Second factor: one correct answer from the member's own security
    // questions (same store as password reset). Both this and the password
    // above are required -- neither alone is enough to move a payout
    // destination.
    const questionIndex = Number(body.security_question_index);
    const securityAnswer = typeof body.security_answer === "string" ? body.security_answer : "";
    if (![1, 2, 3].includes(questionIndex) || !securityAnswer.trim()) {
      return json({
        error: "Answer one of your security questions to confirm this change.",
        code: "security_answer_required",
      }, 400);
    }
    const { data: answerOk, error: answerRpcErr } = await userClient.rpc("verify_own_security_answer", {
      p_question_index: questionIndex,
      p_answer: securityAnswer,
    });
    if (answerRpcErr) throw answerRpcErr;
    if (!answerOk) {
      return json({
        error: "That answer doesn't match. If you haven't set up security questions yet, do that first.",
        code: "security_answer_incorrect",
      }, 401);
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

    // Notify the owner, in-app only -- same as every other notification in
    // this app (see the file header: the email exception this used to carry
    // is retired). Never blocks the save.
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

    return json({ success: true, payout: updated, network_mode: mode });
  } catch (e) {
    console.error("update-crypto-payout error", e);
    return json({ error: "Failed to update payout details" }, 500);
  }
});
