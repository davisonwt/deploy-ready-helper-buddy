import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUSDCPayments } from './useUSDCPayments';

export function useMusicPurchase() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { processBestowPart } = useUSDCPayments();

  const purchaseTrack = async (track) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase music tracks",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      setLoading(true);

      // Calculate total price: $1.25 + 10% + 0.5%
      const baseAmount = 1.25;
      const platformFee = baseAmount * 0.10;
      const sow2growFee = baseAmount * 0.005;
      const totalAmount = baseAmount + platformFee + sow2growFee;

      toast({
        title: "Processing Payment",
        description: `Purchasing "${track.track_title}" for $${totalAmount.toFixed(2)} USDC`,
      });

      // Process USDC payment
      const paymentResult = await processBestowPart({
        amount: totalAmount,
        orchard_id: null, // Not an orchard bestowal
        notes: `Music purchase: ${track.track_title}`,
        recipient_address: null // Will use platform wallet
      });

      if (!paymentResult.success) {
        toast({
          title: "Payment Failed",
          description: paymentResult.error || "Failed to process USDC payment",
          variant: "destructive",
        });
        return { success: false };
      }

      // Call edge function to complete purchase
      const { data, error } = await supabase.functions.invoke('purchase-music-track', {
        body: {
          trackId: track.id,
          paymentReference: paymentResult.signature
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Purchase Successful!",
        description: `${track.track_title} has been sent to your direct messages`,
      });

      return { success: true, data };

    } catch (error) {
      console.error('Music purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
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

  return {
    purchaseTrack,
    getPurchaseHistory,
    loading
  };
}