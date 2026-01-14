import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseNowPaymentsPayOptions {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  onSuccess?: (bestowalId: string, invoiceUrl: string) => void;
  onError?: (error: Error) => void;
}

interface NowPaymentsResponse {
  success: boolean;
  bestowalId: string;
  invoiceId: string;
  invoiceUrl: string;
}

export function useNowPaymentsPay() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const generateIdempotencyKey = () => {
    return `nowpay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  };

  const createPayment = async ({
    orchardId,
    amount,
    pocketsCount,
    message,
    onSuccess,
    onError,
  }: UseNowPaymentsPayOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Please log in to make a payment');
      }

      const idempotencyKey = generateIdempotencyKey();

      const response = await supabase.functions.invoke('create-nowpayments-order', {
        body: {
          orchardId,
          amount,
          pocketsCount,
          message,
          currency: 'USD',
        },
        headers: {
          'x-idempotency-key': idempotencyKey,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create payment');
      }

      const data = response.data as NowPaymentsResponse;

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

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });

      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPayment,
    isLoading,
    error,
  };
}
