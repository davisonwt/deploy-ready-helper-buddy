import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Download, CreditCard, ExternalLink, Info } from 'lucide-react';

interface WalletOnboardingGuideProps {
  compact?: boolean;
}

export function WalletOnboardingGuide({ compact = false }: WalletOnboardingGuideProps) {
  if (compact) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Payment requires Crypto.com Wallet</p>
          <p className="text-sm mb-2">
            To make bestowals, you'll need the Crypto.com DeFi Wallet app installed with USDC, USDT, or CRO tokens.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://crypto.com/defi-wallet', '_blank')}
            className="mt-2"
          >
            Download Wallet <ExternalLink className="ml-2 h-3 w-3" />
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
          Learn how to make bestowals using cryptocurrency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Download Wallet */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">1. Download Crypto.com DeFi Wallet</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Get the free Crypto.com DeFi Wallet app on your mobile device to manage your crypto payments.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://crypto.com/defi-wallet', '_blank')}
                >
                  Download for iOS/Android <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Fund Your Wallet */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">2. Add Funds to Your Wallet</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You'll need one of these tokens on the <strong>Cronos network</strong>:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 mb-3">
                <li>• <strong>USDC</strong> - USD Coin (recommended for stable value)</li>
                <li>• <strong>USDT</strong> - Tether USD (alternative stablecoin)</li>
                <li>• <strong>CRO</strong> - Cronos native token</li>
              </ul>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold mb-1">💡 How to add funds:</p>
                <ol className="space-y-1 ml-4 text-muted-foreground">
                  <li>1. Buy crypto on Crypto.com app or exchange</li>
                  <li>2. Transfer to your DeFi Wallet (Cronos network)</li>
                  <li>3. Or use the built-in "Buy" feature in DeFi Wallet</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Connect and Pay */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">3. Connect & Make Your First Bestowal</h3>
              <p className="text-sm text-muted-foreground mb-2">
                When you're ready to make a bestowal:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Click "Connect Wallet" on the payment page</li>
                <li>• Approve the connection in your Crypto.com DeFi Wallet app</li>
                <li>• Select amount and confirm the transaction</li>
                <li>• Your bestowal will be confirmed in seconds!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-muted/30 rounded-lg p-4 mt-6">
          <p className="text-sm font-semibold mb-2">Need Help?</p>
          <p className="text-sm text-muted-foreground mb-3">
            If you're having trouble setting up your wallet or making payments, check out these resources:
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://help.crypto.com/en/collections/260584-crypto-com-defi-wallet', '_blank')}
            >
              Wallet Help Center <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://cronos.org/faq', '_blank')}
            >
              Cronos Network FAQ <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Security Note */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Security reminder:</strong> Never share your wallet's recovery phrase with anyone. 
            The 364yhvh platform will never ask for your private keys or recovery phrase.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
