/**
 * Single source of truth for processor fee ranges shown to users.
 *
 * Used by:
 *  - Payout onboarding (B) — "this is what it costs YOU to receive money"
 *  - Existing-user payout banner copy (C)
 *  - Checkout provider selector (A, when built) — "this is what it costs YOU to send money"
 *
 * Fees here are headline ranges. The exact fee on any individual transaction
 * comes from the provider at invoice/payout time and is persisted on the
 * `bestowals` row (processor_fee_amount / payout_fee_amount).
 */

export type PayoutProviderId = 'nowpayments' | 'paypal';

/**
 * Below this, crypto is not offered as a bestowal option.
 *
 * This is a FEE-ECONOMICS floor, not a decimals fix. NOWPayments' own flat
 * network fee (~0.27 USDC) plus the buyer's exchange's flat withdrawal fee
 * (~0.50 USDC — e.g. VALR) together are 25%+ of a $2 bestowal and ~2.5% of a
 * $20 one; below this line the flat fees dominate the payment. PayPal has no
 * equivalent flat-fee floor at small amounts.
 *
 * It does NOT solve the amount-precision problem — a fixed-rate invoice
 * (see is_fixed_rate in the invoice-creation functions) still quotes an
 * 8-decimal crypto amount at ANY price, including above this floor, and a
 * wallet/exchange that can only send 2 decimals can still underpay and stall
 * the invoice. That's handled separately by CRYPTO_ROUNDING_NOTICE below,
 * shown at the point of redirect to NOWPayments' hosted invoice.
 */
export const MIN_CRYPTO_BESTOWAL_USD = 10;

/**
 * Shown at every redirect to a NOWPayments-hosted invoiceUrl. NOWPayments'
 * own page renders the exact crypto amount to send (full precision, e.g. 8
 * decimals) — a wallet or exchange that can only send fewer decimals must
 * round UP, never down or to-nearest: underpaying by any fraction leaves the
 * invoice stuck Partially_paid; overpaying by a cent still completes it.
 */
export const CRYPTO_ROUNDING_NOTICE =
  "If your wallet or exchange limits decimals, round the amount UP. Overpaying by a cent completes the payment; underpaying by any fraction stalls it.";

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
    id: 'nowpayments',
    label: 'Crypto (USDC on Solana)',
    feePct: [0.4, 1.0],
    feeFixed: 0,
    note: '≈ 0.4% – 1% added to your total. The sower receives the full amount.',
    explainer:
      'Cheapest option. USDC on Solana settles in seconds. The fee is added to your payment so the sower is never short-changed.',
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

export function quoteFee(
  provider: PayoutProviderId,
  amount: number,
  currencySymbol: string = '$'
): FeeQuote {
  const info = PAYOUT_PROVIDERS.find((p) => p.id === provider);
  if (!info || !Number.isFinite(amount) || amount <= 0) {
    return { minFee: 0, maxFee: 0, display: `${currencySymbol}0.00` };
  }
  const minFee = (amount * info.feePct[0]) / 100 + info.feeFixed;
  const maxFee = (amount * info.feePct[1]) / 100 + info.feeFixed;
  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;
  return {
    minFee,
    maxFee,
    display: minFee === maxFee ? fmt(minFee) : `${fmt(minFee)} – ${fmt(maxFee)}`,
  };
}

export function getProvider(id: PayoutProviderId): PayoutProviderInfo | undefined {
  return PAYOUT_PROVIDERS.find((p) => p.id === id);
}
