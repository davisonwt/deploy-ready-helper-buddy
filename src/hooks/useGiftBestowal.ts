import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { presentSolanaPayment, type SolanaPaymentResponse } from '@/lib/payments/solanaPaymentGate';

export type GiftContextKind = 'live_session' | 'radio_session' | 'chat_tip';
export type GiftProvider = 'solana' | 'paypal' | 'balance';

export interface GiftBestowalInput {
  recipientId: string;
  amount: number;
  contextKind: GiftContextKind;
  contextId: string;
  provider: GiftProvider;
  /** Unused (was NOWPayments-only). Kept optional so existing callers compile unchanged. */
  payCurrency?: string;
  message?: string;
}

interface GiftBestowalResult {
  success: boolean;
  bestowalId?: string;
  redirectUrl?: string;
  error?: string;
}

/**
 * Free-will gift bestowal shared by:
 *   - live-session bestowals (classroom / skilldrop / training)
 *   - radio bestowals
 *   - in-chat tipping (BestowalCoin)
 *
 * Calls the create-gift-bestowal-order edge function, which either creates
 * a direct Solana payment intent (shown inline via presentSolanaPayment,
 * no redirect) or a PayPal order (redirect to the hosted approval page).
 * Payment confirmation (paypal-webhook, or check-solana-payment /
 * sweep-solana-payments for Solana) verifies payment and dispatches the
 * recipient + S2G splits via finalizeCompletedOrder.
 */
export function useGiftBestowal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const send = async (input: GiftBestowalInput): Promise<GiftBestowalResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-gift-bestowal-order', {
        body: {
          recipientId: input.recipientId,
          amount: input.amount,
          contextKind: input.contextKind,
          contextId: input.contextId,
          provider: input.provider,
          payCurrency: input.payCurrency,
          message: input.message,
          redirectBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error || !data) {
        const msg = error?.message ?? 'Could not start the bestowal.';
        toast({ title: 'Bestowal failed', description: msg, variant: 'destructive' });
        return { success: false, error: msg };
      }

      if ((data as { error?: string }).error) {
        const msg = (data as { error: string; message?: string }).message
          ?? (data as { error: string }).error;
        if ((data as { error: string }).error === 'insufficient_balance') {
          toast({ title: 'S2G Balance is short', description: 'Top up to pay this way.', variant: 'destructive' });
        } else {
          toast({ title: 'Bestowal failed', description: msg, variant: 'destructive' });
        }
        return { success: false, error: msg };
      }

      const bestowalId = (data as { bestowalId?: string }).bestowalId;

      if ((data as { balance?: { debited: true } }).balance?.debited) {
        // Debited and finalized synchronously — no wallet, no redirect.
        return { success: true, bestowalId };
      }

      const solanaPayment = (data as { solanaPayment?: SolanaPaymentResponse }).solanaPayment;

      if (solanaPayment) {
        const resolution = await presentSolanaPayment(solanaPayment);
        if (resolution !== 'paid') {
          return { success: false, error: resolution === 'expired' ? 'payment_expired' : 'cancelled' };
        }
        return { success: true, bestowalId };
      }

      const redirect = (data as { approveUrl?: string }).approveUrl;
      if (!redirect) {
        toast({
          title: 'Bestowal failed',
          description: 'Payment provider did not return a checkout URL.',
          variant: 'destructive',
        });
        return { success: false, error: 'no_redirect_url' };
      }

      window.location.href = redirect;

      return {
        success: true,
        bestowalId,
        redirectUrl: redirect,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Bestowal failed', description: msg, variant: 'destructive' });
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return { send, loading };
}
