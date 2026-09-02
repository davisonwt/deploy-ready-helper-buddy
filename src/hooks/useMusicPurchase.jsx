import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { presentSolanaPayment } from '@/lib/payments/solanaPaymentGate';

/**
 * Music purchase via the unified Shape-1 content_purchases pipeline.
 * Solana payments are shown inline (presentSolanaPayment, no redirect);
 * PayPal redirects to the hosted approval page. Payment confirmation
 * finalizes the music_purchases row + delivers a buyer notification.
 *
 * Signatures supported (callers in the codebase vary):
 *   purchaseTrack(track, price, { provider })
 *   purchaseTrack(trackId, price, { provider })
 *
 * `opts.provider` is REQUIRED — 'solana' or 'paypal', whichever the
 * bestower actually picked. There is no default; a missing/invalid
 * provider is a caller bug, not something to silently paper over by
 * picking one for them.
 */
export function useMusicPurchase() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const purchaseTrack = async (trackOrId, _price, opts = {}) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase music tracks',
        variant: 'destructive',
      });
      return { success: false };
    }

    const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
    if (!trackId) {
      toast({ title: 'Purchase failed', description: 'Track id missing', variant: 'destructive' });
      return { success: false };
    }

    if (opts.provider !== 'paypal' && opts.provider !== 'solana') {
      toast({ title: 'Purchase failed', description: 'Choose a payment method first', variant: 'destructive' });
      return { success: false };
    }
    const provider = opts.provider;

    try {
      setLoading(true);
      const data = await invokePaymentFunction('create-content-purchase-order', {
        contentType: 'music_track',
        contentId: trackId,
        provider,
        redirectBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
      });

      if (data?.solanaPayment) {
        const resolution = await presentSolanaPayment(data.solanaPayment);
        if (resolution !== 'paid') return { success: false };
        return { success: true, data };
      }

      const redirectUrl = data?.approveUrl;
      if (!redirectUrl) throw new Error('Provider did not return a checkout URL');
      window.location.href = redirectUrl;
      return { success: true, data };
    } catch (error) {
      console.error('Music purchase failed:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to start checkout',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const getPurchaseHistory = async () => {
    if (!user) return { success: false, data: [] };

    try {
      const { data, error } = await supabase
        .from('music_purchases')
        .select(`
          *,
          dj_music_tracks!inner (
            track_title,
            artist_name,
            file_type
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get purchase history:', error);
      return { success: false, data: [] };
    }
  };

  const hasPurchased = async (trackId) => {
    if (!user || !trackId) return false;
    const { data } = await supabase
      .from('music_purchases')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('track_id', trackId)
      .eq('payment_status', 'completed')
      .limit(1)
      .maybeSingle();
    return !!data;
  };

  return {
    purchaseTrack,
    getPurchaseHistory,
    hasPurchased,
    loading,
  };
}
