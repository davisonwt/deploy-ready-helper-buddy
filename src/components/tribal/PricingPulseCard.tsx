/**
 * PricingPulseCard — compact "My Garden" widget that invokes Sage the
 * Pricing Oracle for a quick read on how the member's seeds compare to
 * tribe medians and local-market fill-rates.
 * Ambassador-only (soft upsell on 402).
 */
import React, { useState, useCallback } from 'react';
import { Coins, RefreshCw, Lock, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface PriceRow {
  orchard_id: string;
  title: string;
  current_price: number;
  currency: string;
  tribe_median: number | null;
  signal: 'undervalued' | 'fair' | 'overvalued' | 'unknown';
  suggested_price?: number | null;
}

interface Props { theme?: DashboardTheme }

const signalIcon = (s: PriceRow['signal']) => {
  if (s === 'undervalued') return <ArrowUpRight className="h-3 w-3 text-emerald-600" />;
  if (s === 'overvalued') return <ArrowDownRight className="h-3 w-3 text-amber-600" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export const PricingPulseCard: React.FC<Props> = ({ theme }) => {
  const [data, setData] = useState<PriceRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsAmb, setNeedsAmb] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setNeedsAmb(false);
    try {
      const { data: res, error } = await supabase.functions.invoke('agent-sage-pricing', {
        body: { mode: 'compare', limit: 5 },
      });
      if (error) {
        const msg = (error as any)?.message ?? '';
        if (msg.toLowerCase().includes('ambassador')) { setNeedsAmb(true); return; }
        throw error;
      }
      setData((res?.rows ?? res?.data ?? []) as PriceRow[]);
    } catch (e: any) {
      setError(e?.message ?? 'Sage could not respond');
    } finally { setLoading(false); }
  }, []);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 bg-violet-500/15">
            <Coins className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Sage's Pricing Pulse 🔮</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Tribe vs. local-market signals
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-[11px]">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {data ? 'Refresh' : 'Scan'}
        </Button>
      </header>

      {needsAmb ? (
        <Link to="/become-ambassador" className="block rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 p-3 text-center">
          <Lock className="h-4 w-4 text-violet-600 mx-auto mb-1" />
          <p className="text-xs font-semibold">Sage is an Ambassador Orchard Companion ($5/mo)</p>
          <p className="text-[10px] text-muted-foreground">Tap to unlock pricing intelligence.</p>
        </Link>
      ) : error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : !data ? (
        <p className="text-[11px] text-muted-foreground italic">
          Tap <span className="font-semibold">Scan</span> to let Sage compare your prices.
        </p>
      ) : data.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No comparable seeds yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 4).map((r) => (
            <li key={r.orchard_id} className="flex items-center gap-2 text-[12px]">
              {signalIcon(r.signal)}
              <span className="truncate flex-1 font-medium">{r.title}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.currency} {r.current_price.toFixed(0)}
              </span>
              {r.tribe_median != null && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  med {r.tribe_median.toFixed(0)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
