import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Wallet, 
  RefreshCw, 
  ArrowDownToLine, 
  AlertCircle, 
  TrendingUp,
  Clock,
  DollarSign,
  ExternalLink,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface SowerBalance {
  id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  wallet_address: string | null;
  wallet_type: string | null;
  last_payout_at: string | null;
}

interface SowerBalanceCardProps {
  compact?: boolean;
}

export function SowerBalanceCard({ compact = false }: SowerBalanceCardProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<SowerBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('sower_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching balance:', error);
        return;
      }

      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
    toast.success('Balance refreshed');
  };

  const handleRequestPayout = async () => {
    if (!balance?.wallet_address) {
      toast.error('Please set up your payout wallet first');
      return;
    }

    if ((balance?.available_balance || 0) < 10) {
      toast.error('Minimum withdrawal is $10 USD');
      return;
    }

    // TODO: Implement payout request via NOWPayments Payout API
    toast.info('Payout request feature coming soon!');
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card className={compact ? 'border-primary/20' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No balance record yet - show setup prompt
  if (!balance) {
    return (
      <Card className={compact ? 'border-primary/20' : ''}>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            My Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2">Set up your payout wallet to start tracking earnings and receive payments.</p>
              <Link to="/wallet-settings">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Set Up Wallet
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const availableBalance = balance.available_balance || 0;
  const pendingBalance = balance.pending_balance || 0;
  const totalEarned = balance.total_earned || 0;
  const totalWithdrawn = balance.total_withdrawn || 0;
  const hasWallet = !!balance.wallet_address;

  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold">${availableBalance.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              {hasWallet && availableBalance >= 10 && (
                <Button size="sm" onClick={handleRequestPayout}>
                  Withdraw
                </Button>
              )}
            </div>
          </div>
          {pendingBalance > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              + ${pendingBalance.toFixed(2)} pending
            </p>
          )}
          {!hasWallet && (
            <Link to="/wallet-settings" className="block mt-3">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Settings className="h-4 w-4" />
                Set Up Payout Wallet
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              My Earnings
            </CardTitle>
            <CardDescription>
              Track your earnings and request payouts
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 text-primary mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Available</span>
            </div>
            <p className="text-2xl font-bold">${availableBalance.toFixed(2)}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold">${pendingBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Total Earned: ${totalEarned.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            <span>Withdrawn: ${totalWithdrawn.toFixed(2)}</span>
          </div>
        </div>

        {/* Wallet Status */}
        {hasWallet ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {balance.wallet_type || 'Crypto'}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">
                {balance.wallet_address?.slice(0, 8)}...{balance.wallet_address?.slice(-6)}
              </span>
            </div>
            <Link to="/wallet-settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Set up your payout wallet to withdraw earnings</span>
              <Link to="/wallet-settings">
                <Button variant="outline" size="sm" className="ml-2">
                  Set Up
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Withdraw Button */}
        {hasWallet && (
          <Button 
            className="w-full gap-2" 
            onClick={handleRequestPayout}
            disabled={availableBalance < 10}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Request Payout
            {availableBalance < 10 && (
              <span className="text-xs opacity-70">(Min. $10)</span>
            )}
          </Button>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          Payouts are processed via NOWPayments. Fee: 0.5%
        </p>
      </CardContent>
    </Card>
  );
}
