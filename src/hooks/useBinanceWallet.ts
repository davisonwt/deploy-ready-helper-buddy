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
          const cachedBalanceValue = Number(cachedBalance.usdc_balance ?? 0);
          const updatedAt = cachedBalance.updated_at ? new Date(cachedBalance.updated_at) : null;
          const isStale = !updatedAt || (Date.now() - updatedAt.getTime()) > 5 * 60 * 1000; // 5 minutes
          
          setBalance({
            usdc_balance: cachedBalanceValue,
            updated_at: cachedBalance.updated_at ?? null,
            source: 'cache',
          });
          
          // Auto-refresh if balance is 0 or stale (use setTimeout to avoid calling before defined)
          if (cachedBalanceValue === 0 || isStale) {
            console.log('💰 Balance is 0 or stale, will auto-refresh...');
            // Delay refresh to ensure function is defined
            setTimeout(() => {
              if (wallet?.wallet_address) {
                refreshBalance().catch(err => {
                  console.error('Auto-refresh failed:', err);
                });
              }
            }, 1000);
          }
        } else {
          setBalance(null);
          // No cache, try to refresh after a delay
          console.log('💰 No cached balance, will refresh...');
          setTimeout(() => {
            if (wallet?.wallet_address) {
              refreshBalance().catch(err => {
                console.error('Initial refresh failed:', err);
              });
            }
          }, 1000);
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
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Please sign in to link your wallet');
        return false;
      }

      let primaryError: unknown = null;
      try {
        const primary = await supabase.functions.invoke('link-binance-wallet', {
          body: { payId },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (primary.error) primaryError = primary.error;
      } catch (e) {
        primaryError = e;
      }

      if (primaryError) {
        // Fallback: call the function endpoint directly (same auth + body)
        const url = 'https://zuwkgasbkpjlxzsjzumu.functions.supabase.co/link-binance-wallet?t=' + Date.now();
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ payId }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || `Failed to link wallet (HTTP ${res.status})`);
        }
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Please sign in to refresh balance');
        return;
      }

      // For user wallets, sync balance from payment history first
      if (wallet.origin === 'user') {
        try {
          console.log('🔄 Syncing balance from payment history...');
          const syncResult = await supabase.functions.invoke<{
            success: boolean;
            balance?: number;
            totalReceived?: number;
            totalSent?: number;
          }>('sync-wallet-balance');
          
          if (syncResult.error) {
            console.warn('⚠️ Balance sync failed, continuing with refresh:', syncResult.error);
          } else if (syncResult.data?.success) {
            console.log('✅ Balance synced:', syncResult.data);
            toast.success(`Balance synced: $${(syncResult.data.balance || 0).toFixed(2)} (Received: $${(syncResult.data.totalReceived || 0).toFixed(2)}, Sent: $${(syncResult.data.totalSent || 0).toFixed(2)})`);
          }
        } catch (syncError) {
          console.warn('⚠️ Balance sync error, continuing with refresh:', syncError);
          // Continue with refresh even if sync fails
        }
      }

      const invokeOptions =
        wallet.origin === 'organization' && wallet.wallet_name
          ? { body: { walletName: wallet.wallet_name } }
          : undefined;

      let primaryError: unknown = null;
      let data: any = null;

      try {
        console.log('🔄 Invoking refresh-binance-wallet-balance...', invokeOptions);
        const result = await supabase.functions.invoke<{
          success: boolean;
          balance?: number;
          source?: 'binance' | 'cache';
          updatedAt?: string | null;
        }>('refresh-binance-wallet-balance', invokeOptions);
        
        console.log('📥 Balance refresh result:', result);
        
        if (result.error) {
          console.error('❌ Refresh error:', result.error);
          primaryError = result.error;
        } else {
          data = result.data;
        }
      } catch (e) {
        console.error('❌ Refresh exception:', e);
        primaryError = e;
      }

      if (primaryError) {
        const url = 'https://zuwkgasbkpjlxzsjzumu.functions.supabase.co/refresh-binance-wallet-balance?t=' + Date.now();
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: invokeOptions?.body ? JSON.stringify(invokeOptions.body) : undefined,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || `Failed to refresh balance (HTTP ${res.status})`);
        }

        data = await res.json();
      }

      console.log('💰 Parsed balance data:', data);

      if (!data?.success) {
        console.error('❌ Balance refresh failed:', data);
        throw new Error(data?.error || 'Failed to refresh wallet balance');
      }

      if (typeof data.balance !== 'number') {
        console.error('❌ Invalid balance format:', data);
        throw new Error('Invalid balance format received');
      }

      setBalance({
        usdc_balance: data.balance,
        updated_at: data.updatedAt ?? new Date().toISOString(),
        source: data.source ?? 'cache',
      });

      const sourceLabel = data.source === 'binance' ? 'from Binance' : 'from platform ledger';
      toast.success(`Balance updated: $${data.balance.toFixed(2)} ${sourceLabel}`);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Please sign in to top up');
        return;
      }

      const body: Record<string, unknown> = {
        amount,
        currency: 'USDC',
        clientOrigin: window.location.origin,
      };

      if (wallet.origin === 'organization' && wallet.wallet_name) {
        body.walletName = wallet.wallet_name;
      }

      let primaryError: unknown = null;
      let data: any = null;

      try {
        const result = await supabase.functions.invoke<{
          success: boolean;
          paymentUrl?: string;
        }>('create-binance-wallet-topup', { body });
        
        if (result.error) primaryError = result.error;
        else data = result.data;
      } catch (e) {
        primaryError = e;
      }

      if (primaryError) {
        const url = 'https://zuwkgasbkpjlxzsjzumu.functions.supabase.co/create-binance-wallet-topup?t=' + Date.now();
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || `Failed to create top-up order (HTTP ${res.status})`);
        }

        data = await res.json();
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
