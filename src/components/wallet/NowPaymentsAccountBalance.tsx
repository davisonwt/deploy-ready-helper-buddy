import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Wallet, AlertCircle, Building2, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface BalanceCurrency {
  amount: number;
  currency: string;
}

interface WalletBalance {
  currencies: BalanceCurrency[];
  error?: string;
}

const WALLET_CONFIG: Record<string, { label: string; description: string; icon: typeof Wallet }> = {
  s2gholding: {
    label: 'S2G Holding',
    description: 'Main holding wallet — receives all incoming payments',
    icon: Building2,
  },
  s2gbestow: {
    label: 'S2G Bestow (Tithing)',
    description: 'Tithing & admin wallet — receives 15% platform share',
    icon: Heart,
  },
};

export function NowPaymentsAccountBalance() {
  const [walletBalances, setWalletBalances] = useState<Record<string, WalletBalance>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async (showToast = false) => {
    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('get-nowpayments-balance');

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch balance');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error');
      }

      setWalletBalances(data.wallets || {});
      if (showToast) toast.success('Balances refreshed');
    } catch (err: any) {
      console.error('Balance fetch error:', err);
      setError(err.message);
      if (showToast) toast.error('Failed to refresh balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalance(true);
    setRefreshing(false);
  };

  const walletNames = ['s2gholding', 's2gbestow'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              NOWPayments Account Balances
            </CardTitle>
            <CardDescription>
              Live balances from your NOWPayments merchant accounts
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm py-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          walletNames.map((walletName) => {
            const config = WALLET_CONFIG[walletName];
            const balance = walletBalances[walletName];
            const Icon = config?.icon || Wallet;
            const nonZero = balance?.currencies?.filter(b => b.amount > 0) || [];
            const hasError = balance?.error;

            return (
              <div key={walletName} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{config?.label || walletName}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{config?.description}</p>

                {hasError ? (
                  <div className="flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{balance.error}</span>
                  </div>
                ) : nonZero.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {nonZero.map((b) => (
                      <div key={b.currency} className="p-3 rounded-lg border bg-muted/30">
                        <Badge variant="outline" className="mb-1 text-xs">
                          {b.currency}
                        </Badge>
                        <p className="text-lg font-bold font-mono">
                          {b.amount < 0.0001
                            ? b.amount.toExponential(2)
                            : b.amount.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No balances found — account may be empty or funds forwarded.
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
