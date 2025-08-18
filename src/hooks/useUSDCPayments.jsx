import '../polyfills'; // Import polyfills for Solana
import { useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWallet } from './useWallet';
import { useToast } = '@/hooks/use-toast';

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Platform wallet address (replace with your actual platform wallet)
const PLATFORM_WALLET = new PublicKey('YourPlatformWalletAddressHere123456789');

// Connection to Solana mainnet
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

export function useUSDCPayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { wallet, balance, refreshBalance } = useWallet();
  const { toast } = useToast();

  // Check if user has sufficient USDC balance
  const checkSufficientBalance = (requiredAmount) => {
    return balance >= requiredAmount;
  };

  // Create USDC transfer transaction
  const createUSDCTransfer = async (recipientAddress, amount) => {
    try {
      if (!wallet?.publicKey) {
        throw new Error('Wallet not connected');
      }

      const senderPublicKey = wallet.publicKey;
      const recipientPublicKey = new PublicKey(recipientAddress);

      // Get associated token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        senderPublicKey
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        recipientPublicKey
      );

      // Convert amount to smallest unit (USDC has 6 decimals)
      const transferAmount = BigInt(Math.floor(amount * 1e6));

      // Create transaction
      const transaction = new Transaction();

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          senderPublicKey,
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      return transaction;
    } catch (error) {
      console.error('Error creating USDC transfer:', error);
      throw error;
    }
  };

  // Process bestowal payment with USDC
  const processBestowPart = async (bestowData) => {
    try {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      if (!wallet?.connected) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      const { amount, orchardId, pocketsCount, pocketNumbers } = bestowData;

      // Check sufficient balance
      if (!checkSufficientBalance(amount)) {
        throw new Error(`Insufficient USDC balance. Required: $${amount.toFixed(2)}, Available: $${balance.toFixed(2)}`);
      }

      // Create bestowal record in database
      const { data: bestowalData, error: bestowError } = await supabase
        .from('bestowals')
        .insert([{
          orchard_id: orchardId,
          bestower_id: user.id,
          amount: amount,
          currency: 'USDC',
          pockets_count: pocketsCount,
          pocket_numbers: pocketNumbers,
          payment_method: 'usdc',
          payment_status: 'pending'
        }])
        .select()
        .single();

      if (bestowError) throw bestowError;

      // Create USDC transfer transaction
      const transaction = await createUSDCTransfer(PLATFORM_WALLET.toString(), amount);

      // Sign and send transaction
      const signedTransaction = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      // Record transaction in database
      const { error: txError } = await supabase
        .from('usdc_transactions')
        .insert([{
          user_id: user.id,
          from_wallet: wallet.address,
          to_wallet: PLATFORM_WALLET.toString(),
          amount: amount,
          signature: signature,
          transaction_type: 'bestowal',
          status: 'pending',
          bestowal_id: bestowalData.id
        }]);

      if (txError) {
        console.error('Error recording transaction:', txError);
      }

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Update bestowal status
      const { error: updateError } = await supabase
        .from('bestowals')
        .update({ 
          payment_status: 'completed',
          payment_reference: signature 
        })
        .eq('id', bestowalData.id);

      if (updateError) {
        console.error('Error updating bestowal status:', updateError);
      }

      // Update transaction status
      const { error: txUpdateError } = await supabase
        .from('usdc_transactions')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('signature', signature);

      if (txUpdateError) {
        console.error('Error updating transaction status:', txUpdateError);
      }

      // Refresh wallet balance
      await refreshBalance();

      toast({
        title: "Payment Successful",
        description: `Bestowal of $${amount.toFixed(2)} USDC completed successfully!`,
      });

      return { 
        success: true, 
        data: bestowalData,
        signature,
        txId: signature
      };

    } catch (err) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get user's USDC transaction history
  const getTransactionHistory = async () => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('usdc_transactions')
        .select(`
          *,
          bestowals:bestowal_id (
            orchard_id,
            pockets_count,
            orchards:orchard_id (
              title,
              category
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    loading,
    error,
    checkSufficientBalance,
    processBestowPart,
    getTransactionHistory,
    // Helper functions
    formatUSDC: (amount) => `$${amount.toFixed(2)} USDC`,
    isWalletReady: wallet?.connected && balance !== null
  };
}