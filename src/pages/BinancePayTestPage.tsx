import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function BinancePayTestPage() {
  const [amount, setAmount] = useState('10.00');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testBinancePayment = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to test Binance Pay",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-binance-pay-order', {
        body: {
          amount: parseFloat(amount),
          currency: 'USDT',
          description: 'Test Payment Order',
          orchardId: null,
          pocketsCount: 1
        }
      });

      if (error) throw error;

      setResult({
        success: true,
        data
      });

      toast({
        title: "Success! ✅",
        description: "Binance Pay credentials are working correctly",
      });

      // Open payment URL if available
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      }

    } catch (error: any) {
      console.error('Binance Pay test error:', error);
      setResult({
        success: false,
        error: error.message || 'Unknown error occurred'
      });

      toast({
        title: "Test Failed",
        description: error.message || "Failed to create test payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Binance Pay Integration Test</h1>
          <p className="text-muted-foreground">
            Test your Binance Pay merchant credentials by creating a test payment order
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Test Payment</CardTitle>
            <CardDescription>
              This will create a real payment order using your merchant account. You can cancel it after testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Test Amount (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
              />
              <p className="text-sm text-muted-foreground">
                Minimum: $0.01 USDT
              </p>
            </div>

            <Button
              onClick={testBinancePayment}
              disabled={loading || !amount || parseFloat(amount) < 0.01}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Test Order...
                </>
              ) : (
                'Create Test Payment'
              )}
            </Button>

            {result && (
              <Card className={result.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold">
                        {result.success ? 'Test Successful!' : 'Test Failed'}
                      </h3>
                      
                      {result.success ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            Your Binance Pay credentials are configured correctly.
                          </p>
                          {result.data && (
                            <div className="bg-background/50 p-3 rounded-md font-mono text-xs break-all">
                              <p><strong>Order ID:</strong> {result.data.prepayId}</p>
                              {result.data.checkoutUrl && (
                                <p><strong>Checkout URL:</strong> <a href={result.data.checkoutUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open Payment Page</a></p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            There was an error with the credentials or configuration.
                          </p>
                          <div className="bg-background/50 p-3 rounded-md font-mono text-xs break-all">
                            {result.error}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What This Test Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span>
              <p>Creates a real Binance Pay order using your merchant credentials</p>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span>
              <p>Verifies that your API key, secret, and merchant ID are valid</p>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span>
              <p>Generates a payment checkout URL that you can use to complete the test payment</p>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-foreground">4.</span>
              <p>You can cancel the payment order in your Binance Merchant dashboard if you don't want to complete it</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
