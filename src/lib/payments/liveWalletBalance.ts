// Live, read-only on-chain USDC balance for a member's own connected
// Solana wallet -- always mainnet, regardless of SOLANA_CLUSTER (the
// platform's own pay-in/payout rail may still be on devnet while this
// displays the member's real wallet, which only exists for real on
// mainnet). Public RPC, no wallet connection or signature needed.
//
// Deliberately NOT @solana/web3.js / @solana/spl-token here: both pull in
// Node's `Buffer` global internally (PublicKey.toBuffer/findProgramAddress,
// getAssociatedTokenAddress), which doesn't exist in a Vite browser bundle
// with no polyfill -- this crashed the dashboard for every logged-in user
// ("ReferenceError: Buffer is not defined") the moment this file's
// useEffect ran on mount, unlike solanaWallet.ts's use of the same
// libraries, which only executes inside a deliberate "Pay with Phantom"
// click. Uses micro-sol-signer instead -- the same Buffer-free library
// already proven in production for this exact operation server-side
// (_shared/solanaPayout.ts's getHotWalletUsdcBalance, byte-for-byte the
// same ATA-derive + getAccountInfo + decode shape, just over a browser
// fetch() instead of Deno's).
import { useEffect, useState } from 'react';
import * as sol from 'micro-sol-signer';
import { USDC_MINTS } from './solanaNetworks';

const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const CACHE_MS = 60_000;
const USDC_DECIMALS = 6;

interface CacheEntry {
  balance: number;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<number>>();

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(MAINNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) {
    throw new Error(`Solana RPC ${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  return body.result as T;
}

async function fetchBalance(address: string): Promise<number> {
  try {
    const mint = USDC_MINTS['mainnet-beta'];
    const ata = sol.tokenAddress({ mint, owner: address, tokenProgram: sol.TOKEN_PROGRAM });
    const info = await rpc<{ value: { data: [string, string] } | null }>('getAccountInfo', [
      ata,
      { encoding: 'base64', commitment: 'confirmed' },
    ]);
    if (!info.value) return 0; // No token account yet == a real, valid zero -- not an error.
    const [b64] = info.value.data;
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const decoded = sol.TokenAccount(raw);
    if (decoded.TAG !== 'token') return 0;
    return Number(decoded.data.amount) / 10 ** USDC_DECIMALS;
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
