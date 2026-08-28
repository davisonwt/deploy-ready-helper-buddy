// useContentPurchase — Shape 1 client hook.
// Initiates a fixed-price content purchase via the create-content-purchase-order
// edge function and redirects the buyer to the provider checkout (NOWPayments
// invoice URL or PayPal approve URL).

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

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
  payCurrency?: string; // NOWPayments: DEFAULT_CRYPTO_PAY_CURRENCY unless a caller has a real reason to override
  metadata?: Record<string, unknown>;
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
      const data = await invokePaymentFunction(
        'create-content-purchase-order',
        {
          contentType: args.contentType,
          contentId: args.contentId,
          provider: args.provider,
          payCurrency: args.payCurrency,
          metadata: args.metadata ?? {},
          redirectBaseUrl: window.location.origin,
        },
      );
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
