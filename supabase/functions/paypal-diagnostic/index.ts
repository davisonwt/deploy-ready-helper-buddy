// Read-only diagnostic: verifies PayPal credentials authenticate against the
// configured environment by requesting an OAuth2 access token. No orders,
// charges, or payouts are created.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const env = (Deno.env.get("PAYPAL_ENV") ?? "sandbox").toLowerCase();
  const base = env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  const payoutsEnabled = Deno.env.get("PAYPAL_PAYOUTS_ENABLED");

  const presence = {
    PAYPAL_ENV: env,
    PAYPAL_CLIENT_ID: Boolean(clientId),
    PAYPAL_CLIENT_SECRET: Boolean(secret),
    PAYPAL_WEBHOOK_ID: Boolean(webhookId),
    PAYPAL_PAYOUTS_ENABLED: payoutsEnabled ?? null,
    base_url: base,
  };

  if (!clientId || !secret) {
    return new Response(
      JSON.stringify({ ok: false, presence, error: "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const basic = btoa(`${clientId}:${secret}`);
  let status = 0;
  let bodyText = "";
  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });
    status = res.status;
    bodyText = await res.text();
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, presence, error: `fetch failed: ${String(e)}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(bodyText); } catch { /* keep raw */ }

  // Redact the actual token; just confirm shape.
  const tokenPresent = typeof parsed.access_token === "string" && (parsed.access_token as string).length > 0;
  const safe = {
    ok: status === 200 && tokenPresent,
    presence,
    http_status: status,
    token_received: tokenPresent,
    token_type: parsed.token_type ?? null,
    expires_in: parsed.expires_in ?? null,
    scope_preview: typeof parsed.scope === "string" ? (parsed.scope as string).slice(0, 200) : null,
    app_id: parsed.app_id ?? null,
    nonce_present: Boolean(parsed.nonce),
    error: parsed.error ?? null,
    error_description: parsed.error_description ?? null,
    raw_body_if_error: status === 200 ? null : bodyText.slice(0, 1000),
  };

  return new Response(JSON.stringify(safe, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
