import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentDetails {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  currency?: string; // e.g., "USDC", "USDT", "BTC"
  network?: string; // e.g., "TRC20", "ERC20", "BEP20"
}

interface CryptomusPaymentResponse {
  success: boolean;
  bestowalId: string;
  paymentUrl: string;
  paymentId?: string;
  address?: string;
  amount?: string;
  currency?: string;
  network?: string;
}

export function useCryptomusPay() {
  const [processing, setProcessing] = useState(false);

  const initiateCryptomusPayment = async (details: PaymentDetails) => {
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

      const { data, error } = await supabase.functions.invoke<CryptomusPaymentResponse>(
        'create-cryptomus-payment',
        {
          body: {
            orchardId: details.orchardId,
            amount: details.amount,
            pocketsCount: details.pocketsCount,
            message: details.message,
            growerId: details.growerId,
            currency: details.currency,
            network: details.network,
            clientOrigin: origin,
          },
          headers: {
            'x-idempotency-key': idempotencyKey,
          },
        }
      );

      if (error) {
        console.error('Cryptomus payment creation error:', error);
        throw new Error(error.message || 'Failed to create Cryptomus payment');
      }

      if (!data?.paymentUrl || !data?.bestowalId) {
        throw new Error('Cryptomus response missing payment URL');
      }

      toast.success('Cryptomus payment created. Complete payment to finalize your bestowal.');

      return {
        success: true,
        bestowalId: data.bestowalId,
        paymentUrl: data.paymentUrl,
        paymentId: data.paymentId,
        address: data.address,
        amount: data.amount,
        currency: data.currency,
        network: data.network,
      };

    } catch (error) {
      console.error('Cryptomus payment initiation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate payment');
      return null;
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    initiateCryptomusPayment,
  };
}

