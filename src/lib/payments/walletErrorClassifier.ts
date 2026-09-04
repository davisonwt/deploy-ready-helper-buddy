// Pure error-classification for the "Pay with Phantom" flow -- extracted
// from useSolanaWalletPay so it can be unit-tested without dragging React,
// the supabase client, or @solana/web3.js into the test.
//
// Ordering is load-bearing, and was the bug behind a false "Your wallet's
// network doesn't match this payment (devnet vs. mainnet)" on the first
// real desktop attempt (2026-09-04): the transaction builder's fetch to
// the RPC proxy failed at CORS preflight, web3.js wrapped it as "failed to
// get recent blockhash: TypeError: Failed to fetch", and the old
// classifier's bare `includes('blockhash')` match called that a network
// mismatch -- Phantom was never even involved. Transport failures are now
// classified FIRST, and the network-mismatch branch only fires on errors
// that actually say so (blockhash not found / genesis / cluster).

export type WalletPayErrorKind =
  | 'not-installed'
  | 'rejected'
  | 'insufficient-funds'
  | 'wrong-network'
  | 'simulation-failed'
  | 'service-unreachable'
  | 'unknown';

export interface WalletPayError {
  kind: WalletPayErrorKind;
  message: string;
  /**
   * Raw technical detail (Phantom's own nested error data, or the
   * simulation's on-chain error + logs) -- never shown as the primary
   * message, but surfaced in an expandable section so a real cause is
   * reportable instead of just Phantom's generic "An internal error has
   * occurred".
   */
  detail?: string;
  /** insufficient-funds only. */
  balance?: number;
  shortfall?: number;
}

export class SimulationFailedError extends Error {
  detail: string;
  constructor(detail: string) {
    super('Transaction simulation failed before signing.');
    this.detail = detail;
  }
}

const SERVICE_UNREACHABLE_PATTERN =
  /failed to fetch|err_failed|networkerror|load failed|could not reach the payment service|rpc_unavailable|rate limit exceeded/i;

// Only errors that genuinely indicate a cluster mismatch -- an on-chain
// "Blockhash not found" (a devnet blockhash simulated against mainnet, or
// vice versa), or a wallet talking about genesis/cluster. Deliberately NOT
// a bare "blockhash"/"network" substring: transport failures mention both.
const NETWORK_MISMATCH_PATTERN = /blockhash ?not ?found|genesis|cluster mismatch|wrong cluster|\bcluster\b/i;

export function classifyError(err: unknown): WalletPayError {
  if (err instanceof SimulationFailedError) {
    // A simulation that failed BECAUSE the blockhash is unknown to the
    // cluster is the one real devnet/mainnet-mismatch signal we can see.
    if (NETWORK_MISMATCH_PATTERN.test(err.detail)) {
      return {
        kind: 'wrong-network',
        message: "Your wallet's network doesn't match this payment (devnet vs. mainnet). Switch Phantom's network and try again.",
        detail: err.detail,
      };
    }
    return {
      kind: 'simulation-failed',
      message: "This payment didn't pass a pre-flight check, so it was never sent to Phantom to sign.",
      detail: err.detail,
    };
  }

  // Phantom (and most injected wallets) nest the actually-useful cause
  // under `data`/`data.originalError` rather than putting it in the
  // top-level message -- that's the detail Phantom's own generic "An
  // internal error has occurred" hides. Pull whatever's there.
  const anyErr = err as { code?: number; message?: string; data?: { originalError?: { message?: string } } } | undefined;
  const nestedMessage = anyErr?.data?.originalError?.message;
  const message = anyErr?.message ?? (err instanceof Error ? err.message : String(err));
  const detail = nestedMessage && nestedMessage !== message
    ? `${message} — ${nestedMessage}`
    : anyErr?.data
      ? `${message} ${JSON.stringify(anyErr.data)}`
      : message;

  // Phantom's standard user-rejection code (matches the wallet-adapter
  // convention every Solana wallet follows).
  if (anyErr?.code === 4001 || /user rejected|reject/i.test(message)) {
    return { kind: 'rejected', message: 'You declined the request in Phantom.' };
  }

  // Transport failures BEFORE any wallet/chain semantics: a fetch that
  // never got a response (CORS preflight, DNS, offline) or a non-2xx from
  // the payment service. web3.js wraps these as e.g. "failed to get recent
  // blockhash: TypeError: Failed to fetch" -- the word "blockhash" there
  // is about what it was trying to do, not what went wrong.
  if (SERVICE_UNREACHABLE_PATTERN.test(message) || SERVICE_UNREACHABLE_PATTERN.test(detail)) {
    return {
      kind: 'service-unreachable',
      message: "Couldn't reach the payment service — try again in a moment.",
      detail,
    };
  }

  if (NETWORK_MISMATCH_PATTERN.test(message)) {
    return {
      kind: 'wrong-network',
      message: "Your wallet's network doesn't match this payment (devnet vs. mainnet). Switch Phantom's network and try again.",
      detail,
    };
  }

  if (/insufficient/i.test(message)) {
    return { kind: 'insufficient-funds', message: 'Not enough USDC (or SOL for the network fee) in this wallet.', detail };
  }

  return { kind: 'unknown', message: message || 'Something went wrong sending this payment.', detail };
}
