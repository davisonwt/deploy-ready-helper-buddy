import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Download, CreditCard, ExternalLink, Info, Banknote } from 'lucide-react';

interface WalletOnboardingGuideProps {
  compact?: boolean;
}

export function WalletOnboardingGuide({ compact = false }: WalletOnboardingGuideProps) {
  if (compact) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Payments via NOWPayments</p>
          <p className="text-sm mb-2">
            S2G uses NOWPayments for all payments. Pay with crypto, card, bank transfer, or PayPal.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://nowpayments.io', '_blank')}
            className="mt-2"
          >
            Learn about NOWPayments <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
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
          Learn how to make and receive bestowals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Making Payments */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">1. Making Payments (Bestowing)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                When you make a bestowal, you'll be redirected to NOWPayments where you can pay using:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 mb-3">
                <li>• <strong>Cryptocurrency</strong> - Bitcoin, Ethereum, USDC, and 200+ coins</li>
                <li>• <strong>Credit/Debit Card</strong> - Visa, Mastercard, etc.</li>
                <li>• <strong>Bank Transfer</strong> - SEPA, Wire transfer</li>
                <li>• <strong>PayPal</strong> - Quick and easy</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                No account needed to pay - just complete the checkout!
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Receiving Payments */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <Banknote className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">2. Receiving Payments (Sowers)</h3>
              <p className="text-sm text-muted-foreground mb-2">
                To receive payouts from your seeds and orchards, you need to set up your payout wallet:
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold mb-1">💡 Setting up your payout wallet:</p>
                <ol className="space-y-1 ml-4 text-muted-foreground">
                  <li>1. Go to <strong>My Wallet Settings</strong> in your profile</li>
                  <li>2. Enter your crypto wallet address (for receiving USDC payouts)</li>
                  <li>3. Your earnings will accumulate and you can request withdrawals</li>
                  <li>4. Minimum withdrawal: $10 USD, Fee: 0.5%</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Viewing Balance */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">3. Viewing Your Balance</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Your earnings are tracked automatically:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Available Balance</strong> - Ready to withdraw</li>
                <li>• <strong>Pending Balance</strong> - Processing (usually 24-48 hours)</li>
                <li>• <strong>Total Earned</strong> - Lifetime earnings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-muted/30 rounded-lg p-4 mt-6">
          <p className="text-sm font-semibold mb-2">Need Help?</p>
          <p className="text-sm text-muted-foreground mb-3">
            Check out these resources for more information:
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://nowpayments.io/help', '_blank')}
            >
              NOWPayments Help <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Security Note */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Security reminder:</strong> S2G never asks for your wallet's private keys or recovery phrase.
            Only provide your public wallet address for receiving payouts.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
