// useContentPurchase — Shape 1 client hook.
// Initiates a fixed-price content purchase via the create-content-purchase-order
// edge function and redirects the buyer to the provider checkout (NOWPayments
// invoice URL or PayPal approve URL).

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ContentType =
  | 'library_item'
  | 'live_session_media'
  | 'music_track'
  | 'premium_item'
  | 'premium_room_access';

export type PurchaseProvider = 'nowpayments' | 'paypal';

interface PurchaseArgs {
  contentType: ContentType;
  contentId: string;
  provider: PurchaseProvider;
  payCurrency?: string; // NOWPayments: e.g. 'usdttrc20'
}

export function useContentPurchase() {
  const [isPending, setIsPending] = useState(false);

  const purchase = useCallback(async (args: PurchaseArgs) => {
    setIsPending(true);
    try {
      if (args.provider === 'nowpayments' && !args.payCurrency) {
        toast.error('Please pick a crypto to pay with.');
        return null;
      }
      const { data, error } = await supabase.functions.invoke(
        'create-content-purchase-order',
        {
          body: {
            contentType: args.contentType,
            contentId: args.contentId,
            provider: args.provider,
            payCurrency: args.payCurrency,
            redirectBaseUrl: window.location.origin,
          },
        },
      );
      if (error) {
        toast.error(error.message ?? 'Could not start checkout.');
        return null;
      }
      const redirectUrl =
        (data as any)?.invoiceUrl ?? (data as any)?.approveUrl ?? null;
      if (!redirectUrl) {
        toast.error('Provider did not return a checkout URL.');
        return null;
      }
      window.location.href = redirectUrl;
      return data as { purchaseId: string };
    } catch (err: any) {
      console.error('useContentPurchase failed', err);
      toast.error(err?.message ?? 'Checkout failed.');
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { purchase, isPending };
}
