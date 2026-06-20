import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Add a NOWPayments crypto payout wallet.
 *
 * In Part 1 the network/currency list is a static curated set covering the most
 * common rails. Part 2 will swap this for a live proxy of NOWPayments'
 * /v1/currencies endpoint (`nowpayments-list-currencies` edge function).
 *
 * Address verification in v1 is format-only via a small in-component regex.
 * On-chain micro-deposit verification is intentionally NOT included.
 */

interface PayoutOption {
  /** payout_currency stored on the row, e.g. 'USDT-TRC20' */
  value: string;
  /** human label */
  label: string;
  /** stored in user_wallets.network */
  network: string | null;
  /** regex used for format-only address validation */
  addressPattern: RegExp;
  /** UI helper text */
  hint: string;
}

const PAYOUT_OPTIONS: PayoutOption[] = [
  {
    value: 'USDC-SOL',
    label: 'USDC on Solana — recommended (currently funded rail)',
    network: 'SOL',
    addressPattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    hint: 'Very low fee. Solana base58 address. This is the only payout currency Sow2Grow currently has funded — other choices may fail at payout until they are funded.',
  },
  {
    value: 'USDT-TRC20',
    label: 'USDT on Tron (TRC20)',
    network: 'TRC20',
    addressPattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    hint: 'Low fee (~$1). Address starts with T. Not currently funded — payouts may fail until inventory is added.',
  },
  {
    value: 'USDT-ERC20',
    label: 'USDT on Ethereum (ERC20)',
    network: 'ERC20',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    hint: 'Higher fee (gas). Address starts with 0x. Not currently funded.',
  },
  {
    value: 'USDC-ERC20',
    label: 'USDC on Ethereum (ERC20)',
    network: 'ERC20',
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    hint: 'Higher fee (gas). Address starts with 0x. Not currently funded.',
  },
  {
    value: 'BTC',
    label: 'Bitcoin (mainnet)',
    network: null,
    addressPattern: /^(bc1[0-9a-z]{20,80}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    hint: 'Network fee depends on mempool congestion. Not currently funded.',
  },
];

interface Props {
  onSaved?: () => void;
}

export default function AddNowPaymentsWallet({ onSaved }: Props) {
  const { user } = useAuth();
  const [optionValue, setOptionValue] = useState<string>(PAYOUT_OPTIONS[0].value);
  const [address, setAddress] = useState('');
  const [confirmOwnership, setConfirmOwnership] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => PAYOUT_OPTIONS.find((o) => o.value === optionValue) ?? PAYOUT_OPTIONS[0],
    [optionValue],
  );

  const addressLooksValid = selected.addressPattern.test(address.trim());
  const canSubmit = !!user && addressLooksValid && confirmOwnership && !saving;

  const handleSave = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_wallets').insert({
        user_id: user.id,
        wallet_type: 'nowpayments_crypto',
        wallet_address: address.trim(),
        payout_currency: selected.value,
        network: selected.network,
        is_active: true,
        is_primary: false,
        verification_method: 'address_validation',
        verified_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast.success('NOWPayments wallet added', {
        description: 'Format-only check passed. Send a small test bestowal to yourself to confirm end-to-end.',
      });
      setAddress('');
      setConfirmOwnership(false);
      onSaved?.();
    } catch (e: any) {
      console.error('AddNowPaymentsWallet save error', e);
      toast.error(e?.message ?? 'Failed to save wallet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a NOWPayments crypto wallet</CardTitle>
        <CardDescription>
          Choose the currency/network you want to receive payouts in. You pay this network&apos;s payout fee at withdrawal time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="np-currency">Currency &amp; network</Label>
          <Select value={optionValue} onValueChange={setOptionValue}>
            <SelectTrigger id="np-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{selected.hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="np-address">Wallet address</Label>
          <Input
            id="np-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste your receiving address"
            spellCheck={false}
            autoComplete="off"
          />
          {address && !addressLooksValid && (
            <p className="text-xs text-destructive">
              That doesn&apos;t look like a valid {selected.label} address.
            </p>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            We do a format-only check now. There is no on-chain verification yet — sending to the wrong address or network can lose funds permanently. Triple-check before saving.
          </AlertDescription>
        </Alert>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={confirmOwnership}
            onCheckedChange={(v) => setConfirmOwnership(v === true)}
            id="np-confirm"
          />
          <span>I confirm this address is mine and the network above is correct.</span>
        </label>

        <Button onClick={handleSave} disabled={!canSubmit} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Save wallet
        </Button>
      </CardContent>
    </Card>
  );
}
