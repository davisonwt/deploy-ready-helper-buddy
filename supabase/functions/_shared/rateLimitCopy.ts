// Member-facing wording for a rate limit, and the checkout bucket's shape.
// Pure (no Deno, no Supabase) so src/test/checkout-rate-limit.test.ts can
// exercise it; rateLimiter.ts imports it.

/** Order creation and capture: generous, separate from the money-out functions. */
export const CHECKOUT_LIMIT = {
  limitType: "checkout",
  maxAttempts: 20,
  timeWindowMinutes: 15,
  failClosed: true,
} as const;

export function retryAfterMinutes(retryAfterSeconds: number): number {
  const s = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 60;
  return Math.max(1, Math.ceil(s / 60));
}

/** "Too many attempts, try again in N minutes." -- the toast text. */
export function rateLimitMessage(retryAfterSeconds: number): string {
  const m = retryAfterMinutes(retryAfterSeconds);
  return `Too many attempts, try again in ${m} minute${m === 1 ? "" : "s"}.`;
}

/**
 * The 429 body. `error` carries the member-facing sentence because
 * invokePaymentFunction throws `parsed.error` as the toast; `code` is the
 * stable machine string; `retryAfter` is seconds.
 */
export function rateLimitBody(retryAfterSeconds: number): { error: string; code: "rate_limited"; message: string; retryAfter: number } {
  const message = rateLimitMessage(retryAfterSeconds);
  return { error: message, code: "rate_limited", message, retryAfter: retryAfterSeconds };
}
