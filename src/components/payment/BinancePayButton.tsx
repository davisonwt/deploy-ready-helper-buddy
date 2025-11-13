import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Wallet, ExternalLink } from 'lucide-react';
import { useBinancePay } from '@/hooks/useBinancePay';

interface BinancePayButtonProps {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function BinancePayButton({
  orchardId,
  amount,
  pocketsCount,
  message,
  growerId,
  onSuccess,
  disabled
}: BinancePayButtonProps) {
  const { processing, initiateBinancePayment } = useBinancePay();
  const [showInfo, setShowInfo] = useState(false);

  const handlePayment = async () => {
    const result = await initiateBinancePayment({
      orchardId,
      amount,
      pocketsCount,
      message,
      growerId
    });

    if (result?.paymentUrl) {
      window.open(result.paymentUrl, '_blank');
      onSuccess?.();
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={disabled || processing}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Pay with Binance Pay
          </>
        )}
      </Button>

      {showInfo && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h4 className="font-semibold text-sm mb-2 flex items-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            Payment Distribution
          </h4>
          <div className="text-xs space-y-1 text-muted-foreground">
            <p>• Your payment goes to s2gholding wallet first</p>
            <p>• 15% distributed to s2gbestow (10% tithing + 5% admin)</p>
            <p>• {growerId ? '75%' : '85%'} goes to the sower</p>
            {growerId && <p>• 10% goes to the product whispers</p>}
          </div>
        </Card>
      )}

      <button
        onClick={() => setShowInfo(!showInfo)}
        className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
      >
        {showInfo ? 'Hide' : 'Show'} payment details
      </button>
    </div>
  );
}
