import { useAuth } from '@/hooks/useAuth';
import { useContentPurchase } from '@/hooks/useContentPurchase';
import { CRYPTO_ROUNDING_NOTICE } from '@/lib/payments/providerFees';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { useBalanceProvider } from '@/hooks/useBalanceProvider';
import { buyerTotal } from '@/lib/pricing/platformFee';
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
  const total = buyerTotal(priceUSD);
  const { provider, setProvider, providers, balanceShortBy, refetchBalance } = useBalanceProvider(total);

  const start = async () => {
    if (!user) { toast.error('Please log in to purchase'); return; }
    if (!mediaItem?.id) { toast.error('Media item missing identifier'); return; }
    const result = await purchase({
      contentType: 'live_session_media',
      contentId: mediaItem.id,
      provider,
    });
    if (result && provider === 'balance') refetchBalance();
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
            Price: ${total.toFixed(2)}. Access is granted automatically once payment is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment method</div>
          <ProviderPicker
            value={provider}
            onChange={setProvider}
            amount={total}
            mode="buyer"
            disabled={isPending}
            providers={providers}
          />
          {balanceShortBy > 0 && (
            <p className="text-xs text-muted-foreground">
              Not enough in your S2G Balance — top up ${balanceShortBy.toFixed(2)} to pay this way.
            </p>
          )}
          {provider === 'solana' && (
            <p className="text-xs text-muted-foreground">{CRYPTO_ROUNDING_NOTICE}</p>
          )}
          <Button onClick={start} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Processing...' : `Pay $${total.toFixed(2)}`}
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
