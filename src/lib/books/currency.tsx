import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_BOOKS_CURRENCY, currencySymbol, formatMoney } from './format';
import { useExchangeRates, convertFromUsd } from '@/lib/currency/rates';

interface BooksCurrencyValue {
  /** ISO code of the business's own currency, e.g. ZAR, USD, NGN, EUR. */
  currency: string;
  /**
   * Converts a USD figure (every books_income/expenses row is stored in
   * USD, see _shared/postFinalize/books.ts) into the business's currency
   * and formats it, e.g. formatMoney(29.93) -> "R 480.87" for a ZAR
   * business -- not "ZAR 29.93", which is just the USD number wearing the
   * wrong currency's label.
   */
  fmt: (usdValue: number | string | null | undefined) => string;
  symbol: string;
}

const Ctx = createContext<BooksCurrencyValue>({
  currency: DEFAULT_BOOKS_CURRENCY,
  fmt: (v) => formatMoney(v, DEFAULT_BOOKS_CURRENCY),
  symbol: currencySymbol(DEFAULT_BOOKS_CURRENCY),
});

export function BooksCurrencyProvider({
  currency,
  children,
}: {
  currency: string | null | undefined;
  children: ReactNode;
}) {
  const code = (currency || DEFAULT_BOOKS_CURRENCY).toUpperCase();
  const { rates } = useExchangeRates();
  const value = useMemo<BooksCurrencyValue>(
    () => ({
      currency: code,
      fmt: (v) => {
        const usd = typeof v === 'string' ? Number(v) : v ?? 0;
        const n = Number.isFinite(usd as number) ? (usd as number) : 0;
        return formatMoney(convertFromUsd(n, code, rates), code);
      },
      symbol: currencySymbol(code),
    }),
    [code, rates]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooksCurrency(): BooksCurrencyValue {
  return useContext(Ctx);
}

/** A short, non-exhaustive list — the business can type any ISO code. */
export const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'AUD', 'CAD', 'NZD',
  'INR', 'BRL', 'MXN', 'JPY', 'CNY', 'CHF', 'SEK', 'NOK', 'AED', 'SGD',
];
