import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Info } from 'lucide-react';

interface PremiumItemPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  itemType: 'music' | 'document' | 'artwork';
  roomId: string;
  onPurchaseComplete?: (paymentReference?: string) => void;
}

export function PremiumItemPurchaseModal({
  open,
  onOpenChange,
  item,
  itemType,
  roomId,
  onPurchaseComplete
}: PremiumItemPurchaseModalProps) {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }

    toast.info(
      'Premium item purchases are temporarily disabled while we migrate to our approved payment providers (NOWPayments / PayPal). Please try again soon.'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase {itemType}</DialogTitle>
          <DialogDescription>
            Purchases temporarily disabled
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Premium item purchases are temporarily disabled while we migrate to our approved payment providers (NOWPayments / PayPal).
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Item: {item.name}</p>
            <p className="text-sm text-muted-foreground">
              Size: {(item.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold">{formatAmount(item.price)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {processing ? 'Processing...' : 'Temporarily Unavailable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
