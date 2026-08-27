/**
 * PLATFORM FEE — Sow2Grow golden rule
 * ====================================
 *
 *   Every bestowal, of every product type, is charged as:
 *   sower's price + Sow2Grow's 15% fee, added ON TOP and carried by the bestower.
 *   A whisperer share is taken OUT OF the sower's price — never added on top.
 *
 * Example, a $2 seed with an active 15% whisperer:
 *   bestower pays  $2.30  ( $2.00 + $0.30 S2G )
 *   S2G keeps      $0.30
 *   whisperer gets $0.30  ( 15% of $2.00 )
 *   sower gets     $1.70
 *
 * There is no price floor. The sower sets the price; nothing in this module
 * substitutes a default or minimum for it — an invalid price is an error.
 *
 * Processor fees (PayPal / crypto) are added on top of the buyer total at
 * checkout — see src/lib/payments/providerFees.ts.
 */

export const S2G_FEE_PERCENT = 15;
export const S2G_FEE_RATE = S2G_FEE_PERCENT / 100;

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Validates a sower-set price. Throws rather than substituting a default — there is no floor. */
export function requirePrice(price: unknown): number {
  const n = typeof price === 'string' ? Number(price) : price;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid product price: ${JSON.stringify(price)}`);
  }
  return n;
}

/** Sow2Grow's 15% fee on top of the sower's price. */
export function s2gFeeOn(base: number): number {
  return round2(base * S2G_FEE_RATE);
}

/** What the bestower is charged for a line (before processor fees). */
export function buyerTotal(base: number): number {
  return round2(base + s2gFeeOn(base));
}

/**
 * Whisperer share always comes out of the sower's base, never on top.
 * `commissionPercent` is the whisperer's own configured rate (from
 * `product_whisperer_assignments.commission_percent`) — an unrelated number
 * to the S2G admin fee rate, so it is required rather than defaulted.
 */
export function whisperShareFromBase(base: number, commissionPercent: number): number {
  return round2(base * (Number(commissionPercent || 0) / 100));
}

/** What the sower/recipient nets after an (optional) whisperer share comes out of their base. */
export function sowerNet(base: number, whisperShare: number = 0): number {
  return round2(base - whisperShare);
}

/** Full breakdown for display: base + fee = total. Throws on a missing/invalid price. */
export function priceBreakdown(price: unknown) {
  const base = requirePrice(price);
  const s2gFee = s2gFeeOn(base);
  return { base, s2gFee, total: round2(base + s2gFee) };
}
