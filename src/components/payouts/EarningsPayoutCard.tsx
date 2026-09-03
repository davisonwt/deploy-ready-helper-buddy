// Non-custodial model (legal, 2026-09-03): earnings are paid out
// automatically at $20, or on-demand any time for any amount >= $1 on the
// Solana rail (PayPal keeps its real $20 minimum -- that's PayPal's own
// per-transfer fee, not something a button can waive). Sourced from the
// same owed_payout_balances() payout-earnings itself reads.
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

const ERROR_COPY: Record<string, string> = {
  nothing_owed: "You're not owed anything right now.",
  below_minimum: 'Request at least $1.',
  payout_address_cooling_off: 'Your payout address changed recently — for security, it takes 48 hours before it can receive a payout.',
  exceeds_per_tx_cap: "That's above the per-transaction limit right now — contact support.",
  exceeds_daily_cap_needs_squad_approval: "Today's payout limit has been reached — try again tomorrow, or contact support.",
  insufficient_hot_wallet_balance: 'Payouts are temporarily unavailable — try again shortly.',
  solana_not_configured: 'Solana payouts are temporarily unavailable — try again shortly.',
  payout_failed: 'Something went wrong sending your payout — try again, or contact support if it keeps happening.',
};

interface PreviewResponse {
  totalOwed: number;
  rail: 'solana_usdc' | 'paypal';
  minimum: number;
  eligible: boolean;
}

export default function EarningsPayoutCard() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invokePaymentFunction<PreviewResponse>('request-earnings-payout', { preview: true });
      setPreview(data);
    } catch (err) {
      console.error('EarningsPayoutCard preview failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const requestNow = async () => {
    setRequesting(true);
    try {
      const data = await invokePaymentFunction<any>('request-earnings-payout', {});
      if (data?.paid) {
        toast.success(`Paid $${Number(data.total).toFixed(2)} to your wallet.`);
      } else if (data?.queued) {
        toast.info(data.message);
      }
      await load();
    } catch (err: any) {
      const code = err?.message as string | undefined;
      toast.error((code && ERROR_COPY[code]) || code || 'Could not request a payout right now.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading your earnings…
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" /> Your earnings
        </CardTitle>
        <CardDescription>
          {preview.rail === 'solana_usdc'
            ? 'Pays out automatically at $20 — or pull it now, any amount $1 or more.'
            : `Pays out automatically once you reach $${preview.minimum} (PayPal's own per-transfer fee makes anything less uneconomical).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold tabular-nums">${preview.totalOwed.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">owed right now</div>
        </div>
        {preview.rail === 'solana_usdc' && (
          <Button onClick={requestNow} disabled={!preview.eligible || requesting}>
            {requesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Request payout now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
