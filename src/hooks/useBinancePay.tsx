import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentDetails {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
}

interface BinancePaymentResponse {
  success: boolean;
  bestowalId: string;
  paymentUrl: string;
  prepayId?: string;
}

export function useBinancePay() {
  const [processing, setProcessing] = useState(false);

  const initiateBinancePayment = async (details: PaymentDetails) => {
    setProcessing(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to make a payment');
        return null;
      }

      const origin = window.location.origin;
      
      // Generate idempotency key for payment
      const idempotencyKey = `${user.id}-${details.orchardId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data, error } = await supabase.functions.invoke<BinancePaymentResponse>(
        'create-binance-pay-order',
        {
          body: {
            orchardId: details.orchardId,
            amount: details.amount,
            pocketsCount: details.pocketsCount,
            message: details.message,
            growerId: details.growerId,
            clientOrigin: origin,
          },
          headers: {
            'x-idempotency-key': idempotencyKey,
          },
        }
      );

      if (error) {
        console.error('Binance Pay order creation error:', error);
        throw new Error(error.message || 'Failed to create Binance Pay order');
      }

      if (!data?.paymentUrl || !data?.bestowalId) {
        throw new Error('Binance Pay response missing payment URL');
      }

      toast.success('Binance Pay order created. Complete payment to finalize your bestowal.');

      return {
        success: true,
        bestowalId: data.bestowalId,
        paymentUrl: data.paymentUrl,
        prepayId: data.prepayId,
      };

    } catch (error) {
      console.error('Binance Pay initiation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate payment');
      return null;
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    initiateBinancePayment,
  };
}
