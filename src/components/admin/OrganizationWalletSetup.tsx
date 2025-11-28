import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast as toastFn } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, CheckCircle2, AlertCircle, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { getCurrentTheme } from '@/utils/dashboardThemes';

interface OrganizationWallet {
  id: string;
  wallet_address: string;
  wallet_name: string;
  is_active: boolean;
  blockchain: string;
  wallet_type: string;
  balance?: number;
  currency?: string;
}

export function OrganizationWalletSetup() {
  const [wallets, setWallets] = useState<OrganizationWallet[]>([]);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_wallets')
        .select('*')
        .eq('is_active', true)
        .in('wallet_name', ['s2gholding', 's2gbestow', 's2gdavison'])
        .order('wallet_name', { ascending: true });

      if (error) {
        console.error('Error fetching wallets:', error);
        toastFn.error('Failed to load organization wallets');
        return;
      }

      setWallets(data || []);
      
      // Auto-fetch balances for all wallets
      if (data && data.length > 0) {
        for (const wallet of data) {
          await refreshBalance(wallet.wallet_name, true);
        }
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toastFn.error('Failed to load organization wallets');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async (walletName: string, silent = false) => {
    setRefreshing(prev => ({ ...prev, [walletName]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('refresh-binance-wallet-balance', {
        body: { walletName }
      });

      if (error) throw error;

      if (data?.balance !== undefined) {
        setWallets(prev => prev.map(w => 
          w.wallet_name === walletName 
            ? { ...w, balance: data.balance, currency: data.currency || 'USDC' }
            : w
        ));
        
        if (!silent) {
          toastFn.success(`Balance updated: ${data.balance} ${data.currency || 'USDC'}`);
        }
      }
    } catch (error: any) {
      console.error('Error refreshing balance:', error);
      if (!silent) {
        toastFn.error(error.message || 'Failed to refresh balance');
      }
    } finally {
      setRefreshing(prev => ({ ...prev, [walletName]: false }));
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toastFn.success('Wallet address copied to clipboard');
  };

  return (
    <Card 
      style={{
        backgroundColor: currentTheme.cardBg,
        borderColor: currentTheme.cardBorder,
        boxShadow: `0 20px 25px -5px ${currentTheme.shadow}, 0 10px 10px -5px ${currentTheme.shadow}`
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: currentTheme.textPrimary }}>
          <Wallet className="h-5 w-5" style={{ color: currentTheme.accent }} />
          Organization Wallet Setup
        </CardTitle>
        <CardDescription style={{ color: currentTheme.textSecondary }}>
          Binance Pay wallet addresses for receiving payments via the Bestowal Map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert 
          style={{
            backgroundColor: currentTheme.secondaryButton,
            borderColor: currentTheme.cardBorder
          }}
        >
          <Wallet className="h-4 w-4" style={{ color: currentTheme.accent }} />
          <AlertDescription style={{ color: currentTheme.textPrimary }}>
            All payments are processed through Binance Pay and distributed automatically according to the Bestowal Map:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All payments first go to <strong>s2gholding</strong> (holding wallet)</li>
              <li>15% automatically distributed to <strong>s2gbestow</strong> (10% tithing + 5% admin)</li>
              <li>Remaining 85% held in s2gholding pending courier confirmation</li>
              <li>After courier confirms product receipt, gosat's can manually trigger distribution to sowers and whispers</li>
            </ul>
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: currentTheme.accent }} />
            <span className="ml-2 text-sm" style={{ color: currentTheme.textSecondary }}>Loading wallets...</span>
          </div>
        ) : wallets.length === 0 ? (
          <Alert 
            style={{
              backgroundColor: currentTheme.secondaryButton,
              borderColor: currentTheme.cardBorder
            }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: currentTheme.accent }} />
            <AlertDescription style={{ color: currentTheme.textPrimary }}>
              No Binance Pay wallets configured. Please add s2gholding and s2gbestow wallet addresses in the database.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {wallets.map((wallet) => (
              <div 
                key={wallet.id} 
                className="border rounded-lg p-4 space-y-3"
                style={{
                  backgroundColor: currentTheme.secondaryButton,
                  borderColor: currentTheme.cardBorder
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold" style={{ color: currentTheme.textPrimary }}>
                      {wallet.wallet_name === 's2gholding' && '💰 Holding Wallet'}
                      {wallet.wallet_name === 's2gbestow' && '⛪ Tithing & Admin Wallet'}
                    </p>
                    <CheckCircle2 className="h-4 w-4" style={{ color: currentTheme.accent }} />
                  </div>
                  {wallet.balance !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className="text-lg font-bold"
                      style={{
                        backgroundColor: currentTheme.accent + '20',
                        color: currentTheme.accent,
                        borderColor: currentTheme.accent
                      }}
                    >
                      {wallet.balance} {wallet.currency || 'USDC'}
                    </Badge>
                  )}
                </div>

                <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                  Wallet ID: <code 
                    className="px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: currentTheme.cardBg,
                      color: currentTheme.textPrimary
                    }}
                  >
                    {wallet.wallet_name}
                  </code>
                </p>

                <div className="flex items-center gap-4">
                  <code 
                    className="px-2 py-1 rounded text-xs flex-1 truncate"
                    style={{
                      backgroundColor: currentTheme.cardBg,
                      color: currentTheme.textPrimary,
                      borderColor: currentTheme.cardBorder
                    }}
                  >
                    {wallet.wallet_address}
                  </code>
                  <button
                    onClick={() => handleCopyAddress(wallet.wallet_address)}
                    className="h-8 w-8 p-0 flex-shrink-0 rounded-lg border transition-all duration-200 inline-flex items-center justify-center"
                    style={{
                      backgroundColor: currentTheme.secondaryButton,
                      borderColor: currentTheme.cardBorder,
                      color: currentTheme.textPrimary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.accent;
                      e.currentTarget.style.borderColor = currentTheme.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                      e.currentTarget.style.borderColor = currentTheme.cardBorder;
                    }}
                    title="Copy address"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => refreshBalance(wallet.wallet_name)}
                    disabled={refreshing[wallet.wallet_name]}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 disabled:opacity-50"
                    style={{
                      backgroundColor: refreshing[wallet.wallet_name] ? currentTheme.secondaryButton : currentTheme.secondaryButton,
                      borderColor: currentTheme.accent,
                      color: currentTheme.textPrimary
                    }}
                    onMouseEnter={(e) => {
                      if (!refreshing[wallet.wallet_name]) {
                        e.currentTarget.style.backgroundColor = currentTheme.accent;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!refreshing[wallet.wallet_name]) {
                        e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }
                    }}
                  >
                    {refreshing[wallet.wallet_name] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Refresh Balance
                  </button>
                  
                  {wallet.wallet_name === 's2gholding' && wallet.balance && wallet.balance > 0 && (
                    <Badge 
                      variant="default"
                      style={{
                        backgroundColor: currentTheme.accent,
                        color: currentTheme.textPrimary
                      }}
                    >
                      Funds available for distribution
                    </Badge>
                  )}
                </div>

                {wallet.wallet_name === 's2gholding' && (
                  <Alert 
                    className="mt-2"
                    style={{
                      backgroundColor: currentTheme.secondaryButton,
                      borderColor: currentTheme.cardBorder
                    }}
                  >
                    <AlertDescription className="text-xs" style={{ color: currentTheme.textPrimary }}>
                      This wallet holds funds pending distribution. Use the "Manual Distribution Queue" below to release funds to sowers after courier confirms product delivery.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}

        <Alert 
          variant="default"
          style={{
            backgroundColor: currentTheme.secondaryButton,
            borderColor: currentTheme.cardBorder
          }}
        >
          <AlertCircle className="h-4 w-4" style={{ color: currentTheme.accent }} />
          <AlertDescription className="text-xs" style={{ color: currentTheme.textPrimary }}>
            Important: These wallet addresses are used for Binance Pay distributions. 
            Make sure you have access to all wallets and keep your recovery phrases safe.
            All payments are processed in USDC via Binance Pay.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
