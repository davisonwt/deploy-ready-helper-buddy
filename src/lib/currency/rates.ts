// App-wide currency conversion, reading public.exchange_rates (refreshed
// hourly by the refresh-exchange-rates cron; see
// 20260903120000_exchange_rates.sql). Most money columns (bestowals.*,
// product_bestowals.*, books_income.amount, auto-synced expenses.amount)
// are stored in USD, and convertFromUsd/formatConverted below is the
// USD -> display-currency path for those. Books' own manually-entered
// rows (expenses.amount, invoices.amount) are stored in the business's
// own currency instead (companies.currency, alongside a per-row
// `currency` column) -- convertBetween/sumConverted handle that general
// any-currency-to-any-currency case, used by src/lib/books/currency.tsx.
// A currency missing from the table (API hasn't run yet, or an
// unrecognized code) falls back to showing the figure unconverted (for
// convertFromUsd/formatConverted) or returns null (for convertBetween/
// sumConverted) rather than guessing.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RatesMap = Record<string, number>; // currency code -> units per 1 USD

let cachedRates: RatesMap | null = null;
let cachedAt = 0;
let inflight: Promise<RatesMap> | null = null;
const CACHE_MS = 5 * 60 * 1000; // in-memory only; the table itself changes at most hourly

async function fetchRates(): Promise<RatesMap> {
  const { data, error } = await supabase.from('exchange_rates' as any).select('currency, usd_rate');
  if (error || !data) return cachedRates ?? { USD: 1 };
  const map: RatesMap = {};
  for (const row of data as any[]) map[row.currency] = Number(row.usd_rate);
  if (!map.USD) map.USD = 1;
  cachedRates = map;
  cachedAt = Date.now();
  return map;
}

/** Live exchange rates, cached in-memory across every caller on the page. */
export function useExchangeRates(): { rates: RatesMap; loading: boolean } {
  const [rates, setRates] = useState<RatesMap>(cachedRates ?? { USD: 1 });
  const [loading, setLoading] = useState(!cachedRates);

  useEffect(() => {
    if (cachedRates && Date.now() - cachedAt < CACHE_MS) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (inflight ?? (inflight = fetchRates())).then((r) => {
      inflight = null;
      if (!cancelled) {
        setRates(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, loading };
}

export function convertFromUsd(amountUsd: number, toCurrency: string, rates: RatesMap): number {
  const code = (toCurrency || 'USD').toUpperCase();
  const rate = rates[code];
  if (code === 'USD' || !rate) return amountUsd;
  return amountUsd * rate;
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(2)}`;
  }
}

/** A single converted figure, e.g. "R 480.87". */
export function formatConverted(amountUsd: number, toCurrency: string, rates: RatesMap): string {
  const code = (toCurrency || 'USD').toUpperCase();
  return formatCurrency(convertFromUsd(amountUsd, code, rates), code);
}

/**
 * Converts an amount between ANY two currencies via USD as the pivot,
 * using this same live rates table -- the general case `convertFromUsd`
 * above doesn't cover, needed because Books rows aren't all USD: a
 * manually-entered invoice/expense is stored in the business's own
 * currency (companies.currency), while auto-synced rows (platform
 * purchases, books_income) are stored in USD. Returns null when a rate
 * this conversion needs isn't in the table -- the caller's job is to show
 * a visible "rates unavailable" state, never a wrong number by silently
 * treating the figure as already being in the target currency.
 */
export function convertBetween(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: RatesMap
): number | null {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  if (from === to) return amount;

  let usd: number;
  if (from === 'USD') {
    usd = amount;
  } else {
    const fromRate = rates[from];
    if (!fromRate) return null;
    usd = amount / fromRate;
  }

  if (to === 'USD') return usd;
  const toRate = rates[to];
  if (!toRate) return null;
  return usd * toRate;
}

export interface MoneyRow {
  amount: number;
  currency: string;
}

/**
 * Sums a list of rows stored in mixed currencies into one figure in
 * `toCurrency`, via convertBetween for every row -- the one place Books
 * money gets summed across currencies, so no tab does its own FX math.
 * Null (rather than a partial/best-effort total) the moment any row can't
 * be converted, so a caller never silently drops or mis-sums a row whose
 * rate is missing.
 */
export function sumConverted(rows: MoneyRow[], toCurrency: string, rates: RatesMap): number | null {
  let total = 0;
  for (const row of rows) {
    const converted = convertBetween(row.amount, row.currency, toCurrency, rates);
    if (converted === null) return null;
    total += converted;
  }
  return total;
}

/**
 * Dual display for a point where money actually moves -- checkout, a
 * receipt, a wallet top-up/withdrawal confirmation -- so no one is
 * confused about what was actually charged, e.g. "R 480.87 (≈ $29.93)".
 * A USD-preferring viewer just sees the USD figure once.
 */
export function formatConvertedWithUsd(amountUsd: number, toCurrency: string, rates: RatesMap): string {
  const code = (toCurrency || 'USD').toUpperCase();
  if (code === 'USD') return formatCurrency(amountUsd, 'USD');
  return `${formatConverted(amountUsd, code, rates)} (≈ ${formatCurrency(amountUsd, 'USD')})`;
}
