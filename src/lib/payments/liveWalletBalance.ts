// Live, read-only on-chain USDC balance for a member's own connected
// Solana wallet -- always mainnet, regardless of SOLANA_CLUSTER (the
// platform's own pay-in/payout rail may still be on devnet while this
// displays the member's real wallet, which only exists for real on
// mainnet).
//
// Routed through the get-wallet-balance edge function, not a direct
// browser fetch() to Solana's public RPC -- api.mainnet-beta.solana.com
// does not send CORS headers permitting requests from an arbitrary
// origin. A direct fetch() from here used to fail with the standard
// opaque CORS-block error ("TypeError: Failed to fetch", no further
// detail) on every single call, silently caught below and reported as a
// real, valid-looking $0.00 balance for every member, every time --
// confirmed by reproducing the exact failure in a real browser. Edge
// functions aren't subject to CORS (it's a browser-only mechanism), so
// the RPC call now happens there instead; see
// supabase/functions/_shared/liveBalance.ts.
import { useEffect, useState } from 'react';
import { invokePaymentFunction } from './invokeFunction';

const CACHE_MS = 60_000;

interface CacheEntry {
  balance: number;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<number>>();

async function fetchBalance(address: string): Promise<number> {
  try {
    const { balance } = await invokePaymentFunction<{ balance: number }>('get-wallet-balance', { address });
    return balance;
  } catch (err) {
    console.error('liveWalletBalance: fetchBalance failed', address, err);
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
