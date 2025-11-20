import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Wallet, Link as LinkIcon, CreditCard, ExternalLink, Eye, EyeOff, Edit } from 'lucide-react';
import { useBinanceWallet } from '@/hooks/useBinanceWallet';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';

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
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  const [merchantIdInput, setMerchantIdInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [showLinkField, setShowLinkField] = useState(false);
  const [manualBalanceDialogOpen, setManualBalanceDialogOpen] = useState(false);
  const [manualBalanceAmount, setManualBalanceAmount] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!wallet) {
      setShowLinkField(false);
    }
  }, [wallet]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('topup') === '1') {
      setTopUpDialogOpen(true);
    }
  }, [location.search]);

  const pillButtonClasses =
    "rounded-full border border-primary/40 bg-primary/15 text-primary-foreground/80 hover:bg-primary hover:text-primary-foreground transition-colors duration-200 shadow-sm px-4";

  const handleLink = async () => {
    if (!payIdInput.trim()) {
      toast.error('Enter your Binance Pay ID before linking.');
      return;
    }

    // API credentials are optional - if provided, they enable direct Binance balance queries
    const success = await linkWallet(
      payIdInput.trim(),
      apiKeyInput.trim() || undefined,
      apiSecretInput.trim() || undefined,
      merchantIdInput.trim() || undefined
    );
    if (success) {
      setPayIdInput('');
      setApiKeyInput('');
      setApiSecretInput('');
      setMerchantIdInput('');
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

  const handleManualBalanceUpdate = async () => {
    const amount = parseFloat(manualBalanceAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid balance amount (0 or greater).');
      return;
    }

    setUpdatingBalance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to update balance');
        return;
      }

      const { data, error } = await supabase.functions.invoke('manual-update-balance', {
        body: { balance: amount },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Balance updated to $${amount.toFixed(2)}`);
        setManualBalanceDialogOpen(false);
        setManualBalanceAmount('');
        await refreshBalance();
      } else {
        throw new Error(data?.error || 'Failed to update balance');
      }
    } catch (err) {
      console.error('Manual balance update error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update balance');
    } finally {
      setUpdatingBalance(false);
    }
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
                    <Label htmlFor="payId">Binance Pay ID *</Label>
                    <Input
                      id="payId"
                      placeholder="Enter your Binance Pay ID"
                      value={payIdInput}
                      onChange={(event) => setPayIdInput(event.target.value)}
                      disabled={linking}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your unique Binance Pay ID for receiving payments
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="merchantId">Merchant ID (Optional)</Label>
                    <Input
                      id="merchantId"
                      placeholder="Enter Binance Merchant ID"
                      value={merchantIdInput}
                      onChange={(event) => setMerchantIdInput(event.target.value)}
                      disabled={linking}
                    />
                    <p className="text-xs text-muted-foreground">
                      Required only if you have a Binance Pay merchant account
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="Enter Binance Pay API Key"
                        value={apiKeyInput}
                        onChange={(event) => setApiKeyInput(event.target.value)}
                        disabled={linking}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add API credentials to query your balance directly from Binance
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="apiSecret"
                        type={showApiSecret ? 'text' : 'password'}
                        placeholder="Enter Binance Pay API Secret"
                        value={apiSecretInput}
                        onChange={(event) => setApiSecretInput(event.target.value)}
                        disabled={linking}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiSecret(!showApiSecret)}
                      >
                        {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get these from Binance Pay Merchant Portal → API Management
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      <strong>💡 Tip:</strong> Adding API credentials allows the app to query your actual Binance balance directly. Without them, the app will calculate balance from your payment history.
                    </p>
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
                          className={pillButtonClasses}
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
                            className={pillButtonClasses}
                            onClick={() => setTopUpDialogOpen(true)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Top up wallet
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className={pillButtonClasses}
                          onClick={() => {
                            setManualBalanceAmount(balance?.balance?.toString() || '0');
                            setManualBalanceDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Set balance
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    size="sm"
                    className={pillButtonClasses}
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

      <Dialog open={manualBalanceDialogOpen} onOpenChange={setManualBalanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manually Set Balance</DialogTitle>
            <DialogDescription>
              If your Binance balance doesn't match what's shown, you can manually set it here. This is useful when you have external deposits or the API can't query your balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manualBalance">Balance (USDC)</Label>
              <Input
                id="manualBalance"
                type="number"
                min={0}
                step="0.01"
                value={manualBalanceAmount}
                onChange={(event) => setManualBalanceAmount(event.target.value)}
                placeholder="Enter your actual Binance balance"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the exact balance shown in your Binance wallet
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[10, 25, 45, 100].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setManualBalanceAmount(preset.toString())}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <Button 
              onClick={handleManualBalanceUpdate} 
              disabled={updatingBalance}
              className="w-full"
            >
              {updatingBalance ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Balance
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
