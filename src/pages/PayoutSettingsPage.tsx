import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Star, Trash2, AlertCircle, CheckCircle2, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ConnectPaypalButton from '@/components/payouts/ConnectPaypalButton';
import CryptoPayoutSettings from '@/components/payouts/CryptoPayoutSettings';
import EarningsPayoutCard from '@/components/payouts/EarningsPayoutCard';
import { SettlementConsentPrompt } from '@/components/payouts/SettlementConsentPrompt';
import { useSettlementConsent } from '@/hooks/useSettlementConsent';

/**
 * Sower payout-method settings — non-custodial model (legal, 2026-09-03).
 *
 * Exactly two rails: a Solana wallet (USDC, one address, shared with
 * profiles.solana_wallet_address so it's the same address everywhere —
 * see CryptoPayoutSettings) and PayPal (connect/email). NOWPayments is
 * gone from this page entirely; see the code comment on `preferred` below
 * for the one place a pre-existing NOWPayments wallet can still matter.
 *
 * Tiebreaker for `preferred` (mirrors supabase/functions/_shared/
 * resolveSowerPayout.ts, used at sale time — not the same routing as the
 * weekly payout-earnings run, which reads payout_network directly):
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

const PAYPAL_TYPE = 'paypal_email';
const SOLANA_TYPE = 'solana_usdc';

type PreferredRail = typeof SOLANA_TYPE | typeof PAYPAL_TYPE | null;

export default function PayoutSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paypalWallets, setPaypalWallets] = useState<WalletRow[]>([]);
  const [preferred, setPreferred] = useState<PreferredRail>(null);
  const [savingPreferred, setSavingPreferred] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const { hasAccepted: consentAccepted, loading: consentLoading, refetch: refetchConsent } = useSettlementConsent();

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
          .eq('wallet_type', PAYPAL_TYPE)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('preferred_payout_method, payout_network, payout_address' as any)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (walletsRes.error) throw walletsRes.error;
      setPaypalWallets((walletsRes.data ?? []) as any as WalletRow[]);
      const pref = (profileRes.data as any)?.preferred_payout_method ?? null;
      setPreferred(pref === SOLANA_TYPE || pref === PAYPAL_TYPE ? pref : null);
      const p = profileRes.data as any;
      setSolanaAddress(p?.payout_network === SOLANA_TYPE && p?.payout_address ? p.payout_address : null);
    } catch (e: any) {
      console.error('PayoutSettings load error', e);
      toast.error(e?.message ?? 'Failed to load payout settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const hasPaypal = paypalWallets.some((w) => w.is_active !== false);
  // Payouts run via PayPal Payouts weekly — a wallet has to be both active
  // AND verified to actually get paid; "Unverified" isn't enough, even
  // though it still shows in the list below.
  const hasVerifiedPaypal = paypalWallets.some((w) => w.is_active !== false && !!w.verified_at);

  /** Mirrors resolveSowerPayout.ts. Returns the PayPal wallet that would receive a sale-time distribution, if PayPal is the active rail. */
  const activeDefaultWalletId = useMemo(() => {
    const candidates = paypalWallets.filter((w) => w.is_active !== false && !!w.wallet_address);
    if (candidates.length === 0) return null;
    const scored = candidates.map((w) => ({
      w,
      pref: preferred === PAYPAL_TYPE ? 1 : 0,
      primary: w.is_primary ? 1 : 0,
      updated: w.updated_at ? new Date(w.updated_at).getTime() : 0,
    }));
    scored.sort((a, b) => b.pref - a.pref || b.primary - a.primary || b.updated - a.updated);
    return scored[0]?.w.id ?? null;
  }, [paypalWallets, preferred]);

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
          : `Preferred rail set to ${next === PAYPAL_TYPE ? 'PayPal' : 'Solana USDC'}`
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
      toast.success('Primary PayPal account updated');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to set primary');
    }
  };

  const removeWallet = async (row: WalletRow) => {
    if (!user) return;
    if (!confirm('Remove this PayPal account?')) return;
    try {
      const { error } = await supabase.from('user_wallets').delete().eq('id', row.id);
      if (error) throw error;
      toast.success('PayPal account removed');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to remove');
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="flex flex-wrap gap-3 mb-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground text-sm">
          Two ways to get paid: a Solana wallet (USDC) or PayPal. Paid automatically when you
          reach $20, or request any time from $1 on Solana.
        </p>
      </div>

      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please sign in to manage payout methods.</AlertDescription>
        </Alert>
      )}

      {user && !consentLoading && consentAccepted === false && (
        <SettlementConsentPrompt onAccepted={refetchConsent} />
      )}

      {user && !loading && !hasVerifiedPaypal && !solanaAddress && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Set up a payout method to get paid.</strong> Connect PayPal or add your
            Solana wallet below — nothing will pay out until one of them is active.
          </AlertDescription>
        </Alert>
      )}

      {user && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your payout rail</CardTitle>
            <CardDescription>
              Whichever one is marked "Active now" is the only one that pays you — only one rail
              pays at a time. Paid automatically when you reach $20, or request any time from $1
              on Solana (PayPal keeps its own $20 minimum — that's PayPal's real per-transfer
              fee, not something we can waive).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-md border p-3">
              <div className="flex items-center gap-2 font-medium">
                PayPal
                {!solanaAddress && hasVerifiedPaypal && (
                  <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/30">
                    Active now
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {solanaAddress
                  ? 'Connected, but not paying you — Solana USDC is your active rail below.'
                  : hasVerifiedPaypal
                    ? 'Connected and verified — this is what pays you today.'
                    : 'Not connected yet — nothing will pay you until you connect PayPal or add a Solana wallet.'}
              </p>
            </div>
            <div className="flex-1 rounded-md border p-3">
              <div className="flex items-center gap-2 font-medium">
                Solana wallet (USDC)
                {solanaAddress && (
                  <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/30">
                    Active now
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {solanaAddress
                  ? 'This is what pays you today — PayPal will not be paid until you switch back.'
                  : 'Not set yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {user && <EarningsPayoutCard />}

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Preferred payout rail
            </CardTitle>
            <CardDescription>
              If you have both PayPal and a Solana wallet configured, payouts go to your
              preferred rail. If no preference is set, we use whichever was set up most recently.
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
                <RadioGroupItem value={SOLANA_TYPE} id="pref-solana" disabled={!solanaAddress} />
                <Label htmlFor="pref-solana" className={!solanaAddress ? 'text-muted-foreground' : ''}>
                  Solana wallet (USDC) {!solanaAddress && <span className="text-xs">— add an address first</span>}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={PAYPAL_TYPE} id="pref-paypal" disabled={!hasPaypal} />
                <Label htmlFor="pref-paypal" className={!hasPaypal ? 'text-muted-foreground' : ''}>
                  PayPal {!hasPaypal && <span className="text-xs">— connect PayPal first</span>}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auto" id="pref-auto" />
                <Label htmlFor="pref-auto">Auto (use my most recent setup)</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {user && <CryptoPayoutSettings />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your PayPal account</CardTitle>
          <CardDescription>
            Set one as primary if you ever connect more than one. The <em>Active default</em>{' '}
            badge marks the account a sale-time distribution would use today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : paypalWallets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">No PayPal account connected yet.</p>
          ) : (
            <ul className="space-y-2">
              {paypalWallets.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-md border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm truncate">{r.wallet_address}</span>
                      {r.is_primary && (
                        <Badge className="text-xs"><Star className="w-3 h-3 mr-1" />Primary</Badge>
                      )}
                      {activeDefaultWalletId === r.id && (
                        <Badge className="text-xs bg-primary/15 text-primary border border-primary/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Active default
                        </Badge>
                      )}
                      {r.verified_at ? (
                        <Badge variant="outline" className="text-xs">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!r.is_primary && (
                    <Button size="sm" variant="outline" onClick={() => setPrimary(r)}>
                      Make primary
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => removeWallet(r)} aria-label="Remove">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <ConnectPaypalButton />
        </CardContent>
      </Card>
    </div>
  );
}
