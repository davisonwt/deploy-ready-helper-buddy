import { useState, useEffect, useCallback } from 'react';
import { useCryptoComWallet } from '@/providers/CryptoComProvider';
import { ethers } from 'ethers';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/cronos';
import { toast } from 'sonner';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const { connector, connected, address, chainId } = useCryptoComWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const connectWallet = useCallback(async () => {
    if (!connector) {
      toast.error('Crypto.com DeFi Wallet not detected');
      return;
    }

    try {
      setLoading(true);
      await connector.activate();
      toast.success('Wallet connected successfully');
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [connector]);

  const refreshBalance = useCallback(async () => {
    if (!connected || !address) {
      setBalance('0');
      return;
    }

    try {
      if (!window.ethereum) {
        setBalance('0');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      
      const bal = await usdcContract.balanceOf(address);
      const formatted = ethers.formatUnits(bal, 6);
      setBalance(formatted);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    }
  }, [connected, address]);

  useEffect(() => {
    if (connected && address) {
      refreshBalance();
      
      // Refresh balance every 30 seconds
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [connected, address, refreshBalance]);

  return {
    connected,
    publicKey: address || '',
    walletAddress: address || '',
    balance,
    connectWallet,
    refreshBalance,
    loading,
    wallet: connector,
    chainId,
  };
}
