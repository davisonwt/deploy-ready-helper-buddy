import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NowPaymentsInvoice {
  bestowalId: string;
  invoiceId?: string;
  invoiceUrl?: string;
  expiresAt?: string | null;
  breakdown: {
    baseAmount: number;
    processorFee: number;
    processorFeePct: number;
    buyerTotal: number;
    currency: string;
  };
}

export interface CreateInvoiceInput {
  orchardId: string;
  pocketsCount: number;
  payCurrency: string;
  message?: string;
  growerId?: string | null;
  redirectBaseUrl?: string;
}

export type BestowalPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'distributed'
  | string;

export type BestowalPayoutStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'manual_required'
  | string;

export interface BestowalLiveStatus {
  payment_status: BestowalPaymentStatus;
  payout_status: BestowalPayoutStatus;
  payout_reference: string | null;
  payout_error: string | null;
}

/**
 * Client hook for the NOWPayments inbound rail. Exposes:
 *  - createInvoice(input) → posts to create-nowpayments-invoice
 *  - useBestowalStatus(bestowalId) → Realtime-subscribed status of the bestowals row
 */
export function useNowPayments() {
  const createInvoice = useCallback(
    async (input: CreateInvoiceInput): Promise<NowPaymentsInvoice> => {
      const { data, error } = await supabase.functions.invoke(
        'create-nowpayments-invoice',
        { body: input },
      );
      if (error) throw error;
      if (!data || data.error) {
        throw new Error(data?.error ?? 'unknown_error');
      }
      return data as NowPaymentsInvoice;
    },
    [],
  );

  return { createInvoice };
}

export function useBestowalStatus(bestowalId: string | null) {
  const [status, setStatus] = useState<BestowalLiveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bestowalId) return;
    let cancelled = false;

    (async () => {
      const { data, error: fetchError } = await supabase
        .from('bestowals')
        .select('payment_status, payout_status, payout_reference, payout_error')
        .eq('id', bestowalId)
        .maybeSingle();
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      if (data) setStatus(data as BestowalLiveStatus);
    })();

    const channel = supabase
      .channel(`bestowal-status-${bestowalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bestowals',
          filter: `id=eq.${bestowalId}`,
        },
        (payload) => {
          const row = payload.new as BestowalLiveStatus;
          setStatus({
            payment_status: row.payment_status,
            payout_status: row.payout_status,
            payout_reference: row.payout_reference,
            payout_error: row.payout_error,
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bestowalId]);

  return { status, error };
}
