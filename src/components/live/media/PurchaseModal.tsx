import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle } from 'lucide-react';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItem: any;
  onPurchaseComplete: () => void;
}

export function PurchaseModal({ open, onOpenChange, mediaItem }: PurchaseModalProps) {
  const priceUSD = (mediaItem?.price_cents || 0) / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Purchase {mediaItem?.file_name}
          </DialogTitle>
          <DialogDescription>
            Price: ${priceUSD.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <Alert className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Temporarily unavailable.</strong> In-session media purchases are being
            migrated to NOWPayments and PayPal. Please check back soon.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
