/**
 * Money display for Sleeping Seeds listings.
 *
 * A listing's rates are shown in the listing's OWN currency and are never
 * converted. There is no exchange rate anywhere in this file and no second
 * figure in brackets. A truck priced in Kenyan shillings reads in Kenyan
 * shillings to every viewer on earth.
 *
 * Checkout is a separate matter: the existing booking path charges in USD
 * on the PayPal branch and ZAR on the Paystack branch. That mismatch is
 * disclosed to the buyer at the booking step rather than papered over with
 * a converted price. See PAYMENT_CURRENCY_NOTE below.
 */

/**
 * Formats an amount in its own currency, using the viewer's locale only for
 * grouping and decimal marks. The currency itself never changes.
 */
export function formatNativeAmount(amount: number, currency: string, locale?: string): string {
  const code = (currency || '').toUpperCase();
  const loc = locale
    ?? (typeof navigator !== 'undefined' ? navigator.language : undefined)
    ?? 'en';

  if (!/^[A-Z]{3}$/.test(code)) return amount.toFixed(2);

  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    // An unknown or unsupported code still has to render honestly.
    try {
      return new Intl.NumberFormat(loc, { style: 'currency', currency: code }).format(amount);
    } catch {
      return `${code} ${amount.toFixed(2)}`;
    }
  }
}

/**
 * What the buyer is told at the booking step, so the charge currency is
 * never a surprise. The listing price stays in its own currency above it.
 */
export function paymentCurrencyNote(provider: 'paypal' | 'paystack' | null | undefined): string {
  if (provider === 'paystack') return 'Payment is processed in ZAR.';
  return 'Payment is processed in USD.';
}

/**
 * Shown when the listing currency differs from the charge currency.
 *
 * This wording is deliberately not neutral. The old line read "Rates are
 * shown in ZAR. Payment is processed in USD", which describes the situation
 * accurately and therefore makes it sound intended. It is not: the charge
 * currency does not follow the listing, so the guest's card is debited in a
 * different currency from the one they agreed to, at a rate neither they nor
 * the host sets. Until the rails carry the listing's own currency, a guest
 * is entitled to know the number on their statement may not match the number
 * they just read.
 */
export function paymentCurrencyNoteFor(
  listingCurrency: string,
  provider: 'paypal' | 'paystack' | null | undefined,
): string {
  const charge = provider === 'paystack' ? 'ZAR' : 'USD';
  const listing = (listingCurrency || '').toUpperCase();
  if (listing === charge) return `You will be charged in ${charge}.`;
  return `This listing is priced in ${listing}, but your card will be charged `
    + `in ${charge}. The amount is converted at your bank's rate, so what you `
    + `pay may differ from the ${listing} price shown.`;
}
