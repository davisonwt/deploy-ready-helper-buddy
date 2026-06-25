import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Info } from 'lucide-react';

/**
 * DISABLED — Binance Pay top-up is no longer an allowed payment rail.
 * Sow2Grow now uses NOWPayments (crypto) and PayPal (fiat) only.
 * This stub remains because VideoGifting.jsx still imports it; once that
 * caller is reworked, this file can be deleted.
 */
export function FiatOnRamp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Funds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Wallet top-ups are temporarily unavailable while we migrate to
            NOWPayments and PayPal. Please use the standard bestowal flow.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
