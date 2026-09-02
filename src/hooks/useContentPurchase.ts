// useContentPurchase — Shape 1 client hook.
// Initiates a fixed-price content purchase via the create-content-purchase-order
// edge function. Solana payments are shown inline (presentSolanaPayment, no
// redirect); PayPal redirects to the hosted approval page as before.

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { presentSolanaPayment, type SolanaPaymentResponse } from '@/lib/payments/solanaPaymentGate';

export type ContentType =
  | 'library_item'
  | 'live_session_media'
  | 'music_track'
  | 'premium_item'
  | 'premium_room_access';

export type PurchaseProvider = 'solana' | 'paypal';

interface PurchaseArgs {
  contentType: ContentType;
  contentId: string;
  provider: PurchaseProvider;
  metadata?: Record<string, unknown>;
}

export function useContentPurchase() {
  const [isPending, setIsPending] = useState(false);

  const purchase = useCallback(async (args: PurchaseArgs) => {
    setIsPending(true);
    try {
      const data = await invokePaymentFunction(
        'create-content-purchase-order',
        {
          contentType: args.contentType,
          contentId: args.contentId,
          provider: args.provider,
          metadata: args.metadata ?? {},
          redirectBaseUrl: window.location.origin,
        },
      );

      const solanaPayment = (data as { solanaPayment?: SolanaPaymentResponse })?.solanaPayment;
      if (solanaPayment) {
        const resolution = await presentSolanaPayment(solanaPayment);
        if (resolution !== 'paid') return null;
        return data as { purchaseId: string };
      }

      const redirectUrl = (data as any)?.approveUrl ?? null;
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
