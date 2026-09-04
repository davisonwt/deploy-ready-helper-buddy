import { useCallback, useRef, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  buildUsdcTransferTransaction,
  getPhantomProvider,
  proxiedSolanaConnection,
} from '@/lib/payments/solanaWallet';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import type { SolanaPaymentResponse } from '@/lib/payments/solanaPaymentGate';

export type WalletPayPhase =
  | 'idle'
  | 'connecting'
  | 'building'
  | 'awaiting-approval'
  | 'submitted'
  | 'error';

// Error kinds/classification live in a pure module so they're unit-testable
// without React/web3.js -- re-exported here for existing importers.
export { SimulationFailedError, classifyError } from '@/lib/payments/walletErrorClassifier';
export type { WalletPayError, WalletPayErrorKind } from '@/lib/payments/walletErrorClassifier';
import { SimulationFailedError, classifyError, type WalletPayError } from '@/lib/payments/walletErrorClassifier';

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
      const connection = await proxiedSolanaConnection();

      setPhase('building');
      // Balance pre-check via the get-wallet-balance edge function -- the
      // SAME server-config read the dashboard's My Wallet tile uses. This
      // used to call api.mainnet-beta.solana.com directly from the browser,
      // which that endpoint CORS-blocks for arbitrary origins; the failed
      // fetch was silently caught and reported as a real-looking 0.00
      // balance ("You have 0.00 USDC") on every desktop pay attempt.
      // Checked against the EXTENSION'S active account (payer), not the
      // saved profile wallet -- they can differ, which is why the error
      // message below names the wallet it actually checked. The edge
      // function reads mainnet only, so on a devnet intent the pre-check is
      // skipped (the on-chain simulation below still catches a true
      // shortfall either way -- this check is advisory UX, not the
      // enforcement layer).
      if (payment.cluster === 'mainnet-beta') {
        let balance: number | null = null;
        try {
          ({ balance } = await invokePaymentFunction<{ balance: number }>('get-wallet-balance', { address: pubkeyStr }));
        } catch (err) {
          // A failed READ is not a zero balance -- log and continue; the
          // pre-flight simulation is the real gate.
          console.warn('[SolanaPay] balance pre-check unavailable, continuing without it', err);
        }
        if (balance !== null && balance < payment.amountUsdc) {
          const shortWallet = `${pubkeyStr.slice(0, 4)}…${pubkeyStr.slice(-4)}`;
          setPhase('error');
          setError({
            kind: 'insufficient-funds',
            message:
              `Connected wallet ${shortWallet} has ${balance.toFixed(2)} USDC on mainnet — ` +
              `you need ${(Math.round((payment.amountUsdc - balance) * 100) / 100).toFixed(2)} more to complete this payment. ` +
              `If your funds are in a different account, switch accounts in Phantom and try again.`,
            balance,
            shortfall: Math.round((payment.amountUsdc - balance) * 100) / 100,
          });
          return;
        }
      }

      const tx = await buildUsdcTransferTransaction({
        connection,
        payer,
        hotWalletAddress: payment.hotWalletAddress,
        referencePubkey: payment.referencePubkey,
        amountUsdc: payment.amountUsdc,
        cluster: payment.cluster,
      });

      // Known-good before the user ever sees Phantom's approve dialog --
      // Phantom's own failure mode for a bad transaction is an opaque "An
      // internal error has occurred" with no detail. Simulating against
      // the same RPC first turns any real on-chain problem (missing
      // account, bad instruction, insufficient rent, etc.) into the
      // actual error + program logs instead of that black box.
      const sim = await connection.simulateTransaction(tx);
      if (sim.value.err) {
        throw new SimulationFailedError(
          `${JSON.stringify(sim.value.err)}${sim.value.logs?.length ? `\n\n${sim.value.logs.join('\n')}` : ''}`,
        );
      }

      setPhase('awaiting-approval');
      const { signature } = await provider.signAndSendTransaction(tx);

      setPhase('submitted');
      onSubmitted?.(signature);
    } catch (err) {
      // Log the raw error object, not just its message -- Phantom nests
      // the actually-useful detail (originalError, logs) under properties
      // classifyError's pattern-matching alone would otherwise discard.
      console.error('[SolanaPay] pay() failed', err);
      setPhase('error');
      setError(classifyError(err));
    } finally {
      inFlight.current = false;
    }
  }, [payment, onSubmitted]);

  return { phase, error, pay, reset, hasPhantom: !!getPhantomProvider() };
}
