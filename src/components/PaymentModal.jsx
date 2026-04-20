import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Info } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { PaymentMethodSelector } from './payment/PaymentMethodSelector';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount = 0,
  currency = 'USDC',
  orchardId, 
  pocketsCount = 0, 
  orchardTitle = "Orchard",
  growerId,
  paymentType = 'orchard',
  message,
  paymentDetails,
  onPaymentComplete
}) => {
  const resolvedPaymentType = paymentDetails?.type === 'tithing'
    ? 'tithe'
    : paymentDetails?.type === 'free_will_gift'
      ? 'freewill'
      : paymentType;

  const resolvedAmount = Number(paymentDetails?.amount ?? amount) || 0;
  const resolvedCurrency = paymentDetails?.currency ?? currency;
  const resolvedOrchardId = paymentDetails?.orchardId ?? orchardId;
  const resolvedGrowerId = paymentDetails?.growerId ?? growerId;
  const resolvedMessage = paymentDetails?.message ?? message;
  const resolvedTitle = paymentDetails?.orchardTitle ?? orchardTitle;
  const resolvedPocketsCount = Array.isArray(paymentDetails?.pockets)
    ? paymentDetails.pockets.length
    : pocketsCount;
  const modalTitle = resolvedPaymentType === 'orchard' ? `Support ${resolvedTitle}` : resolvedTitle;

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
          <CardTitle>{modalTitle}</CardTitle>
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
              <span className="font-medium">{resolvedPocketsCount}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Amount:</span>
              <span>{resolvedAmount.toFixed(2)} {resolvedCurrency}</span>
            </div>
          </div>

          <PaymentMethodSelector
            orchardId={resolvedOrchardId}
            amount={resolvedAmount}
            pocketsCount={resolvedPocketsCount}
            growerId={resolvedGrowerId}
            message={resolvedMessage}
            paymentType={resolvedPaymentType}
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
