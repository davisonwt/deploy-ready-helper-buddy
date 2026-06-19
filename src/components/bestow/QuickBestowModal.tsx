/**
 * QuickBestowModal — universal in-place bestow modal.
 *
 * Used from:
 *   • LivingSeedCard live-stage Bestow button (guest)
 *   • LiveStage now-playing Bestow button (radio guest)
 *   • Tribe / grove feed Bestow button on every seed
 *
 * Triggers the existing `create-binance-pay-order` edge function. The host
 * (if any) is passed as `growerId` so distribution gives them the whisperer
 * cut. The bestowal hook enqueues thank-you notes + digital-file delivery
 * via the post-payment chat helper (`postBestowalChatNotes`).
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useBinancePay } from '@/hooks/useBinancePay';
import { useAuth } from '@/hooks/useAuth';
import { postBestowalChatNotes } from '@/lib/bestowalChat';

export interface QuickBestowModalProps {
  open: boolean;
  onClose: () => void;
  /** Orchard / seed id the bestowal is being made toward */
  orchardId: string;
  /** Title of the seed (for the chat note) */
  seedTitle: string;
  /** The sower (orchard owner) — receives the thank-you note */
  sowerUserId: string;
  /** Optional host of the live session — gets the whisperer share */
  hostUserId?: string | null;
  whispererSharePct?: number;
  /** Suggested default amount */
  defaultAmount?: number;
}

export default function QuickBestowModal({
  open, onClose,
  orchardId, seedTitle, sowerUserId,
  hostUserId, whispererSharePct = 10,
  defaultAmount = 5,
}: QuickBestowModalProps) {
  const { user } = useAuth();
  const { processing, initiateBinancePayment } = useBinancePay();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [note, setNote] = useState('');

  useEffect(() => { if (open) { setAmount(defaultAmount); setNote(''); } }, [open, defaultAmount]);

  const handleBestow = async () => {
    if (!user) { toast.error('Please sign in to bestow.'); return; }
    if (!orchardId) { toast.error('No seed selected.'); return; }
    if (amount <= 0) { toast.error('Enter an amount greater than zero.'); return; }

    const result = await initiateBinancePayment({
      orchardId,
      amount,
      pocketsCount: 1,
      message: note || undefined,
      growerId: hostUserId || undefined,
    });

    if (result?.paymentUrl) {
      window.open(result.paymentUrl, '_blank');
      // Pre-stage the chat thread + notes so they're ready when payment confirms.
      try {
        await postBestowalChatNotes({
          bestowalId: result.bestowalId,
          bestowerUserId: user.id,
          sowerUserId,
          seedTitle,
          amount,
          note: note || undefined,
        });
      } catch (err) {
        console.warn('Chat thread bootstrap failed (will retry on webhook):', err);
      }
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Bestow on “{seedTitle}”
          </DialogTitle>
          <DialogDescription>
            Bestowals settle in USDC via Binance Pay. Sower receives the
            majority; a 15% platform fee supports Sow2Grow operations
            {hostUserId ? `; ${whispererSharePct}% goes to the live host.` : '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (USDC)</label>
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

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button onClick={handleBestow} disabled={processing || amount <= 0} className="gap-2">
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            Bestow ${amount.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
