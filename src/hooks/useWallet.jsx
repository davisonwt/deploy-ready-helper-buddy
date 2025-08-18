import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Connection to Solana mainnet
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

export function useWallet() {
  const [wallet, setWallet] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if Phantom wallet is available
  const isPhantomAvailable = () => {
    return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
  };

  // Connect to Phantom wallet
  const connectWallet = useCallback(async () => {
    if (!isPhantomAvailable()) {
      toast({
        title: "Phantom Wallet Required",
        description: "Please install Phantom wallet to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your wallet.",
        variant: "destructive"
      });
      return;
    }

    try {
      setConnecting(true);
      const response = await window.solana.connect();
      const walletAddress = response.publicKey.toString();
      
      setWallet({
        publicKey: response.publicKey,
        address: walletAddress
      });
      setConnected(true);

      // Store wallet in database
      await saveWalletToDatabase(walletAddress);
      
      // Load balance
      await loadUSDCBalance(walletAddress);

      toast({
        title: "Wallet Connected",
        description: "Your Phantom wallet has been connected successfully.",
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Phantom wallet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  }, [user, toast]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect();
      }
      setWallet(null);
      setConnected(false);
      setBalance(0);

      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [toast]);

  // Save wallet to database
  const saveWalletToDatabase = async (walletAddress) => {
    try {
      const { error } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          wallet_type: 'phantom',
          is_primary: true
        }, {
          onConflict: 'user_id,wallet_address'
        });

      if (error) {
        console.error('Error saving wallet to database:', error);
      }
    } catch (error) {
      console.error('Failed to save wallet:', error);
    }
  };

  // Load USDC balance
  const loadUSDCBalance = useCallback(async (walletAddress) => {
    try {
      setLoadingBalance(true);
      const publicKey = new PublicKey(walletAddress);
      
      // Get associated token account for USDC
      const associatedTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      try {
        const tokenAccount = await getAccount(connection, associatedTokenAccount);
        const usdcBalance = Number(tokenAccount.amount) / 1e6; // USDC has 6 decimals
        setBalance(usdcBalance);

        // Update balance in database
        await updateBalanceInDatabase(walletAddress, usdcBalance);
      } catch (error) {
        // Token account doesn't exist yet, balance is 0
        console.log('USDC token account not found, balance is 0');
        setBalance(0);
        await updateBalanceInDatabase(walletAddress, 0);
      }
    } catch (error) {
      console.error('Error loading USDC balance:', error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  // Update balance in database
  const updateBalanceInDatabase = async (walletAddress, usdcBalance) => {
    try {
      const { error } = await supabase
        .from('wallet_balances')
        .upsert({
          wallet_address: walletAddress,
          usdc_balance: usdcBalance,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('Error updating balance in database:', error);
      }
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  };

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (wallet && wallet.address) {
      await loadUSDCBalance(wallet.address);
    }
  }, [wallet, loadUSDCBalance]);

  // Load user's saved wallet on mount
  useEffect(() => {
    const loadSavedWallet = async () => {
      if (!user || !isPhantomAvailable()) return;

      try {
        // Check if Phantom is already connected
        const response = await window.solana.connect({ onlyIfTrusted: true });
        if (response.publicKey) {
          const walletAddress = response.publicKey.toString();
          setWallet({
            publicKey: response.publicKey,
            address: walletAddress
          });
          setConnected(true);
          await loadUSDCBalance(walletAddress);
        }
      } catch (error) {
        // Wallet not connected or user rejected
        console.log('No saved wallet connection found');
      }
    };

    loadSavedWallet();
  }, [user, loadUSDCBalance]);

  // Listen for account changes
  useEffect(() => {
    if (!isPhantomAvailable()) return;

    const handleAccountChange = (publicKey) => {
      if (publicKey) {
        const walletAddress = publicKey.toString();
        setWallet({
          publicKey,
          address: walletAddress
        });
        loadUSDCBalance(walletAddress);
      } else {
        setWallet(null);
        setConnected(false);
        setBalance(0);
      }
    };

    window.solana?.on('accountChanged', handleAccountChange);
    window.solana?.on('disconnect', () => {
      setWallet(null);
      setConnected(false);
      setBalance(0);
    });

    return () => {
      window.solana?.off('accountChanged', handleAccountChange);
      window.solana?.off('disconnect');
    };
  }, [loadUSDCBalance]);

  return {
    wallet,
    connected,
    connecting,
    balance,
    loadingBalance,
    isPhantomAvailable: isPhantomAvailable(),
    connectWallet,
    disconnectWallet,
    refreshBalance,
    loadUSDCBalance
  };
}