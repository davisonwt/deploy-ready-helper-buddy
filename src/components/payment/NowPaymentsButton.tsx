import { Button } from '@/components/ui/button';
import { Loader2, Wallet, ShoppingCart, Heart } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ProductItem {
  id: string;
  title: string;
  price: number;
  sower_id: string;
}

interface NowPaymentsButtonProps {
  // For orchard bestowals
  orchardId?: string;
  amount: number;
  pocketsCount?: number;
  message?: string;
  growerId?: string;
  // Payment type
  paymentType?: 'orchard' | 'product' | 'tithe' | 'freewill';
  // For product bestowals
  productItems?: ProductItem[];
  // Common
  disabled?: boolean;
  onSuccess?: (bestowalId: string, invoiceUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  buttonText?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function NowPaymentsButton({
  orchardId,
  amount,
  pocketsCount = 1,
  message,
  growerId,
  paymentType = 'orchard',
  productItems,
  disabled = false,
  onSuccess,
  onError,
  className,
  buttonText,
  variant = 'outline',
  size = 'lg',
}: NowPaymentsButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const generateIdempotencyKey = () => {
    return `nowpay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  };

  const handleClick = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to make a payment',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Please log in to make a payment');
      }

      const idempotencyKey = generateIdempotencyKey();

      const requestBody: Record<string, any> = {
        amount,
        paymentType,
        currency: 'USD',
        message,
      };

      // Add type-specific data
      if (paymentType === 'orchard' && orchardId) {
        requestBody.orchardId = orchardId;
        requestBody.pocketsCount = pocketsCount;
      } else if (paymentType === 'product' && productItems) {
        requestBody.productItems = productItems;
      }

      const response = await supabase.functions.invoke('create-nowpayments-order', {
        body: requestBody,
        headers: {
          'x-idempotency-key': idempotencyKey,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create payment');
      }

      const data = response.data;

      if (!data.success || !data.invoiceUrl) {
        throw new Error('Failed to create payment invoice');
      }

      toast({
        title: 'Payment Created',
        description: 'Redirecting to payment page...',
      });

      // Call success callback
      onSuccess?.(data.bestowalId, data.invoiceUrl);

      // Redirect to NOWPayments checkout
      window.location.href = data.invoiceUrl;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine button text and icon based on payment type
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Payment...
        </>
      );
    }

    if (buttonText) {
      return (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      );
    }

    switch (paymentType) {
      case 'product':
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Pay with Crypto
          </>
        );
      case 'tithe':
      case 'freewill':
        return (
          <>
            <Heart className="mr-2 h-4 w-4" />
            Give with Crypto
          </>
        );
      default:
        return (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Pay with Crypto
          </>
        );
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading || !user}
      className={className}
      variant={variant}
      size={size}
    >
      {getButtonContent()}
    </Button>
  );
}
