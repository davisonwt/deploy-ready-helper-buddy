// Shared processor-fee calculator.
//
// Golden rule of Sow2Grow: **the buyer (bestower) pays the processor fee, not
// the sower**. Every `create-*-order` edge function must run its buyer total
// through this helper so the same rule is enforced end-to-end.
//
// PayPal (cards + PayPal balance): the standard published rate for
// merchant-of-record card acceptance is 3.49% + $0.49 per transaction. We
// pass 100% of that on top of the base amount charged to the buyer, so the
// sower always receives the full base amount minus the flat 15% S2G share.
//
// NOWPayments (crypto): flat percent on the base amount.
//
// Both rates are overridable via env vars for future tuning without a code
// change, but the defaults reflect real-world rails.

export type BuyerFeeProvider = "paypal" | "nowpayments";

export interface BuyerFeeQuote {
  /** Base amount before processor fee. */
  base: number;
  /** Processor fee added on top, paid by the buyer. */
  fee: number;
  /** Buyer's total charge (base + fee). */
  total: number;
  /** Percent component of the fee (for display / snapshotting). */
  feePct: number;
  /** Fixed component of the fee (0 for percent-only providers). */
  feeFixed: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const ceil2 = (n: number) => Math.ceil((n - Number.EPSILON) * 100) / 100;

export function computeBuyerFee(
  provider: BuyerFeeProvider,
  base: number,
): BuyerFeeQuote {
  const safeBase = round2(Number.isFinite(base) && base > 0 ? base : 0);

  if (provider === "paypal") {
    const pct = numEnv("PAYPAL_FEE_PCT", 0.0349);
    const fixed = numEnv("PAYPAL_FEE_FIXED", 0.49);
    const fee = ceil2(safeBase * pct + fixed);
    return {
      base: safeBase,
      fee,
      total: round2(safeBase + fee),
      feePct: pct,
      feeFixed: fixed,
    };
  }

  // nowpayments
  const pct = numEnv("NOWPAYMENTS_FEE_PCT", 0.01);
  const fee = ceil2(safeBase * pct);
  return {
    base: safeBase,
    fee,
    total: round2(safeBase + fee),
    feePct: pct,
    feeFixed: 0,
  };
}

function numEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
