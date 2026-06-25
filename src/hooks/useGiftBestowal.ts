import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type GiftContextKind = 'live_session' | 'radio_session' | 'chat_tip';
export type GiftProvider = 'nowpayments' | 'paypal';

export interface GiftBestowalInput {
  recipientId: string;
  amount: number;
  contextKind: GiftContextKind;
  contextId: string;
  provider: GiftProvider;
  payCurrency?: string; // required when provider = 'nowpayments'
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
 * Calls the create-gift-bestowal-order edge function which creates a
 * NOWPayments invoice OR PayPal order, then returns the buyer redirect URL.
 * The webhook (nowpayments-webhook / paypal-webhook) verifies payment and
 * dispatches the recipient + S2G splits via the existing dispatchPayouts().
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
        toast({ title: 'Bestowal failed', description: msg, variant: 'destructive' });
        return { success: false, error: msg };
      }

      const redirect = (data as { invoiceUrl?: string; approveUrl?: string }).invoiceUrl
        ?? (data as { approveUrl?: string }).approveUrl;

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
        bestowalId: (data as { bestowalId?: string }).bestowalId,
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
