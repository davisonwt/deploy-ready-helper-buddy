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
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

import { useAuth } from '@/hooks/useAuth';
import { IRREVERSIBLE_WARNING, maskAddress, validateSolanaAddress } from '@/lib/payments/cryptoAddress';

const PAYOUT_NETWORK = 'solana_usdc' as const;

interface NetworkMode {
  solana_cluster: string;
  is_testnet: boolean;
}

interface SecurityQuestion {
  index: number;
  label: string;
}

export default function CryptoPayoutSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NetworkMode | null>(null);

  const [address, setAddress] = useState('');
  const [confirmAddress, setConfirmAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[] | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
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
      // Plain fetch (invokePaymentFunction) rather than functions.invoke():
      // the SDK collapses every non-2xx into "Edge Function returned a
      // non-2xx status code", hiding the function's own message.
      const data = await invokePaymentFunction<any>('update-crypto-payout', undefined, { method: 'GET' });
      const summary = data?.network_mode;
      setMode(summary ? { solana_cluster: summary.solana_cluster, is_testnet: summary.is_testnet } : null);
      setSecurityQuestions(data?.security_questions ?? null);
      const p = data?.payout;
      setActiveNetwork(p?.payout_network ?? null);
      // Only prefill from a Solana-configured payout — this card no longer
      // has a way to show/edit anything else. Falls back to
      // profiles.solana_wallet_address (set via the dashboard's My Wallet
      // card or Profile) when a payout address hasn't been activated yet —
      // "one address everywhere" means a member who already connected a
      // wallet elsewhere shouldn't have to retype it here.
      if (p?.payout_network === PAYOUT_NETWORK && p?.payout_address) {
        setSaved({ payout_address: p.payout_address });
        setAddress(p.payout_address);
        setConfirmAddress('');
      } else if (p?.solana_wallet_address) {
        setAddress(p.solana_wallet_address);
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

  const canSave =
    !!address &&
    !addressError &&
    !mismatch &&
    acknowledged &&
    activateAsRail &&
    !!currentPassword &&
    !!securityQuestions &&
    selectedQuestionIndex !== null &&
    !!securityAnswer.trim() &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Through invokePaymentFunction so a 401 (wrong password / wrong
      // answer), 400 (validation), 429 (rate limit) or 500 reaches the
      // toast as the function's actual message.
      const data = await invokePaymentFunction<any>('update-crypto-payout', {
        payout_network: PAYOUT_NETWORK,
        payout_address: address.trim(),
        payout_address_confirm: confirmAddress.trim(),
        payout_tag: null,
        payout_wallet_type: 'personal',
        current_password: currentPassword,
        security_question_index: selectedQuestionIndex,
        security_answer: securityAnswer,
      });
      setSaved({ payout_address: data.payout.payout_address });
      setActiveNetwork(PAYOUT_NETWORK);
      setConfirmAddress('');
      setCurrentPassword('');
      setSelectedQuestionIndex(null);
      setSecurityAnswer('');
      setAcknowledged(false);
      setActivateAsRail(false);
      toast.success('Solana USDC is now your active payout rail. A new address has a 48-hour holding period before it can be paid.');
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
          Solana wallet (USDC)
          {saved && (
            <Badge variant="secondary" className="text-[10px]">
              {maskAddress(saved.payout_address)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Where we send your on-chain payouts. Paid automatically when you reach $20, or request
          any time from $1. This is a separate, exclusive rail from PayPal: only one pays you at
          a time.
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

        {/* Solana-only card -- key off solana_cluster directly, not the
            combined mode.is_testnet flag. is_testnet is
            solana_cluster !== 'mainnet-beta' || xrp_network !== 'mainnet'
            (_shared/cryptoNetworks.ts) -- XRP isn't offered anywhere in
            this component (or funded anywhere in this app; see the file
            header) and its network defaults to testnet permanently, so
            the OR'd flag stayed true forever regardless of Solana's real
            cluster. This showed "pointed at a test network (Solana
            mainnet-beta)" even once mainnet-beta was genuinely live. */}
        {mode && mode.solana_cluster !== 'mainnet-beta' && (
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

            <div className="space-y-2">
              <Label htmlFor="payout-current-password">Confirm your password</Label>
              <Input
                id="payout-current-password"
                type="password"
                value={currentPassword}
                autoComplete="current-password"
                placeholder="Your account password"
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required to confirm it's really you — this is the single most common way marketplace
                accounts get their payouts redirected. A new or changed address also has a 48-hour
                holding period before it can be paid.
              </p>
            </div>

            {securityQuestions ? (
              <div className="space-y-2">
                <Label>Answer one of your security questions</Label>
                <RadioGroup
                  value={selectedQuestionIndex !== null ? String(selectedQuestionIndex) : undefined}
                  onValueChange={(v) => setSelectedQuestionIndex(Number(v))}
                  className="space-y-1"
                >
                  {securityQuestions.map((q) => (
                    <div key={q.index} className="flex items-center gap-2">
                      <RadioGroupItem value={String(q.index)} id={`payout-secq-${q.index}`} />
                      <Label htmlFor={`payout-secq-${q.index}`} className="text-xs font-normal">
                        {q.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Input
                  id="payout-security-answer"
                  value={securityAnswer}
                  autoComplete="off"
                  placeholder="Your answer"
                  disabled={selectedQuestionIndex === null}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A second check, on top of your password, specifically for changing where your
                  money goes.
                </p>
              </div>
            ) : (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Security questions required</AlertTitle>
                <AlertDescription className="text-xs">
                  Set up your security questions before changing a payout address — it's the second
                  check we require alongside your password.{' '}
                  <Link to="/onboarding/security" className="underline font-medium">
                    Set them up now
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}

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
