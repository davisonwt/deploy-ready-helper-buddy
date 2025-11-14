import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEFAULT_ORGANIZATION_WALLET_NAME =
  import.meta.env.VITE_ORGANIZATION_SOWER_WALLET_NAME ?? 's2gdavison';

interface LinkedWallet {
  wallet_address: string;
  wallet_name?: string | null;
  origin: 'user' | 'organization';
  is_active?: boolean;
  is_primary?: boolean;
  updated_at?: string;
}

interface WalletBalance {
  usdc_balance: number;
  updated_at: string | null;
  source: 'binance' | 'cache';
}

interface UseBinanceWalletOptions {
  includeOrganizationWallet?: boolean;
  organizationWalletName?: string;
}

export function useBinanceWallet(options: UseBinanceWalletOptions = {}) {
  const {
    includeOrganizationWallet = false,
    organizationWalletName = DEFAULT_ORGANIZATION_WALLET_NAME,
  } = options;

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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

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
        .select('wallet_address, wallet_type, is_active, is_primary, updated_at')
        .eq('user_id', user.id)
        .eq('wallet_type', 'binance_pay')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      if (walletRecord?.wallet_address) {
        setWallet({
          wallet_address: walletRecord.wallet_address,
          origin: 'user',
          is_active: walletRecord.is_active,
          is_primary: walletRecord.is_primary,
          updated_at: walletRecord.updated_at,
        });

        const { data: cachedBalance, error: cachedError } = await supabase
          .from('wallet_balances')
          .select('usdc_balance, updated_at')
          .eq('wallet_address', walletRecord.wallet_address)
          .maybeSingle();

        if (cachedError && cachedError.code !== 'PGRST116') {
          throw cachedError;
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

        return;
      }

      if (!includeOrganizationWallet) {
        setWallet(null);
        setBalance(null);
        return;
      }

      const { data: orgWallet, error: orgError } = await supabase
        .from('organization_wallets')
        .select('wallet_address, wallet_name')
        .eq('wallet_name', organizationWalletName)
        .eq('is_active', true)
        .maybeSingle();

      if (orgError && orgError.code !== 'PGRST116') {
        if (orgError.code === '42501') {
          setError('You do not have permission to view this organization wallet.');
          setWallet(null);
          setBalance(null);
          return;
        }
        throw orgError;
      }

      if (!orgWallet?.wallet_address) {
        setWallet(null);
        setBalance(null);
        return;
      }

      setWallet({
        wallet_address: orgWallet.wallet_address,
        wallet_name: orgWallet.wallet_name ?? organizationWalletName,
        origin: 'organization',
      });

      try {
        const { data: refreshed, error: refreshedError } = await supabase.functions.invoke<{
          success: boolean;
          balance?: number;
          source?: 'binance' | 'cache';
          updatedAt?: string | null;
        }>('refresh-binance-wallet-balance', {
          body: { walletName: orgWallet.wallet_name ?? organizationWalletName },
        });

        if (refreshedError) {
          console.warn('Failed to refresh organization wallet balance:', refreshedError);
          setBalance(null);
        } else if (refreshed?.success && typeof refreshed.balance === 'number') {
          setBalance({
            usdc_balance: refreshed.balance,
            updated_at: refreshed.updatedAt ?? new Date().toISOString(),
            source: refreshed.source ?? 'binance',
          });
        } else {
          setBalance(null);
        }
      } catch (refreshError) {
        console.warn('Organization wallet balance refresh failed:', refreshError);
        setBalance(null);
      }
    } catch (err) {
      console.error('Failed to load Binance wallet:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setWallet(null);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [includeOrganizationWallet, organizationWalletName]);

  const linkWallet = useCallback(async (payId: string) => {
    if (!payId?.trim()) {
      toast.error('Enter a valid Binance Pay ID');
      return false;
    }

    setLinking(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in to link your wallet');
        return false;
      }

      const { error } = await supabase.functions.invoke('link-binance-wallet', {
        body: { payId },
      });

      if (error) {
        // Improve message for common gateway/network issues
        const msg =
          error.message?.includes('Failed to send a request to the Edge Function')
            ? 'Network/auth issue contacting the server. Please refresh, sign in again, and retry.'
            : error.message;
        throw new Error(msg || 'Failed to link wallet');
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
      const invokeOptions =
        wallet.origin === 'organization' && wallet.wallet_name
          ? { body: { walletName: wallet.wallet_name } }
          : undefined;

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        balance?: number;
        source?: 'binance' | 'cache';
        updatedAt?: string | null;
      }>('refresh-binance-wallet-balance', invokeOptions);

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
  }, [wallet?.wallet_address, wallet?.wallet_name, wallet?.origin]);

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
      const body: Record<string, unknown> = {
        amount,
        currency: 'USDC',
        clientOrigin: window.location.origin,
      };

      if (wallet.origin === 'organization' && wallet.wallet_name) {
        body.walletName = wallet.wallet_name;
      }

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        paymentUrl?: string;
      }>('create-binance-wallet-topup', { body });

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
  }, [wallet?.wallet_address, wallet?.wallet_name, wallet?.origin]);

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
