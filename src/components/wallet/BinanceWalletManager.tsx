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
import { getCurrentTheme } from '@/utils/dashboardThemes';

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
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);

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

  // Dynamic button classes based on theme
  const pillButtonClasses = "rounded-full transition-colors duration-200 shadow-sm px-4";

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
    <Card 
      className={className}
      style={{
        backgroundColor: currentTheme.cardBg,
        borderColor: currentTheme.cardBorder,
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: currentTheme.textPrimary }}>
          <Wallet className="h-5 w-5" style={{ color: currentTheme.accent }} />
          Binance Wallet
        </CardTitle>
        <CardDescription style={{ color: currentTheme.textSecondary }}>
          Link your Binance Pay ID to view your balance and top up directly inside Sow2Grow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-3" style={{ color: currentTheme.textSecondary }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading wallet information...
          </div>
        ) : (
          <>
            {error && (
              <div className="text-sm rounded-md p-3" style={{ 
                color: '#ef5350', 
                backgroundColor: 'rgba(239, 83, 80, 0.1)', 
                border: '1px solid rgba(239, 83, 80, 0.3)' 
              }}>
                {error}
              </div>
            )}

              {(!wallet || showLinkField) && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
                    Link your Binance Pay ID (Pay ID) so Sow2Grow can route distributions to your wallet and display your balance.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payId" style={{ color: currentTheme.textPrimary }}>Binance Pay ID *</Label>
                    <Input
                      id="payId"
                      placeholder="Enter your Binance Pay ID"
                      value={payIdInput}
                      onChange={(event) => setPayIdInput(event.target.value)}
                      disabled={linking}
                      style={{
                        backgroundColor: currentTheme.cardBg,
                        borderColor: currentTheme.cardBorder,
                        color: currentTheme.textPrimary,
                      }}
                    />
                    <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
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

                  <div className="rounded-lg border p-3" style={{
                    borderColor: currentTheme.cardBorder,
                    backgroundColor: currentTheme.secondaryButton,
                  }}>
                    <p className="text-xs" style={{ color: currentTheme.textPrimary }}>
                      <strong>💡 Tip:</strong> Adding API credentials allows the app to query your actual Binance balance directly. Without them, the app will calculate balance from your payment history.
                    </p>
                  </div>

                  <Button 
                    onClick={handleLink} 
                    disabled={linking} 
                    className="w-full"
                    style={{
                      background: currentTheme.primaryButton,
                      color: currentTheme.textPrimary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = currentTheme.primaryButtonHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = currentTheme.primaryButton;
                    }}
                  >
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
                  <div className="rounded-lg border p-4 space-y-1" style={{
                    borderColor: currentTheme.cardBorder,
                    backgroundColor: currentTheme.secondaryButton,
                  }}>
                    <div className="text-xs font-semibold" style={{ color: currentTheme.textSecondary }}>
                      {wallet.origin === 'organization' ? 'Organization Wallet' : 'Linked Binance Pay ID'}
                    </div>
                    <div className="text-lg font-semibold tracking-wide break-all" style={{ color: currentTheme.textPrimary }}>
                      {wallet.wallet_name ? `${wallet.wallet_name} • ${wallet.wallet_address}` : wallet.wallet_address}
                    </div>
                    <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                      {wallet.origin === 'organization' ? 'Read-only • Admin access' : 'Primary • Active'}
                    </div>
                    {wallet.origin === 'organization' && (
                      <div className="text-[11px]" style={{ color: currentTheme.textSecondary }}>
                        This wallet is shared by the organization (`{wallet.wallet_name ?? 's2gdavison'}`). Only administrators can view and top up this balance from Sow2Grow.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4" style={{
                      borderColor: currentTheme.cardBorder,
                      backgroundColor: currentTheme.cardBg,
                    }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: currentTheme.textSecondary }}>
                        Available Balance
                      </div>
                      <div className="text-2xl font-bold" style={{ color: currentTheme.textPrimary }}>
                        {balance?.display ?? '$0.00'}
                      </div>
                      <div className="text-xs mt-1" style={{ color: currentTheme.textSecondary }}>
                        {balance?.updatedAt
                          ? `Last synced ${new Date(balance.updatedAt).toLocaleString()}`
                          : 'Sync to fetch the latest balance'}
                      </div>
                      <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                        Source: {balance?.source === 'binance' ? 'Binance Pay' : 'Platform ledger'}
                      </div>
                    </div>

                    <div className="rounded-lg border p-4" style={{
                      borderColor: currentTheme.cardBorder,
                      backgroundColor: currentTheme.cardBg,
                    }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: currentTheme.textSecondary }}>
                        Quick Actions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border transition-all duration-200 shadow-sm px-4 py-2"
                          onClick={refreshBalance}
                          disabled={refreshing}
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                            e.currentTarget.style.color = currentTheme.textPrimary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                            e.currentTarget.style.color = currentTheme.textPrimary;
                          }}
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
                            className="rounded-full border transition-all duration-200 shadow-sm px-4 py-2"
                            onClick={() => setTopUpDialogOpen(true)}
                            style={{
                              borderColor: currentTheme.accent,
                              backgroundColor: currentTheme.secondaryButton,
                              color: currentTheme.textPrimary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.accent;
                              e.currentTarget.style.borderColor = currentTheme.accent;
                              e.currentTarget.style.color = currentTheme.textPrimary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                              e.currentTarget.style.borderColor = currentTheme.accent;
                              e.currentTarget.style.color = currentTheme.textPrimary;
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Top up wallet
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border transition-all duration-200 shadow-sm px-4 py-2"
                          onClick={() => {
                            setManualBalanceAmount(balance?.amount?.toString() || '0');
                            setManualBalanceDialogOpen(true);
                          }}
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                            e.currentTarget.style.color = currentTheme.textPrimary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                            e.currentTarget.style.color = currentTheme.textPrimary;
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Set balance
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator style={{ backgroundColor: currentTheme.cardBorder }} />

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border transition-all duration-200 shadow-sm px-4 py-2"
                    onClick={() => {
                      setShowLinkField(true);
                      setPayIdInput('');
                    }}
                    style={{
                      borderColor: currentTheme.accent,
                      backgroundColor: currentTheme.secondaryButton,
                      color: currentTheme.textPrimary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.accent;
                      e.currentTarget.style.borderColor = currentTheme.accent;
                      e.currentTarget.style.color = currentTheme.textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                      e.currentTarget.style.borderColor = currentTheme.accent;
                      e.currentTarget.style.color = currentTheme.textPrimary;
                    }}
                  >
                    <LinkIcon className="h-3 w-3 mr-2" />
                    Link a different wallet
                  </Button>

                  <div className="text-xs space-y-2" style={{ color: currentTheme.textSecondary }}>
                    <p className="font-semibold" style={{ color: currentTheme.textPrimary }}>Need your Pay ID?</p>
                    <p>
                      Open the Binance app &gt; tap <strong>Profile</strong> &gt; <strong>Pay</strong> &gt; <strong>Receive</strong> to copy your Pay ID.
                    </p>
                    <Button
                      variant="outline"
                      size="default"
                      className="rounded-full border transition-all duration-200 shadow-sm px-4 py-2 mt-2"
                      onClick={() => window.open('https://www.binance.com/en/pay', '_blank')}
                      style={{
                        borderColor: currentTheme.accent,
                        backgroundColor: currentTheme.secondaryButton,
                        color: currentTheme.textPrimary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.accent;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                        e.currentTarget.style.color = currentTheme.textPrimary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                        e.currentTarget.style.color = currentTheme.textPrimary;
                      }}
                    >
                      Binance Pay Help <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
          </>
        )}
      </CardContent>

      <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
        <DialogContent className="max-w-md" style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: currentTheme.textPrimary }}>Top up your Sow2Grow wallet</DialogTitle>
            <DialogDescription style={{ color: currentTheme.textSecondary }}>
              Generate a Binance Pay checkout to add more USDC to the wallet you use on Sow2Grow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topUpAmount" style={{ color: currentTheme.textPrimary }}>Amount (USDC)</Label>
              <Input
                id="topUpAmount"
                type="number"
                min={1}
                step="1"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(Number(event.target.value))}
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopUpAmount(preset)}
                  style={{
                    borderColor: currentTheme.cardBorder,
                    backgroundColor: currentTheme.secondaryButton,
                    color: currentTheme.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                  }}
                >
                  {preset} USDC
                </Button>
              ))}
            </div>
            <Button 
              onClick={handleTopUp} 
              className="w-full"
              style={{
                background: currentTheme.primaryButton,
                color: currentTheme.textPrimary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentTheme.primaryButtonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = currentTheme.primaryButton;
              }}
            >
              Create Binance Pay order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualBalanceDialogOpen} onOpenChange={setManualBalanceDialogOpen}>
        <DialogContent className="max-w-md" style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: currentTheme.textPrimary }}>Manually Set Balance</DialogTitle>
            <DialogDescription style={{ color: currentTheme.textSecondary }}>
              If your Binance balance doesn't match what's shown, you can manually set it here. This is useful when you have external deposits or the API can't query your balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manualBalance" style={{ color: currentTheme.textPrimary }}>Balance (USDC)</Label>
              <Input
                id="manualBalance"
                type="number"
                min={0}
                step="0.01"
                value={manualBalanceAmount}
                onChange={(event) => setManualBalanceAmount(event.target.value)}
                placeholder="Enter your actual Binance balance"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
              />
              <p className="text-xs mt-1" style={{ color: currentTheme.textSecondary }}>
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
                  style={{
                    borderColor: currentTheme.cardBorder,
                    backgroundColor: currentTheme.secondaryButton,
                    color: currentTheme.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                  }}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <Button 
              onClick={handleManualBalanceUpdate} 
              disabled={updatingBalance}
              className="w-full"
              style={{
                background: currentTheme.primaryButton,
                color: currentTheme.textPrimary,
              }}
              onMouseEnter={(e) => {
                if (!updatingBalance) {
                  e.currentTarget.style.background = currentTheme.primaryButtonHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = currentTheme.primaryButton;
              }}
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
