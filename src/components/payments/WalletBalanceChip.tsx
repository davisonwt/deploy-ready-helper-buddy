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

// Same list GroundskeeperWidget uses (fixed bottom-right, this chip's
// immediate neighbor at bottom-24) -- both sat on top of the chat Send
// button, mic/camera toggles, and Daily call controls on narrow widths.
// Every route confirmed (via grep) to render ChatRoom or a Daily call.
const CHAT_OR_CALL_ROUTES = [
  '/chatapp',
  '/call/',
  '/live-rooms',
  '/classroom',
  '/skilldrop',
  '/premium-room',
];

export default function WalletBalanceChip() {
  const { user } = useAuth();
  const location = useLocation();
  const address: string | null = user?.solana_wallet_address || null;
  const { balance, error, loading } = useLiveWalletBalance(address);

  // Same page the dashboard tile and the "Connect wallet" flow both use --
  // this is the only place wallet-address connect/change UI lives (see
  // CryptoPayoutSettings), never duplicated here.
  const hideForChatOrCall = CHAT_OR_CALL_ROUTES.some((p) => location.pathname.startsWith(p));
  if (!user || location.pathname === '/settings/payouts' || hideForChatOrCall) return null;

  // Farm-Stalls' desktop 3-column frame (StallsFeedPage, StallVisitPage's
  // StallInteriorView) already shows the wallet balance in StallTodayPanel,
  // the permanent right column -- this chip on top of it there is a
  // duplicate. Below 1024px neither page has that column (it's a drawer,
  // not shown by default), so the chip stays useful there -- hide with a
  // CSS breakpoint (lg:hidden) rather than unmounting outright.
  const desktopDuplicatesWalletPanel = location.pathname === '/stalls-feed' || location.pathname.startsWith('/stall/');

  const low = !!address && balance !== null && balance < LOW_BALANCE_THRESHOLD;

  return (
    <Link
      to="/settings/payouts"
      className={cn(
        'fixed bottom-6 right-24 z-50 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition-colors',
        desktopDuplicatesWalletPanel && 'lg:hidden',
        !address
          ? 'border-border bg-background/90 text-muted-foreground hover:text-foreground'
          : low
            ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-300'
            : 'border-border bg-background/90 text-foreground',
      )}
      aria-label={!address ? 'Connect your wallet' : error ? 'Wallet balance could not be read' : `Wallet balance ${(balance ?? 0).toFixed(2)} USDC on mainnet`}
      title={!address ? undefined : error ? error : 'Mainnet USDC in your connected wallet'}
    >
      <Wallet className="h-3.5 w-3.5" />
      {!address ? (
        'Connect wallet'
      ) : loading && balance === null && !error ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : error ? (
        'Balance?'
      ) : (
        `$${(balance ?? 0).toFixed(2)}`
      )}
    </Link>
  );
}
