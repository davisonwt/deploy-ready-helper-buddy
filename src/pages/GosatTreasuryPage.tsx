import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Vault, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NPCurrency { currency: string; available: number; pending: number; }
interface PPBalance { currency: string; available: number; total: number; }
interface OrgWallet {
  wallet_name: string;
  label: string;
  blockchain: string;
  address: string;
  sol: number;
  usdc: number;
  ok: boolean;
  error?: string;
}

interface TreasuryResponse {
  generatedAt: string;
  nowpayments: { ok: boolean; error?: string; currencies?: NPCurrency[] };
  paypal: { ok: boolean; error?: string; balances?: PPBalance[] };
  orgWallets?: OrgWallet[];
  reserved: { available: number; pending: number; currency: string };
  summary: {
    custodyTotalUsd: number;
    reservedForSowersUsd: number;
    platformNetUsd: number;
    notice: string;
  };
}

function fmtUsd(n: number) { return `$${(Number(n) || 0).toFixed(2)}`; }

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

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Vault className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Platform Treasury</h1>
            <p className="text-sm text-muted-foreground">Gosat-only view of Sow2Grow's custody balances.</p>
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

      {data?.summary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary (USD-equivalent)</CardTitle>
              <CardDescription>
                Generated {new Date(data.generatedAt).toLocaleString()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Custody total" value={fmtUsd(data.summary.custodyTotalUsd)} />
              <Stat label="Reserved for sowers" value={fmtUsd(data.summary.reservedForSowersUsd)} />
              <Stat label="Platform net (computed)" value={fmtUsd(data.summary.platformNetUsd)} highlight />
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{data.summary.notice}</AlertDescription>
          </Alert>
        </>
      )}

      {/* Organization wallets: Main (s2gholding) + Tithing (s2gbestow) */}
      {data?.orgWallets && data.orgWallets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization wallets</CardTitle>
            <CardDescription>Main & Tithing on-chain balances (live from Solana RPC).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.orgWallets.map((w) => (
              <div key={w.wallet_name} className="rounded-md border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{w.label}</div>
                  <Badge variant={w.ok ? 'secondary' : 'destructive'}>
                    {w.ok ? w.blockchain.toUpperCase() : 'ERROR'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono break-all">{w.address || '—'}</div>
                {w.ok ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="text-xs text-muted-foreground">USDC</div>
                      <div className="text-lg font-semibold">{w.usdc.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">SOL</div>
                      <div className="text-lg font-semibold">{w.sol.toFixed(4)}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-destructive break-all">{w.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NOWPayments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>NOWPayments custody</CardTitle>
              <CardDescription>Live balance from /v1/balance.</CardDescription>
            </div>
            <Badge variant={data?.nowpayments.ok ? 'secondary' : 'destructive'}>
              {data?.nowpayments.ok ? 'OK' : 'Error'}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : data?.nowpayments.ok ? (
              data.nowpayments.currencies && data.nowpayments.currencies.length > 0 ? (
                <ul className="divide-y">
                  {data.nowpayments.currencies.map((c) => (
                    <li key={c.currency} className="py-2 flex justify-between text-sm">
                      <span className="font-mono">{c.currency}</span>
                      <span>
                        <strong>{c.available.toFixed(6)}</strong>
                        {c.pending > 0 && (
                          <span className="text-muted-foreground"> · pending {c.pending.toFixed(6)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No non-zero balances.</p>
              )
            ) : (
              <p className="text-sm text-destructive break-all">{data?.nowpayments.error}</p>
            )}
          </CardContent>
        </Card>

        {/* PayPal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>PayPal custody</CardTitle>
              <CardDescription>Live balance from /v1/reporting/balances.</CardDescription>
            </div>
            <Badge variant={data?.paypal.ok ? 'secondary' : 'destructive'}>
              {data?.paypal.ok ? 'OK' : 'Error'}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : data?.paypal.ok ? (
              data.paypal.balances && data.paypal.balances.length > 0 ? (
                <ul className="divide-y">
                  {data.paypal.balances.map((b) => (
                    <li key={b.currency} className="py-2 flex justify-between text-sm">
                      <span className="font-mono">{b.currency}</span>
                      <span>
                        <strong>{b.available.toFixed(2)}</strong>
                        <span className="text-muted-foreground"> · total {b.total.toFixed(2)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No balances returned.</p>
              )
            ) : (
              <p className="text-sm text-destructive break-all">{data?.paypal.error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>On-platform reserved</CardTitle>
            <CardDescription>Sum of all sower_balances rows. Sow2Grow owes this out to sowers.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Stat label="Available" value={fmtUsd(data.reserved.available)} />
            <Stat label="Pending" value={fmtUsd(data.reserved.pending)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? 'bg-primary/5 border-primary/30' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
