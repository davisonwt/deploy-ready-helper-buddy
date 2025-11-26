import { useState } from 'react';
import { useWallet } from './useWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { USDC_ADDRESS, USDC_ABI, parseUSDC } from '@/lib/cronos';

interface PaymentSplit {
  artistAddress: string;
  artistAmount: number;
  platformAddress?: string;
  platformAmount?: number;
  adminAddress?: string;
  adminAmount?: number;
}

export function useCryptoPay() {
  const [processing, setProcessing] = useState(false);
  const { connected, walletAddress, connectWallet } = useWallet();

  const processPayment = async (
    amount: number,
    splits: PaymentSplit,
    onSuccess: (txHash: string) => void
  ) => {
    if (!connected) {
      await connectWallet();
      return;
    }

    if (!window.ethereum) {
      toast.error('Crypto wallet not found');
      return;
    }

    try {
      setProcessing(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

      // Artist payment (89.5%)
      const artistAmountWei = parseUSDC(splits.artistAmount);
      const artistTx = await usdcContract.transfer(splits.artistAddress, artistAmountWei);
      await artistTx.wait();

      // Platform fee (10%) if specified
      if (splits.platformAddress && splits.platformAmount) {
        const platformAmountWei = parseUSDC(splits.platformAmount);
        const platformTx = await usdcContract.transfer(splits.platformAddress, platformAmountWei);
        await platformTx.wait();
      }

      // Admin fee (0.5%) if specified
      if (splits.adminAddress && splits.adminAmount) {
        const adminAmountWei = parseUSDC(splits.adminAmount);
        const adminTx = await usdcContract.transfer(splits.adminAddress, adminAmountWei);
        await adminTx.wait();
      }

      toast.success('Payment completed successfully!');
      onSuccess(artistTx.hash);
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const buySong = async (track: any) => {
    // Minimum 2.00 USDC for single music tracks (includes 10% tithing + 5% admin fee)
    // The 2 USDC is the TOTAL amount - fees are already included
    const totalAmount = track.price && track.price >= 2.00 ? track.price : 2.00;
    
    // Calculate distribution from total (fees already included in the 2 USDC)
    const tithingAmount = totalAmount * 0.10; // 10% tithing
    const adminFee = totalAmount * 0.05; // 5% admin fee
    const artistAmount = totalAmount - tithingAmount - adminFee; // Remaining to artist

    // Get platform wallet
    const { data: platformWallet } = await supabase
      .rpc('get_payment_wallet_address')
      .single();

    if (!platformWallet?.wallet_address) {
      toast.error('Platform wallet not configured');
      return;
    }

    await processPayment(
      totalAmount,
      {
        artistAddress: track.wallet_address,
        artistAmount,
        platformAddress: platformWallet.wallet_address,
        platformAmount: platformFee,
        adminAddress: platformWallet.wallet_address, // Reuse for now
        adminAmount: adminFee,
      },
      async (txHash) => {
        // Record purchase
        await supabase.from('music_purchases').insert({
          track_id: track.id,
          buyer_id: (await supabase.auth.getUser()).data.user?.id,
          amount: totalAmount,
          platform_fee: tithingAmount,
          sow2grow_fee: adminFee,
          artist_amount: artistAmount,
          total_amount: totalAmount,
          payment_reference: txHash,
          payment_status: 'completed',
        });
      }
    );
  };

  const buySession = async (session: any, onSuccess: () => void) => {
    const amount = session.price || 5;

    // Get host wallet from profiles via DJ
    const { data: hostData } = await supabase
      .from('radio_schedule')
      .select('dj_id, radio_djs!inner(user_id, profiles!user_id(*))')
      .eq('id', session.id)
      .single();

    const hostWallet = (hostData as any)?.radio_djs?.profiles?.wallet_address;
    
    if (!hostWallet) {
      toast.error('Host wallet not configured');
      return;
    }

    const hostAmount = amount * 0.995; // 99.5% to host
    const adminAmount = amount * 0.005; // 0.5% to admin

    const { data: platformWallet } = await supabase
      .rpc('get_payment_wallet_address')
      .single();

    await processPayment(
      amount,
      {
        artistAddress: hostWallet,
        artistAmount: hostAmount,
        adminAddress: platformWallet?.wallet_address,
        adminAmount,
      },
      async (txHash) => {
        // Record session purchase
        await supabase.from('user_sessions').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          session_id: session.id,
          amount,
          payment_reference: txHash,
        });
        onSuccess();
      }
    );
  };

  return {
    processing,
    connected,
    walletAddress,
    connectWallet,
    buySong,
    buySession,
    processPayment,
  };
}
