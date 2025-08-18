import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, RefreshCw, ExternalLink, Copy } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

export function WalletConnection({ compact = false }) {
  const {
    wallet,
    connected,
    connecting,
    balance,
    loadingBalance,
    isPhantomAvailable,
    connectWallet,
    disconnectWallet,
    refreshBalance
  } = useWallet();
  
  const { toast } = useToast();

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(balance);
  };

  if (!isPhantomAvailable) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Phantom Wallet Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            To use USDC payments, please install the Phantom wallet browser extension.
          </p>
          <Button 
            onClick={() => window.open('https://phantom.app/', '_blank')}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Install Phantom Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact && connected) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-lg bg-card">
        <div className="flex items-center gap-2 flex-1">
          <Wallet className="h-4 w-4 text-green-500" />
          <div className="text-sm">
            <div className="font-medium">{formatBalance(balance)}</div>
            <div className="text-muted-foreground">{formatAddress(wallet.address)}</div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={refreshBalance}
          disabled={loadingBalance}
        >
          <RefreshCw className={`h-4 w-4 ${loadingBalance ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Connect your Phantom wallet to make USDC payments with ultra-low fees.
          </p>
          <Button 
            onClick={connectWallet}
            disabled={connecting}
            className="w-full"
          >
            {connecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Phantom Wallet
              </>
            )}
          </Button>
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
            Wallet Connected
          </div>
          <Badge variant="secondary" className="text-green-600">
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">USDC Balance</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshBalance}
              disabled={loadingBalance}
            >
              <RefreshCw className={`h-4 w-4 ${loadingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="text-2xl font-bold">
            {loadingBalance ? 'Loading...' : formatBalance(balance)}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Wallet Address</span>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <code className="flex-1 text-sm">{formatAddress(wallet.address)}</code>
            <Button size="sm" variant="ghost" onClick={handleCopyAddress}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={disconnectWallet} className="flex-1">
            Disconnect
          </Button>
          <Button 
            onClick={() => window.open(`https://solscan.io/account/${wallet.address}`, '_blank')}
            variant="outline"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Solscan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}