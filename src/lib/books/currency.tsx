import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_BOOKS_CURRENCY, currencySymbol, formatMoney } from './format';

interface BooksCurrencyValue {
  /** ISO code of the business's own currency, e.g. ZAR, USD, NGN, EUR. */
  currency: string;
  /** Formats a value in the business's currency. */
  fmt: (value: number | string | null | undefined) => string;
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
  const value = useMemo<BooksCurrencyValue>(
    () => ({
      currency: code,
      fmt: (v) => formatMoney(v, code),
      symbol: currencySymbol(code),
    }),
    [code]
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
