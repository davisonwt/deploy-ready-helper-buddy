// Friendly copy for known create-*-order error codes, so a buyer never
// sees a raw code like "sower_settlement_consent_pending" in a toast.
// Errors not listed here fall back to the raw message (still better than
// nothing, and every other existing code path already does this).
export const CHECKOUT_ERROR_COPY: Record<string, string> = {
  sower_settlement_consent_pending: "This sower hasn't finished setting up payouts yet — try again soon.",
};

export function checkoutErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);
  return CHECKOUT_ERROR_COPY[code] ?? code;
}

/** True for an error the buyer can't fix by retrying -- the pay button should stay disabled, not just show a toast. */
export function isBlockingCheckoutError(err: unknown): boolean {
  const code = err instanceof Error ? err.message : String(err);
  return code === 'sower_settlement_consent_pending';
}
