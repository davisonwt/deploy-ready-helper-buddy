import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useCurrency } from '@/hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  onAccessGranted
}: RoomAccessModalProps) {
  const { user } = useAuth();
  const { connected, balance, connectWallet } = useWallet();
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
      if (!connected) {
        toast.error('Please connect your wallet to purchase access');
        await connectWallet();
        return;
      }

      if (parseFloat(balance) < room.price) {
        toast.error(`Insufficient balance. You need ${formatAmount(room.price)}`);
        return;
      }
    }

    setProcessing(true);

    try {
      // Grant room access
      const { error: accessError } = await supabase
        .from('premium_room_access')
        .insert({
          user_id: user.id,
          room_id: room.id,
          access_granted_at: new Date().toISOString(),
          payment_amount: room.price,
          payment_status: room.price > 0 ? 'completed' : 'free'
        });

      if (accessError) throw accessError;

      toast.success(room.price > 0 ? 'Access purchased successfully!' : 'Welcome to the room!');
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
              ? 'Complete your purchase to access all room content'
              : 'Join this room to access all content'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Room: {room.title}</p>
            <p className="text-sm text-muted-foreground">{room.description}</p>
          </div>

          {room.price > 0 && (
            <>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold">{formatAmount(room.price)}</span>
                </div>
              </div>

              {connected && (
                <div className="text-sm text-muted-foreground">
                  Your balance: {formatAmount(balance)}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleJoinRoom} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {processing ? 'Processing...' : (room.price > 0 ? 'Purchase Access' : 'Join Room')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
