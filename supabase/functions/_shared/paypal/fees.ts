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
// NOWPayments (crypto, retired -- see spec-payments.md section 1): flat
// percent on the base amount. Left in place only for any historical order
// still referencing it; no checkout path creates new nowpayments orders.
//
// Solana (direct USDC wallet-to-wallet, replaces nowpayments): a real
// Solana transaction fee is a fraction of a cent (~5000 lamports, ~$0.0005
// at typical SOL prices) -- there is no percent-of-amount processor to pass
// through at all, unlike PayPal. The flat default below is a small, honest
// buffer rounding that up to a whole cent for display, not a real cost
// recovery mechanism; it exists so "network fee ~$0.01" shown at checkout
// is never technically an understatement.
//
// Both rates are overridable via env vars for future tuning without a code
// change, but the defaults reflect real-world rails.

export type BuyerFeeProvider = "paypal" | "nowpayments" | "solana";

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

  if (provider === "solana") {
    // Flat only, no percent -- see the file header. Not ceil2'd against a
    // percent of base like the other two; it's a fixed few cents regardless
    // of amount, which is the whole point of "direct" removing the
    // percent-based crypto processor fee.
    const fixed = numEnv("SOLANA_FEE_FIXED", 0.01);
    return {
      base: safeBase,
      fee: fixed,
      total: round2(safeBase + fixed),
      feePct: 0,
      feeFixed: fixed,
    };
  }

  // nowpayments (retired -- see file header)
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
