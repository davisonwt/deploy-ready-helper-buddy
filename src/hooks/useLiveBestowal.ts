import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Generalized free-will bestowal for live sessions
 * (classroom / skilldrop / training / radio).
 *
 * Mirrors the recipe in useRadioBestowal: insert bestowals row,
 * notify sower + admin (gosat) via system chat messages, mint an invoice.
 */
export interface LiveBestowalInput {
  /** Receiver — host / instructor / DJ of the session */
  sowerId: string;
  /** Giver — must equal auth.uid() */
  bestowerId: string;
  amount: number;
  /** classroom / skilldrop / training / radio / live */
  sessionKind: string;
  sessionId: string;
  /** Optional: media being tipped (e.g. a specific track or submission) */
  mediaId?: string | null;
  note?: string;
}

export function useLiveBestowal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendBestowal = async (data: LiveBestowalInput) => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Please sign in to bestow.');
      if (auth.user.id !== data.bestowerId) throw new Error('Authentication mismatch.');
      if (!(data.amount > 0)) throw new Error('Amount must be greater than zero.');

      const tithingFee = data.amount * 0.10;
      const adminFee = data.amount * 0.05;
      const sowerAmount = data.amount - tithingFee - adminFee;

      const { data: bestowRecord, error: bestowErr } = await supabase
        .from('bestowals')
        .insert({
          bestower_id: data.bestowerId,
          amount: data.amount,
          currency: 'USDT',
          payment_status: 'completed',
          payment_method: 'binance_pay',
          orchard_id: data.sowerId,
          pockets_count: 1,
        })
        .select()
        .single();
      if (bestowErr) throw bestowErr;

      const { data: sowerRoom } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: data.sowerId,
        user2_id: data.bestowerId,
      });

      const { data: gosatProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', 'gosat')
        .maybeSingle();

      const gosatRoom = gosatProfile?.user_id
        ? (await supabase.rpc('get_or_create_direct_room', {
            user1_id: gosatProfile.user_id,
            user2_id: data.bestowerId,
          })).data
        : null;

      const kindLabel = data.sessionKind.charAt(0).toUpperCase() + data.sessionKind.slice(1);

      if (sowerRoom) {
        await supabase.from('chat_messages').insert({
          room_id: sowerRoom,
          sender_id: null,
          content: `🌱 A tribe member bestowed $${data.amount} USDT on you during your ${kindLabel} live session. You'll receive $${sowerAmount.toFixed(2)} after fees.${data.note ? `\n\nNote: ${data.note}` : ''}`,
          message_type: 'text',
          system_metadata: {
            is_system: true,
            type: 'live_session_bestowal',
            session_kind: data.sessionKind,
            session_id: data.sessionId,
            bestowal_id: (bestowRecord as any).id,
          },
        });
      }

      if (gosatRoom) {
        await supabase.from('chat_messages').insert({
          room_id: gosatRoom,
          sender_id: null,
          content: `💰 Tithing ($${tithingFee.toFixed(2)}) and Admin fee ($${adminFee.toFixed(2)}) received from ${kindLabel} bestowal to s2gaadmin wallet.`,
          message_type: 'text',
          system_metadata: {
            is_system: true,
            type: 'admin_fees',
            bestowal_id: (bestowRecord as any).id,
          },
        });
      }

      const invoiceNumber = `INV-${Date.now()}`;
      await (supabase as any).from('payment_invoices').insert({
        invoice_number: invoiceNumber,
        user_id: data.bestowerId,
        amount: data.amount,
        currency: 'USDT',
        status: 'paid',
        payment_method: 'binance_pay',
        payment_reference: (bestowRecord as any).id,
        invoice_type: `${data.sessionKind}_bestowal`,
        metadata: {
          session_kind: data.sessionKind,
          session_id: data.sessionId,
          media_id: data.mediaId ?? null,
          sower_id: data.sowerId,
        },
      });

      if (gosatRoom) {
        await supabase.from('chat_messages').insert({
          room_id: gosatRoom,
          sender_id: null,
          content: `📄 Invoice ${invoiceNumber} for your ${kindLabel} bestowal of $${data.amount} USDT has been generated.`,
          message_type: 'text',
          system_metadata: {
            is_system: true,
            type: 'invoice',
            invoice_number: invoiceNumber,
          },
        });
      }

      toast({
        title: 'Bestowal sent',
        description: `$${data.amount} USDT bestowed. Invoice ${invoiceNumber} on its way.`,
      });

      return { success: true, bestowalId: (bestowRecord as any).id, invoiceNumber };
    } catch (err: any) {
      console.error('[useLiveBestowal] error', err);
      toast({
        title: 'Bestowal failed',
        description: err?.message ?? 'Something went wrong.',
        variant: 'destructive',
      });
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { sendBestowal, loading };
}
