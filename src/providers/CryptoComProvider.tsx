import React, { createContext, useContext } from 'react';
import type { EthereumProvider } from '@/types/ethereum';

interface CryptoComContextType {
  connector: EthereumProvider | null;
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

export class CryptoComProvider extends React.Component<{ children: React.ReactNode }, { connected: boolean; address: string | null; chainId: number | null; }> {
  connector: EthereumProvider | null = null;
  state = {
    connected: false,
    address: null as string | null,
    chainId: null as number | null,
  };

  connect = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Wallet provider not found');
      }
      const provider = window.ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts && accounts.length > 0) {
        this.setState({ address: accounts[0], connected: true });
        const network = await provider.request({ method: 'eth_chainId' }) as string;
        this.setState({ chainId: parseInt(network, 16) });

        // Attach listeners after explicit connect
        provider.on?.('accountsChanged', (accounts: unknown) => {
          const accountsArray = accounts as string[];
          if (accountsArray?.length > 0) {
            this.setState({ address: accountsArray[0], connected: true });
          } else {
            this.setState({ address: null, connected: false });
          }
        });
        provider.on?.('chainChanged', (networkId: unknown) => {
          this.setState({ chainId: parseInt(networkId as string, 16) });
        });
      }
    } catch (error) {
      console.error('Wallet connect error:', error);
    }
  };

  render() {
    const { children } = this.props;
    const { connected, address, chainId } = this.state;

    return (
      <CryptoComContext.Provider value={{ connector: this.connector, connected, address, chainId, connect: this.connect }}>
        {children}
      </CryptoComContext.Provider>
    );
  }
}

