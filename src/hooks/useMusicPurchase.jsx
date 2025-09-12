import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUSDCPayments } from './useUSDCPayments';

export function useMusicPurchase() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { transferUSDC, checkSufficientBalance } = useUSDCPayments();

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

      // Pricing: 1.25 USDC to artist + 10.5% to Sow2Grow (total ≈ 1.38 USDC)
      const baseAmount = 1.25;
      const sow2growFee = baseAmount * 0.105;
      const totalAmount = baseAmount + sow2growFee;

      // Check wallet balance
      if (!checkSufficientBalance(totalAmount)) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${totalAmount.toFixed(2)} USDC to purchase this track`,
          variant: "destructive",
        });
        return { success: false };
      }

      toast({
        title: "Processing Payment",
        description: `Purchasing "${track.track_title}" for ${totalAmount.toFixed(2)} USDC`,
      });

      // 1) Resolve owner (artist) wallet
      const { data: ownerLookup, error: ownerLookupError } = await supabase
        .from('dj_music_tracks')
        .select('id, radio_djs!inner(user_id)')
        .eq('id', track.id)
        .single();

      if (ownerLookupError || !ownerLookup?.radio_djs?.user_id) {
        throw new Error('Could not resolve track owner');
      }

      const ownerUserId = ownerLookup.radio_djs.user_id;

      const { data: ownerWallet, error: ownerWalletError } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', ownerUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (ownerWalletError || !ownerWallet?.wallet_address) {
        throw new Error("Artist hasn't set up a wallet yet");
      }

      // 2) Resolve Sow2Grow platform wallet
      const { data: platformWallet, error: platformError } = await supabase
        .rpc('get_payment_wallet_address')
        .single();

      if (platformError || !platformWallet?.wallet_address) {
        throw new Error('Platform wallet not available');
      }

      // 3) Execute wallet-to-wallet transfers
      const ownerPayment = await transferUSDC({
        recipientAddress: ownerWallet.wallet_address,
        amount: baseAmount,
        memo: `Music purchase: ${track.track_title}`,
      });

      if (!ownerPayment.success) {
        throw new Error(ownerPayment.error || 'Failed to send payment to artist');
      }

      let feePaymentSig = null;
      if (sow2growFee > 0) {
        const feePayment = await transferUSDC({
          recipientAddress: platformWallet.wallet_address,
          amount: sow2growFee,
          memo: `Sow2Grow fee for music purchase: ${track.track_title}`,
        });
        if (!feePayment.success) {
          throw new Error(feePayment.error || 'Failed to send platform fee');
        }
        feePaymentSig = feePayment.signature;
      }

      // 4) Complete purchase delivery via Edge Function
      const { data, error } = await supabase.functions.invoke('purchase-music-track', {
        body: {
          trackId: track.id,
          paymentReference: ownerPayment.signature,
        }
      });

      if (error) throw error;

      toast({
        title: 'Purchase Successful!',
        description: `${track.track_title} has been sent to your direct messages`,
      });

      return { success: true, data, signatures: [ownerPayment.signature, feePaymentSig].filter(Boolean) };

    } catch (error) {
      console.error('Music purchase failed:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to complete purchase',
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

  return {
    purchaseTrack,
    getPurchaseHistory,
    loading
  };
}