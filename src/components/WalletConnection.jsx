import '../utils/solana-polyfills'; // Import polyfills first
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
    if (wallet) {
      const address = wallet.toString();
      navigator.clipboard.writeText(address);
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
            Install Phantom Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🚀 Get Started with Ultra-Low Fee Payments</h4>
            <p className="text-blue-700 text-sm mb-3">
              Create a secure USDC wallet to make instant payments with fees under $0.01. Your wallet will be linked to your Sow2Grow account.
            </p>
            <div className="space-y-2 text-sm text-blue-600">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Ultra-low transaction fees (~$0.001)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Instant transfers worldwide</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Secure blockchain technology</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">📱 How to Connect After Installation:</h4>
            <div className="space-y-2 text-sm text-amber-700">
              <div className="font-medium">Desktop:</div>
              <div>1. Open Phantom browser extension</div>
              <div>2. Click "Explore" tab → Search for Sow2Grow</div>
              <div>3. Return here and click "Connect Wallet"</div>
              
              <div className="font-medium mt-3">Mobile:</div>
              <div>1. Open Phantom mobile app</div>
              <div>2. Tap "Explore" tab → Search for Sow2Grow</div>
              <div>3. Open site in Phantom browser and connect</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.open('https://phantom.app/download', '_blank')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Download Phantom Wallet (Free)
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Already installed? Refresh this page and follow the connection steps above
              </p>
            </div>
          </div>
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
              <div className="text-muted-foreground">{formatAddress(wallet.toString())}</div>
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
          
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <div className="text-sm text-green-700">
              <div className="font-medium mb-1">💡 Connection Tips:</div>
              <div>• Make sure Phantom extension is unlocked</div>
              <div>• Allow popups for this site</div>
              <div>• If no popup appears, refresh the page</div>
              <div>• You may need to approve a "Sign message" request</div>
            </div>
          </div>

          <Button 
            onClick={connectWallet}
            disabled={connecting}
            className="w-full"
          >
            {connecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting to Phantom...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Phantom Wallet
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Problems connecting? Try accessing Sow2Grow through Phantom's Explore tab
            </p>
          </div>
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
              <code className="flex-1 text-sm">{formatAddress(wallet.toString())}</code>
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
            onClick={() => window.open(`https://solscan.io/account/${wallet.toString()}`, '_blank')}
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