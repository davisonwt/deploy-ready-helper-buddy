import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RadioBestowlData {
  trackId?: string;
  documentId?: string;
  amount: number;
  listenerId: string;
  sowerId: string;
  scheduleId: string;
}

/**
 * DISABLED — previous implementation inserted bestowals with
 * payment_status='completed' and payment_invoices with status='paid'
 * directly from the client, without ever charging the listener. That
 * was an active free-money path and has been short-circuited.
 *
 * TODO: rebuild on the approved NOWPayments / PayPal create-order +
 * webhook-verified completion flow.
 */
export const useRadioBestowal = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const processRadioBestowal = async (_data: RadioBestowlData) => {
    toast({
      title: 'Bestowals temporarily disabled',
      description:
        'Radio bestowals are paused while we migrate to our approved payment providers (NOWPayments / PayPal). Please try again soon.',
      variant: 'destructive',
    });
    return { success: false, error: new Error('Bestowals temporarily disabled') };
  };

  return {
    processRadioBestowal,
    loading,
  };
};
