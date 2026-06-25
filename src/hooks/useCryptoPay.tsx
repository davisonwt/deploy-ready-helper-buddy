import { useState } from 'react';
import { toast } from 'sonner';

/**
 * useCryptoPay — DISABLED.
 *
 * The previous implementation routed song and radio-session purchases through
 * an on-chain USDC transfer on Cronos. Per the NOWPayments/PayPal-only payment
 * rail rule, the on-chain path has been removed entirely (Solana / ethers /
 * cronos imports stripped).
 *
 * Backlog: rebuild `buySong` and `buySession` on top of NOWPayments + PayPal
 * with webhook-verified completion, same scale as the library-bestowal and
 * media-purchase rebuilds.
 *
 * Until that rebuild lands, both purchase entry points short-circuit with a
 * clear toast so the UI stays compiled and reachable but cannot create a fake
 * "completed" purchase row.
 */
export function useCryptoPay() {
  const [processing] = useState(false);

  const unavailable = () => {
    toast.error('Payments temporarily unavailable', {
      description:
        'We are migrating this purchase flow to NOWPayments / PayPal. Please check back soon.',
    });
  };

  const buySong = async (_track?: unknown) => {
    unavailable();
  };

  const buySession = async (_session?: unknown, _onSuccess?: () => void) => {
    unavailable();
  };

  const connectWallet = async () => {
    unavailable();
  };

  return {
    processing,
    connected: false,
    walletAddress: null as string | null,
    connectWallet,
    buySong,
    buySession,
  };
}
