import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Wallet, Link as LinkIcon, CreditCard, ExternalLink } from 'lucide-react';
import { useBinanceWallet } from '@/hooks/useBinanceWallet';

export interface BinanceWalletManagerProps {
  className?: string;
  showTopUpActions?: boolean;
}

export function BinanceWalletManager({ className, showTopUpActions = true }: BinanceWalletManagerProps) {
  const {
    wallet,
    balance,
    loading,
    linking,
    refreshing,
    error,
    linkWallet,
    refreshBalance,
    createTopUpOrder,
  } = useBinanceWallet();

  const [payIdInput, setPayIdInput] = useState('');
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [showLinkField, setShowLinkField] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setShowLinkField(false);
    }
  }, [wallet]);

  const handleLink = async () => {
    if (!payIdInput.trim()) {
      toast.error('Enter your Binance Pay ID before linking.');
      return;
    }

    const success = await linkWallet(payIdInput.trim());
    if (success) {
      setPayIdInput('');
      setShowLinkField(false);
    }
  };

  const handleTopUp = async () => {
    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
      toast.error('Enter a valid top-up amount.');
      return;
    }
    await createTopUpOrder(topUpAmount);
    setTopUpDialogOpen(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-amber-600" />
          Binance Wallet
        </CardTitle>
        <CardDescription>
          Link your Binance Pay ID to view your balance and top up directly inside Sow2Grow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading wallet information...
          </div>
        ) : (
          <>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
                {error}
              </div>
            )}

              {(!wallet || showLinkField) && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Link your Binance Pay ID (Pay ID) so Sow2Grow can route distributions to your wallet and display your balance.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="payId">Binance Pay ID</Label>
                    <Input
                      id="payId"
                      placeholder="Enter your Binance Pay ID"
                      value={payIdInput}
                      onChange={(event) => setPayIdInput(event.target.value)}
                      disabled={linking}
                    />
                  </div>
                  <Button onClick={handleLink} disabled={linking} className="w-full">
                    {linking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Linking...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link Binance Wallet
                      </>
                    )}
                  </Button>
                </div>
              )}

              {wallet && !showLinkField && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {wallet.origin === 'organization' ? 'Organization Wallet' : 'Linked Binance Pay ID'}
                    </div>
                    <div className="text-lg font-semibold tracking-wide break-all">
                      {wallet.wallet_name ? `${wallet.wallet_name} • ${wallet.wallet_address}` : wallet.wallet_address}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {wallet.origin === 'organization' ? 'Read-only • Admin access' : 'Primary • Active'}
                    </div>
                    {wallet.origin === 'organization' && (
                      <div className="text-[11px] text-muted-foreground">
                        This wallet is shared by the organization (`{wallet.wallet_name ?? 's2gdavison'}`). Only administrators can view and top up this balance from Sow2Grow.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border p-4">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        Available Balance
                      </div>
                      <div className="text-2xl font-bold">
                        {balance?.display ?? '$0.00'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {balance?.updatedAt
                          ? `Last synced ${new Date(balance.updatedAt).toLocaleString()}`
                          : 'Sync to fetch the latest balance'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Source: {balance?.source === 'binance' ? 'Binance Pay' : 'Platform ledger'}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        Quick Actions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshBalance}
                          disabled={refreshing}
                        >
                          {refreshing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh balance
                            </>
                          )}
                        </Button>
                        {showTopUpActions && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTopUpDialogOpen(true)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Top up wallet
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    onClick={() => {
                      setShowLinkField(true);
                      setPayIdInput('');
                    }}
                  >
                    <LinkIcon className="h-3 w-3 mr-2" />
                    Link a different wallet
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">Need your Pay ID?</p>
                    <p>
                      Open the Binance app &gt; tap <strong>Profile</strong> &gt; <strong>Pay</strong> &gt; <strong>Receive</strong> to copy your Pay ID.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => window.open('https://www.binance.com/en/pay', '_blank')}
                    >
                      Binance Pay Help <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
          </>
        )}
      </CardContent>

      <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Top up your Sow2Grow wallet</DialogTitle>
            <DialogDescription>
              Generate a Binance Pay checkout to add more USDC to the wallet you use on Sow2Grow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topUpAmount">Amount (USDC)</Label>
              <Input
                id="topUpAmount"
                type="number"
                min={1}
                step="1"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopUpAmount(preset)}
                >
                  {preset} USDC
                </Button>
              ))}
            </div>
            <Button onClick={handleTopUp} className="w-full">
              Create Binance Pay order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
