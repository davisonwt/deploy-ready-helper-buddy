// Compact, always-visible balance chip -- the header-level counterpart to
// the dashboard's "My Wallet" tile (src/components/dashboard/DashboardTribeStats.tsx).
// Non-custodial model: this reads the member's own connected Solana
// wallet's live on-chain USDC balance, same source as the dashboard tile
// and MyWalletCard, so all three always agree.
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLiveWalletBalance } from '@/lib/payments/liveWalletBalance';
import { cn } from '@/lib/utils';

const LOW_BALANCE_THRESHOLD = 5;

export default function WalletBalanceChip() {
  const { user } = useAuth();
  const location = useLocation();
  const address: string | null = user?.solana_wallet_address || null;
  const { balance, loading } = useLiveWalletBalance(address);

  // Same page the dashboard tile and the "Connect wallet" flow both use --
  // this is the only place wallet-address connect/change UI lives (see
  // CryptoPayoutSettings), never duplicated here.
  if (!user || location.pathname === '/settings/payouts') return null;

  const low = !!address && balance !== null && balance < LOW_BALANCE_THRESHOLD;

  return (
    <Link
      to="/wallet-settings"
      className={cn(
        'fixed bottom-6 right-24 z-50 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition-colors',
        !address
          ? 'border-border bg-background/90 text-muted-foreground hover:text-foreground'
          : low
            ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-300'
            : 'border-border bg-background/90 text-foreground',
      )}
      aria-label={!address ? 'Connect your wallet' : `Wallet balance ${(balance ?? 0).toFixed(2)} USDC`}
    >
      <Wallet className="h-3.5 w-3.5" />
      {!address ? (
        'Connect wallet'
      ) : loading && balance === null ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        `$${(balance ?? 0).toFixed(2)}`
      )}
    </Link>
  );
}
