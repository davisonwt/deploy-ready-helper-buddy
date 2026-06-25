import { useState } from 'react';
import { toast } from 'sonner';

/**
 * DISABLED — Cryptomus is no longer an allowed payment rail.
 * Only NOWPayments and PayPal are permitted on this platform.
 *
 * Chat-asset tipping (BestowalCoin) is a per-sender payout shape
 * that does not fit the existing orchard-bestowal or basket-order
 * NOWPayments flows. A new backend (sender wallet/payout + webhook
 * credit) is required before this can be re-enabled.
 *
 * Backlog: rebuild chat tipping on NOWPayments with sender payout split.
 */

interface PaymentDetails {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  currency?: string;
  network?: string;
}

export function useCryptomusPay() {
  const [processing] = useState(false);

  const initiateCryptomusPayment = async (_details: PaymentDetails) => {
    toast.error(
      'Chat tipping is temporarily disabled while we migrate to our approved payment providers (NOWPayments / PayPal).'
    );
    return null;
  };

  return {
    processing,
    initiateCryptomusPayment,
  };
}
