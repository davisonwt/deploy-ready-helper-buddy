import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface CryptoComContextType {
  connector: any | null;
  connected: boolean;
  address: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
}

const CryptoComContext = createContext<CryptoComContextType>({
  connector: null,
  connected: false,
  address: null,
  chainId: null,
  connect: async () => {},
});

export const useCryptoComWallet = () => useContext(CryptoComContext);

export function CryptoComProvider({ children }: { children: React.ReactNode }) {
  const [connector] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const connect = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Wallet provider not found');
      }
      const provider = window.ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setConnected(true);
        const network = await provider.request({ method: 'eth_chainId' });
        setChainId(parseInt(network, 16));
      }
    } catch (error) {
      console.error('Wallet connect error:', error);
    }
  }, []);

  useEffect(() => {
    // Check if Crypto.com DeFi Wallet is available
    const checkConnection = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = window.ethereum;
          
          // Check if it's Crypto.com DeFi Wallet OR any EVM provider
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setConnected(true);
            const network = await provider.request({ method: 'eth_chainId' });
            setChainId(parseInt(network, 16));
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on?.('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
        } else {
          setAddress(null);
          setConnected(false);
        }
      });

      window.ethereum.on?.('chainChanged', (networkId: string) => {
        setChainId(parseInt(networkId, 16));
      });
    }
  }, []);

  return (
    <CryptoComContext.Provider value={{ connector, connected, address, chainId, connect }}>
      {children}
    </CryptoComContext.Provider>
  );
}
