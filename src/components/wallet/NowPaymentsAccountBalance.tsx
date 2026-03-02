import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BalanceCurrency {
  amount: number;
  currency: string;
}

export function NowPaymentsAccountBalance() {
  const [balanceData, setBalanceData] = useState<BalanceCurrency[]>([]);
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

      // NOWPayments returns balance as an object with currency keys
      const raw = data.balance;
      const currencies: BalanceCurrency[] = [];

      if (raw && typeof raw === 'object') {
        // Handle various response shapes
        if (Array.isArray(raw)) {
          raw.forEach((item: any) => {
            if (item.currency && item.amount !== undefined) {
              currencies.push({ currency: item.currency.toUpperCase(), amount: Number(item.amount) });
            }
          });
        } else {
          // Object shape: { btc: 0.001, eth: 0.5, ... } or nested
          for (const [key, value] of Object.entries(raw)) {
            if (typeof value === 'number') {
              currencies.push({ currency: key.toUpperCase(), amount: value });
            } else if (typeof value === 'object' && value !== null && 'amount' in (value as any)) {
              currencies.push({ currency: key.toUpperCase(), amount: Number((value as any).amount) });
            }
          }
        }
      }

      setBalanceData(currencies);
      if (showToast) toast.success('Balance refreshed');
    } catch (err: any) {
      console.error('Balance fetch error:', err);
      setError(err.message);
      if (showToast) toast.error('Failed to refresh balance');
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

  const nonZeroBalances = balanceData.filter(b => b.amount > 0);
  const hasBalances = nonZeroBalances.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              NOWPayments Account Balance
            </CardTitle>
            <CardDescription>
              Live balance from your NOWPayments merchant account
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
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm py-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : hasBalances ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {nonZeroBalances.map((b) => (
              <div
                key={b.currency}
                className="p-3 rounded-lg border bg-muted/30"
              >
                <Badge variant="outline" className="mb-1 text-xs">
                  {b.currency}
                </Badge>
                <p className="text-lg font-bold font-mono">
                  {b.amount < 0.0001 ? b.amount.toExponential(2) : b.amount.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No balances found. Funds may have already been forwarded or the account is empty.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
