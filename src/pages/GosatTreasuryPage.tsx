import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Vault, AlertTriangle, ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Gosat-only liability view (BOOKKEEPING-PLAN.md section 4). Read-only:
// it observes what S2G holds for others versus what it actually has.

interface Snapshot {
  environment: string;
  generated_at: string;
  held_for_members: {
    owed: { total: number; recipients: number; by_rail: Record<string, number> };
    parked: { total: number; members: number };
    total: number;
  };
  held_for_orchards: { total: number; sower_share: number; s2g_share: number; holdings: number; orchards: number; by_location: Record<string, number> };
  liabilities_total: number;
  s2g_own: { operating_net: number; net: number; opening_balance: number; this_month: number; by_rail: Record<string, number> };
  unrecorded: { solana_processor_fees: number };
  recorded_float: { total: number; movements: number; by_wallet: Record<string, number> };
  swept_to_squad: number;
  aging: { oldest_unpaid_at: string | null; oldest_unpaid_days: number; recipients_over_30d: number; recipients_over_60d: number };
  recipients: Array<{ user_id: string; name: string; type: string; amount: number; rail: string; oldest_row_at: string | null; days_waiting: number }>;
  orchards: Array<{ id: string; title: string; kind: string; sower: string; held: number; target: number; pockets_held: number; pockets_total: number; funded: boolean; days_open: number }>;
  other_environments: Record<string, { owed: number; parked: number; held_for_orchards: number }>;
}

interface WalletBalance { name: string; label: string; address: string; note: string; sol: number; usdc: number; ok: boolean; error?: string; }
interface PerWallet { wallet: string; expected: number; actual: number; difference: number; parts: Record<string, number>; }

interface TreasuryResponse {
  generatedAt: string;
  snapshot: Snapshot;
  devnetSnapshot: Snapshot | null;
  wallets: WalletBalance[];
  paypal: { ok: boolean; environment: 'live' | 'sandbox'; error?: string; balances?: Array<{ currency: string; available: number; total: number }>; availableUsd: number };
  nowpayments: { ok: boolean; error?: string; currencies?: Array<{ currency: string; available: number; pending: number }> };
  assets: { totalUsd: number; walletUsdc: number; paypalUsd: number; paypalCounted: boolean; unreadable: string[] };
  reconciliation: {
    verdict: 'GREEN' | 'RED';
    sentence: string;
    partial: boolean;
    assets: number; liabilities: number; s2g_own: number; unrecorded: number; recorded_float: number;
    expected_assets: number; unexplained: number; tolerance: number; unexplained_beyond_tolerance: boolean; shortfall: number; coverage_ratio: number | null;
    gapComponents: Array<{ label: string; amount: number; unit: string }>;
    perWallet: PerWallet[];
    unplaced: Record<string, number>;
  };
}

function fmtUsd(n: number | null | undefined) { return `$${(Number(n) || 0).toFixed(2)}`; }
const WALLET_LABELS: Record<string, string> = { hot: 'Hot wallet', squad: 'Squad vault', launch: 'Launch Orchard wallet', uplift: 'Uplift Orchard wallet', paypal: 'PayPal' };

export default function GosatTreasuryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('treasury-balances', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.detail ? `${data.error}: ${data.detail}` : data.error);
      setData(data as TreasuryResponse);
    } catch (err: any) {
      console.error('treasury-balances failed', err);
      setError(err?.message ?? 'Failed to load treasury.');
      toast.error('Failed to load treasury.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const snap = data?.snapshot;
  const rec = data?.reconciliation;
  const red = rec?.verdict === 'RED';

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Link>
          </Button>
          <Vault className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Platform Treasury</h1>
            <p className="text-sm text-muted-foreground">What Sow2Grow holds for others, what is its own, and whether the wallets cover it. Read-only.</p>
          </div>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data && <Loader2 className="h-6 w-6 animate-spin" />}

      {snap && rec && (
        <>
          {/* Verdict */}
          <Alert variant={red ? 'destructive' : 'default'} data-testid="treasury-verdict" data-verdict={rec.verdict}>
            {red ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            <AlertDescription className="text-sm">
              <span className="font-semibold mr-2">{rec.verdict}</span>
              {rec.sentence}
              {rec.partial && ' Some balances could not be read, so this verdict is partial.'}
              {data.assets.unreadable.length > 0 && ` Unreadable: ${data.assets.unreadable.join(', ')}.`}
            </AlertDescription>
          </Alert>

          {/* Liability block */}
          <Card>
            <CardHeader>
              <CardTitle>Held versus own (live, USD)</CardTitle>
              <CardDescription>Generated {new Date(data.generatedAt).toLocaleString()}. Test-environment money is excluded and listed separately below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Stat label="Held for members" value={fmtUsd(snap.held_for_members.total)}
                      sub={`owed ${fmtUsd(snap.held_for_members.owed.total)} to ${snap.held_for_members.owed.recipients} · parked balance ${fmtUsd(snap.held_for_members.parked.total)}`} testId="held-for-members" />
                <Stat label={`Held for orchards (${snap.held_for_orchards.orchards})`} value={fmtUsd(snap.held_for_orchards.total)}
                      sub={`sowers ${fmtUsd(snap.held_for_orchards.sower_share)} · S2G share once released ${fmtUsd(snap.held_for_orchards.s2g_share)}`} testId="held-for-orchards" />
                <Stat label="Total liability" value={fmtUsd(snap.liabilities_total)} highlight testId="total-liability" />
                <Stat label="S2G's own, recognised" value={fmtUsd(snap.s2g_own.operating_net)}
                      sub={`this month ${fmtUsd(snap.s2g_own.this_month)} · opening balance ${fmtUsd(snap.s2g_own.opening_balance)}`} testId="s2g-own" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Stat label="Cash on hand" value={fmtUsd(rec.assets)}
                      sub={`wallets ${fmtUsd(data.assets.walletUsdc)} · PayPal ${data.assets.paypalCounted ? fmtUsd(data.assets.paypalUsd) : 'not counted'}`} testId="cash-on-hand" />
                <Stat label="Expected on hand" value={fmtUsd(rec.expected_assets)} sub="liabilities + own + unrecorded + recorded float" />
                <Stat label="Unexplained" value={fmtUsd(rec.unexplained)} sub={`tolerance ${fmtUsd(rec.tolerance)}${rec.unexplained_beyond_tolerance ? ' · beyond tolerance' : ''}`} />
                <Stat label={red ? 'Shortfall' : 'Coverage'} value={red ? fmtUsd(rec.shortfall) : (rec.coverage_ratio == null ? 'n/a' : `${(rec.coverage_ratio * 100).toFixed(0)}%`)} highlight={red} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Expected gap, shown so it is never hidden inside the verdict</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {rec.gapComponents.map((g) => (
                    <li key={g.label} className="flex justify-between gap-4"><span>{g.label}</span><span className="font-mono">{g.unit === 'SOL' ? `${g.amount.toFixed(4)} SOL` : fmtUsd(g.amount)}</span></li>
                  ))}
                  {Object.entries(rec.unplaced).filter(([, v]) => v !== 0).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-4"><span>Cannot be placed in a wallet: {k.replace(/_/g, ' ')}</span><span className="font-mono">{fmtUsd(v)}</span></li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Wallets with expectation */}
          <Card>
            <CardHeader>
              <CardTitle>Wallets</CardTitle>
              <CardDescription>Live mainnet balances next to what the books say should be there.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rec.perWallet.map((pw) => {
                const w = data.wallets.find((x) => x.name === pw.wallet);
                const isPaypal = pw.wallet === 'paypal';
                return (
                  <div key={pw.wallet} className="rounded-md border p-4 space-y-2" data-testid={`wallet-${pw.wallet}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{WALLET_LABELS[pw.wallet] ?? pw.wallet}</div>
                      {isPaypal ? (
                        <Badge variant={data.paypal.environment === 'live' ? 'secondary' : 'destructive'}>
                          {data.paypal.ok ? `PayPal ${data.paypal.environment.toUpperCase()}` : 'PayPal ERROR'}
                        </Badge>
                      ) : (
                        <Badge variant={w?.ok ? 'secondary' : 'destructive'}>{w?.ok ? 'MAINNET' : 'ERROR'}</Badge>
                      )}
                    </div>
                    {!isPaypal && <div className="text-xs text-muted-foreground font-mono break-all">{w?.address || '—'}</div>}
                    {isPaypal && !data.paypal.ok && <p className="text-xs text-destructive break-all">{data.paypal.error}</p>}
                    {!isPaypal && w && !w.ok && <p className="text-xs text-destructive break-all">{w.error}</p>}
                    {isPaypal && data.paypal.ok && data.paypal.environment !== 'live' && (
                      <p className="text-xs text-destructive">Sandbox balance: not counted as cash on hand.</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div><div className="text-xs text-muted-foreground">Actual</div><div className="text-lg font-semibold">{fmtUsd(pw.actual)}</div></div>
                      <div><div className="text-xs text-muted-foreground">Expected</div><div className="text-lg font-semibold">{fmtUsd(pw.expected)}</div></div>
                      <div><div className="text-xs text-muted-foreground">Difference</div><div className={`text-lg font-semibold ${pw.difference < 0 ? 'text-destructive' : ''}`}>{fmtUsd(pw.difference)}</div></div>
                    </div>
                    {!isPaypal && w?.ok && <div className="text-xs text-muted-foreground">{w.sol.toFixed(4)} SOL for gas</div>}
                    <div className="text-xs text-muted-foreground">
                      {Object.entries(pw.parts).filter(([, v]) => v !== 0).map(([k, v]) => `${k.replace(/_/g, ' ')} ${fmtUsd(v)}`).join(' · ') || 'nothing expected here'}
                    </div>
                    {w?.note && <div className="text-xs text-muted-foreground">{w.note}</div>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Who is owed what */}
          <Card>
            <CardHeader>
              <CardTitle>Who is owed what</CardTitle>
              <CardDescription>
                From owed_payout_balances(), the same source the payout run uses.
                Oldest unpaid: {snap.aging.oldest_unpaid_days} day{snap.aging.oldest_unpaid_days === 1 ? '' : 's'}
                {snap.aging.recipients_over_30d > 0 && ` · ${snap.aging.recipients_over_30d} waiting over 30 days`}
                {snap.aging.recipients_over_60d > 0 && ` · ${snap.aging.recipients_over_60d} over 60 days`}.
                Parked S2G Balance ({fmtUsd(snap.held_for_members.parked.total)} across {snap.held_for_members.parked.members}) is listed on /admin/payouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snap.recipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody is owed anything through the pipeline.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr><th className="py-1 pr-3">Recipient</th><th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Owed</th><th className="py-1 pr-3">Rail</th><th className="py-1 pr-3">Waiting</th></tr>
                    </thead>
                    <tbody>
                      {snap.recipients.map((r) => (
                        <tr key={`${r.type}-${r.user_id}`} className="border-t" data-testid="owed-recipient">
                          <td className="py-1 pr-3">{r.name}</td>
                          <td className="py-1 pr-3">{r.type}</td>
                          <td className="py-1 pr-3 font-mono">{fmtUsd(r.amount)}</td>
                          <td className="py-1 pr-3">{r.rail === 'unassigned' ? <Badge variant="destructive">no payout method</Badge> : r.rail}</td>
                          <td className={`py-1 pr-3 ${r.days_waiting > 60 ? 'text-destructive' : r.days_waiting > 30 ? 'text-amber-600' : ''}`}>{r.days_waiting} d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orchards */}
          {snap.orchards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Orchards holding money</CardTitle>
                <CardDescription>Held until each orchard funds. No deadline, so age here is information, not an alarm.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {snap.orchards.map((o) => (
                    <li key={o.id} className="py-2 flex flex-wrap justify-between gap-2">
                      <span>{o.title} <span className="text-muted-foreground">· {o.sower} · {o.days_open} d open</span></span>
                      <span className="font-mono">{fmtUsd(o.held)} / {fmtUsd(o.target)} · {o.pockets_held}/{o.pockets_total} pockets{o.funded ? ' · funded' : ''}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Test environments */}
          {(Object.keys(snap.other_environments ?? {}).length > 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Test money, excluded from every figure above:{' '}
                {Object.entries(snap.other_environments).map(([env, v]) => (
                  <span key={env} className="mr-3">
                    <strong>{env}</strong> owed {fmtUsd(v.owed)} · parked {fmtUsd(v.parked)} · held for orchards {fmtUsd(v.held_for_orchards)}
                  </span>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* NOWPayments legacy, only if it holds something */}
          {data.nowpayments.ok && (data.nowpayments.currencies?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>NOWPayments (legacy)</CardTitle>
                <CardDescription>No live rail writes here any more. Shown because the balance is not zero.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {data.nowpayments.currencies!.map((c) => (
                    <li key={c.currency} className="py-2 flex justify-between text-sm">
                      <span className="font-mono">{c.currency}</span>
                      <span><strong>{c.available.toFixed(6)}</strong>{c.pending > 0 && <span className="text-muted-foreground"> · pending {c.pending.toFixed(6)}</span>}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, highlight, testId }: { label: string; value: string; sub?: string; highlight?: boolean; testId?: string }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? 'bg-primary/5 border-primary/30' : ''}`} data-testid={testId}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
