import { NowPaymentsButton } from './NowPaymentsButton';
import { PayPalButton } from './PayPalButton';
import { Separator } from '@/components/ui/separator';

interface ProductItem {
  id: string;
  title: string;
  price: number;
  sower_id: string;
}

interface PaymentMethodSelectorProps {
  orchardId?: string;
  amount: number;
  pocketsCount?: number;
  message?: string;
  growerId?: string;
  paymentType?: 'orchard' | 'product' | 'tithe' | 'freewill';
  productItems?: ProductItem[];
  disabled?: boolean;
  onSuccess?: (bestowalId: string, url: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  cryptoButtonText?: string;
  paypalButtonText?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PaymentMethodSelector({
  orchardId,
  amount,
  pocketsCount,
  message,
  growerId,
  paymentType = 'orchard',
  productItems,
  disabled = false,
  onSuccess,
  onError,
  className,
  cryptoButtonText,
  paypalButtonText,
  variant = 'outline',
  size = 'lg',
}: PaymentMethodSelectorProps) {
  const sharedProps = {
    orchardId,
    amount,
    pocketsCount,
    message,
    growerId,
    paymentType,
    productItems,
    disabled,
    onError,
    variant,
    size,
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        <NowPaymentsButton
          {...sharedProps}
          onSuccess={onSuccess}
          className="w-full"
          buttonText={cryptoButtonText}
        />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <Separator className="flex-1" />
        </div>

        <PayPalButton
          {...sharedProps}
          onSuccess={onSuccess}
          className="w-full"
          buttonText={paypalButtonText}
        />
      </div>
    </div>
  );
}
