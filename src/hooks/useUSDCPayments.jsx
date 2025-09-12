// Import polyfills first
import '../utils/solana-polyfills';

import { useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWallet } from './useWallet';
import { useToast } from '@/hooks/use-toast';

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Platform wallet address (replace with your actual platform wallet)
// Using a valid Solana address as placeholder - replace with your actual platform wallet
const PLATFORM_WALLET_ADDRESS = '11111111111111111111111111111112'; // System Program ID as placeholder
const PLATFORM_WALLET = new PublicKey(PLATFORM_WALLET_ADDRESS);

// Connection to Solana mainnet
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

export function useUSDCPayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { wallet, connected, balance } = useWallet();
  const { toast } = useToast();

  // Check if user has sufficient USDC balance
  const checkSufficientBalance = (requiredAmount) => {
    return balance >= requiredAmount;
  };

  // Create USDC transfer transaction
  const createUSDCTransfer = async (recipientAddress, amount) => {
    try {
      const senderPublicKey = wallet;
      const recipientPublicKey = new PublicKey(recipientAddress);
      
      // Derive associated token accounts (ATAs)
      const senderTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        senderPublicKey
      );
      
      const recipientTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        recipientPublicKey
      );

      // Create transaction
      const transaction = new Transaction();

      // Ensure sender ATA exists
      try {
        await getAccount(connection, senderTokenAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderPublicKey, // payer
            senderTokenAccount,
            senderPublicKey, // owner
            USDC_MINT
          )
        );
      }

      // Ensure recipient ATA exists
      try {
        await getAccount(connection, recipientTokenAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderPublicKey, // payer
            recipientTokenAccount,
            recipientPublicKey, // owner
            USDC_MINT
          )
        );
      }
      
      // Add transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        senderPublicKey,
        Math.round(amount * 1_000_000), // USDC has 6 decimals
        [],
        TOKEN_PROGRAM_ID
      );
      
      transaction.add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;
      
      return transaction;
    } catch (error) {
      console.error('Failed to create USDC transfer:', error);
      throw error;
    }
  };

  // Simple USDC transfer without creating DB records
  const transferUSDC = async ({ recipientAddress, amount, memo }) => {
    if (!connected || !wallet || !user) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!checkSufficientBalance(amount)) {
      return { success: false, error: 'Insufficient USDC balance' };
    }

    try {
      setLoading(true);
      setError(null);

      const transaction = await createUSDCTransfer(recipientAddress, amount);

      // Optional: add memo via SystemProgram if needed in future
      // if (memo) { ... }

      const signedTransaction = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);

      toast({
        title: 'Payment Sent',
        description: `Sent ${amount.toFixed(2)} USDC`,
      });

      return { success: true, signature };
    } catch (err) {
      console.error('USDC transfer failed:', err);
      toast({
        title: 'Payment Failed',
        description: err.message || 'Failed to send USDC',
        variant: 'destructive',
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Process bestowal payment
  const processBestowPart = async (bestowData) => {
    if (!connected || !wallet || !user) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!checkSufficientBalance(bestowData.amount)) {
      return { success: false, error: 'Insufficient USDC balance' };
    }

    try {
      setLoading(true);
      setError(null);

      // Create bestowal record in database
      const { data: bestowalData, error: bestowalError } = await supabase
        .from('bestowals')
        .insert({
          user_id: user.id,
          orchard_id: bestowData.orchard_id,
          amount: bestowData.amount,
          currency: 'USDC',
          payment_method: 'usdc_transfer',
          payment_status: 'pending',
          notes: bestowData.notes || ''
        })
        .select()
        .single();

      if (bestowalError) throw bestowalError;

      // Create USDC transfer transaction
      const transaction = await createUSDCTransfer(
        bestowData.recipient_address || PLATFORM_WALLET.toString(),
        bestowData.amount
      );

      // Request signature from wallet
      const signedTransaction = await window.solana.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);

      // Create transaction record
      const { error: txError } = await supabase
        .from('usdc_transactions')
        .insert({
          user_id: user.id,
          wallet_address: wallet.toString(),
          transaction_hash: signature,
          amount: bestowData.amount,
          recipient_address: bestowData.recipient_address || PLATFORM_WALLET.toString(),
          transaction_type: 'bestowal',
          status: 'confirmed',
          bestowal_id: bestowalData.id
        });

      if (txError) console.error('Failed to record transaction:', txError);

      // Update bestowal status
      const { error: updateError } = await supabase
        .from('bestowals')
        .update({
          payment_status: 'completed',
          transaction_hash: signature
        })
        .eq('id', bestowalData.id);

      if (updateError) console.error('Failed to update bestowal:', updateError);

      toast({
        title: "Bestowal Successful",
        description: `Successfully sent ${bestowData.amount} USDC`,
      });

      return { 
        success: true, 
        data: bestowalData, 
        signature,
        txId: signature 
      };

    } catch (error) {
      console.error('Bestowal failed:', error);
      
      toast({
        title: "Bestowal Failed",
        description: error.message || "Failed to process USDC payment",
        variant: "destructive",
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get transaction history
  const getTransactionHistory = async () => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('usdc_transactions')
        .select(`
          *,
          bestowals!inner (
            id,
            orchard_id,
            amount,
            orchards (
              title,
              user_id
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return { success: false, error: error.message };
    }
  };

  // Format USDC amount
  const formatUSDC = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  // Check if wallet is ready for payments
  const isWalletReady = connected && wallet && balance > 0;

  return {
    loading,
    error,
    checkSufficientBalance,
    processBestowPart,
    transferUSDC,
    getTransactionHistory,
    formatUSDC,
    isWalletReady,
  };
}