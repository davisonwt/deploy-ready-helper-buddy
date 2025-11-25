import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RadioBestowlData {
  trackId?: string;
  documentId?: string;
  amount: number;
  listenerId: string;
  sowerId: string;
  scheduleId: string;
}

export const useRadioBestowal = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const processRadioBestowal = async (data: RadioBestowlData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate fees
      const tithingFee = data.amount * 0.10; // 10%
      const adminFee = data.amount * 0.05; // 5%
      const sowerAmount = data.amount - tithingFee - adminFee;

      // Create bestowal record
      const { data: bestowlRecord, error: bestowlError } = await supabase
        .from('bestowals')
        .insert({
          bestower_id: data.listenerId,
          amount: data.amount,
          currency: 'USDT',
          payment_status: 'completed',
          payment_method: 'binance_pay',
          orchard_id: data.sowerId,
          pockets_count: 1,
        })
        .select()
        .single();

      if (bestowlError) throw bestowlError;

      // Get or create verification rooms for notifications
      const { data: sowerRoom } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: data.sowerId,
        user2_id: data.listenerId,
      });

      const { data: gosatProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', 'gosat')
        .single();

      const { data: gosatRoom } = gosatProfile ? await supabase.rpc('get_or_create_direct_room', {
        user1_id: gosatProfile.user_id,
        user2_id: data.listenerId,
      }) : { data: null };

      // Send notification to sower
      if (sowerRoom) {
        await supabase.from('chat_messages').insert({
          room_id: sowerRoom,
          sender_id: null,
          content: `🎙️ A listener bestowed $${data.amount} USDT on your content during the radio broadcast! You'll receive $${sowerAmount.toFixed(2)} after fees.`,
          message_type: 'text',
          system_metadata: {
            is_system: true,
            type: 'radio_bestowal',
            bestowal_id: bestowlRecord.id,
          },
        });
      }

      // Send notification to gosat about fees
      if (gosatRoom) {
        await supabase.from('chat_messages').insert({
          room_id: gosatRoom,
          sender_id: null,
          content: `💰 Tithing ($${tithingFee.toFixed(2)}) and Admin fee ($${adminFee.toFixed(2)}) received from radio bestowal to s2gaadmin wallet.`,
          message_type: 'text',
          system_metadata: {
            is_system: true,
            type: 'admin_fees',
            bestowal_id: bestowlRecord.id,
          },
        });
      }

      // Create invoice for bestower
      const invoiceNumber = `INV-${Date.now()}`;
      await supabase.from('payment_invoices').insert({
        invoice_number: invoiceNumber,
        user_id: data.listenerId,
        amount: data.amount,
        currency: 'USDT',
        status: 'paid',
        payment_method: 'binance_pay',
        payment_reference: bestowlRecord.id,
        invoice_type: 'radio_bestowal',
        metadata: {
          track_id: data.trackId,
          document_id: data.documentId,
          schedule_id: data.scheduleId,
          sower_id: data.sowerId,
        },
      });

      // Send invoice notification to bestower
      if (gosatRoom) {
        await supabase.from('chat_messages').insert({
          room_id: gosatRoom,
          sender_id: null,
          content: `📄 Invoice ${invoiceNumber} for your radio bestowal of $${data.amount} USDT has been generated.`,
          message_type: 'text',
          system_metadata: {
            is_system: true,
            type: 'invoice',
            invoice_number: invoiceNumber,
          },
        });
      }

      toast({
        title: 'Bestowal Complete',
        description: `$${data.amount} USDT bestowed successfully! Invoice ${invoiceNumber} sent.`,
      });

      return { success: true, bestowlRecord };
    } catch (error: any) {
      console.error('Radio bestowal error:', error);
      toast({
        title: 'Bestowal Failed',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    processRadioBestowal,
    loading,
  };
};
