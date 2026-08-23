import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface XrpRateSource {
  name: string;
  price: number;
}

export interface XrpRateState {
  rate: number | null;
  sources: XrpRateSource[];
  observedAt: string | null;
  isOverride: boolean;
  quoteTtlSeconds: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Live XRP/USD price, median of several independent exchanges.
 *
 * XRP is not a stablecoin, so nothing in Sow2Grow is ever priced in XRP — seeds,
 * the S2G share and whisperer commissions are all USD. This hook exists purely
 * to SHOW what that USD amount is worth in XRP at this moment.
 */
export function useXrpRate(pollMs = 30_000): XrpRateState {
  const [rate, setRate] = useState<number | null>(null);
  const [sources, setSources] = useState<XrpRateSource[]>([]);
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [isOverride, setIsOverride] = useState(false);
  const [quoteTtlSeconds, setQuoteTtlSeconds] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error: fnError } = await supabase.functions.invoke('xrp-quote', {
        body: { mode: 'preview' },
      });
      if (cancelled) return;

      if (fnError || data?.error) {
        setError(data?.error ?? fnError?.message ?? 'Could not load the XRP price.');
        setRate(null);
      } else {
        setError(null);
        setRate(Number(data.rate));
        setSources(Array.isArray(data.sources) ? data.sources : []);
        setObservedAt(data.observed_at ?? null);
        setIsOverride(Boolean(data.is_override));
        if (data.quote_ttl_seconds) setQuoteTtlSeconds(Number(data.quote_ttl_seconds));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return { rate, sources, observedAt, isOverride, quoteTtlSeconds, loading, error, refresh };
}

/** USD -> XRP at a given rate, at ledger precision (6 dp). */
export function usdToXrp(usd: number, rate: number): number {
  return Math.round((usd / rate) * 1e6) / 1e6;
}
