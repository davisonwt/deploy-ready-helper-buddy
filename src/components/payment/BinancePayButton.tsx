import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Wallet, ExternalLink, TrendingUp } from 'lucide-react';
import { useBinancePay } from '@/hooks/useBinancePay';
import { useBinanceWallet } from '@/hooks/useBinanceWallet';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BinancePayButtonProps {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function BinancePayButton({
  orchardId,
  amount,
  pocketsCount,
  message,
  growerId,
  onSuccess,
  disabled
}: BinancePayButtonProps) {
  const { processing, initiateBinancePayment } = useBinancePay();
  const { wallet, balance } = useBinanceWallet();
  const [showInfo, setShowInfo] = useState(false);
  const [showTopUpPrompt, setShowTopUpPrompt] = useState(false);
  const navigate = useNavigate();
  const formattedRequiredAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
  const shortfall = balance ? Math.max(0, amount - balance.amount) : null;
  const formattedShortfall = shortfall && shortfall > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(shortfall)
    : null;

  const handlePayment = async () => {
    if (!wallet?.wallet_address) {
      toast.warning('Link your Binance Pay ID in Wallet Settings before bestowing.');
      return;
    }

    if (balance && amount > balance.amount) {
      setShowTopUpPrompt(true);
      return;
    }

    const result = await initiateBinancePayment({
      orchardId,
      amount,
      pocketsCount,
      message,
      growerId
    });

    if (result?.paymentUrl) {
      window.open(result.paymentUrl, '_blank');
      onSuccess?.();
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={disabled || processing}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Pay with Binance Pay
          </>
        )}
      </Button>

        {showInfo && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              Bestowal Distribution
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>• Standard orchards: funds rest in the s2gholding wallet until a Gosat releases them.</p>
              <p>• Full value orchards without couriers and community products distribute instantly after confirmation.</p>
              <p>• 15% is routed to s2gbestow (10% tithe, 5% admin stewardship).</p>
              <p>• The remaining share goes to the sower{growerId ? ' and product whispers' : ''}.</p>
            </div>
          </Card>
        )}

      <button
        onClick={() => setShowInfo(!showInfo)}
        className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
      >
        {showInfo ? 'Hide' : 'Show'} payment details
      </button>

        <Dialog open={showTopUpPrompt} onOpenChange={setShowTopUpPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insufficient wallet balance</DialogTitle>
              <DialogDescription>
                You need at least {formattedRequiredAmount} in your Binance Pay wallet to complete this bestowal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm text-muted-foreground">
              <p>
                Current wallet balance:{' '}
                {balance
                  ? balance.display
                  : 'Unavailable — refresh your wallet in the dashboard'}
              </p>
              {formattedShortfall && (
                <p>
                  Shortfall: {formattedShortfall}
                </p>
              )}
              <p>
                Top up your wallet and try again. Once your funds are available, return to this bestowal screen.
              </p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowTopUpPrompt(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowTopUpPrompt(false);
                  navigate('/wallet-settings?topup=1');
                }}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Top up wallet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
