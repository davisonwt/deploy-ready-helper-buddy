import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkedWallet {
  wallet_address: string;
  is_active?: boolean;
  is_primary?: boolean;
  updated_at?: string;
}

interface WalletBalance {
  usdc_balance: number;
  updated_at: string | null;
  source: 'binance' | 'cache';
}

export function useBinanceWallet() {
  const [wallet, setWallet] = useState<LinkedWallet | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }

      if (!user) {
        setWallet(null);
        setBalance(null);
        return;
      }

      const { data: walletRecord, error: walletError } = await supabase
        .from('user_wallets')
        .select('wallet_address, is_active, is_primary, updated_at')
        .eq('wallet_type', 'binance_pay')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      if (!walletRecord?.wallet_address) {
        setWallet(null);
        setBalance(null);
        return;
      }

      setWallet(walletRecord);

      const { data: cachedBalance, error: balanceError } = await supabase
        .from('wallet_balances')
        .select('usdc_balance, updated_at')
        .eq('wallet_address', walletRecord.wallet_address)
        .maybeSingle();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }

      if (cachedBalance) {
        setBalance({
          usdc_balance: Number(cachedBalance.usdc_balance ?? 0),
          updated_at: cachedBalance.updated_at ?? null,
          source: 'cache',
        });
      } else {
        setBalance(null);
      }
    } catch (err) {
      console.error('Failed to load Binance wallet:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const linkWallet = useCallback(async (payId: string) => {
    if (!payId?.trim()) {
      toast.error('Enter a valid Binance Pay ID');
      return false;
    }

    setLinking(true);
    try {
      const { error } = await supabase.functions.invoke('link-binance-wallet', {
        body: { payId },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Binance Pay ID linked successfully');
      await loadWallet();
      return true;
    } catch (err) {
      console.error('Link wallet error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to link wallet');
      return false;
    } finally {
      setLinking(false);
    }
  }, [loadWallet]);

  const refreshBalance = useCallback(async () => {
    if (!wallet?.wallet_address) {
      toast.error('Link a Binance Pay wallet first');
      return;
    }

    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        balance?: number;
        source?: 'binance' | 'cache';
        updatedAt?: string | null;
      }>('refresh-binance-wallet-balance');

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success || typeof data.balance !== 'number') {
        throw new Error('Failed to refresh wallet balance');
      }

      setBalance({
        usdc_balance: data.balance,
        updated_at: data.updatedAt ?? new Date().toISOString(),
        source: data.source ?? 'binance',
      });

      toast.success('Wallet balance updated');
    } catch (err) {
      console.error('Refresh wallet balance error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh balance');
    } finally {
      setRefreshing(false);
    }
  }, [wallet?.wallet_address]);

  const createTopUpOrder = useCallback(async (amount: number) => {
    if (!wallet?.wallet_address) {
      toast.error('Link a Binance Pay wallet first');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid top-up amount');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        paymentUrl?: string;
      }>('create-binance-wallet-topup', {
        body: {
          amount,
          currency: 'USDC',
          clientOrigin: window.location.origin,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success || !data.paymentUrl) {
        throw new Error('Failed to create top-up order');
      }

      window.open(data.paymentUrl, '_blank', 'noopener');
    } catch (err) {
      console.error('Top-up error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create top-up order');
    }
  }, [wallet?.wallet_address]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const formattedBalance = useMemo(() => {
    if (!balance) {
      return null;
    }

    return {
      amount: balance.usdc_balance,
      display: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(balance.usdc_balance),
      updatedAt: balance.updated_at,
      source: balance.source,
    };
  }, [balance]);

  return {
    wallet,
    balance: formattedBalance,
    rawBalance: balance,
    loading,
    linking,
    refreshing,
    error,
    linkWallet,
    refreshBalance,
    createTopUpOrder,
    reload: loadWallet,
  };
}
