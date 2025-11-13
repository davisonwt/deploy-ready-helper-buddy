import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BinancePayButton } from '@/components/payment/BinancePayButton';

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

        <BinancePayButton
          orchardId={orchardId}
          amount={totalAmount}
          pocketsCount={pocketsCount}
          message={message}
          growerId={growerId}
          disabled={!user || availablePockets === 0}
          onSuccess={() => {
            toast({
              title: 'Payment Initiated!',
              description: 'Complete the payment in your Binance app'
            });
          }}
        />
      </CardContent>
    </Card>
  );
};

export default OrchardPaymentWidget;
