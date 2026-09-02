import { useCallback, useRef, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  buildUsdcTransferTransaction,
  getPhantomProvider,
  getUsdcBalance,
  usdcConnection,
} from '@/lib/payments/solanaWallet';
import { USDC_MINTS } from '@/lib/payments/solanaNetworks';
import type { SolanaPaymentResponse } from '@/lib/payments/solanaPaymentGate';

export type WalletPayPhase =
  | 'idle'
  | 'connecting'
  | 'building'
  | 'awaiting-approval'
  | 'submitted'
  | 'error';

export type WalletPayErrorKind =
  | 'not-installed'
  | 'rejected'
  | 'insufficient-funds'
  | 'wrong-network'
  | 'unknown';

export interface WalletPayError {
  kind: WalletPayErrorKind;
  message: string;
  /** insufficient-funds only. */
  balance?: number;
  shortfall?: number;
}

/**
 * Drives the "Pay with Phantom" button's whole click-to-signature flow.
 * Deliberately stops at 'submitted' -- once Phantom's signAndSendTransaction
 * resolves, the transaction is on-chain and pending, but "paid" is a
 * server-verified fact, not a client one (finalized commitment, exact
 * amount, not already claimed by another intent). SolanaPaymentPanel's own
 * check-solana-payment poll (unchanged) is what actually flips the screen
 * to "Payment confirmed" -- this hook's onSubmitted callback exists so the
 * panel can trigger one immediate poll right away instead of waiting up to
 * 5s for the next scheduled one.
 */
export function useSolanaWalletPay(payment: SolanaPaymentResponse, onSubmitted?: (signature: string) => void) {
  const [phase, setPhase] = useState<WalletPayPhase>('idle');
  const [error, setError] = useState<WalletPayError | null>(null);
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
  }, []);

  const pay = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);

    const provider = getPhantomProvider();
    if (!provider) {
      setPhase('error');
      setError({ kind: 'not-installed', message: 'Phantom is not installed in this browser.' });
      inFlight.current = false;
      return;
    }

    try {
      setPhase('connecting');
      let pubkeyStr = provider.publicKey?.toString();
      if (!pubkeyStr) {
        const resp = await provider.connect();
        pubkeyStr = resp.publicKey.toString();
      }
      const payer = new PublicKey(pubkeyStr);
      const connection = usdcConnection(payment.cluster);
      const mint = new PublicKey(USDC_MINTS[payment.cluster]);

      setPhase('building');
      const balance = await getUsdcBalance(connection, payer, mint);
      if (balance < payment.amountUsdc) {
        setPhase('error');
        setError({
          kind: 'insufficient-funds',
          message: 'Not enough USDC in this wallet.',
          balance,
          shortfall: Math.round((payment.amountUsdc - balance) * 100) / 100,
        });
        return;
      }

      const tx = await buildUsdcTransferTransaction({
        connection,
        payer,
        hotWalletAddress: payment.hotWalletAddress,
        referencePubkey: payment.referencePubkey,
        amountUsdc: payment.amountUsdc,
        cluster: payment.cluster,
      });

      setPhase('awaiting-approval');
      const { signature } = await provider.signAndSendTransaction(tx);

      setPhase('submitted');
      onSubmitted?.(signature);
    } catch (err) {
      setPhase('error');
      setError(classifyError(err));
    } finally {
      inFlight.current = false;
    }
  }, [payment, onSubmitted]);

  return { phase, error, pay, reset, hasPhantom: !!getPhantomProvider() };
}

function classifyError(err: unknown): WalletPayError {
  const anyErr = err as { code?: number; message?: string } | undefined;
  const message = anyErr?.message ?? (err instanceof Error ? err.message : String(err));
  const lower = message.toLowerCase();

  // Phantom's standard user-rejection code (matches the wallet-adapter
  // convention every Solana wallet follows).
  if (anyErr?.code === 4001 || lower.includes('user rejected') || lower.includes('reject')) {
    return { kind: 'rejected', message: 'You declined the request in Phantom.' };
  }

  // Phantom has no synchronous "which cluster are you on" query -- modern
  // versions detect a devnet/mainnet mismatch themselves (via the
  // transaction's blockhash genesis) and either prompt to switch or throw
  // a message referencing the network/blockhash. Pattern-match those
  // rather than claim certainty we don't have.
  if (
    lower.includes('blockhash') ||
    lower.includes('network') ||
    lower.includes('genesis') ||
    lower.includes('cluster')
  ) {
    return {
      kind: 'wrong-network',
      message: "Your wallet's network doesn't match this payment (devnet vs. mainnet). Switch Phantom's network and try again.",
    };
  }

  if (lower.includes('insufficient')) {
    return { kind: 'insufficient-funds', message: 'Not enough USDC (or SOL for the network fee) in this wallet.' };
  }

  return { kind: 'unknown', message: message || 'Something went wrong sending this payment.' };
}
