import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Info, CreditCard, Wallet, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { NowPaymentsButton } from './payment/NowPaymentsButton';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  orchardId, 
  pocketsCount = 0, 
  orchardTitle = "Orchard",
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
              Pay with crypto, cards, bank transfer, PayPal, and more. All fees included in invoice.
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

          {/* Payment options info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">Available Payment Methods:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                <span>300+ Cryptocurrencies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Credit/Debit Cards</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>Bank Transfers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">💳</span>
                <span>PayPal & More</span>
              </div>
            </div>
          </div>

          <NowPaymentsButton
            orchardId={orchardId}
            amount={amount}
            pocketsCount={pocketsCount}
            growerId={growerId}
            className="w-full"
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
