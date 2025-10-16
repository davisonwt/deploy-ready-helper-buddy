import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Heart, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useBestowals } from '@/hooks/useBestowals';

const OrchardPaymentWidget = ({ orchardId, orchardTitle, pocketPrice, availablePockets }) => {
  const [pocketsCount, setPocketsCount] = useState(1);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const { user } = useAuth();
  const { connected, balance, connectWallet } = useWallet();
  const { createBestowal } = useBestowals();
  const { toast } = useToast();

  const totalAmount = pocketsCount * pocketPrice;
  const hasBalance = connected && parseFloat(balance) >= totalAmount;

  const handlePocketsChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setPocketsCount(Math.min(Math.max(1, value), availablePockets));
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please log in to support this orchard'
      });
      return;
    }

    if (!connected) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first'
      });
      return;
    }

    if (!hasBalance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: `You need ${totalAmount.toFixed(2)} USDC but have ${balance} USDC`
      });
      return;
    }

    setProcessing(true);

    try {
      const result = await createBestowal({
        orchard_id: orchardId,
        bestower_id: user.id,
        amount: totalAmount,
        pockets_count: pocketsCount,
        message: message || null,
        payment_method: 'crypto',
        currency: 'USDC'
      });

      if (result) {
        toast({
          title: 'Success!',
          description: `You've supported ${orchardTitle} with ${pocketsCount} pocket(s)!`
        });
        
        // Reset form
        setPocketsCount(1);
        setMessage('');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: error.message || 'Unable to process payment. Please try again.'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-orange-600" />
          Support This Orchard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Connection */}
        {!connected ? (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Connect your wallet to support this orchard
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              Balance: {balance} USDC
            </AlertDescription>
          </Alert>
        )}

        {/* Pockets Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Pockets</label>
          <Input
            type="number"
            min="1"
            max={availablePockets}
            value={pocketsCount}
            onChange={handlePocketsChange}
            disabled={processing}
          />
          <p className="text-xs text-muted-foreground">
            {availablePockets} pocket(s) available • ${pocketPrice.toFixed(2)} per pocket
          </p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Message (Optional)</label>
          <Input
            placeholder="Add a message of support..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            disabled={processing}
          />
        </div>

        {/* Total Amount */}
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-orange-900">Total Amount:</span>
            <span className="text-2xl font-bold text-orange-700">
              ${totalAmount.toFixed(2)} USDC
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!connected ? (
            <Button 
              onClick={connectWallet} 
              className="w-full"
              size="lg"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          ) : (
            <Button
              onClick={handlePayment}
              disabled={processing || !hasBalance || availablePockets === 0}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Support with {pocketsCount} Pocket{pocketsCount > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>

        {!hasBalance && connected && (
          <Alert variant="destructive">
            <AlertDescription>
              Insufficient balance. You need {totalAmount.toFixed(2)} USDC but have {balance} USDC.
            </AlertDescription>
          </Alert>
        )}

        {availablePockets === 0 && (
          <Alert>
            <AlertDescription>
              This orchard is fully funded! Thank you for your interest.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default OrchardPaymentWidget;
