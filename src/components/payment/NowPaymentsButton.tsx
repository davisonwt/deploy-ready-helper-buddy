import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';
import { useNowPaymentsPay } from '@/hooks/useNowPaymentsPay';
import { useAuth } from '@/hooks/useAuth';

interface NowPaymentsButtonProps {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function NowPaymentsButton({
  orchardId,
  amount,
  pocketsCount,
  message,
  growerId,
  disabled = false,
  onSuccess,
  className,
}: NowPaymentsButtonProps) {
  const { user } = useAuth();
  const { createPayment, isLoading } = useNowPaymentsPay();

  const handleClick = async () => {
    if (!user) {
      return;
    }

    try {
      await createPayment({
        orchardId,
        amount,
        pocketsCount,
        message,
        growerId,
        onSuccess: (bestowalId, invoiceUrl) => {
          console.log('Payment initiated:', { bestowalId, invoiceUrl });
          onSuccess?.();
        },
      });
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading || !user}
      className={className}
      variant="outline"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Payment...
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Pay with Crypto
        </>
      )}
    </Button>
  );
}
