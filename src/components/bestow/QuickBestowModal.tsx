/**
 * QuickBestowModal — universal in-place bestow modal.
 *
 * Used from:
 *   • LivingSeedCard live-stage Bestow button (guest)
 *   • LiveStage now-playing Bestow button (radio guest)
 *   • Tribe / grove feed Bestow button on every seed
 *
 * Provider selection (feature A): buyer picks NOWPayments (USDC-SOL) or PayPal
 * before confirming, with fee estimate shown per choice. The submit branches:
 *   • nowpayments → create-nowpayments-invoice (opens hosted invoice in new tab)
 *   • paypal      → create-paypal-order        (full-page redirect to approval)
 * In both cases the bestowal row is created server-side with the buyer-side
 * processor fee broken out, and post-payment chat notes are pre-staged.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNowPayments } from '@/hooks/useNowPayments';
import { usePaypal } from '@/hooks/usePaypal';
import { postBestowalChatNotes } from '@/lib/bestowalChat';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { PayoutProviderId, quoteFee } from '@/lib/payments/providerFees';

export interface QuickBestowModalProps {
  open: boolean;
  onClose: () => void;
  orchardId: string;
  seedTitle: string;
  sowerUserId: string;
  hostUserId?: string | null;
  whispererSharePct?: number;
  defaultAmount?: number;
}

export default function QuickBestowModal({
  open, onClose,
  orchardId, seedTitle, sowerUserId,
  hostUserId, whispererSharePct = 10,
  defaultAmount = 5,
}: QuickBestowModalProps) {
  const { user } = useAuth();
  const { createInvoice } = useNowPayments();
  const { createOrder, redirectToApprove } = usePaypal();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [note, setNote] = useState('');
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setNote('');
      setProvider('nowpayments');
    }
  }, [open, defaultAmount]);

  const handleBestow = async () => {
    if (!user) { toast.error('Please sign in to bestow.'); return; }
    if (!orchardId) { toast.error('No seed selected.'); return; }
    if (amount <= 0) { toast.error('Enter an amount greater than zero.'); return; }

    setProcessing(true);
    try {
      let bestowalId: string;

      if (provider === 'nowpayments') {
        const invoice = await createInvoice({
          orchardId,
          pocketsCount: 1,
          payCurrency: 'usdcsol',
          message: note || undefined,
          growerId: hostUserId || undefined,
        });
        bestowalId = invoice.bestowalId;
        if (invoice.invoiceUrl) {
          window.open(invoice.invoiceUrl, '_blank');
        }
      } else {
        const order = await createOrder({
          orchardId,
          pocketsCount: 1,
          message: note || undefined,
          growerId: hostUserId || undefined,
        });
        bestowalId = order.bestowalId;
        if (order.approveUrl) {
          // PayPal flow is a full-page redirect; chat notes posted before nav.
          try {
            await postBestowalChatNotes({
              bestowalId, bestowerUserId: user.id, sowerUserId,
              seedTitle, amount, note: note || undefined,
            });
          } catch (err) {
            console.warn('Chat thread bootstrap failed (will retry on webhook):', err);
          }
          redirectToApprove(order.approveUrl);
          return;
        }
      }

      try {
        await postBestowalChatNotes({
          bestowalId, bestowerUserId: user.id, sowerUserId,
          seedTitle, amount, note: note || undefined,
        });
      } catch (err) {
        console.warn('Chat thread bootstrap failed (will retry on webhook):', err);
      }
      onClose();
    } catch (err: any) {
      console.error('Bestowal initiation failed:', err);
      toast.error(err?.message ?? 'Could not start the bestowal. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const feePreview = quoteFee(provider, amount);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Bestow on “{seedTitle}”
          </DialogTitle>
          <DialogDescription>
            Sower receives the majority; a 15% platform fee supports Sow2Grow operations
            {hostUserId ? `; ${whispererSharePct}% goes to the live host.` : '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (USD)</label>
            <Input
              type="number"
              min={1}
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[5, 10, 25, 50, 100].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    amount === v ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border hover:bg-muted'
                  }`}
                >${v}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment method
            </label>
            <div className="mt-1">
              <ProviderPicker
                value={provider}
                onChange={setProvider}
                amount={amount}
                mode="buyer"
                disabled={processing}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bestowal note (optional — sent in 1-on-1 chat)
            </label>
            <Input
              placeholder="Thank you for sowing this seed…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground text-right">
            Estimated processor fee: <span className="font-medium text-foreground">{feePreview.display}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
            <Button onClick={handleBestow} disabled={processing || amount <= 0} className="gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Bestow ${amount.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
