/**
 * Which payment rails can HONESTLY charge a given listing currency.
 *
 * The rule: a sower who lists R47.99 receives R47.99. A rail that cannot
 * charge rands is not offered for a rand listing -- it is not relabelled,
 * not converted behind the buyer's back, and not shown as a button that
 * fails at the last step. Blocking is the correct outcome; a screen that
 * honestly reads "you will be charged $1,650" for an R1,650 listing is
 * still a broken product.
 *
 * Stage 1 is display only. Nothing here changes what a rail charges once
 * the buyer is through -- it decides what is offered, and says why when
 * something is not.
 */

export type RailId = 'paypal' | 'paystack' | 'solana';

/**
 * PayPal's settlement currencies.
 *
 * ZAR is deliberately absent, and that is not an account setting -- PayPal
 * does not hold or settle rands at all. This list errs on the side of
 * blocking: a currency wrongly left out shows a clear message and is a
 * one-line fix, while a currency wrongly included charges somebody the
 * wrong money. Check against PayPal's own published list before adding.
 */
export const PAYPAL_CURRENCIES = [
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'ILS', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'SEK',
  'SGD', 'THB', 'TWD', 'USD',
] as const;

/**
 * Solana/Phantom settles in USDC, which is a US-dollar token. It can
 * therefore honestly serve a dollar listing and nothing else: sending 1650
 * USDC for an R1,650 listing is the same relabelling in a different coat.
 */
export const SOLANA_CURRENCIES = ['USD'] as const;

/**
 * Paystack is switched off at the user's instruction (2026-09-19).
 *
 * Note for whoever reads this next: the repo's Paystack rail is fully
 * implemented -- paystack-initialize / -webhook / -verify, plus
 * _shared/paystack/*, added in commit ddca1222 -- and no 501 or "Not
 * Implemented" appears anywhere in supabase/functions. It was removed by
 * decision, not because the code is missing. Flip this to true to offer it
 * again; nothing else needs changing.
 */
export const PAYSTACK_ENABLED = false;

export interface RailOffer {
  id: RailId;
  /** Buyer-facing name. */
  label: string;
}

export interface RailBlock {
  id: RailId;
  /**
   * Why, in the buyer's words and naming their currency. Never a code, never
   * "unsupported provider", never a silent absence.
   */
  reason: string;
}

export interface RailAvailability {
  currency: string;
  available: RailOffer[];
  blocked: RailBlock[];
  /** True when nothing can charge this currency -- say so, show no button. */
  none: boolean;
}

const LABELS: Record<RailId, string> = {
  paypal: 'PayPal',
  paystack: 'Card / EFT',
  solana: 'USDC (Phantom)',
};

function supports(list: readonly string[], currency: string): boolean {
  return list.includes(currency);
}

/**
 * What a buyer may be offered for a listing in `currency`.
 *
 * `rails` narrows the set to those a given checkout surface can actually
 * invoke -- the booking path has no Solana branch today, so passing it
 * would advertise something the server cannot start.
 */
export function railsForCurrency(
  currency: string | null | undefined,
  rails: readonly RailId[] = ['paypal', 'paystack', 'solana'],
): RailAvailability {
  const code = (currency ?? '').trim().toUpperCase();
  const available: RailOffer[] = [];
  const blocked: RailBlock[] = [];

  for (const id of rails) {
    if (id === 'paystack') {
      // Off entirely: a rail that is not offered anywhere needs no
      // per-currency explanation, and naming it would only puzzle a buyer
      // who never saw it.
      if (!PAYSTACK_ENABLED) continue;
      available.push({ id, label: LABELS[id] });
      continue;
    }

    if (!/^[A-Z]{3}$/.test(code)) {
      blocked.push({
        id,
        reason: 'This listing has no currency set, so we cannot say what you would be charged.',
      });
      continue;
    }

    if (id === 'paypal') {
      if (supports(PAYPAL_CURRENCIES, code)) available.push({ id, label: LABELS[id] });
      else blocked.push({ id, reason: `PayPal cannot take payments in ${code}.` });
      continue;
    }

    if (id === 'solana') {
      if (supports(SOLANA_CURRENCIES, code)) available.push({ id, label: LABELS[id] });
      else {
        blocked.push({
          id,
          reason: `Phantom pays in USDC, which is US dollars, so it cannot take payments in ${code}.`,
        });
      }
    }
  }

  return { currency: code, available, blocked, none: available.length === 0 };
}

/**
 * The sentence shown when nothing can charge this listing. Plain and
 * specific, never gamified -- the buyer did nothing wrong and there is
 * nothing for them to fix.
 */
export function noRailMessage(currency: string | null | undefined): string {
  const code = (currency ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return 'This listing has no currency set, so it cannot take payments yet. Please ask the sower to set one.';
  }
  return `There is no way to pay for this listing in ${code} yet. None of our payment methods can charge ${code}, and we will not convert the price behind your back. Please contact the sower.`;
}
