import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContentPurchase } from '@/hooks/useContentPurchase';
import { CRYPTO_ROUNDING_NOTICE, MIN_CRYPTO_BESTOWAL_USD, type PayoutProviderId } from '@/lib/payments/providerFees';
import ProviderPicker from '@/components/payments/ProviderPicker';
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
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');
  const priceUSD = (mediaItem?.price_cents || 0) / 100;
  const total = buyerTotal(priceUSD);
  const belowCryptoMin = total < MIN_CRYPTO_BESTOWAL_USD;
  const effectiveProvider: PayoutProviderId = belowCryptoMin ? 'paypal' : provider;

  const start = () => {
    if (!user) { toast.error('Please log in to purchase'); return; }
    if (!mediaItem?.id) { toast.error('Media item missing identifier'); return; }
    purchase({
      contentType: 'live_session_media',
      contentId: mediaItem.id,
      provider: effectiveProvider,
      payCurrency: effectiveProvider === 'nowpayments' ? 'usdttrc20' : undefined,
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
            Price: ${total.toFixed(2)} — you'll be redirected to checkout. Access is granted automatically once payment is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment method</div>
          {belowCryptoMin && (
            <p className="text-xs text-muted-foreground">
              Crypto has a ${MIN_CRYPTO_BESTOWAL_USD} minimum — pay with PayPal for smaller amounts.
            </p>
          )}
          <ProviderPicker
            value={effectiveProvider}
            onChange={setProvider}
            amount={total}
            mode="buyer"
            disabled={isPending}
            providers={belowCryptoMin ? ['paypal'] : undefined}
          />
          {effectiveProvider === 'nowpayments' && (
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
