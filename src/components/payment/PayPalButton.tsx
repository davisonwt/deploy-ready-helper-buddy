import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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

interface PayPalButtonProps {
  orchardId?: string;
  amount: number;
  pocketsCount?: number;
  message?: string;
  growerId?: string;
  paymentType?: 'orchard' | 'product' | 'tithe' | 'freewill';
  productItems?: ProductItem[];
  disabled?: boolean;
  onSuccess?: (bestowalId: string, approvalUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  buttonText?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PayPalButton({
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
}: PayPalButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to make a payment', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please log in to make a payment');

      const requestBody: Record<string, any> = {
        amount,
        paymentType,
        currency: 'USD',
        message,
      };

      if (paymentType === 'orchard' && orchardId) {
        requestBody.orchardId = orchardId;
        requestBody.pocketsCount = pocketsCount;
      } else if (paymentType === 'product' && productItems) {
        requestBody.productItems = productItems;
      }

      const response = await supabase.functions.invoke('create-paypal-order', {
        body: requestBody,
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create PayPal payment');

      const data = response.data;
      if (!data.success || !data.approvalUrl) throw new Error('Failed to create PayPal order');

      toast({ title: 'Redirecting to PayPal', description: 'Complete your payment on PayPal...' });
      onSuccess?.(data.bestowalId, data.approvalUrl);
      window.location.href = data.approvalUrl;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      toast({ title: 'Payment Failed', description: error.message, variant: 'destructive' });
      onError?.(error);
    } finally {
      setIsLoading(false);
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
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to PayPal...
        </>
      ) : (
        <>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.408-1.13.964L7.076 21.337z"/>
            <path d="M18.429 7.534c-.021.137-.048.276-.078.418-.99 5.09-4.383 6.85-8.716 6.85H7.822c-.568 0-1.05.413-1.14.974l-1.076 6.82-.305 1.934a.543.543 0 0 0 .536.627h3.76c.497 0 .92-.36.998-.848l.04-.208.79-5.008.051-.277a1.01 1.01 0 0 1 .998-.849h.63c4.064 0 7.244-1.65 8.178-6.424.39-1.996.188-3.662-.844-4.832a4.009 4.009 0 0 0-1.009-.827z" opacity="0.7"/>
          </svg>
          {buttonText || 'Pay with PayPal'}
        </>
      )}
    </Button>
  );
}
