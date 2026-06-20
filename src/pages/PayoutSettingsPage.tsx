import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Star, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AddNowPaymentsWallet from '@/components/payouts/AddNowPaymentsWallet';
import AddPaypalEmail from '@/components/payouts/AddPaypalEmail';
import { PAYOUT_PROVIDERS } from '@/lib/payments/providerFees';

/**
 * Sower payout-method settings.
 *
 * Lets sowers add NOWPayments crypto wallets and/or PayPal emails that
 * incoming bestowals will pay out to. Routed at /settings/payouts.
 *
 * Tiebreaker (mirrors supabase/functions/_shared/resolveSowerPayout.ts):
 *   1. profiles.preferred_payout_method matches wallet_type
 *   2. is_primary = true
 *   3. most recently updated
 */

interface WalletRow {
  id: string;
  user_id: string;
  wallet_type: string;
  wallet_address: string;
  payout_currency: string | null;
  network: string | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  verified_at: string | null;
  verification_method: string | null;
  updated_at: string | null;
}

const NOWPAY_TYPE = 'nowpayments_crypto';
const PAYPAL_TYPE = 'paypal_email';

type PreferredRail = typeof NOWPAY_TYPE | typeof PAYPAL_TYPE | null;

export default function PayoutSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [preferred, setPreferred] = useState<PreferredRail>(null);
  const [savingPreferred, setSavingPreferred] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'paypal'>('crypto');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [walletsRes, profileRes] = await Promise.all([
        supabase
          .from('user_wallets')
          .select(
            'id, user_id, wallet_type, wallet_address, payout_currency, network, is_primary, is_active, verified_at, verification_method, updated_at' as any
          )
          .eq('user_id', user.id)
          .in('wallet_type', [NOWPAY_TYPE, PAYPAL_TYPE])
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('preferred_payout_method' as any)
          .eq('id', user.id)
          .maybeSingle(),
      ]);
      if (walletsRes.error) throw walletsRes.error;
      setWallets((walletsRes.data ?? []) as any as WalletRow[]);
      const pref = (profileRes.data as any)?.preferred_payout_method ?? null;
      setPreferred(pref === NOWPAY_TYPE || pref === PAYPAL_TYPE ? pref : null);
    } catch (e: any) {
      console.error('PayoutSettings load error', e);
      toast.error(e?.message ?? 'Failed to load payout wallets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const cryptoWallets = useMemo(
    () => wallets.filter((w) => w.wallet_type === NOWPAY_TYPE),
    [wallets]
  );
  const paypalWallets = useMemo(
    () => wallets.filter((w) => w.wallet_type === PAYPAL_TYPE),
    [wallets]
  );

  const hasCrypto = cryptoWallets.some((w) => w.is_active !== false);
  const hasPaypal = paypalWallets.some((w) => w.is_active !== false);

  /** Mirrors resolveSowerPayout.ts. Returns the wallet that would actually receive the next payout. */
  const activeDefaultWalletId = useMemo(() => {
    const candidates = wallets.filter((w) => w.is_active !== false && !!w.wallet_address);
    if (candidates.length === 0) return null;
    const scored = candidates.map((w) => ({
      w,
      pref: preferred && w.wallet_type === preferred ? 1 : 0,
      primary: w.is_primary ? 1 : 0,
      updated: w.updated_at ? new Date(w.updated_at).getTime() : 0,
    }));
    scored.sort(
      (a, b) => b.pref - a.pref || b.primary - a.primary || b.updated - a.updated
    );
    return scored[0]?.w.id ?? null;
  }, [wallets, preferred]);

  const updatePreferred = async (next: PreferredRail) => {
    if (!user) return;
    setSavingPreferred(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_payout_method: next } as any)
        .eq('id', user.id);
      if (error) throw error;
      setPreferred(next);
      toast.success(
        next === null
          ? 'Cleared preferred rail — falling back to primary'
          : `Preferred rail set to ${next === PAYPAL_TYPE ? 'PayPal' : 'Crypto (NOWPayments)'}`
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to update preference');
    } finally {
      setSavingPreferred(false);
    }
  };

  const setPrimary = async (row: WalletRow) => {
    if (!user) return;
    try {
      // Clear current primary for this wallet_type, then set this one.
      const { error: clearErr } = await supabase
        .from('user_wallets')
        .update({ is_primary: false } as any)
        .eq('user_id', user.id)
        .eq('wallet_type', row.wallet_type);
      if (clearErr) throw clearErr;

      const { error } = await supabase
        .from('user_wallets')
        .update({ is_primary: true } as any)
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Primary payout wallet updated');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to set primary');
    }
  };

  const removeWallet = async (row: WalletRow) => {
    if (!user) return;
    if (!confirm('Remove this payout method?')) return;
    try {
      const { error } = await supabase.from('user_wallets').delete().eq('id', row.id);
      if (error) throw error;
      toast.success('Payout method removed');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to remove');
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground text-sm">
          Choose where bestowals are paid out. <strong>You pay your chosen processor&apos;s fee, not Sow2Grow.</strong>
        </p>
        <ul className="mt-2 text-xs text-muted-foreground space-y-1">
          {PAYOUT_PROVIDERS.map((p) => (
            <li key={p.id}>
              <span className="font-medium text-foreground">{p.label}:</span> {p.note}
            </li>
          ))}
        </ul>
      </div>

      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please sign in to manage payout methods.</AlertDescription>
        </Alert>
      )}

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Preferred payout rail
            </CardTitle>
            <CardDescription>
              When you have both a crypto wallet and a PayPal email configured, payouts go to
              your preferred rail&apos;s primary wallet. If no preference is set, we use the most
              recently updated primary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={preferred ?? 'auto'}
              onValueChange={(v) =>
                updatePreferred(v === 'auto' ? null : (v as PreferredRail))
              }
              disabled={savingPreferred || loading}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={NOWPAY_TYPE} id="pref-crypto" disabled={!hasCrypto} />
                <Label htmlFor="pref-crypto" className={!hasCrypto ? 'text-muted-foreground' : ''}>
                  Crypto (NOWPayments) {!hasCrypto && <span className="text-xs">— add a wallet first</span>}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={PAYPAL_TYPE} id="pref-paypal" disabled={!hasPaypal} />
                <Label htmlFor="pref-paypal" className={!hasPaypal ? 'text-muted-foreground' : ''}>
                  PayPal {!hasPaypal && <span className="text-xs">— add a PayPal email first</span>}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auto" id="pref-auto" />
                <Label htmlFor="pref-auto">Auto (use my most recent primary)</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="crypto">
            Crypto (NOWPayments)
            {preferred === NOWPAY_TYPE && <Badge className="ml-2 text-[10px]">Preferred</Badge>}
          </TabsTrigger>
          <TabsTrigger value="paypal">
            PayPal
            {preferred === PAYPAL_TYPE && <Badge className="ml-2 text-[10px]">Preferred</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="space-y-4 mt-4">
          <WalletList
            title="Your NOWPayments wallets"
            loading={loading}
            rows={cryptoWallets}
            activeDefaultId={activeDefaultWalletId}
            onSetPrimary={setPrimary}
            onRemove={removeWallet}
            emptyText="No crypto payout wallets yet."
          />
          <AddNowPaymentsWallet onSaved={load} />
        </TabsContent>

        <TabsContent value="paypal" className="space-y-4 mt-4">
          <WalletList
            title="Your PayPal emails"
            loading={loading}
            rows={paypalWallets}
            activeDefaultId={activeDefaultWalletId}
            onSetPrimary={setPrimary}
            onRemove={removeWallet}
            emptyText="No PayPal payout emails yet."
          />
          <AddPaypalEmail onSaved={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WalletList({
  title,
  loading,
  rows,
  activeDefaultId,
  onSetPrimary,
  onRemove,
  emptyText,
}: {
  title: string;
  loading: boolean;
  rows: WalletRow[];
  activeDefaultId: string | null;
  onSetPrimary: (r: WalletRow) => void;
  onRemove: (r: WalletRow) => void;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          Set one as primary within this rail. The <em>Active default</em> badge marks the wallet
          that will actually receive the next payout, based on your preferred rail above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-md border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm truncate">{r.wallet_address}</span>
                    {r.payout_currency && (
                      <Badge variant="secondary" className="text-xs">{r.payout_currency}</Badge>
                    )}
                    {r.is_primary && (
                      <Badge className="text-xs"><Star className="w-3 h-3 mr-1" />Primary</Badge>
                    )}
                    {activeDefaultId === r.id && (
                      <Badge className="text-xs bg-primary/15 text-primary border border-primary/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />Active default
                      </Badge>
                    )}
                    {r.verified_at ? (
                      <Badge variant="outline" className="text-xs">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
                {!r.is_primary && (
                  <Button size="sm" variant="outline" onClick={() => onSetPrimary(r)}>
                    Make primary
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => onRemove(r)} aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
