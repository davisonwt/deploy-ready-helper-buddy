// App-wide USD -> display-currency conversion. Every money column in this
// app (expenses.amount, books_income.amount, bestowals.*, product_bestowals.*,
// etc.) is stored in USD -- this is the only place that converts a USD
// figure for display, reading public.exchange_rates (refreshed hourly by
// the refresh-exchange-rates cron; see 20260903120000_exchange_rates.sql).
// A currency missing from the table (API hasn't run yet, or an unrecognized
// code) falls back to showing the USD figure unconverted rather than
// guessing or blocking render.
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
