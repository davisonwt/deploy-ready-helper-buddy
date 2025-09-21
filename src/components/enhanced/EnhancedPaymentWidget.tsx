import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import UsdcPayment from '@/components/payment/UsdcPayment';
import TransactionTracker from '@/components/payment/TransactionTracker';
import { AlertCircle, CheckCircle2, CreditCard, Wallet } from 'lucide-react';

interface EnhancedPaymentWidgetProps {
  orchardId: string;
  orchardTitle: string;
  defaultAmount?: number;
  acceptedCurrencies?: string[];
}

const EnhancedPaymentWidget: React.FC<EnhancedPaymentWidgetProps> = ({
  orchardId,
  orchardTitle,
  defaultAmount = 150,
  acceptedCurrencies = ['USDC', 'USD']
}) => {
  const { connected } = useWallet();
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'traditional'>('usdc');
  const [amount, setAmount] = useState(defaultAmount);
  const [txSignature, setTxSignature] = useState<string>('');

  const handlePaymentSuccess = (signature: string) => {
    setTxSignature(signature);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Bestow to {orchardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Selection */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="1"
              className="flex-1"
            />
            <Badge variant="secondary">
              {paymentMethod === 'usdc' ? 'USDC' : 'USD'}
            </Badge>
          </div>
        </div>

        {/* Payment Method Selection */}
        <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'usdc' | 'traditional')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="usdc" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              USDC (Crypto)
            </TabsTrigger>
            <TabsTrigger value="traditional" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card/Bank
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="usdc" className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Instant & Secure
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Pay directly with USDC on Solana blockchain. No fees, instant settlement.
              </p>
            </div>
            
            {!connected ? (
              <div className="text-center">
                <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />
              </div>
            ) : (
              <UsdcPayment 
                amount={amount} 
                orchardId={orchardId}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </TabsContent>
          
          <TabsContent value="traditional" className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Traditional payment methods (credit card, bank transfer) will be available soon.
              </p>
            </div>
            
            <Button disabled className="w-full">
              Credit Card Payment (Coming Soon)
            </Button>
          </TabsContent>
        </Tabs>

        {/* Transaction Tracking */}
        {txSignature && (
          <div className="mt-6">
            <TransactionTracker signature={txSignature} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPaymentWidget;