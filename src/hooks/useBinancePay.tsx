import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WalletDistribution {
  s2gholding: string;
  s2gbestow: string;
  sower: string;
  grower?: string;
}

interface PaymentDetails {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  sowerId: string;
  growerId?: string;
}

export function useBinancePay() {
  const [processing, setProcessing] = useState(false);

  const getWalletAddresses = async (): Promise<WalletDistribution | null> => {
    try {
      // Fetch the three main wallets from Supabase
      const { data: wallets, error } = await supabase
        .from('organization_wallets')
        .select('wallet_name, wallet_address')
        .in('wallet_name', ['s2gholding', 's2gbestow', 's2gdavison'])
        .eq('is_active', true);

      if (error) throw error;

      if (!wallets || wallets.length < 3) {
        toast.error('Payment wallets not configured properly');
        return null;
      }

      const distribution: Partial<WalletDistribution> = {};
      wallets.forEach(w => {
        if (w.wallet_name === 's2gholding') distribution.s2gholding = w.wallet_address;
        if (w.wallet_name === 's2gbestow') distribution.s2gbestow = w.wallet_address;
        if (w.wallet_name === 's2gdavison') distribution.sower = w.wallet_address;
      });

      return distribution as WalletDistribution;
    } catch (error) {
      console.error('Error fetching wallet addresses:', error);
      return null;
    }
  };

  const initiateBinancePayment = async (details: PaymentDetails) => {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to make a payment');
        return null;
      }

      // Get wallet distribution
      const wallets = await getWalletAddresses();
      if (!wallets) {
        throw new Error('Unable to retrieve payment wallets');
      }

      // Calculate distribution amounts based on bestowal map
      const tithingAdminPercent = 0.15; // 15% (10% tithing + 5% admin)
      const growerPercent = details.growerId ? 0.10 : 0; // 10% if grower exists
      const sowerPercent = 1 - tithingAdminPercent - growerPercent;

      const tithingAdminAmount = details.amount * tithingAdminPercent;
      const growerAmount = details.amount * growerPercent;
      const sowerAmount = details.amount * sowerPercent;

      // Create bestowal record
      const { data: bestowal, error: bestowError } = await supabase
        .from('bestowals')
        .insert({
          orchard_id: details.orchardId,
          bestower_id: user.id,
          amount: details.amount,
          currency: 'USDC',
          pockets_count: details.pocketsCount,
          message: details.message,
          payment_method: 'binance_pay',
          payment_status: 'pending',
          distribution_data: {
            holding_wallet: wallets.s2gholding,
            tithing_admin_wallet: wallets.s2gbestow,
            tithing_admin_amount: tithingAdminAmount,
            sower_wallet: wallets.sower,
            sower_amount: sowerAmount,
            grower_wallet: wallets.grower,
            grower_amount: growerAmount
          }
        })
        .select()
        .single();

      if (bestowError) throw bestowError;

      // Generate Binance Pay URL (you'll need to configure this with your Binance merchant)
      const binancePayUrl = generateBinancePayUrl({
        amount: details.amount,
        currency: 'USDC',
        orderId: bestowal.id,
        returnUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/payment-cancelled`
      });

      return {
        success: true,
        bestowId: bestowal.id,
        paymentUrl: binancePayUrl
      };

    } catch (error) {
      console.error('Binance Pay error:', error);
      toast.error('Failed to initiate payment');
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const generateBinancePayUrl = (params: {
    amount: number;
    currency: string;
    orderId: string;
    returnUrl: string;
    cancelUrl: string;
  }) => {
    // TODO: Implement actual Binance Pay API integration
    // For now, return a placeholder that opens Binance Pay
    const queryParams = new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      orderId: params.orderId,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl
    });

    // This is a placeholder - replace with actual Binance Pay merchant URL
    return `https://pay.binance.com/checkout?${queryParams.toString()}`;
  };

  const confirmPayment = async (bestowId: string, paymentReference: string) => {
    try {
      // Update bestowal status
      const { error: updateError } = await supabase
        .from('bestowals')
        .update({
          payment_status: 'completed',
          payment_reference: paymentReference
        })
        .eq('id', bestowId);

      if (updateError) throw updateError;

      // TODO: Trigger distribution to wallets via edge function
      await supabase.functions.invoke('distribute-bestowal', {
        body: { bestowId }
      });

      toast.success('Payment confirmed and distributed!');
      return true;
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast.error('Failed to confirm payment');
      return false;
    }
  };

  return {
    processing,
    initiateBinancePayment,
    confirmPayment
  };
}
