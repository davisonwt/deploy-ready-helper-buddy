import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
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
  onPurchaseComplete?: () => void;
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
  const { connected, balance, connectWallet } = useWallet();
  const { formatAmount } = useCurrency();
  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }

    if (!connected) {
      toast.error('Please connect your wallet first');
      await connectWallet();
      return;
    }

    if (parseFloat(balance) < item.price) {
      toast.error(`Insufficient balance. You need ${formatAmount(item.price)}`);
      return;
    }

    setProcessing(true);

    try {
      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('premium_item_purchases')
        .insert({
          buyer_id: user.id,
          room_id: roomId,
          item_type: itemType,
          item_id: item.id,
          amount: item.price,
          payment_status: 'completed'
        });

      if (purchaseError) throw purchaseError;

      toast.success(`${itemType} purchased successfully!`);
      onPurchaseComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Purchase failed:', error);
      toast.error(error.message || 'Purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase {itemType}</DialogTitle>
          <DialogDescription>
            Complete your purchase to access this content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {connected && (
            <div className="text-sm text-muted-foreground">
              Your balance: {formatAmount(balance)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {processing ? 'Processing...' : 'Purchase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
