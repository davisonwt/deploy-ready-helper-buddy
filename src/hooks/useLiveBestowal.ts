import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Generalized free-will bestowal for live sessions
 * (classroom / skilldrop / training / radio).
 *
 * DISABLED — previous implementation inserted bestowals with
 * payment_status='completed' and payment_invoices with status='paid'
 * directly from the client, without ever charging the bestower. That
 * was an active free-money path and has been short-circuited.
 *
 * TODO: rebuild on the approved NOWPayments / PayPal create-order +
 * webhook-verified completion flow (same pattern as the orchard and
 * basket rails).
 */
export interface LiveBestowalInput {
  sowerId: string;
  bestowerId: string;
  amount: number;
  sessionKind: string;
  sessionId: string;
  mediaId?: string | null;
  note?: string;
}

export function useLiveBestowal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendBestowal = async (_data: LiveBestowalInput) => {
    toast({
      title: 'Bestowals temporarily disabled',
      description:
        'Live-session bestowals are paused while we migrate to our approved payment providers (NOWPayments / PayPal). Please try again soon.',
      variant: 'destructive',
    });
    return { success: false, error: new Error('Bestowals temporarily disabled') };
  };

  return { sendBestowal, loading };
}
