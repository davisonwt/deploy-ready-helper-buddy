import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { connection, USDC_MINT } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';

const UsdcPayment = ({ amount = 10 }: { amount?: number }) => {
  const { id: orchardId } = useParams<{ id: string }>();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [txSignature, setTxSignature] = useState('');

  const handlePayment = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Wallet not connected');
      return;
    }
    if (!orchardId) {
      setError('Invalid orchard');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch orchard owner's wallet from organization_wallets
      const { data: orgWallet } = await supabase
        .from('organization_wallets')
        .select('wallet_address')
        .eq('is_active', true)
        .single();
      
      if (!orgWallet?.wallet_address) {
        throw new Error('No recipient wallet set');
      }
      const recipient = new PublicKey(orgWallet.wallet_address);

      // Get USDC decimals
      const mint = await getMint(connection, USDC_MINT);
      const decimals = mint.decimals;

      // Sender ATA
      const senderAta = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);

      // Recipient ATA (assume exists; create if not in prod)
      const recipientAta = await getAssociatedTokenAddress(USDC_MINT, recipient);

      // Create transfer instruction
      const transferIx = createTransferCheckedInstruction(
        senderAta,
        USDC_MINT,
        recipientAta,
        wallet.publicKey,
        BigInt(amount * 10 ** decimals),
        decimals
      );

      // Build tx
      const tx = new Transaction().add(transferIx);
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign and send
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Confirm
      await connection.confirmTransaction(signature);

      setTxSignature(signature);
      toast({ title: 'Payment successful!', description: `Tx: ${signature}` });

      // Update DB bestowal with required fields
      const { data: userProfile } = await supabase.auth.getUser();
      await supabase.from('bestowals').insert({
        orchard_id: orchardId,
        bestower_id: userProfile.user?.id,
        amount,
        pockets_count: 1,
        payment_status: 'completed',
        payment_reference: signature,
        currency: 'USDC',
        payment_method: 'solana_usdc'
      });
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Bestow USDC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!wallet.connected && <Button onClick={() => wallet.connect()}>Connect Wallet</Button>}
        {wallet.connected && (
          <Button onClick={handlePayment} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay {amount} USDC
          </Button>
        )}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {txSignature && <Alert><AlertDescription>Tx: {txSignature}</AlertDescription></Alert>}
      </CardContent>
    </Card>
  );
};

export default UsdcPayment;