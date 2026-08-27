// PLATFORM FEE — Sow2Grow golden rule (server side, authoritative).
//
//   Every bestowal, of every product type, is charged as:
//   sower's price + Sow2Grow's 15% fee, added ON TOP and carried by the bestower.
//   A whisperer share is taken OUT OF the sower's price — never added on top.
//   There is no price floor; an invalid price is an error, not a default.

export const S2G_FEE_PERCENT = 15;
export const S2G_FEE_RATE = S2G_FEE_PERCENT / 100;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function requirePrice(price: unknown): number {
  const n = typeof price === "string" ? Number(price) : price;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid product price: ${JSON.stringify(price)}`);
  }
  return n;
}

export function s2gFeeOn(base: number): number {
  return round2(base * S2G_FEE_RATE);
}

export function buyerTotal(base: number): number {
  return round2(base + s2gFeeOn(base));
}

export function priceBreakdown(price: unknown) {
  const base = requirePrice(price);
  const s2gFee = s2gFeeOn(base);
  return { base, s2gFee, total: round2(base + s2gFee) };
}
