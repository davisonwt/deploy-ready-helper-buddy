import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet, CreditCard, Banknote } from 'lucide-react';
import UsdcPayment from '@/components/payment/UsdcPayment';
import TransactionTracker from '@/components/payment/TransactionTracker';
import { WalletConnection } from '@/components/WalletConnection';
import SolanaProvider from '@/providers/SolanaProvider';

interface EnhancedPaymentWidgetProps {
  amount?: number;
  orchardId?: string;
  onPaymentSuccess?: (signature: string) => void;
}

const EnhancedPaymentWidget = ({ 
  amount = 10, 
  orchardId, 
  onPaymentSuccess 
}: EnhancedPaymentWidgetProps) => {
  const [lastTransaction, setLastTransaction] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'traditional'>('usdc');

  const handlePaymentComplete = (signature: string) => {
    setLastTransaction(signature);
    onPaymentSuccess?.(signature);
  };

  return (
    <SolanaProvider>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Complete Payment System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="usdc" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                USDC (Recommended)
              </TabsTrigger>
              <TabsTrigger value="traditional" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Traditional Payment
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="usdc" className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Preferred Method
                  </Badge>
                </div>
                <p className="text-sm text-green-700">
                  Pay with USDC for instant confirmation, low fees, and transparent blockchain tracking.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Step 1: Connect Wallet</h3>
                <WalletConnection compact />
                
                <h3 className="font-semibold">Step 2: Make Payment</h3>
                <UsdcPayment amount={amount} />
                
                {lastTransaction && (
                  <>
                    <h3 className="font-semibold">Step 3: Track Transaction</h3>
                    <TransactionTracker signature={lastTransaction} />
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="traditional" className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Traditional Payment</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Traditional payment methods available soon. USDC provides the best experience currently.
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setPaymentMethod('usdc')}
              >
                Switch to USDC Payment
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </SolanaProvider>
  );
};

export default EnhancedPaymentWidget;