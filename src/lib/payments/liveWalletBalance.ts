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

// A failed read is NOT a zero. This used to swallow every error into 0
// and cache it for 60s, so an expired session, a dropped connection or a
// 500 from the function rendered as a confident "$0.00" (2026-09-06 My
// Wallet tile bug). Now a failure throws, the hook reports it, and only a
// real answer from the chain is ever cached.
async function fetchBalance(address: string): Promise<number> {
  const { balance } = await invokePaymentFunction<{ balance: number }>('get-wallet-balance', { address });
  if (typeof balance !== 'number' || !Number.isFinite(balance)) {
    throw new Error('The balance service returned no number.');
  }
  return balance;
}

export function describeBalanceError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/session expired|sign in/i.test(raw)) return 'Sign in again to read your balance.';
  if (/could not reach|failed to fetch|network/i.test(raw)) return "Couldn't reach the balance service.";
  return raw ? `Couldn't read balance: ${raw}` : "Couldn't read balance.";
}

/** Test seam: forget every cached balance. */
export function clearLiveWalletBalanceCache() {
  cache.clear();
  inflight.clear();
}

export function useLiveWalletBalance(address: string | null | undefined) {
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!address);

  const refetch = async (force = false) => {
    if (!address) return;
    setLoading(true);
    try {
      const cached = cache.get(address);
      if (!force && cached && Date.now() - cached.at < CACHE_MS) {
        setBalance(cached.balance);
        setError(null);
        return;
      }
      const existing = inflight.get(address);
      const p = existing ?? fetchBalance(address);
      if (!existing) inflight.set(address, p);
      let b: number;
      try {
        b = await p;
      } finally {
        inflight.delete(address);
      }
      cache.set(address, { balance: b, at: Date.now() }); // only a real answer is cached
      setBalance(b);
      setError(null);
    } catch (err) {
      console.error('liveWalletBalance: fetchBalance failed', address, err);
      setBalance(null); // unknown, never 0
      setError(describeBalanceError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setError(null);
      setLoading(false);
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return { balance, error, loading, refetch: () => refetch(true) };
}
