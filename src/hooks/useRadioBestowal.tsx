import { useGiftBestowal, type GiftProvider } from '@/hooks/useGiftBestowal';

interface RadioBestowlData {
  trackId?: string;
  documentId?: string;
  amount: number;
  listenerId: string; // accepted for API back-compat; ignored (server reads auth.uid())
  sowerId: string;
  scheduleId: string;
  provider?: GiftProvider;
  payCurrency?: string;
}

/**
 * Free-will radio bestowal — thin facade over useGiftBestowal so the
 * existing radio UI keeps the same call signature. Now wired to the real
 * NOWPayments / PayPal create-order + webhook flow.
 */
export const useRadioBestowal = () => {
  const { send, loading } = useGiftBestowal();

  const processRadioBestowal = async (data: RadioBestowlData) => {
    const result = await send({
      recipientId: data.sowerId,
      amount: data.amount,
      contextKind: 'radio_session',
      contextId: data.scheduleId,
      provider: data.provider ?? 'nowpayments',
      payCurrency: data.payCurrency ?? 'usdttrc20',
    });
    return result.success
      ? { success: true as const, bestowalId: result.bestowalId }
      : { success: false as const, error: new Error(result.error ?? 'Bestowal failed') };
  };

  return { processRadioBestowal, loading };
};
