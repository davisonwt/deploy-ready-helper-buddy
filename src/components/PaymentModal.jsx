import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Info } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { BinancePayButton } from './payment/BinancePayButton';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  orchardId, 
  pocketsCount = 0, 
  orchardTitle = "Orchard",
  sowerId,
  growerId,
  onPaymentComplete
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-2 top-2 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader>
          <CardTitle>Support {orchardTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All payments are processed through Binance Pay using USDC
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pockets:</span>
              <span className="font-medium">{pocketsCount}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Amount:</span>
              <span>{amount.toFixed(2)} USDC</span>
            </div>
          </div>

          <BinancePayButton
            orchardId={orchardId}
            amount={amount}
            pocketsCount={pocketsCount}
            sowerId={sowerId}
            growerId={growerId}
            onSuccess={() => {
              if (onPaymentComplete) {
                onPaymentComplete();
              }
              onClose();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModal;
