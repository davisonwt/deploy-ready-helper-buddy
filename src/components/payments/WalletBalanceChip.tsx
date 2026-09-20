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

// /call/:roomKind/:roomId (Jitsi) and /premium-room/:id are real, current
// routes with the same collision (this chip sits on top of call controls).
// /chatapp, /live-rooms, /classroom and /skilldrop used to belong here too,
// but as of 2026-09-19 they only redirect to /conversations before anything
// renders -- keeping them was dead code, and a dead private copy of a route
// list is exactly how /conversations itself went unlisted here for hours
// after it shipped. /conversations (and Global Chat, the same route with a
// ?c= query param) is now excluded via the shared isOverlaySuppressedRoute
// predicate below instead -- one list, not two that can drift apart again.
const CHAT_OR_CALL_ROUTES = [
  '/call/',
  '/premium-room',
];

export default function WalletBalanceChip() {
  const { user } = useAuth();
  const location = useLocation();
  const address: string | null = user?.solana_wallet_address || null;
  const { balance, error, loading, refetch } = useLiveWalletBalance(address);

  // Same page the dashboard tile and the "Connect wallet" flow both use --
  // this is the only place wallet-address connect/change UI lives (see
  // CryptoPayoutSettings), never duplicated here.
  const hideForChatOrCall = CHAT_OR_CALL_ROUTES.some((p) => location.pathname.startsWith(p));
  // Farm-Stalls' desktop 3-column frame (StallsFeedPage, StallVisitPage's
  // StallInteriorView) already shows the wallet balance in StallTodayPanel,
  // the permanent right column -- this chip on top of it there is a
  // duplicate. Below 1024px there's no such column, but the front/interior
  // image itself now fills the viewport edge-to-edge on portrait phones
  // too (pannable interior/front, batch 2f) -- this chip's own bottom-
  // right corner sits right on top of it there just the same, so hide it
  // unconditionally on these two routes now rather than only at lg: and up.
  const hideOnStallRoutes = location.pathname === '/stalls-feed' || location.pathname.startsWith('/stall/');
  if (!user || location.pathname === '/settings/payouts' || hideForChatOrCall || hideOnStallRoutes) return null;

  const low = !!address && balance !== null && balance < LOW_BALANCE_THRESHOLD;

  // Bare "Balance?" bug (2026-09-20, same class as StallTodayPanel's own
  // fix): a failed read is its own tappable state -- a button that
  // retries in place, not the Link to payout settings the other three
  // states use.
  if (address && error) {
    return (
      <button
        type="button"
        onClick={() => refetch()}
        className="fixed bottom-6 right-24 z-50 flex items-center gap-1.5 rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-600 shadow-lg backdrop-blur transition-colors hover:bg-orange-500/15 dark:text-orange-300"
        aria-label="Wallet balance unavailable — tap to retry"
        title={error}
      >
        <Wallet className="h-3.5 w-3.5" />
        Tap to retry
      </button>
    );
  }

  return (
    <Link
      to="/settings/payouts"
      className={cn(
        'fixed bottom-6 right-24 z-50 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition-colors',
        !address
          ? 'border-border bg-background/90 text-muted-foreground hover:text-foreground'
          : low
            ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-300'
            : 'border-border bg-background/90 text-foreground',
      )}
      aria-label={!address ? 'Connect your wallet' : `Wallet balance ${(balance ?? 0).toFixed(2)} USDC on mainnet`}
      title={!address ? undefined : 'Mainnet USDC in your connected wallet'}
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
