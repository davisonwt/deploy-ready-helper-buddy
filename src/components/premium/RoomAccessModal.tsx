import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useContentPurchase } from '@/hooks/useContentPurchase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RoomAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: any;
  onAccessGranted?: () => void;
}

export function RoomAccessModal({
  open,
  onOpenChange,
  room,
  onAccessGranted,
}: RoomAccessModalProps) {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const { purchase, isPending } = useContentPurchase();
  const [processing, setProcessing] = useState(false);
  const isPaid = Number(room?.price ?? 0) > 0;

  const handleFreeJoin = async () => {
    if (!user) { toast.error('Please log in to join'); navigate('/login'); return; }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('premium_room_access')
        .insert({
          user_id: user.id,
          room_id: room.id,
          access_granted_at: new Date().toISOString(),
          payment_amount: 0,
          payment_status: 'free',
        });
      if (error) throw error;
      toast.success('Welcome to the room!');
      onAccessGranted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to join room:', error);
      toast.error(error.message || 'Failed to join room');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaid = (provider: 'paypal' | 'nowpayments') => {
    if (!user) { toast.error('Please log in to purchase'); navigate('/login'); return; }
    purchase({
      contentType: 'premium_room_access',
      contentId: room.id,
      provider,
      payCurrency: provider === 'nowpayments' ? 'usdttrc20' : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isPaid ? 'Purchase Room Access' : 'Join Room'}</DialogTitle>
          <DialogDescription>
            {isPaid
              ? "You'll be redirected to complete checkout. Access is granted automatically once payment is confirmed."
              : 'Join this room to access all content'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Room: {room?.title}</p>
            <p className="text-sm text-muted-foreground">{room?.description}</p>
          </div>

          {isPaid && (
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold">{formatAmount(Number(room.price))}</span>
            </div>
          )}

          {isPaid ? (
            <div className="grid gap-2">
              <Button onClick={() => handlePaid('paypal')} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay with PayPal
              </Button>
              <Button variant="outline" onClick={() => handlePaid('nowpayments')} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay with crypto (USDT TRC-20)
              </Button>
            </div>
          ) : (
            <Button onClick={handleFreeJoin} disabled={processing} className="w-full">
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Room
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={processing || isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
