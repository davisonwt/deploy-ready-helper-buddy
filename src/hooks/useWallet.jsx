// Temporarily disabled to fix React issues - will re-enable after Buffer polyfill is fixed
import { useState } from 'react';

export function useWallet() {
  const [wallet, setWallet] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  return {
    wallet,
    connected,
    connecting,
    balance,
    loadingBalance,
    isPhantomAvailable: () => false,
    connectWallet: async () => ({ success: false, error: 'Temporarily disabled' }),
    disconnectWallet: () => {},
    refreshBalance: async () => {},
  };
}