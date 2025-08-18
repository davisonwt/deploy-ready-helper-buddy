import '../utils/solana-polyfills'; // Import polyfills first
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, RefreshCw, TrendingUp, History } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { WalletConnection } from './WalletConnection';
import { FiatOnRamp } from './FiatOnRamp';
import { useState } from 'react';

export function WalletWidget() {
  const { wallet, connected, balance, loadingBalance, refreshBalance } = useWallet();
  const [showTopUp, setShowTopUp] = useState(false);

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(balance);
  };

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            USDC Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletConnection compact />
        </CardContent>
      </Card>
    );
  }

  if (showTopUp) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Top-up Wallet
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTopUp(false)}
            >
              Back
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FiatOnRamp 
            onSuccess={() => {
              refreshBalance();
              setShowTopUp(false);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            USDC Wallet
          </div>
          <Badge variant="secondary" className="text-green-600">
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">Available Balance</div>
          <div className="text-3xl font-bold">
            {loadingBalance ? 'Loading...' : formatBalance(balance)}
          </div>
          <div className="text-sm text-muted-foreground">USDC on Solana</div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <div className="text-xs text-muted-foreground">Low Fees</div>
            <div className="font-semibold text-sm">~$0.001</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <History className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <div className="text-xs text-muted-foreground">Speed</div>
            <div className="font-semibold text-sm">Instant</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setShowTopUp(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Top-up
          </Button>
          <Button
            variant="outline"
            onClick={refreshBalance}
            disabled={loadingBalance}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingBalance ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Balance Warning */}
        {balance < 10 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="text-yellow-800 text-sm">
              💡 <strong>Low Balance:</strong> Consider topping up your wallet for seamless payments.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}