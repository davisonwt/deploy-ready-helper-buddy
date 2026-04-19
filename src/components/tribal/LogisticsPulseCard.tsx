/**
 * LogisticsPulseCard — compact "My Garden" widget that lazily invokes
 * Loaf the Logistics Penguin to show sales velocity + reorder hints.
 * Ambassador-only (the agent itself enforces gating; we surface a soft upsell).
 */
import React, { useState, useCallback } from 'react';
import { Package, RefreshCw, Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface VelocityRow {
  orchard_id: string;
  title: string;
  velocity_per_day: number;
  days_until_sold_out: number | null;
  reorder_signal: 'low' | 'medium' | 'high' | 'idle';
}

interface Props { theme?: DashboardTheme }

export const LogisticsPulseCard: React.FC<Props> = ({ theme }) => {
  const [data, setData] = useState<VelocityRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsAmb, setNeedsAmb] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setNeedsAmb(false);
    try {
      const { data: res, error } = await supabase.functions.invoke('agent-loaf-logistics', {
        body: { mode: 'velocity', limit: 5 },
      });
      if (error) {
        const msg = (error as any)?.message ?? '';
        if (msg.toLowerCase().includes('ambassador')) { setNeedsAmb(true); return; }
        throw error;
      }
      setData((res?.rows ?? res?.data ?? []) as VelocityRow[]);
    } catch (e: any) {
      setError(e?.message ?? 'Loaf could not respond');
    } finally { setLoading(false); }
  }, []);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 bg-amber-500/15">
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Loaf's Logistics Pulse 🥖</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Sales velocity & reorder hints
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-[11px]">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {data ? 'Refresh' : 'Scan'}
        </Button>
      </header>

      {needsAmb ? (
        <Link to="/become-ambassador" className="block rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-center">
          <Lock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
          <p className="text-xs font-semibold">Loaf is an Ambassador agent ($5/mo)</p>
          <p className="text-[10px] text-muted-foreground">Tap to unlock logistics intelligence.</p>
        </Link>
      ) : error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : !data ? (
        <p className="text-[11px] text-muted-foreground italic">
          Tap <span className="font-semibold">Scan</span> to let Loaf check your seed velocities.
        </p>
      ) : data.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No active seeds with sales yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 4).map((r) => {
            const tone =
              r.reorder_signal === 'high' ? 'text-red-600 bg-red-500/10' :
              r.reorder_signal === 'medium' ? 'text-amber-600 bg-amber-500/10' :
              r.reorder_signal === 'low' ? 'text-emerald-600 bg-emerald-500/10' :
              'text-muted-foreground bg-muted';
            return (
              <li key={r.orchard_id} className="flex items-center gap-2 text-[12px]">
                <TrendingUp className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 font-medium">{r.title}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.velocity_per_day.toFixed(1)}/d
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${tone}`}>
                  {r.reorder_signal}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
