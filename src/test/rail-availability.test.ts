import { describe, it, expect } from 'vitest';
import {
  railsForCurrency,
  noRailMessage,
  PAYSTACK_ENABLED,
  PAYPAL_CURRENCIES,
} from '@/lib/payments/railAvailability';

describe('Paystack is off everywhere', () => {
  it('is disabled', () => {
    expect(PAYSTACK_ENABLED).toBe(false);
  });

  it.each(['USD', 'ZAR', 'EUR', 'KES'])('is never offered for %s', (currency) => {
    const result = railsForCurrency(currency);
    expect(result.available.map((r) => r.id)).not.toContain('paystack');
    expect(result.blocked.map((r) => r.id)).not.toContain('paystack');
  });
});

describe('ZAR - the domes case', () => {
  const zar = railsForCurrency('ZAR', ['paypal', 'paystack']);

  it('offers no rail at all', () => {
    expect(zar.available).toEqual([]);
    expect(zar.none).toBe(true);
  });

  it('blocks PayPal in the buyer\'s words, naming the currency', () => {
    expect(zar.blocked).toContainEqual({ id: 'paypal', reason: 'PayPal cannot take payments in ZAR.' });
  });

  it('blocks Solana too, because USDC is dollars', () => {
    const withSolana = railsForCurrency('ZAR', ['paypal', 'solana']);
    expect(withSolana.blocked.find((r) => r.id === 'solana')?.reason).toContain('USDC');
    expect(withSolana.none).toBe(true);
  });

  it('explains the dead end without a button', () => {
    expect(noRailMessage('ZAR')).toContain('no way to pay for this listing in ZAR');
    expect(noRailMessage('ZAR')).toContain('will not convert the price');
  });
});

describe('USD - everything that can run, runs', () => {
  it('offers PayPal', () => {
    expect(railsForCurrency('USD', ['paypal']).available.map((r) => r.id)).toEqual(['paypal']);
  });

  it('offers Solana', () => {
    expect(railsForCurrency('USD', ['solana']).available.map((r) => r.id)).toEqual(['solana']);
  });
});

describe('other currencies', () => {
  it.each(['EUR', 'GBP', 'AUD', 'JPY', 'SEK'])('offers PayPal for %s', (currency) => {
    expect(railsForCurrency(currency, ['paypal']).none).toBe(false);
  });

  it.each(['KES', 'NGN', 'INR', 'ZAR', 'ZZZ'])('blocks PayPal for %s', (currency) => {
    const result = railsForCurrency(currency, ['paypal']);
    expect(result.none).toBe(true);
    expect(result.blocked[0].reason).toBe(`PayPal cannot take payments in ${currency}.`);
  });

  it('never lists ZAR as a PayPal currency', () => {
    expect(PAYPAL_CURRENCIES).not.toContain('ZAR');
  });

  it('blocks Solana for every non-dollar currency', () => {
    for (const currency of ['EUR', 'GBP', 'ZAR', 'KES']) {
      expect(railsForCurrency(currency, ['solana']).none).toBe(true);
    }
  });
});

describe('a listing with no currency', () => {
  // 'zzz' is NOT here: it normalises to a well-formed ZZZ, and a
  // well-formed code nobody supports earns the unsupported message,
  // not the missing-currency one.
  it.each([null, undefined, '', 'US', '12'])('offers nothing and says why (%s)', (currency) => {
    const result = railsForCurrency(currency as string | null | undefined, ['paypal', 'solana']);
    expect(result.none).toBe(true);
    expect(result.blocked[0].reason).toContain('no currency set');
  });

  it('has its own dead-end message', () => {
    expect(noRailMessage(null)).toContain('no currency set');
  });
});

describe('currency is normalised, never guessed', () => {
  it('accepts lowercase and surrounding space', () => {
    expect(railsForCurrency('  usd  ', ['paypal']).none).toBe(false);
    expect(railsForCurrency('  usd  ', ['paypal']).currency).toBe('USD');
  });
});
