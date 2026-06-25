import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Music purchase via the unified Shape-1 content_purchases pipeline.
 * Initiates a NOWPayments or PayPal checkout and redirects the buyer.
 * The webhook finalizes the music_purchases row + delivers a buyer notification.
 *
 * Signatures supported (callers in the codebase vary):
 *   purchaseTrack(track)
 *   purchaseTrack(trackId, price?)
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

    const provider = opts.provider === 'paypal' ? 'paypal' : 'nowpayments';
    const payCurrency = opts.payCurrency || 'usdttrc20';

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-content-purchase-order', {
        body: {
          contentType: 'music_track',
          contentId: trackId,
          provider,
          payCurrency: provider === 'nowpayments' ? payCurrency : undefined,
          redirectBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      const redirectUrl = data?.invoiceUrl || data?.approveUrl;
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
