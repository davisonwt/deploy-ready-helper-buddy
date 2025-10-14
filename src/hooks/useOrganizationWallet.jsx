import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export function useOrganizationWallet() {
  const [organizationWallet, setOrganizationWallet] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizationWallet();
  }, []);

  const fetchOrganizationWallet = async () => {
    try {
      setLoading(true);
      // Query the organization_wallets table directly to get the full record including ID
      const { data, error } = await supabase
        .from('organization_wallets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setOrganizationWallet(data);
      } else {
        setOrganizationWallet(null);
      }
    } catch (err) {
      console.error('Error fetching organization wallet:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('organization_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setPayments(data);
      return data;
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message);
      return [];
    }
  };

  const generatePaymentUrl = (token = 'SOL', amount = null, memo = null) => {
    if (!organizationWallet?.wallet_address) return null;

    try {
      const baseUrl = 'https://phantom.app/ul/v1/browse/';
      const params = new URLSearchParams({
        url: encodeURIComponent(
          `https://solanapay.com/?recipient=${organizationWallet.wallet_address}` +
          (token !== 'SOL' ? `&spl-token=${getTokenMintAddress(token)}` : '') +
          (amount ? `&amount=${amount}` : '') +
          (memo ? `&memo=${encodeURIComponent(memo)}` : '')
        )
      });
      
      return `${baseUrl}?${params.toString()}`;
    } catch (err) {
      console.error('Error generating payment URL:', err);
      return null;
    }
  };

  const openPhantomPayment = (token = 'SOL', amount = null, memo = null) => {
    const url = generatePaymentUrl(token, amount, memo);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Unable to generate payment link",
        variant: "destructive"
      });
    }
  };

  const checkTransactionStatus = async (signature) => {
    try {
      const connection = new Connection(clusterApiUrl('mainnet-beta'));
      const status = await connection.getSignatureStatus(signature);
      return status;
    } catch (err) {
      console.error('Error checking transaction status:', err);
      return null;
    }
  };

  const getTokenMintAddress = (symbol) => {
    const tokenMints = {
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      'SOL': null // Native SOL doesn't need mint address
    };
    return tokenMints[symbol];
  };

  const updateWalletAddress = async (newAddress) => {
    try {
      const { error } = await supabase
        .from('organization_wallets')
        .update({ wallet_address: newAddress })
        .eq('id', organizationWallet.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Organization wallet address updated successfully"
      });
      
      await fetchOrganizationWallet();
    } catch (err) {
      console.error('Error updating wallet address:', err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  return {
    organizationWallet,
    payments,
    loading,
    error,
    fetchOrganizationWallet,
    fetchPayments,
    generatePaymentUrl,
    openPhantomPayment,
    checkTransactionStatus,
    updateWalletAddress,
    supportedTokens: organizationWallet?.supported_tokens || []
  };
}