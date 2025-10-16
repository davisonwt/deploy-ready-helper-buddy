import React from 'react';
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

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostWallet?: string;
  hostName?: string;
}

export const DonateModal: React.FC<DonateModalProps> = ({
  isOpen,
  onClose,
  hostWallet,
  hostName = 'Host',
}) => {
  const [amount, setAmount] = React.useState('5');

  const handleDonate = () => {
    // Mock webhook call: Split 90% to hostWallet, 10% to tithing
    console.log('Donation processed:', { hostWallet, amount });
    // TODO: Replace with real Crypto.com Pay SDK
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Donate to {hostName}</DialogTitle>
          <DialogDescription>
            Support the host with USDC. 90% goes to the host, 10% to tithing.
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
            Cancel
          </Button>
          <Button onClick={handleDonate}>Confirm Donation</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
