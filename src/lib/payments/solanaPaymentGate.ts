/**
 * Imperative "present a Solana payment screen from anywhere" gate.
 *
 * Every checkout surface (QuickBestowModal, BestowalCheckout, MyWalletPage,
 * useGiftBestowal, useContentPurchase, useMusicPurchase, ...) used to do a
 * plain `window.location.href = redirectUrl` on success. Solana pay-in has
 * no redirect destination — the buyer stays on the page and watches a
 * QR/deep-link screen until the payment lands. Routing that behavior
 * through a single imperative call (instead of threading a new
 * response-shape branch through every one of those call sites) keeps this
 * a one-file change for each caller: `await presentSolanaPayment(payment)`
 * in place of the old redirect, resolving once the payment settles.
 *
 * <SolanaPaymentHost/> (mounted once, in App.tsx) is the only listener —
 * it renders the dialog and calls the resolver. Same shape as how
 * sonner's toast() works without a hook per call site.
 */

export interface SolanaPaymentResponse {
  intentId: string;
  referencePubkey: string;
  solanaPayUrl: string;
  hotWalletAddress: string;
  amountUsdc: number;
  cluster: 'devnet' | 'mainnet-beta';
  expiresAt: string;
}

export type SolanaPaymentResolution = 'paid' | 'expired' | 'cancelled';

export interface SolanaPaymentRequest {
  payment: SolanaPaymentResponse;
  resolve: (resolution: SolanaPaymentResolution) => void;
}

type GateListener = (request: SolanaPaymentRequest | null) => void;

let listener: GateListener | null = null;

/** Called once by SolanaPaymentHost on mount. */
export function registerSolanaPaymentGate(l: GateListener): () => void {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}

/**
 * Shows the Solana payment screen and resolves once the buyer's payment is
 * confirmed paid, the intent expires, or the buyer cancels. If no
 * <SolanaPaymentHost/> is mounted (shouldn't happen — it's mounted at the
 * app root), resolves 'cancelled' immediately rather than hanging forever.
 */
export function presentSolanaPayment(payment: SolanaPaymentResponse): Promise<SolanaPaymentResolution> {
  return new Promise((resolve) => {
    if (!listener) {
      console.error('presentSolanaPayment: no SolanaPaymentHost mounted');
      resolve('cancelled');
      return;
    }
    listener({
      payment,
      resolve: (resolution) => {
        resolve(resolution);
        listener?.(null);
      },
    });
  });
}
