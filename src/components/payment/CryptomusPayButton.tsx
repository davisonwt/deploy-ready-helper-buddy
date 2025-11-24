import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Wallet, ExternalLink, Copy, Check } from 'lucide-react';
import { useCryptomusPay } from '@/hooks/useCryptomusPay';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CryptomusPayButtonProps {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  growerId?: string;
  currency?: string; // e.g., "USDC", "USDT", "BTC"
  network?: string; // e.g., "TRC20", "ERC20", "BEP20"
  onSuccess?: () => void;
  disabled?: boolean;
}

export function CryptomusPayButton({
  orchardId,
  amount,
  pocketsCount,
  message,
  growerId,
  currency = "USDC",
  network = "TRC20",
  onSuccess,
  disabled
}: CryptomusPayButtonProps) {
  const { processing, initiateCryptomusPayment } = useCryptomusPay();
  const [showInfo, setShowInfo] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  
  const formattedRequiredAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const handlePayment = async () => {
    const result = await initiateCryptomusPayment({
      orchardId,
      amount,
      pocketsCount,
      message,
      growerId,
      currency,
      network,
    });

    if (result?.paymentUrl) {
      // Show payment details dialog with address and amount
      if (result.address && result.amount) {
        setPaymentAddress(result.address);
        setPaymentAmount(result.amount);
        setShowPaymentDetails(true);
      } else {
        // Open payment URL if no address provided (redirects to Cryptomus checkout)
        window.open(result.paymentUrl, '_blank');
        onSuccess?.();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPaymentPage = () => {
    if (paymentAddress) {
      window.open(`https://cryptomus.com/pay/${paymentAddress}`, '_blank');
    }
    onSuccess?.();
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={disabled || processing}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
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
            Pay with Cryptomus
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

      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              Send {currency} to the address below to complete your bestowal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="font-mono text-sm flex-1">{paymentAmount} {currency}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => paymentAmount && copyToClipboard(paymentAmount)}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Wallet Address ({network})</label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="font-mono text-xs flex-1 break-all">{paymentAddress}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => paymentAddress && copyToClipboard(paymentAddress)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Send exactly {paymentAmount} {currency} to this address</p>
              <p>• Network: {network}</p>
              <p>• Payment will be confirmed automatically once received</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowPaymentDetails(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleOpenPaymentPage}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Payment Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

