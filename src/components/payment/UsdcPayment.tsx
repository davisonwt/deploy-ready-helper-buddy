import React, { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ethers } from 'ethers';
import { USDC_ADDRESS, USDC_ABI, parseUSDC, formatUSDC } from '@/lib/cronos';
import { useParams } from 'react-router-dom';
import '@/types/ethereum'; // Import for global Window.ethereum type

interface UsdcPaymentProps {
  amount: number;
  orchardId?: string;
  onSuccess?: (signature: string) => void;
}

export default function UsdcPayment({ amount, orchardId, onSuccess }: UsdcPaymentProps) {
  const { connected, publicKey, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const params = useParams();
  const targetOrchardId = orchardId || params.id;

  const handlePayment = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your Binance Pay wallet first');
      return;
    }

    if (!targetOrchardId) {
      toast.error('No orchard specified for payment');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get organization wallet address (site receiving wallet)
      const { data: orgWallet, error: walletError } = await supabase
        .from('organization_wallets')
        .select('wallet_address')
        .eq('is_active', true)
        .eq('blockchain', 'cronos')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (walletError || !orgWallet) {
        throw new Error('Organization wallet not configured. Please contact admin.');
      }

      // Get provider from Crypto.com wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create USDC contract instance
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

      // Parse amount to correct units (6 decimals for USDC)
      const amountToSend = parseUSDC(amount);

      // Send transaction to organization wallet
      const tx = await usdcContract.transfer(orgWallet.wallet_address, amountToSend);

      toast.success('Transaction sent! Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();

      setTxHash(receipt.hash);
      setSuccess(true);

      // Record in database
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('bestowals')
        .insert({
          orchard_id: targetOrchardId,
          bestower_id: user?.id,
          amount: amount,
          currency: 'USDC',
          pockets_count: 1,
          payment_method: 'cryptocom',
          payment_status: 'completed',
          payment_reference: receipt.hash,
          blockchain_network: 'cronos',
        });

      if (insertError) {
        console.error('Error recording payment:', insertError);
      }

      toast.success(`Payment successful! Sent ${formatUSDC(amount)} USDC`);

      if (onSuccess) {
        onSuccess(receipt.hash);
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const error = err as Error;
      const errorMessage = error?.message || 'Payment failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay with USDC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <Button onClick={connectWallet} className="w-full">
            Connect Binance Pay Wallet
          </Button>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-3xl font-bold">{formatUSDC(amount)} USDC</p>
            </div>

            <Button 
              onClick={handlePayment} 
              disabled={loading || success}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Payment Complete
                </>
              ) : (
                'Pay Now'
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && txHash && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Payment successful!{' '}
                  <a
                    href={`https://cronoscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View transaction
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
