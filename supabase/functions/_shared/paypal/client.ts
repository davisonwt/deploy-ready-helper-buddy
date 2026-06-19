// Shared PayPal REST client for edge functions.
// - OAuth2 token caching (in-memory per isolate)
// - Environment switching (sandbox/live)
// - Webhook signature verification

const TOKEN_TTL_MS = 8 * 60 * 1000; // 8 minutes (PayPal tokens live ~9h, but we refresh often)

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function getEnv(): "sandbox" | "live" {
  const v = (Deno.env.get("PAYPAL_ENV") ?? "sandbox").toLowerCase();
  return v === "live" ? "live" : "sandbox";
}

export function paypalBaseUrl(): string {
  return getEnv() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getCreds(): { id: string; secret: string } {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) {
    throw new Error("paypal_credentials_missing");
  }
  return { id, secret };
}

async function fetchAccessToken(): Promise<string> {
  const { id, secret } = getCreds();
  const basic = btoa(`${id}:${secret}`);
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`paypal_oauth_failed:${res.status}:${text}`);
  }
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + Math.min(TOKEN_TTL_MS, (json.expires_in - 60) * 1000),
  };
  return json.access_token;
}

export async function getPaypalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  return await fetchAccessToken();
}

export interface PaypalFetchInit extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function paypalFetch<T = unknown>(
  path: string,
  init: PaypalFetchInit = {},
): Promise<{ status: number; ok: boolean; data: T; raw: string }> {
  const token = await getPaypalAccessToken();
  const headers = new Headers(init.headers as HeadersInit | undefined);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const body =
    init.body === undefined
      ? undefined
      : typeof init.body === "string"
      ? init.body
      : JSON.stringify(init.body);

  const res = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers,
    body,
  });
  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  return { status: res.status, ok: res.ok, data: data as T, raw };
}

export interface PaypalWebhookHeaders {
  transmissionId: string | null;
  transmissionTime: string | null;
  certUrl: string | null;
  authAlgo: string | null;
  transmissionSig: string | null;
}

export function extractPaypalWebhookHeaders(req: Request): PaypalWebhookHeaders {
  const h = req.headers;
  return {
    transmissionId: h.get("paypal-transmission-id"),
    transmissionTime: h.get("paypal-transmission-time"),
    certUrl: h.get("paypal-cert-url"),
    authAlgo: h.get("paypal-auth-algo"),
    transmissionSig: h.get("paypal-transmission-sig"),
  };
}

/**
 * Verifies a PayPal webhook signature by calling PayPal's verify endpoint.
 * Returns true only on explicit SUCCESS.
 */
export async function verifyPaypalWebhookSig(
  headers: PaypalWebhookHeaders,
  rawBody: string,
): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.error("[paypal] PAYPAL_WEBHOOK_ID not set");
    return false;
  }
  if (
    !headers.transmissionId ||
    !headers.transmissionTime ||
    !headers.certUrl ||
    !headers.authAlgo ||
    !headers.transmissionSig
  ) {
    return false;
  }

  // webhook_event must be the parsed JSON object, not a string.
  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const payload = {
    auth_algo: headers.authAlgo,
    cert_url: headers.certUrl,
    transmission_id: headers.transmissionId,
    transmission_sig: headers.transmissionSig,
    transmission_time: headers.transmissionTime,
    webhook_id: webhookId,
    webhook_event: webhookEvent,
  };

  try {
    const { ok, data } = await paypalFetch<{ verification_status?: string }>(
      "/v1/notifications/verify-webhook-signature",
      { method: "POST", body: payload },
    );
    if (!ok) return false;
    return data?.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[paypal] verify_webhook_signature error", e);
    return false;
  }
}
