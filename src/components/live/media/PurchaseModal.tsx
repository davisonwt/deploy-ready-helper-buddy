import { useAuth } from '@/hooks/useAuth';
import { useContentPurchase } from '@/hooks/useContentPurchase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItem: any;
  onPurchaseComplete: () => void;
}

export function PurchaseModal({ open, onOpenChange, mediaItem }: PurchaseModalProps) {
  const { user } = useAuth();
  const { purchase, isPending } = useContentPurchase();
  const priceUSD = (mediaItem?.price_cents || 0) / 100;

  const start = (provider: 'paypal' | 'nowpayments') => {
    if (!user) { toast.error('Please log in to purchase'); return; }
    if (!mediaItem?.id) { toast.error('Media item missing identifier'); return; }
    purchase({
      contentType: 'live_session_media',
      contentId: mediaItem.id,
      provider,
      payCurrency: provider === 'nowpayments' ? 'usdttrc20' : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Purchase {mediaItem?.file_name}
          </DialogTitle>
          <DialogDescription>
            Price: ${priceUSD.toFixed(2)} — you'll be redirected to checkout. Access is granted automatically once payment is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Button onClick={() => start('paypal')} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay with PayPal
          </Button>
          <Button variant="outline" onClick={() => start('nowpayments')} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay with crypto (USDT TRC-20)
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
