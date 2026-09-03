// Live, read-only on-chain USDC balance for a member's own connected
// Solana wallet -- always mainnet, regardless of SOLANA_CLUSTER (the
// platform's own pay-in/payout rail may still be on devnet while this
// displays the member's real wallet, which only exists for real on
// mainnet). Public RPC, no wallet connection or signature needed.
import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { USDC_MINTS } from './solanaNetworks';

const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const CACHE_MS = 60_000;

interface CacheEntry {
  balance: number;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<number>>();

async function fetchBalance(address: string): Promise<number> {
  const connection = new Connection(MAINNET_RPC, 'confirmed');
  const owner = new PublicKey(address);
  const mint = new PublicKey(USDC_MINTS['mainnet-beta']);
  try {
    const ata = await getAssociatedTokenAddress(mint, owner);
    const info = await connection.getTokenAccountBalance(ata, 'confirmed');
    return info.value.uiAmount ?? 0;
  } catch {
    // No USDC token account yet reads as a real, valid zero -- not an error.
    return 0;
  }
}

export function useLiveWalletBalance(address: string | null | undefined) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!address);

  const refetch = async (force = false) => {
    if (!address) return;
    setLoading(true);
    try {
      const cached = cache.get(address);
      if (!force && cached && Date.now() - cached.at < CACHE_MS) {
        setBalance(cached.balance);
        return;
      }
      const existing = inflight.get(address);
      const p = existing ?? fetchBalance(address);
      if (!existing) inflight.set(address, p);
      const b = await p;
      inflight.delete(address);
      cache.set(address, { balance: b, at: Date.now() });
      setBalance(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setLoading(false);
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return { balance, loading, refetch: () => refetch(true) };
}
