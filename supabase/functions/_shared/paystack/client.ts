// Shared Paystack REST client + webhook signature verification for edge
// functions. Paystack has no separate sandbox host -- test vs live mode is
// determined entirely by which secret key is configured (sk_test_... vs
// sk_live_...), unlike PayPal's api-m.sandbox.paypal.com / api-m.paypal.com
// split.

const PAYSTACK_API = "https://api.paystack.co";

function getSecretKey(): string {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) throw new Error("paystack_credentials_missing");
  return key;
}

/** "live" | "sandbox", purely from the configured secret key's prefix. */
export function paystackEnvironmentFromKey(): "live" | "sandbox" {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  return key.startsWith("sk_test_") ? "sandbox" : "live";
}

export interface PaystackFetchInit extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function paystackFetch<T = unknown>(
  path: string,
  init: PaystackFetchInit = {},
): Promise<{ status: number; ok: boolean; data: T; raw: string }> {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  headers.set("Authorization", `Bearer ${getSecretKey()}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const body =
    init.body === undefined
      ? undefined
      : typeof init.body === "string"
      ? init.body
      : JSON.stringify(init.body);

  const res = await fetch(`${PAYSTACK_API}${path}`, { ...init, headers, body });
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

/**
 * Verifies Paystack's x-paystack-signature header: HMAC-SHA512 of the raw
 * request body, keyed with PAYSTACK_SECRET_KEY, hex-encoded. Unlike PayPal
 * (which requires a round trip to PayPal's own verify-webhook-signature
 * API), Paystack signs locally -- no network call needed, and no separate
 * webhook-id secret beyond the same key already used for API calls.
 */
export async function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    console.error("[paystack] verifySignature: PAYSTACK_SECRET_KEY not set");
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(computed, signatureHeader.toLowerCase());
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const FALLBACK_ZAR_RATE = 18.5;

/**
 * Reads the stored USD->ZAR rate from public.exchange_rates (refreshed
 * hourly by refresh-exchange-rates). Falls back to a conservative default
 * only if the row is missing entirely -- same "last-known rate, never a
 * blocking error" philosophy as that function; checkout must never hang on
 * a live FX API being down.
 */
export async function getZarRate(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ rate: number; stored: boolean }> {
  try {
    const { data } = await supabase
      .from("exchange_rates")
      .select("usd_rate")
      .eq("currency", "ZAR")
      .maybeSingle();
    const rate = Number(data?.usd_rate);
    if (Number.isFinite(rate) && rate > 0) return { rate, stored: true };
  } catch (err) {
    console.warn("[paystack] exchange rate lookup failed; using fallback", err);
  }
  return { rate: FALLBACK_ZAR_RATE, stored: false };
}
