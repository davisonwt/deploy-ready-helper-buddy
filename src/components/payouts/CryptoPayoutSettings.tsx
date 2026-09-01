/**
 * Crypto payout destination settings — USDC on Solana.
 *
 * Sits alongside the existing PayPal payout method; it does not replace it.
 * All persistence goes through the `update-crypto-payout` edge function so
 * the address is validated server-side, audited, and the owner is notified
 * of the change.
 *
 * Solana-only per spec-payments.md's two-rails decision (USDC on Solana,
 * PayPal — XRP was never funded and nothing that sends money reads an XRP
 * address). The payout_tag/payout_wallet_type columns and the
 * update-crypto-payout backend still accept 'xrp' for now (out of scope
 * here) — this component just stops offering it as a choice.
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/hooks/useAuth';
import { IRREVERSIBLE_WARNING, maskAddress, validateSolanaAddress } from '@/lib/payments/cryptoAddress';

const PAYOUT_NETWORK = 'solana_usdc' as const;

interface NetworkMode {
  solana_cluster: string;
  is_testnet: boolean;
}

export default function CryptoPayoutSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NetworkMode | null>(null);

  const [address, setAddress] = useState('');
  const [confirmAddress, setConfirmAddress] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  // Separate from `acknowledged` (irreversibility) on purpose — this is the
  // explicit "yes, switch me off PayPal" consent. Saving an address must
  // never flip payout_network as a side effect of just typing it in; see
  // payout-earnings/index.ts, which buckets recipients on payout_network
  // alone (PayPal loses every future run once this is 'solana_usdc').
  const [activateAsRail, setActivateAsRail] = useState(false);
  const [saved, setSaved] = useState<{ payout_address: string } | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-crypto-payout', {
        method: 'GET',
      });
      if (error) throw error;
      const summary = data?.network_mode;
      setMode(summary ? { solana_cluster: summary.solana_cluster, is_testnet: summary.is_testnet } : null);
      const p = data?.payout;
      setActiveNetwork(p?.payout_network ?? null);
      // Only prefill from a Solana-configured payout — this card no longer
      // has a way to show/edit anything else.
      if (p?.payout_network === PAYOUT_NETWORK && p?.payout_address) {
        setSaved({ payout_address: p.payout_address });
        setAddress(p.payout_address);
        setConfirmAddress('');
      }
    } catch (e: any) {
      console.error('crypto payout load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addressError = address ? validateSolanaAddress(address) : null;
  const mismatch = confirmAddress.trim() !== address.trim();
  const alreadyActive = activeNetwork === PAYOUT_NETWORK;

  const canSave = !!address && !addressError && !mismatch && acknowledged && activateAsRail && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-crypto-payout', {
        body: {
          payout_network: PAYOUT_NETWORK,
          payout_address: address.trim(),
          payout_address_confirm: confirmAddress.trim(),
          payout_tag: null,
          payout_wallet_type: 'personal',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSaved({ payout_address: data.payout.payout_address });
      setActiveNetwork(PAYOUT_NETWORK);
      setConfirmAddress('');
      setAcknowledged(false);
      setActivateAsRail(false);
      toast.success('Solana USDC is now your active payout rail. Check your Sow2Grow notifications for a confirmation of the change.');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Could not save payout destination');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Crypto payout wallet
          {saved && (
            <Badge variant="secondary" className="text-[10px]">
              USDC (Solana) · {maskAddress(saved.payout_address)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Where we send your on-chain payouts. USDC on the Solana network — a fraction of a cent
          to send, so once it's your active rail, you're paid immediately, any amount, no
          threshold. This is a separate, exclusive rail from PayPal: only one pays you at a time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!loading && (
          <Alert variant={alreadyActive ? 'default' : undefined}>
            <AlertDescription className="text-xs font-medium">
              {alreadyActive
                ? 'Solana USDC is your active payout rail right now — PayPal will not be paid until you switch back.'
                : "You're not on the Solana rail — payouts default to PayPal (see your connection status above). Saving and activating a Solana address below switches future payouts to Solana and stops PayPal."}
            </AlertDescription>
          </Alert>
        )}

        {mode?.is_testnet && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Test mode</AlertTitle>
            <AlertDescription className="text-xs">
              Sow2Grow is currently pointed at a test network (Solana {mode.solana_cluster}).
              Transfers made now carry no real value.
            </AlertDescription>
          </Alert>
        )}

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">{IRREVERSIBLE_WARNING}</AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="payout-address">Solana wallet address</Label>
              <Input
                id="payout-address"
                value={address}
                spellCheck={false}
                autoComplete="off"
                placeholder="Base58 Solana address"
                onChange={(e) => setAddress(e.target.value)}
              />
              {addressError && <p className="text-xs text-destructive">{addressError}</p>}

              <Label htmlFor="payout-address-confirm">Re-enter the address to confirm</Label>
              <Input
                id="payout-address-confirm"
                value={confirmAddress}
                spellCheck={false}
                autoComplete="off"
                placeholder="Type or paste it again"
                onChange={(e) => setConfirmAddress(e.target.value)}
              />
              {confirmAddress && mismatch && (
                <p className="text-xs text-destructive">
                  The two addresses do not match. Please double-check this address.
                </p>
              )}
            </div>

            {address && !addressError && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                <div className="font-medium">Please double-check before saving:</div>
                <div>Network: USDC (Solana)</div>
                <div className="break-all">Address: {address.trim()}</div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="payout-ack"
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
              />
              <Label htmlFor="payout-ack" className="text-xs font-normal leading-snug">
                I have checked every character of this address and I understand crypto payments
                cannot be reversed or refunded.
              </Label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="payout-activate"
                checked={activateAsRail}
                onCheckedChange={(v) => setActivateAsRail(v === true)}
              />
              <Label htmlFor="payout-activate" className="text-xs font-normal leading-snug">
                Make Solana USDC my active payout rail. I understand this switches future weekly
                payouts to Solana and stops PayPal from paying me until I switch back.
              </Label>
            </div>

            <Button onClick={handleSave} disabled={!canSave} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {alreadyActive ? 'Update Solana address' : 'Switch to Solana USDC'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
