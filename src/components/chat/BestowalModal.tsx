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
import { Heart } from 'lucide-react';

interface BestowalModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostWallet?: string;
  hostName?: string;
}

export const BestowalModal: FC<BestowalModalProps> = ({
  isOpen,
  onClose,
  hostWallet,
  hostName = 'Sower',
}) => {
  const [amount, setAmount] = useState('5');

  const handleBestow = () => {
    console.log('Bestowal processed:', { hostWallet, amount });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Bestow to {hostName}
          </DialogTitle>
          <DialogDescription>
            Send a heartfelt bestowal with USDC. 90% waters the sower's orchard, 10% nurtures the community.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Bestowal Amount (USDC)</Label>
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
          <Button onClick={handleBestow}>
            <Heart className="h-4 w-4 mr-2" />
            Send Your Bestowal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Re-export for backward compatibility
export const DonateModal = BestowalModal;
