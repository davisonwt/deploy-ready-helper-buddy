import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useContentPurchase } from '@/hooks/useContentPurchase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PremiumItemPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  itemType: 'music' | 'document' | 'artwork';
  roomId: string;
  // kept for back-compat; ignored — access is now granted by webhook on payment completion.
  onPurchaseComplete?: (paymentReference?: string) => void;
}

export function PremiumItemPurchaseModal({
  open,
  onOpenChange,
  item,
  itemType,
  roomId,
}: PremiumItemPurchaseModalProps) {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { purchase, isPending } = useContentPurchase();

  const start = (provider: 'paypal' | 'nowpayments') => {
    if (!user) { toast.error('Please log in to purchase'); return; }
    if (!item?.id) { toast.error('Item missing identifier'); return; }
    purchase({
      contentType: 'premium_item',
      contentId: String(item.id),
      provider,
      payCurrency: provider === 'nowpayments' ? 'usdttrc20' : undefined,
      metadata: { room_id: roomId, item_type: itemType },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase {itemType}</DialogTitle>
          <DialogDescription>
            You'll be redirected to complete checkout. Access is granted automatically once payment is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{item?.name}</p>
            {typeof item?.size === 'number' && (
              <p className="text-xs text-muted-foreground">
                Size: {(item.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <span className="font-semibold">Total:</span>
            <span className="text-2xl font-bold">{formatAmount(Number(item?.price ?? 0))}</span>
          </div>

          <div className="grid gap-2">
            <Button onClick={() => start('paypal')} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay with PayPal
            </Button>
            <Button variant="outline" onClick={() => start('nowpayments')} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay with crypto (USDT TRC-20)
            </Button>
          </div>
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
