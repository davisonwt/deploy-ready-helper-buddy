import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaypalOrder {
  bestowalId: string;
  orderId: string;
  approveUrl: string | null;
  breakdown: {
    baseAmount: number;
    processorFee: number;
    processorFeePct: number;
    buyerTotal: number;
    currency: string;
  };
}

export interface CreatePaypalOrderInput {
  orchardId: string;
  pocketsCount: number;
  message?: string;
  growerId?: string | null;
  redirectBaseUrl?: string;
}

/**
 * Client hook for the PayPal inbound rail. Exposes:
 *  - createOrder(input) → posts to create-paypal-order
 *  - redirectToApprove(approveUrl) → sends the buyer to PayPal hosted approval
 *
 * For status updates, reuse `useBestowalStatus` from `@/hooks/useNowPayments`
 * — it is provider-agnostic (subscribes to the bestowals row).
 */
export function usePaypal() {
  const createOrder = useCallback(
    async (input: CreatePaypalOrderInput): Promise<PaypalOrder> => {
      const { data, error } = await supabase.functions.invoke(
        'create-paypal-order',
        { body: input },
      );
      if (error) throw error;
      if (!data || data.error) {
        throw new Error(data?.error ?? 'unknown_error');
      }
      return data as PaypalOrder;
    },
    [],
  );

  const redirectToApprove = useCallback((approveUrl: string) => {
    window.location.href = approveUrl;
  }, []);

  return { createOrder, redirectToApprove };
}
