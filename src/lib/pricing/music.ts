/**
 * MUSIC SINGLE PRICING — Sow2Grow golden rule
 * ===========================================
 *
 *   A music single is $2 to the sower.
 *   Sow2Grow's 15% is added ON TOP of that $2 (the bestower carries it).
 *   A whisperer share is taken OUT OF the sower's $2 — never added on top.
 *
 * Example, single at $2 with a 15% whisperer:
 *   bestower pays  $2.30  ( $2.00 + $0.30 S2G )
 *   S2G keeps      $0.30
 *   whisperer gets $0.30  ( 15% of $2.00 )
 *   sower gets     $1.70
 *
 * Processor fees (PayPal / crypto) are added on top of the $2.30 at
 * checkout — see supabase/functions/_shared/paypal/fees.ts.
 */

/** Minimum (and default) sower price for a single. */
export const MUSIC_SINGLE_MIN_USD = 2;

/** Sow2Grow platform + admin percentage, added on top of the sower price. */
export const S2G_FEE_PERCENT = 15;
export const S2G_FEE_RATE = S2G_FEE_PERCENT / 100;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** The sower price of a single — never below the $2 floor. */
export function musicSingleBase(price?: number | null): number {
  const p = Number(price ?? 0);
  return round2(Number.isFinite(p) && p > MUSIC_SINGLE_MIN_USD ? p : MUSIC_SINGLE_MIN_USD);
}

/** Sow2Grow's 15% on a sower price. */
export function s2gFeeOn(base: number): number {
  return round2(base * S2G_FEE_RATE);
}

/** What the bestower is charged for a single (before processor fees). */
export function musicSingleTotal(price?: number | null): number {
  const base = musicSingleBase(price);
  return round2(base + s2gFeeOn(base));
}

/** Full breakdown for display. */
export function musicSingleBreakdown(price?: number | null) {
  const base = musicSingleBase(price);
  const s2gFee = s2gFeeOn(base);
  return { base, s2gFee, total: round2(base + s2gFee) };
}

/** Whisperer share always comes out of the sower's base, never on top. */
export function whisperShareFromBase(base: number, commissionPercent: number): number {
  return round2(base * (Number(commissionPercent || 0) / 100));
}
