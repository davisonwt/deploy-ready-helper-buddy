import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_BOOKS_CURRENCY, currencySymbol, formatMoney } from './format';
import { useExchangeRates, convertFromUsd, convertBetween, sumConverted, type MoneyRow } from '@/lib/currency/rates';

interface BooksCurrencyValue {
  /** ISO code of the business's own currency, e.g. ZAR, USD, NGN, EUR. */
  currency: string;
  /**
   * Converts a USD figure (books_income and auto-synced expenses/invoices
   * rows are always USD, see _shared/postFinalize/books.ts) into the
   * business's currency and formats it, e.g. formatMoney(29.93) -> "R
   * 480.87" for a ZAR business -- not "ZAR 29.93", which is just the USD
   * number wearing the wrong currency's label.
   *
   * Only safe for figures already known to be USD. A `expenses`/
   * `invoices` row can be stored in ANY currency (each row carries its
   * own `currency` column) -- use `convert`/`sum` for those instead of
   * assuming USD.
   */
  fmt: (usdValue: number | string | null | undefined) => string;
  symbol: string;
  /** True while the live rates table is still being fetched. */
  loading: boolean;
  /**
   * Converts one amount from its OWN stored currency into the business's
   * currency -- the one place that does this math, used everywhere a
   * Books row (an expense, invoice, or income entry) is displayed or
   * summed, so no tab re-derives it. Returns null when the rate needed
   * for this conversion isn't available; callers must show a visible
   * "rates unavailable" state rather than guess or fall back to an
   * unconverted (wrong) number.
   */
  convert: (amount: number, fromCurrency: string) => number | null;
  /** convert(), formatted -- or null when the rate is unavailable. */
  fmtConverted: (amount: number, fromCurrency: string) => string | null;
  /**
   * Sums a list of rows stored in mixed currencies (each row is its own
   * {amount, currency}) into one business-currency total. Null the
   * moment any row's currency can't be converted -- never a partial or
   * wrong total.
   */
  sum: (rows: MoneyRow[]) => number | null;
  /** Formats a value ALREADY in the business's currency -- no conversion. */
  format: (amount: number) => string;
}

const noRates = {};

const Ctx = createContext<BooksCurrencyValue>({
  currency: DEFAULT_BOOKS_CURRENCY,
  fmt: (v) => formatMoney(v, DEFAULT_BOOKS_CURRENCY),
  symbol: currencySymbol(DEFAULT_BOOKS_CURRENCY),
  loading: false,
  convert: (amount, fromCurrency) => convertBetween(amount, fromCurrency, DEFAULT_BOOKS_CURRENCY, noRates),
  fmtConverted: (amount, fromCurrency) => {
    const c = convertBetween(amount, fromCurrency, DEFAULT_BOOKS_CURRENCY, noRates);
    return c === null ? null : formatMoney(c, DEFAULT_BOOKS_CURRENCY);
  },
  sum: (rows) => sumConverted(rows, DEFAULT_BOOKS_CURRENCY, noRates),
  format: (amount) => formatMoney(amount, DEFAULT_BOOKS_CURRENCY),
});

export function BooksCurrencyProvider({
  currency,
  children,
}: {
  currency: string | null | undefined;
  children: ReactNode;
}) {
  const code = (currency || DEFAULT_BOOKS_CURRENCY).toUpperCase();
  const { rates, loading } = useExchangeRates();
  const value = useMemo<BooksCurrencyValue>(
    () => ({
      currency: code,
      fmt: (v) => {
        const usd = typeof v === 'string' ? Number(v) : v ?? 0;
        const n = Number.isFinite(usd as number) ? (usd as number) : 0;
        return formatMoney(convertFromUsd(n, code, rates), code);
      },
      symbol: currencySymbol(code),
      loading,
      convert: (amount, fromCurrency) => convertBetween(amount, fromCurrency, code, rates),
      fmtConverted: (amount, fromCurrency) => {
        const c = convertBetween(amount, fromCurrency, code, rates);
        return c === null ? null : formatMoney(c, code);
      },
      sum: (rows) => sumConverted(rows, code, rates),
      format: (amount) => formatMoney(amount, code),
    }),
    [code, rates, loading]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooksCurrency(): BooksCurrencyValue {
  return useContext(Ctx);
}

/** Visible label for a converted figure whose rate isn't available yet/at all. */
export const RATES_UNAVAILABLE = 'Rates unavailable';

/**
 * Renders a converted (possibly null) figure for display: the formatted
 * amount, "…" while rates are still loading, or RATES_UNAVAILABLE once
 * loading has finished and the conversion still can't be done -- the one
 * place that decision is made, so no tab writes its own loading/missing
 * fallback text.
 */
export function moneyOrUnavailable(formatted: string | null, loading: boolean): string {
  if (formatted !== null) return formatted;
  return loading ? '…' : RATES_UNAVAILABLE;
}

/** A short, non-exhaustive list — the business can type any ISO code. */
export const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'AUD', 'CAD', 'NZD',
  'INR', 'BRL', 'MXN', 'JPY', 'CNY', 'CHF', 'SEK', 'NOK', 'AED', 'SGD',
];
