// MUSIC SINGLE PRICING — Sow2Grow golden rule (server side).
//
//   A single is $2 to the sower. Sow2Grow's 15% is added ON TOP (bestower pays).
//   A whisperer share is taken OUT OF the sower's $2 — never added on top.
//   Processor fees are added on top of the grossed total at checkout.

export const MUSIC_SINGLE_MIN_USD = 2;
export const S2G_FEE_PERCENT = 15;
export const S2G_FEE_RATE = S2G_FEE_PERCENT / 100;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function musicSingleBase(price?: number | null): number {
  void price;
  return MUSIC_SINGLE_MIN_USD;
}

export function s2gFeeOn(base: number): number {
  return round2(base * S2G_FEE_RATE);
}

export function musicSingleBreakdown(price?: number | null) {
  const base = musicSingleBase(price);
  const s2gFee = s2gFeeOn(base);
  return { base, s2gFee, total: round2(base + s2gFee) };
}
