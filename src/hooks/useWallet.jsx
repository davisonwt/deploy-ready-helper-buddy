// Import polyfills first
import '../utils/solana-polyfills';

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
  const { user, loginAnonymously } = useAuth();
  const { toast } = useToast();

  // Check if Phantom wallet is available
  const isPhantomAvailable = useCallback(() => {
    return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
  }, []);

  // Connect to Phantom wallet
  const connectWallet = useCallback(async () => {
    if (!isPhantomAvailable()) {
      toast({
        title: "Phantom Wallet Required", 
        description: "Please install Phantom wallet extension and refresh the page.",
        variant: "destructive",
      });
      // Redirect to Phantom download page
      window.open('https://phantom.app/download', '_blank');
      return { success: false, error: 'Phantom wallet not available' };
    }

    try {
      setConnecting(true);
      
      // Request connection with explicit permissions
      const response = await window.solana.connect({ onlyIfTrusted: false });
      
      if (!response.publicKey) {
        throw new Error('No public key received from wallet');
      }
      
      const walletAddress = response.publicKey.toString();
      
      setWallet(response.publicKey);
      setConnected(true);
      
      // Auto-login to Supabase if not already authenticated
      if (!user) {
        console.log('🔐 User not authenticated, attempting auto-login...');
        try {
          const loginResult = await loginAnonymously();
          if (loginResult.success) {
            console.log('✅ Auto-login successful');
            toast({
              title: "Welcome!",
              description: "You're now logged in and ready to explore sow2grow",
            });
          } else {
            console.error('❌ Auto-login failed:', loginResult.error);
            toast({
              title: "Login Required", 
              description: "Please login to continue",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Auto-login error:', error);
        }
      } else {
        console.log('✅ User already authenticated');
      }
      
      // Save wallet to database
      await saveWalletToDatabase(walletAddress);
      
      // Load USDC balance
      await loadUSDCBalance(walletAddress);
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${walletAddress.slice(0, 8)}...`,
      });

      return { success: true, address: walletAddress };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Phantom wallet",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setConnecting(false);
    }
  }, [isPhantomAvailable, user, toast, loginAnonymously]);

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
        description: "Successfully disconnected from Phantom wallet",
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [toast]);

  // Load USDC balance for a wallet address
  const loadUSDCBalance = useCallback(async (walletAddress) => {
    try {
      setLoadingBalance(true);
      const publicKey = new PublicKey(walletAddress);
      
      // Get associated token account for USDC
      const associatedTokenAddress = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      try {
        const tokenAccount = await getAccount(connection, associatedTokenAddress);
        const usdcBalance = Number(tokenAccount.amount) / 1000000; // USDC has 6 decimals
        setBalance(usdcBalance);
        
        // Update balance in database
        await updateBalanceInDatabase(walletAddress, usdcBalance);
        
        return usdcBalance;
      } catch (error) {
        console.log('No USDC token account found or balance is 0');
        setBalance(0);
        await updateBalanceInDatabase(walletAddress, 0);
        return 0;
      }
    } catch (error) {
      console.error('Failed to load USDC balance:', error);
      setBalance(0);
      return 0;
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  // Save wallet address to database
  const saveWalletToDatabase = useCallback(async (walletAddress) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          wallet_type: 'phantom',
          is_active: true
        }, {
          onConflict: 'user_id,wallet_address'
        });

      if (error) {
        console.error('Failed to save wallet to database:', error);
      }
    } catch (error) {
      console.error('Database error:', error);
    }
  }, [user]);

  // Update USDC balance in database
  const updateBalanceInDatabase = useCallback(async (walletAddress, usdcBalance) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('wallet_balances')
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          usdc_balance: usdcBalance,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,wallet_address'
        });

      if (error) {
        console.error('Failed to update balance in database:', error);
      }
    } catch (error) {
      console.error('Database error:', error);
    }
  }, [user]);

  // Refresh current wallet balance
  const refreshBalance = useCallback(async () => {
    if (wallet && connected) {
      return await loadUSDCBalance(wallet.toString());
    }
    return 0;
  }, [wallet, connected, loadUSDCBalance]);

  // Auto-connect if wallet was previously connected
  useEffect(() => {
    if (isPhantomAvailable() && window.solana.isConnected) {
      const publicKey = window.solana.publicKey;
      if (publicKey) {
        setWallet(publicKey);
        setConnected(true);
        loadUSDCBalance(publicKey.toString());
      }
    }
  }, [isPhantomAvailable, loadUSDCBalance]);

  // Listen for wallet events
  useEffect(() => {
    if (!isPhantomAvailable()) return;

    const handleAccountChanged = (publicKey) => {
      if (publicKey) {
        setWallet(publicKey);
        setConnected(true);
        loadUSDCBalance(publicKey.toString());
      } else {
        setWallet(null);
        setConnected(false);
        setBalance(0);
      }
    };

    const handleDisconnect = () => {
      setWallet(null);
      setConnected(false);
      setBalance(0);
    };

    window.solana.on('accountChanged', handleAccountChanged);
    window.solana.on('disconnect', handleDisconnect);

    return () => {
      if (window.solana.off) {
        window.solana.off('accountChanged', handleAccountChanged);
        window.solana.off('disconnect', handleDisconnect);
      }
    };
  }, [isPhantomAvailable, loadUSDCBalance]);

  return {
    wallet,
    connected,
    connecting,
    balance,
    loadingBalance,
    isPhantomAvailable,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  };
}