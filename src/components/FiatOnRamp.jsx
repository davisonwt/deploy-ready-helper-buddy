import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Info } from 'lucide-react';
import { useBinanceWallet } from '@/hooks/useBinanceWallet';
import { toast } from 'sonner';

export function FiatOnRamp() {
  const { wallet, createTopUpOrder } = useBinanceWallet();
  const [amount, setAmount] = useState(50);

  const handleTopUp = () => {
    if (!wallet?.wallet_address) {
      toast.error('Link your Binance Pay ID first in the wallet manager.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid top-up amount.');
      return;
    }

    createTopUpOrder(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Funds with Binance Pay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Generate a Binance Pay checkout link to add USDC to the wallet you linked to Sow2Grow.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>• This uses your linked Binance Pay ID to route funds back into your wallet.</p>
          <p>• The checkout opens in a secure Binance Pay window so you never leave the app.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topUpAmount">Top-up amount (USDC)</Label>
          <Input
            id="topUpAmount"
            type="number"
            min={1}
            step="1"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            disabled={!wallet?.wallet_address}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {[25, 50, 100, 250].map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => setAmount(preset)}
            >
              {preset} USDC
            </Button>
          ))}
        </div>

        {wallet?.origin === 'organization' && (
          <div className="text-xs text-muted-foreground">
            Top-ups created here will fund the organization wallet `{wallet.wallet_name ?? 's2gdavison'}`.
          </div>
        )}

        <Button className="w-full" onClick={handleTopUp}>
          Create Binance Pay checkout
        </Button>
      </CardContent>
    </Card>
  );
}
