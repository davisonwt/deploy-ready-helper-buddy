// "Connect with PayPal" (Log in with PayPal / Identity API). Replaces the
// email-OTP flow — PayPal itself asserts the verified email, so
// user_wallets.verified_at is stamped the moment the identity exchange
// succeeds, no code of our own to send or check.
//
// action: 'authorize_url' — body { redirect_uri, state }. Returns the URL
//   to send the browser to (www.paypal.com/connect or the sandbox
//   equivalent, per PAYPAL_ENV). state is opaque to us — the frontend
//   generates and verifies it itself (CSRF protection on the redirect
//   round-trip); we just echo it into the URL.
// action: 'callback'      — body { code, redirect_uri }. redirect_uri MUST
//   be the exact same value used to build the authorize_url, or PayPal's
//   token exchange rejects it. Exchanges the code for an access token
//   (authorization_code grant), reads the id_token's own claims for the
//   verified email + payer id (falling back to the userinfo endpoint only
//   if the id_token is missing one), and upserts the caller's own
//   paypal_email user_wallets row.
// action: 'save_manual_email' — body { email }. Fallback for when Log in
//   with PayPal itself is unavailable to the member. Writes the same
//   user_wallets row shape as 'callback', but verification_method is
//   'manual_entry' instead of 'paypal_oauth' -- verified_at is still
//   stamped (a product decision, not a PayPal confirmation) so the
//   payout-earnings gate opens the same way; the UI badge keys off
//   verification_method, not verified_at, to still flag it as unverified.
//
// Auth: real user session only, every action — self-service, no admin/
// service-role bypass (same reasoning as the retired paypal-email-verify:
// nobody connects a PayPal account on someone else's behalf).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { paypalBaseUrl, paypalConnectBaseUrl } from "../_shared/paypal/client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface UserInfo {
  email?: string;
  emails?: Array<{ value?: string; primary?: boolean; confirmed?: boolean }>;
  payer_id?: string;
  user_id?: string; // a full https://www.paypal.com/webapps/.../<payer_id> URI on some accounts
  sub?: string; // same shape as user_id, on the id_token's own claims
}

function extractPayerId(info: UserInfo): string | null {
  if (info.payer_id) return info.payer_id;
  const uri = info.user_id || info.sub;
  if (uri) {
    const parts = uri.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  }
  return null;
}

// Decodes an id_token's payload claims WITHOUT verifying its signature.
// Safe only because this id_token never touches the browser or any other
// untrusted party -- it comes straight back from PayPal's own /v1/oauth2/token
// endpoint in this same server-to-server, TLS-protected call, the same trust
// boundary this function already extends to access_token (also unverified,
// also used as-is against PayPal's own APIs).
function decodeIdTokenClaims(idToken: string): UserInfo | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "===".slice((base64.length + 3) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(json) as UserInfo;
  } catch (err) {
    console.warn("paypal-connect: id_token decode failed", err instanceof Error ? err.message : String(err));
    return null;
  }
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

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Manual fallback for when Log in with PayPal itself is unavailable --
    // needs neither redirect_uri nor PayPal API credentials, so it's
    // handled before the OAuth-only gates below that both other actions
    // require.
    if (action === "save_manual_email") {
      const emailInput = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        return json({ error: "invalid_email" }, 400);
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

      // Same "reuse the newest active row" shape the OAuth callback uses.
      const { data: existingRows } = await admin
        .from("user_wallets")
        .select("id")
        .eq("user_id", userId)
        .eq("wallet_type", "paypal_email")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1);
      const existing = existingRows?.[0] ?? null;

      // verified_at is stamped immediately (product decision, not a PayPal
      // confirmation) so the payout gate in payout-earnings -- which
      // requires verified_at IS NOT NULL -- opens right away for a manually
      // typed email, same as an OAuth-connected one. verification_method
      // stays distinct ("manual_entry" vs "paypal_oauth") purely so the UI
      // can still flag it as self-reported, and so support/audit can tell
      // the two apart later.
      const row = {
        user_id: userId,
        wallet_type: "paypal_email",
        wallet_address: emailInput,
        payout_currency: "USD",
        is_active: true,
        verified_at: new Date().toISOString(),
        verification_method: "manual_entry",
      };

      if (existing) {
        const { error: updateErr } = await admin.from("user_wallets").update(row).eq("id", existing.id);
        if (updateErr) {
          console.error("paypal-connect: manual email update failed", updateErr.message);
          return json({ error: "wallet_update_failed", detail: updateErr.message }, 500);
        }
      } else {
        const { error: insertErr } = await admin.from("user_wallets").insert({ ...row, is_primary: true });
        if (insertErr) {
          console.error("paypal-connect: manual email insert failed", insertErr.message);
          return json({ error: "wallet_insert_failed", detail: insertErr.message }, 500);
        }
      }

      return json({ success: true, email: emailInput });
    }

    const redirectUri = typeof body?.redirect_uri === "string" ? body.redirect_uri : "";
    if (!redirectUri) return json({ error: "missing_redirect_uri" }, 400);

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!clientId || !clientSecret) return json({ error: "paypal_credentials_missing" }, 500);

    if (action === "authorize_url") {
      const state = typeof body?.state === "string" ? body.state : "";
      const params = new URLSearchParams({
        flowEntry: "static",
        client_id: clientId,
        scope: "openid email",
        redirect_uri: redirectUri,
        response_type: "code",
      });
      if (state) params.set("state", state);
      return json({ url: `${paypalConnectBaseUrl()}/connect?${params.toString()}` });
    }

    if (action === "callback") {
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      if (!code) return json({ error: "missing_code" }, 400);

      const basic = btoa(`${clientId}:${clientSecret}`);
      const tokenRes = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });
      const tokenRaw = await tokenRes.text();
      if (!tokenRes.ok) {
        console.error("paypal-connect: token exchange failed", tokenRes.status, tokenRaw);
        return json({ error: "paypal_token_exchange_failed", detail: tokenRaw }, 502);
      }
      const tokenJson = JSON.parse(tokenRaw) as { access_token?: string; scope?: string; id_token?: string };
      console.log("paypal-connect: token granted scope:", tokenJson.scope, "has id_token:", !!tokenJson.id_token);
      if (!tokenJson.access_token) {
        return json({ error: "paypal_token_exchange_failed", detail: "no_access_token" }, 502);
      }

      // Prefer the id_token's own claims -- PayPal live has been rejecting
      // the userinfo call, and the token exchange already handed us
      // everything we need (email, payer id) without a second round trip.
      // userinfo stays as the fallback for accounts/flows that don't get
      // an id_token or whose id_token is missing an email claim.
      let info: UserInfo | null = tokenJson.id_token ? decodeIdTokenClaims(tokenJson.id_token) : null;
      if (info?.email) {
        console.log("paypal-connect: identity resolved via id_token claims");
      } else {
        info = null;
        const infoRes = await fetch(
          `${paypalBaseUrl()}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
          { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
        );
        const infoRaw = await infoRes.text();
        if (!infoRes.ok) {
          console.error("paypal-connect: userinfo failed", infoRes.status, infoRaw,
            "| granted scope:", tokenJson.scope,
            "| has id_token:", !!tokenJson.id_token,
            "| id_token email present:", !!(tokenJson.id_token && decodeIdTokenClaims(tokenJson.id_token)?.email));
          return json({ error: "paypal_userinfo_failed", detail: infoRaw }, 502);
        }
        info = JSON.parse(infoRaw) as UserInfo;
        console.log("paypal-connect: identity resolved via userinfo fallback");
      }
      const emailRaw =
        info.email ??
        info.emails?.find((e) => e.primary)?.value ??
        info.emails?.[0]?.value ??
        "";
      const email = emailRaw.trim().toLowerCase();
      if (!email) {
        console.error("paypal-connect: no email in resolved identity, keys:", Object.keys(info));
        return json({ error: "paypal_email_missing" }, 502);
      }
      const payerId = extractPayerId(info);

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

      // .limit(1) rather than .maybeSingle(): a user could have more than
      // one legacy paypal_email row from the retired manual-entry flow,
      // which .maybeSingle() would error on instead of just picking one.
      const { data: existingRows } = await admin
        .from("user_wallets")
        .select("id")
        .eq("user_id", userId)
        .eq("wallet_type", "paypal_email")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1);
      const existing = existingRows?.[0] ?? null;

      const row = {
        user_id: userId,
        wallet_type: "paypal_email",
        wallet_address: email,
        paypal_payer_id: payerId,
        payout_currency: "USD",
        is_active: true,
        verified_at: new Date().toISOString(),
        verification_method: "paypal_oauth",
      };

      if (existing) {
        const { error: updateErr } = await admin.from("user_wallets").update(row).eq("id", existing.id);
        if (updateErr) {
          console.error("paypal-connect: wallet update failed", updateErr.message);
          return json({ error: "wallet_update_failed", detail: updateErr.message }, 500);
        }
      } else {
        const { error: insertErr } = await admin.from("user_wallets").insert({ ...row, is_primary: true });
        if (insertErr) {
          console.error("paypal-connect: wallet insert failed", insertErr.message);
          return json({ error: "wallet_insert_failed", detail: insertErr.message }, 500);
        }
      }

      return json({ success: true, email });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("paypal-connect error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
