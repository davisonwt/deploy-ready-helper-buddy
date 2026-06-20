import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, ArrowUpRight, ArrowDownLeft, PiggyBank, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { PayoutProviderId, quoteFee } from '@/lib/payments/providerFees';

interface SowerBalance {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
}

interface WalletRow {
  wallet_type: string;
  wallet_address: string;
  payout_currency: string | null;
  network: string | null;
  verified_at: string | null;
}

interface TopupRow {
  id: string;
  provider: string;
  amount: number;
  fee_amount: number;
  currency: string;
  status: string;
  created_at: string;
  credited_at: string | null;
}

interface BestowalRow {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

interface PayoutRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

type ActivityItem = {
  id: string;
  kind: 'topup' | 'bestowal' | 'payout';
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

function fmt(n: number | null | undefined, ccy = 'USD') {
  const v = Number(n ?? 0);
  return `${ccy === 'USD' ? '$' : ''}${v.toFixed(2)}${ccy !== 'USD' ? ' ' + ccy : ''}`;
}

export default function MyWalletPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<SowerBalance | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [bestowals, setBestowals] = useState<BestowalRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  // Top-up form
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');
  const [amount, setAmount] = useState<string>('25');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [bal, wal, tops, bests, pays] = await Promise.all([
      supabase.from('sower_balances').select('available_balance, pending_balance, total_earned, total_withdrawn, currency').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_wallets').select('wallet_type, wallet_address, payout_currency, network, verified_at').eq('user_id', user.id).eq('is_active', true).order('is_primary', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('topups' as any).select('id, provider, amount, fee_amount, currency, status, created_at, credited_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('bestowals').select('id, amount, currency, payment_status, created_at').eq('bestower_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('sower_payouts').select('id, amount, currency, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    setBalance((bal.data as SowerBalance | null) ?? { available_balance: 0, pending_balance: 0, total_earned: 0, total_withdrawn: 0, currency: 'USD' });
    setWallet(wal.data as WalletRow | null);
    setTopups(((tops.data as any) ?? []) as TopupRow[]);
    setBestowals(((bests.data as any) ?? []) as BestowalRow[]);
    setPayouts(((pays.data as any) ?? []) as PayoutRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const amountNum = Number(amount);
  const feeQuote = useMemo(
    () => (Number.isFinite(amountNum) && amountNum > 0 ? quoteFee(provider, amountNum) : null),
    [provider, amountNum],
  );

  const handleTopup = async () => {
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      toast.error('Enter an amount of at least $1.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-wallet-topup', {
        body: {
          provider,
          amount: amountNum,
          payCurrency: 'usdcsol',
          redirectBaseUrl: window.location.origin,
        },
      });
      if (error) throw error;
      const url = (data as any)?.invoiceUrl ?? (data as any)?.approveUrl;
      if (!url) throw new Error('No payment URL returned.');
      window.location.href = url;
    } catch (err: any) {
      console.error('topup failed', err);
      toast.error(err?.message ?? 'Top-up failed.');
      setSubmitting(false);
    }
  };

  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [
      ...topups.map((t) => ({ id: 't:' + t.id, kind: 'topup' as const, amount: Number(t.amount), currency: t.currency, status: t.status, created_at: t.created_at })),
      ...bestowals.map((b) => ({ id: 'b:' + b.id, kind: 'bestowal' as const, amount: Number(b.amount), currency: b.currency, status: b.payment_status, created_at: b.created_at })),
      ...payouts.map((p) => ({ id: 'p:' + p.id, kind: 'payout' as const, amount: Number(p.amount), currency: p.currency, status: p.status, created_at: p.created_at })),
    ];
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return items.slice(0, 30);
  }, [topups, bestowals, payouts]);

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const ccy = balance?.currency ?? 'USD';
  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <header className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">My Wallet</h1>
          <p className="text-sm text-muted-foreground">Your on-platform balance, top-ups, and payout destination.</p>
        </div>
      </header>

      {/* Balance */}
      <Card>
        <CardHeader>
          <CardTitle>On-platform balance</CardTitle>
          <CardDescription>What Sow2Grow holds for you. Top-ups credit here. Payouts withdraw from here.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Available" value={fmt(balance?.available_balance, ccy)} highlight />
          <Stat label="Pending" value={fmt(balance?.pending_balance, ccy)} />
          <Stat label="Total earned" value={fmt(balance?.total_earned, ccy)} />
          <Stat label="Total withdrawn" value={fmt(balance?.total_withdrawn, ccy)} />
        </CardContent>
      </Card>

      {/* Payout destination */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Payout destination</CardTitle>
            <CardDescription>Where Sow2Grow sends your money.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings/payouts"><Settings2 className="h-4 w-4 mr-1" /> Change</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {wallet ? (
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Method:</span> <strong>{wallet.wallet_type === 'paypal_email' ? 'PayPal' : 'NOWPayments (crypto)'}</strong></div>
              <div className="truncate"><span className="text-muted-foreground">Destination:</span> <code className="text-xs">{wallet.wallet_address}</code></div>
              {wallet.payout_currency && (
                <div><span className="text-muted-foreground">Currency:</span> {wallet.payout_currency.toUpperCase()}{wallet.network ? ` on ${wallet.network.toUpperCase()}` : ''}</div>
              )}
              <div className="pt-1">
                {wallet.verified_at
                  ? <Badge variant="secondary">Verified</Badge>
                  : <Badge variant="outline">Unverified</Badge>}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No payout destination set yet. <Link to="/settings/payouts" className="underline">Set one up</Link> so we can send your money out.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Top-up */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5" /> Top up your balance</CardTitle>
          <CardDescription>Add funds to your on-platform balance. The processor fee comes out of what you send — Sow2Grow takes no cut on top-ups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="topup-amount">Amount (USD)</Label>
            <Input
              id="topup-amount"
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
            />
          </div>
          <ProviderPicker value={provider} onChange={setProvider} amount={amountNum || 0} mode="buyer" disabled={submitting} />
          {feeQuote && (
            <div className="text-xs text-muted-foreground">
              Processor fee ≈ <strong>{feeQuote.display}</strong> · You'll be credited <strong>${amountNum.toFixed(2)}</strong>.
            </div>
          )}
          <Button onClick={handleTopup} disabled={submitting || !amountNum || amountNum < 1}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening…</> : 'Continue to payment'}
          </Button>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Top-ups, bestowals you sent, and payouts you received.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {activity.map((item) => (
                <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.kind === 'topup' && <ArrowDownLeft className="h-4 w-4 text-green-500" />}
                    {item.kind === 'bestowal' && <ArrowUpRight className="h-4 w-4 text-blue-500" />}
                    {item.kind === 'payout' && <ArrowUpRight className="h-4 w-4 text-orange-500" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium capitalize">{item.kind}</div>
                      <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{fmt(item.amount, item.currency)}</div>
                    <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
