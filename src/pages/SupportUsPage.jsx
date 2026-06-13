import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { WalletHelpModal } from '@/components/wallet/WalletHelpModal';

export default function SupportUsPage() {
  return (
    <main className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Support Us with Binance Pay (USDC)
          </h1>
          <WalletHelpModal />
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            To support our work, please use Binance Pay in your Binance app to send USDC to our organization wallet.
          </p>
          <p className="text-sm text-muted-foreground">
            You can find wallet setup instructions and FAQs via the Payment Help button.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
