import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UsdcPaymentProps {
  amount: number;
  orchardId?: string;
  onSuccess?: (signature: string) => void;
}

export default function UsdcPayment({ amount }: UsdcPaymentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay with USDC via Binance Pay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            All payments are now processed through Binance Pay. No wallet connection required!
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Amount to pay</p>
          <p className="text-3xl font-bold">{amount.toFixed(2)} USDC</p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Pay directly from your Binance app</p>
          <p>✓ Instant and secure transactions</p>
          <p>✓ No wallet connection needed</p>
        </div>

        <Button 
          variant="outline"
          className="w-full"
          onClick={() => window.open('https://www.binance.com/en/pay', '_blank')}
        >
          Learn About Binance Pay <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
