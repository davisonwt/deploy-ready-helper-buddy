import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Info, CreditCard, Wallet, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { NowPaymentsButton } from '@/components/payment/NowPaymentsButton';

const OrchardPaymentWidget = ({ orchardId, orchardTitle, pocketPrice, availablePockets, growerId }) => {
  const [pocketsCount, setPocketsCount] = useState(1);
  const [message, setMessage] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const totalAmount = pocketsCount * pocketPrice;

  const handlePocketsChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setPocketsCount(Math.min(Math.max(1, value), availablePockets));
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-orange-600" />
            Support This Orchard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please log in to support this orchard
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-orange-600" />
          Support This Orchard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Number of Pockets ({pocketPrice} USDC each)
          </label>
          <Input
            type="number"
            min="1"
            max={availablePockets}
            value={pocketsCount}
            onChange={handlePocketsChange}
            disabled={!user}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Available: {availablePockets} pockets
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Message (Optional)
          </label>
          <Input
            placeholder="Add a message of support..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!user}
          />
        </div>

        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold">{totalAmount.toFixed(2)} USDC</span>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Payment Options Available:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              <span>300+ Cryptocurrencies</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Credit/Debit Cards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span>Bank Transfers (EFT)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">💳</span>
              <span>PayPal & More</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            All payment fees are included in your invoice.
          </p>
        </div>

        {/* NOWPayments Button */}
        <NowPaymentsButton
          orchardId={orchardId}
          amount={totalAmount}
          pocketsCount={pocketsCount}
          message={message}
          growerId={growerId}
          disabled={!user || availablePockets === 0}
          className="w-full"
          onSuccess={() => {
            toast({
              title: 'Payment Initiated!',
              description: 'Complete the payment on the checkout page using your preferred method'
            });
          }}
        />
      </CardContent>
    </Card>
  );
};

export default OrchardPaymentWidget;
