/**
 * Crypto payout destination settings — USDC (Solana) or XRP (Ripple).
 *
 * Sits alongside the existing NOWPayments / PayPal payout methods; it does not
 * replace them. All persistence goes through the `update-crypto-payout` edge
 * function so the address is validated server-side, audited, and the owner is
 * notified of the change.
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import XrpRateNotice from '@/components/payouts/XrpRateNotice';

import { useAuth } from '@/hooks/useAuth';
import {
  EXCHANGE_TAG_WARNING,
  IRREVERSIBLE_WARNING,
  NETWORK_LABELS,
  PayoutNetwork,
  PayoutWalletType,
  maskAddress,
  validateDestinationTag,
  validatePayoutAddress,
} from '@/lib/payments/cryptoAddress';

interface NetworkMode {
  solana_cluster: string;
  xrp_network: string;
  is_testnet: boolean;
}

export default function CryptoPayoutSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NetworkMode | null>(null);

  const [network, setNetwork] = useState<PayoutNetwork>('solana_usdc');
  const [walletType, setWalletType] = useState<PayoutWalletType>('personal');
  const [address, setAddress] = useState('');
  const [confirmAddress, setConfirmAddress] = useState('');
  const [tag, setTag] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [saved, setSaved] = useState<{
    payout_network: PayoutNetwork;
    payout_address: string;
    payout_tag: number | null;
    payout_wallet_type: PayoutWalletType;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-crypto-payout', {
        method: 'GET',
      });
      if (error) throw error;
      setMode(data?.network_mode ?? null);
      const p = data?.payout;
      if (p?.payout_address) {
        setSaved(p);
        setNetwork(p.payout_network);
        setWalletType(p.payout_wallet_type ?? 'personal');
        setAddress(p.payout_address);
        setConfirmAddress('');
        setTag(p.payout_tag === null || p.payout_tag === undefined ? '' : String(p.payout_tag));
      }
    } catch (e: any) {
      console.error('crypto payout load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isXrp = network === 'xrp';
  const needsTag = isXrp && walletType === 'custodial';

  const addressError = address ? validatePayoutAddress(network, address) : null;
  const tagError = needsTag ? validateDestinationTag(tag) : null;
  const mismatch = confirmAddress.trim() !== address.trim();

  const canSave =
    !!address && !addressError && !tagError && !mismatch && acknowledged && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-crypto-payout', {
        body: {
          payout_network: network,
          payout_address: address.trim(),
          payout_address_confirm: confirmAddress.trim(),
          payout_tag: needsTag ? Number(tag) : null,
          payout_wallet_type: isXrp ? walletType : 'personal',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSaved(data.payout);
      setConfirmAddress('');
      setAcknowledged(false);
      toast.success('Payout destination saved. Check your Sow2Grow notifications for a confirmation of the change.');
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
              {NETWORK_LABELS[saved.payout_network]} · {maskAddress(saved.payout_address)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Where we send your on-chain payouts. Two networks are supported: USDC on Solana, and
          XRP on the XRP Ledger.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {mode?.is_testnet && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Test mode</AlertTitle>
            <AlertDescription className="text-xs">
              Sow2Grow is currently pointed at test networks (Solana {mode.solana_cluster}, XRP{' '}
              {mode.xrp_network}). Transfers made now carry no real value.
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
              <Label>Payout currency / network</Label>
              <RadioGroup
                value={network}
                onValueChange={(v) => {
                  setNetwork(v as PayoutNetwork);
                  setAddress('');
                  setConfirmAddress('');
                  setTag('');
                  setAcknowledged(false);
                }}
                className="grid gap-2 sm:grid-cols-2"
              >
                {(['solana_usdc', 'xrp'] as PayoutNetwork[]).map((n) => (
                  <div key={n} className="flex items-center gap-2 rounded-md border p-3">
                    <RadioGroupItem value={n} id={`net-${n}`} />
                    <Label htmlFor={`net-${n}`} className="cursor-pointer">
                      {NETWORK_LABELS[n]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {!isXrp && (
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  PayPal payouts are batched to a $20 minimum because PayPal charges a fee per
                  transfer. USDC on Solana costs a fraction of a cent to send, so once this rail
                  is live, Solana recipients are paid immediately — any amount, no threshold.
                </AlertDescription>
              </Alert>
            )}

            {isXrp && <XrpRateNotice context="payout" />}

            {isXrp && (

              <div className="space-y-2">
                <Label>What kind of XRP wallet is this?</Label>
                <RadioGroup
                  value={walletType}
                  onValueChange={(v) => {
                    setWalletType(v as PayoutWalletType);
                    setTag('');
                    setAcknowledged(false);
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-2 rounded-md border p-3">
                    <RadioGroupItem value="personal" id="wt-personal" className="mt-1" />
                    <Label htmlFor="wt-personal" className="cursor-pointer font-normal">
                      <span className="font-medium">Personal / self-custody wallet</span>
                      <span className="block text-xs text-muted-foreground">
                        e.g. hardware wallet, Xaman, Trezor / Ledger. No destination tag needed.
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border p-3">
                    <RadioGroupItem value="custodial" id="wt-custodial" className="mt-1" />
                    <Label htmlFor="wt-custodial" className="cursor-pointer font-normal">
                      <span className="font-medium">Account at a centralized exchange</span>
                      <span className="block text-xs text-muted-foreground">
                        e.g. Binance, Kraken, Coinbase, VALR, LUNO. A destination tag is required.
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payout-address">
                {isXrp ? 'XRP wallet address' : 'Solana wallet address'}
              </Label>
              <Input
                id="payout-address"
                value={address}
                spellCheck={false}
                autoComplete="off"
                placeholder={isXrp ? 'r...' : 'Base58 Solana address'}
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

            {needsTag && (
              <div className="space-y-2">
                <Label htmlFor="payout-tag">Destination tag</Label>
                <Input
                  id="payout-tag"
                  inputMode="numeric"
                  value={tag}
                  placeholder="e.g. 1234567"
                  onChange={(e) => setTag(e.target.value)}
                />
                {tagError && <p className="text-xs text-destructive">{tagError}</p>}
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{EXCHANGE_TAG_WARNING}</AlertDescription>
                </Alert>
              </div>
            )}

            {address && !addressError && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                <div className="font-medium">Please double-check before saving:</div>
                <div>Network: {NETWORK_LABELS[network]}</div>
                <div className="break-all">Address: {address.trim()}</div>
                {needsTag && <div>Destination tag: {tag || '—'}</div>}
              </div>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="payout-ack"
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
              />
              <Label htmlFor="payout-ack" className="text-xs font-normal leading-snug">
                I have checked every character of this address{needsTag ? ' and tag' : ''} and I
                understand crypto payments cannot be reversed or refunded.
              </Label>
            </div>

            <Button onClick={handleSave} disabled={!canSave} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save payout destination
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
