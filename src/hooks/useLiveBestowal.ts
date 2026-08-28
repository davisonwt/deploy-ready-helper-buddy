import { useGiftBestowal, type GiftProvider } from '@/hooks/useGiftBestowal';
import { DEFAULT_CRYPTO_PAY_CURRENCY } from '@/lib/payments/providerFees';

/**
 * Generalized free-will bestowal for live sessions
 * (classroom / skilldrop / training).
 *
 * Thin facade over useGiftBestowal — keeps the existing call sites unchanged.
 * Now wired to the real NOWPayments / PayPal create-order + webhook flow
 * (no more direct client-side bestowals.payment_status='completed' inserts).
 */
export interface LiveBestowalInput {
  sowerId: string;
  bestowerId: string; // accepted for API back-compat; ignored (server reads auth.uid())
  amount: number;
  sessionKind: 'classroom' | 'skilldrop' | 'training' | string;
  sessionId: string;
  mediaId?: string | null;
  note?: string;
  /** Required — no default. The bestower must have chosen this. */
  provider: GiftProvider;
  payCurrency?: string;
}

export function useLiveBestowal() {
  const { send, loading } = useGiftBestowal();

  const sendBestowal = async (data: LiveBestowalInput) => {
    const result = await send({
      recipientId: data.sowerId,
      amount: data.amount,
      contextKind: 'live_session',
      contextId: data.sessionId,
      provider: data.provider,
      payCurrency: data.payCurrency ?? DEFAULT_CRYPTO_PAY_CURRENCY,
      message: data.note,
    });
    return result.success
      ? { success: true as const, bestowalId: result.bestowalId }
      : { success: false as const, error: new Error(result.error ?? 'Bestowal failed') };
  };

  return { sendBestowal, loading };
}
