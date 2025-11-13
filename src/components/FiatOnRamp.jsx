import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Info, ExternalLink } from 'lucide-react';

export function FiatOnRamp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Funds with Binance Pay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Use Binance to add USDC to your account for seamless payments
          </AlertDescription>
        </Alert>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <p>Open your Binance app</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <p>Add funds via card, bank transfer, or P2P</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <p>Convert to USDC in your Funding Wallet</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">4.</span>
            <p>Use Binance Pay to make instant payments</p>
          </div>
        </div>

        <Button 
          className="w-full"
          onClick={() => window.open('https://www.binance.com/en/buy-sell-crypto', '_blank')}
        >
          Add Funds on Binance <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
