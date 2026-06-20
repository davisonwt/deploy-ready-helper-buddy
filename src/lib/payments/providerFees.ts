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

export interface PayoutProviderInfo {
  id: PayoutProviderId;
  label: string;
  /** Percent fee range [min, max], inclusive. */
  feePct: [number, number];
  /** Short note shown under the label. */
  note: string;
  /** Long-form explainer for the onboarding/settings page. */
  explainer: string;
}

export const PAYOUT_PROVIDERS: PayoutProviderInfo[] = [
  {
    id: 'nowpayments',
    label: 'NOWPayments (crypto, USDC on Solana)',
    feePct: [0.4, 1.0],
    note: '≈ 0.4% – 1% per payout. You pay this, not Sow2Grow.',
    explainer:
      'NOWPayments is the cheapest option. USDC on Solana is the only payout rail currently funded by Sow2Grow, so we recommend choosing it. Other networks may fail at payout time until they are funded.',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    feePct: [5.7, 8.0],
    note: '≈ 5.7% – 8% per payout. You pay this, not Sow2Grow.',
    explainer:
      'PayPal is simpler if you already have an account, but the fee is much higher. Sow2Grow does not absorb it — it comes out of what you receive.',
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
  const minFee = (amount * info.feePct[0]) / 100;
  const maxFee = (amount * info.feePct[1]) / 100;
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
