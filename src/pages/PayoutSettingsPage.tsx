import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Star, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AddNowPaymentsWallet from '@/components/payouts/AddNowPaymentsWallet';
import AddPaypalEmail from '@/components/payouts/AddPaypalEmail';

/**
 * Sower payout-method settings.
 *
 * Lets sowers add NOWPayments crypto wallets and/or PayPal emails that
 * incoming bestowals will pay out to. Routed at /settings/payouts.
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
}

const NOWPAY_TYPE = 'nowpayments_crypto';
const PAYPAL_TYPE = 'paypal_email';

export default function PayoutSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [activeTab, setActiveTab] = useState<'crypto' | 'paypal'>('crypto');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('id, user_id, wallet_type, wallet_address, payout_currency, network, is_primary, is_active, verified_at, verification_method' as any)
        .eq('user_id', user.id)
        .in('wallet_type', [NOWPAY_TYPE, PAYPAL_TYPE])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWallets((data ?? []) as any as WalletRow[]);
    } catch (e: any) {
      console.error('PayoutSettings load error', e);
      toast.error(e?.message ?? 'Failed to load payout wallets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

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

  const cryptoWallets = wallets.filter((w) => w.wallet_type === NOWPAY_TYPE);
  const paypalWallets = wallets.filter((w) => w.wallet_type === PAYPAL_TYPE);

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground text-sm">
          Choose where bestowals are paid out. You bear your chosen processor&apos;s payout fee.
        </p>
      </div>

      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please sign in to manage payout methods.</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="crypto">Crypto (NOWPayments)</TabsTrigger>
          <TabsTrigger value="paypal">PayPal</TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="space-y-4 mt-4">
          <WalletList
            title="Your NOWPayments wallets"
            loading={loading}
            rows={cryptoWallets}
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
  onSetPrimary,
  onRemove,
  emptyText,
}: {
  title: string;
  loading: boolean;
  rows: WalletRow[];
  onSetPrimary: (r: WalletRow) => void;
  onRemove: (r: WalletRow) => void;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Set one as primary to make it your default payout destination.</CardDescription>
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
