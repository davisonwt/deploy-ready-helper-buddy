// Client-side mirror of supabase/functions/_shared/cryptoNetworks.ts --
// same USDC mint addresses (Circle's official contract-address docs), same
// devnet-first default. Duplicated deliberately rather than shared: the
// edge function's copy is Deno-only (Deno.env.get), the client needs its
// own env access (import.meta.env) and this constant set is small and
// unlikely to drift silently since both are keyed off the same public,
// well-known mint addresses.

export type SolanaCluster = 'devnet' | 'mainnet-beta';

export const USDC_MINTS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

export function getSolanaRpcUrl(cluster: SolanaCluster): string {
  const custom = import.meta.env.VITE_SOLANA_RPC_URL as string | undefined;
  if (custom) return custom;
  return cluster === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
}
