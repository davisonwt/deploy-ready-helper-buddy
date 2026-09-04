/**
 * Single source of truth for processor fee ranges shown to users.
 *
 * Used by:
 *  - Payout onboarding (B) — "this is what it costs YOU to receive money"
 *  - Existing-user payout banner copy (C)
 *  - Checkout provider selector (A) — "this is what it costs YOU to send money"
 *
 * Fees here are headline ranges. The exact fee on any individual transaction
 * comes from the provider at invoice/payout time and is persisted on the
 * `bestowals` row (processor_fee_amount / payout_fee_amount).
 */

export type PayoutProviderId = 'solana' | 'paypal' | 'balance';

/**
 * Direct Solana pay-in has no fee-economics floor (spec-payments.md
 * section 5) -- the old $10 minimum existed only because NOWPayments' own
 * flat ~0.27 USDC network fee plus a sending exchange's ~0.50 USDC
 * withdrawal fee together dominated a small bestowal. Going direct removes
 * the first of those entirely; the second was never ours to control and
 * still applies only if the sender funds from an exchange rather than a
 * wallet they already hold USDC in. Kept at 0 (not deleted) so every call
 * site's existing `amount < MIN_CRYPTO_BESTOWAL_USD` guard stays correct
 * code rather than dead code -- it now simply never trips.
 */
export const MIN_CRYPTO_BESTOWAL_USD = 0;

/**
 * Shown at the Solana payment screen. Unlike NOWPayments' fixed-rate
 * invoices (which quoted an 8-decimal crypto amount that a 2-decimal
 * wallet could underpay by rounding), a direct Solana Pay transfer is a
 * plain USDC amount at USDC's own fixed 6 decimals -- there is no
 * exchange-rate quote to round against. The risk that remains is sending
 * a different amount than requested at all, not a rounding mismatch.
 */
export const CRYPTO_ROUNDING_NOTICE =
  'Send exactly the USDC amount shown. Underpaying by any amount will not complete the payment; overpaying completes it and the difference is recorded.';

/**
 * Retained only for any historical NOWPayments invoice code path that
 * still references it (see spec-payments.md section 6: NOWPayments code
 * stays in place, unreachable from checkout, until both directions of the
 * Solana migration are proven). No live checkout path uses this anymore.
 */
export const DEFAULT_CRYPTO_PAY_CURRENCY = 'usdcsol';

export interface PayoutProviderInfo {
  id: PayoutProviderId;
  label: string;
  /** Percent fee range [min, max], inclusive. */
  feePct: [number, number];
  /** Flat fee added on top (buyer mode). */
  feeFixed: number;
  /** Short note shown under the label. */
  note: string;
  /** Long-form explainer for the onboarding/settings page. */
  explainer: string;
}

/**
 * GOLDEN RULE: the bestower (buyer) always carries the processor fee.
 * Sowers receive the full base amount (minus S2G's 15% share). These figures
 * are what the buyer sees in the picker before confirming.
 */
export const PAYOUT_PROVIDERS: PayoutProviderInfo[] = [
  {
    id: 'balance',
    label: 'S2G Balance — one tap, no wallet',
    feePct: [0, 0],
    feeFixed: 0,
    note: 'No processor fee. Debited instantly from your S2G Balance.',
    explainer:
      'Spend from the balance you already topped up — one tap, no wallet popup, no processor fee. Only shown when your balance covers the full amount.',
  },
  {
    id: 'solana',
    label: 'USDC (Solana) — pay from your own wallet',
    feePct: [0, 0],
    feeFixed: 0.01,
    note: 'Network fee ~$0.01, paid by you. No minimum. The sower receives the full amount.',
    explainer:
      'Send USDC directly from your own Solana wallet (Phantom or similar) — no processor in the middle, no minimum amount. A real Solana network fee is a fraction of a cent; Sow2Grow shows a flat ~$0.01 so the number at checkout is never an understatement.',
  },
  {
    id: 'paypal',
    label: 'PayPal — debit / credit card or PayPal balance',
    feePct: [3.49, 3.49],
    feeFixed: 0.49,
    note: 'PayPal fee (3.49% + $0.49) is added to your total. The sower receives the full amount.',
    explainer:
      'Pay with any Visa, Mastercard, Amex, or Discover card — no PayPal account required — or with your PayPal balance. PayPal charges 3.49% + $0.49 per transaction, and Sow2Grow adds it to your total so the sower always receives 100% of the base amount they set.',
  },
];

export interface FeeQuote {
  minFee: number;
  maxFee: number;
  /** "$0.04 – $0.10" style preview, currency-agnostic prefix. */
  display: string;
}

/** Same rounding the server uses for percent-based processor fees (ceil to the cent — a fee estimate must never understate). */
const ceil2 = (n: number) => Math.ceil((n - Number.EPSILON) * 100) / 100;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function quoteFee(
  provider: PayoutProviderId,
  amount: number,
  currencySymbol: string = '$'
): FeeQuote {
  const info = PAYOUT_PROVIDERS.find((p) => p.id === provider);
  if (!info || !Number.isFinite(amount) || amount <= 0) {
    return { minFee: 0, maxFee: 0, display: `${currencySymbol}0.00` };
  }
  // ceil2 on each bound, matching computeBuyerFee server-side -- a preview
  // that rounds down where the server rounds up shows a fee (and total) one
  // cent below the real charge.
  const minFee = ceil2((amount * info.feePct[0]) / 100 + info.feeFixed);
  const maxFee = ceil2((amount * info.feePct[1]) / 100 + info.feeFixed);
  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;
  return {
    minFee,
    maxFee,
    display: minFee === maxFee ? fmt(minFee) : `${fmt(minFee)} – ${fmt(maxFee)}`,
  };
}

/**
 * Exact client-side mirror of the server's computeBuyerFee
 * (supabase/functions/_shared/paypal/fees.ts) at its production defaults:
 * paypal ceil2(base * 3.49% + $0.49), solana flat $0.01, balance free.
 * Used wherever the UI must show the precise amount the server will
 * charge (e.g. ConfirmBestowModal's confirm button) rather than a
 * headline range. Kept in lockstep by src/test/platform-fee-drift.test.ts.
 */
export function computeBuyerFeeExact(
  provider: PayoutProviderId,
  base: number,
): { base: number; fee: number; total: number } {
  const safeBase = round2(Number.isFinite(base) && base > 0 ? base : 0);
  if (provider === 'paypal') {
    const fee = ceil2(safeBase * 0.0349 + 0.49);
    return { base: safeBase, fee, total: round2(safeBase + fee) };
  }
  if (provider === 'solana') {
    return { base: safeBase, fee: 0.01, total: round2(safeBase + 0.01) };
  }
  return { base: safeBase, fee: 0, total: safeBase }; // balance
}

export function getProvider(id: PayoutProviderId): PayoutProviderInfo | undefined {
  return PAYOUT_PROVIDERS.find((p) => p.id === id);
}
