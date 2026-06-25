import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, CreditCard, Info } from 'lucide-react';

interface WalletOnboardingGuideProps {
  compact?: boolean;
}

export function WalletOnboardingGuide({ compact = false }: WalletOnboardingGuideProps) {
  if (compact) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-1">Payments use NOWPayments or PayPal</p>
          <p className="text-sm">
            Choose crypto (USDC, BTC, ETH and more via NOWPayments) or PayPal at checkout —
            no separate wallet setup is required.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Getting Started with Payments
        </CardTitle>
        <CardDescription>
          How bestowals work on Sow2Grow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 mt-1">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">1. Pick a payment method at checkout</h3>
            <p className="text-sm text-muted-foreground">
              You'll be offered <strong>NOWPayments</strong> (USDC, BTC, ETH and other supported
              coins) or <strong>PayPal</strong>. Both settle directly to the recipient — no
              external wallet credentials are stored on your profile.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 mt-1">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. Confirm the payment</h3>
            <p className="text-sm text-muted-foreground">
              Follow the checkout flow in the provider's secure window. Your bestowal is
              recorded automatically once payment is confirmed by the webhook.
            </p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Security reminder:</strong> Sow2Grow never asks for your wallet private
            keys, seed phrases, or PayPal password. All payments happen on the provider's
            domain.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
