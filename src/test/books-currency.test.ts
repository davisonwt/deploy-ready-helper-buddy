import { describe, it, expect } from 'vitest';
import { convertBetween, sumConverted, type RatesMap, type MoneyRow } from '@/lib/currency/rates';

// Books rows (invoices.amount, expenses.amount, books_income.amount) are
// stored in whatever currency was on the row at write time -- a manual
// expense/invoice is the business's own currency (companies.currency),
// an auto-synced expense or books_income row is always USD. The rates
// table stores "units of `currency` per 1 USD" (see
// 20260903120000_exchange_rates.sql), so ZAR: 18 means 1 USD = 18 ZAR.
const RATES: RatesMap = { USD: 1, ZAR: 18, EUR: 0.92 };

describe('convertBetween', () => {
  describe('USD business', () => {
    it('leaves a USD row unconverted', () => {
      expect(convertBetween(100, 'USD', 'USD', RATES)).toBe(100);
    });

    it('converts a foreign-currency row (e.g. a ZAR expense) into USD', () => {
      // 1800 ZAR / 18 ZAR-per-USD = 100 USD
      expect(convertBetween(1800, 'ZAR', 'USD', RATES)).toBe(100);
    });
  });

  describe('ZAR business', () => {
    it('leaves a ZAR row unconverted (identity -- no rate lookup needed)', () => {
      expect(convertBetween(500, 'ZAR', 'ZAR', RATES)).toBe(500);
    });

    it('converts a USD row (e.g. books_income, always USD) into ZAR', () => {
      // 100 USD * 18 ZAR-per-USD = 1800 ZAR
      expect(convertBetween(100, 'USD', 'ZAR', RATES)).toBe(1800);
    });

    it('converts a third-currency row (e.g. a EUR expense) into ZAR via the USD pivot', () => {
      // 92 EUR -> 92/0.92 = 100 USD -> 100*18 = 1800 ZAR
      expect(convertBetween(92, 'EUR', 'ZAR', RATES)).toBe(1800);
    });
  });

  describe('rate missing', () => {
    it('returns null when the source currency has no live rate', () => {
      expect(convertBetween(100, 'GBP', 'ZAR', RATES)).toBeNull();
    });

    it('returns null when the target currency has no live rate', () => {
      expect(convertBetween(100, 'USD', 'GBP', RATES)).toBeNull();
    });

    it('never needs a rate when the row is already in the business currency, even if that currency is missing from the table', () => {
      expect(convertBetween(250, 'NGN', 'NGN', {})).toBe(250);
    });

    it('is unaffected by an empty rates table for a same-currency conversion', () => {
      expect(convertBetween(100, 'USD', 'USD', {})).toBe(100);
    });
  });

  it('defaults a missing/blank currency code to USD', () => {
    expect(convertBetween(100, '', 'ZAR', RATES)).toBe(1800);
    expect(convertBetween(100, 'USD', '', RATES)).toBe(100);
  });

  it('is case-insensitive on currency codes', () => {
    expect(convertBetween(1800, 'zar', 'usd', RATES)).toBe(100);
  });
});

describe('sumConverted', () => {
  it('sums mixed-currency rows (a USD books_income row + a ZAR expense/invoice row) into one business-currency total', () => {
    const rows: MoneyRow[] = [
      { amount: 100, currency: 'USD' }, // -> 1800 ZAR
      { amount: 500, currency: 'ZAR' }, // -> 500 ZAR (identity)
    ];
    expect(sumConverted(rows, 'ZAR', RATES)).toBe(2300);
  });

  it('sums an all-USD business correctly (identity throughout)', () => {
    const rows: MoneyRow[] = [
      { amount: 40, currency: 'USD' },
      { amount: 60, currency: 'USD' },
    ];
    expect(sumConverted(rows, 'USD', RATES)).toBe(100);
  });

  it('returns null -- never a partial or wrong total -- when any row cannot be converted', () => {
    const rows: MoneyRow[] = [
      { amount: 100, currency: 'USD' }, // convertible
      { amount: 50, currency: 'GBP' }, // rate missing
    ];
    expect(sumConverted(rows, 'ZAR', RATES)).toBeNull();
  });

  it('sums an empty list to 0', () => {
    expect(sumConverted([], 'ZAR', RATES)).toBe(0);
  });
});
