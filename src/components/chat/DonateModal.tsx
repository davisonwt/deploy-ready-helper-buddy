import { useState, FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostWallet?: string;
  hostName?: string;
}

export const DonateModal: FC<DonateModalProps> = ({
  isOpen,
  onClose,
  hostWallet,
  hostName = 'Host',
}) => {
  const [amount, setAmount] = useState('5');

  const handleDonate = () => {
    toast.info('In-chat tipping is temporarily disabled while we migrate to NOWPayments / PayPal.');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Donate to {hostName}</DialogTitle>
          <DialogDescription>
            In-chat tipping is temporarily unavailable while we migrate to NOWPayments / PayPal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              disabled
            />
          </div>
          {hostWallet && (
            <div className="text-sm text-muted-foreground">
              Wallet: {hostWallet.slice(0, 8)}...{hostWallet.slice(-6)}
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDonate} disabled>
            Temporarily Unavailable
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

