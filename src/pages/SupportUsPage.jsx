import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletHelpModal } from '@/components/wallet/WalletHelpModal';

export default function SupportUsPage() {
  return (
    <main className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Support Us with USDC on Cronos</CardTitle>
          <WalletHelpModal />
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            To support our work, please use your Crypto.com DeFi Wallet to send USDC to our organization wallet.
          </p>
          <p className="text-sm text-muted-foreground">
            You can find wallet setup instructions and FAQs via the Payment Help button.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}