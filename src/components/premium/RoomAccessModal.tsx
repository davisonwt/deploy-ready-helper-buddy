import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Info } from 'lucide-react';

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
  onAccessGranted
}: RoomAccessModalProps) {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handleJoinRoom = async () => {
    if (!user) {
      toast.error('Please log in to join');
      navigate('/login');
      return;
    }

    if (room.price > 0) {
      toast.info('Binance Pay integration coming soon!');
      // TODO: Implement Binance Pay purchase flow
      return;
    }

    setProcessing(true);

    try {
      // Grant free room access
      const { error: accessError } = await supabase
        .from('premium_room_access')
        .insert({
          user_id: user.id,
          room_id: room.id,
          access_granted_at: new Date().toISOString(),
          payment_amount: 0,
          payment_status: 'free'
        });

      if (accessError) throw accessError;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room.price > 0 ? 'Purchase Room Access' : 'Join Room'}</DialogTitle>
          <DialogDescription>
            {room.price > 0 
              ? 'Pay with USDC via Binance Pay'
              : 'Join this room to access all content'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {room.price > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                All payments are processed through Binance Pay using USDC
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Room: {room.title}</p>
            <p className="text-sm text-muted-foreground">{room.description}</p>
          </div>

          {room.price > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold">{formatAmount(room.price)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleJoinRoom} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {processing ? 'Processing...' : (room.price > 0 ? 'Pay with Binance Pay' : 'Join Room')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
