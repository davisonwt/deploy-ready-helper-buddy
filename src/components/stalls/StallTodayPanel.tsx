import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Loader2, Eye, ShoppingBasket, ChevronDown } from 'lucide-react';
import { useSacredNow } from '@/hooks/useSacredNow';
import { useCommunityGrowthStats } from '@/hooks/useCommunityGrowthStats';
import { useStallVisitorCount } from '@/hooks/useStallVisitorCount';
import { useAuth } from '@/hooks/useAuth';
import { useLiveWalletBalance } from '@/lib/payments/liveWalletBalance';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { BOTTOM_CHROME_PADDING_STYLE } from '@/lib/layout/bottomChrome';

interface Props {
  className?: string;
  /** Each section (Wallet, Today, Omer, Growth) as its own bordered wood card with a gap between, instead of one continuous panel with hairline dividers -- the mobile-portrait stall interior page (StallInteriorView) stacks these below the pannable image. */
  stacked?: boolean;
  /** Stall being viewed + whether the current viewer is really its owner
   * (StallInteriorView's effectiveIsOwner -- false while "viewing as
   * visitor"). Both required for the Visitors section below: owner-only,
   * so a plain visitor never sees another member's audience size. Omitted
   * entirely by EmptyPlotView (no stall built yet) -- no section renders. */
  ownerId?: string | null;
  isOwner?: boolean;
}

const LOW_BALANCE_THRESHOLD = 5;
/** Device preference, not per-stall -- same key regardless of whose stall
 *  is open. Collapsed by default (no saved value yet). */
const STATS_COLLAPSED_KEY = 's2g:stall-today-panel-collapsed';

/**
 * Today/calendar card + Omer + Your Growth, restyled gold-on-dark-wood for
 * "the stall is the frame" (Farm-Stalls batch 2e) -- the same information
 * as the Cockpit sidebar's right panel (DashboardPage.jsx), minus the
 * SeedFlow tip box (not part of this batch's scope). Fetches its own data
 * (useSacredNow, useCommunityGrowthStats) rather than taking it as props,
 * so it can be dropped into the stall interior's desktop column or mobile
 * drawer without the parent needing to know about sacred-date/stats state.
 *
 * Flow v2 step 4: Wallet balance, additive on top of the above. Reads the
 * same live on-chain USDC balance as WalletBalanceChip.tsx/
 * DashboardTribeStats.tsx (useLiveWalletBalance, non-custodial -- all
 * three always agree).
 *
 * Flow v2 step 9 (Davison decision): the standalone Let It Rain panel/
 * button that used to live here is retired -- the Heart tip picker on a
 * SeedCard IS Let It Rain now, no separate feature.
 */
export default function StallTodayPanel({ className = '', stacked = false, ownerId = null, isOwner = false }: Props) {
  const sacred = useSacredNow();
  const stats = useCommunityGrowthStats();
  const { user } = useAuth();
  const address = user?.solana_wallet_address || null;
  const { balance, error, loading, refetch } = useLiveWalletBalance(address);
  const { count: visitorCount, loading: visitorCountLoading } = useStallVisitorCount(ownerId, isOwner);
  // No server-persisted basket exists (diagnosed 2026-09-20: baskets/
  // basket_items tables exist in Postgres but are wired to nothing, zero
  // rows, zero code references; basket_orders is a completed/in-flight
  // checkout record, not a live basket). itemCount is real and exactly
  // matches /products/basket's own count (BestowalCheckout.tsx renders
  // one row per basketItems entry) -- but it's this device's
  // localStorage only, not a durable per-member count. Davison's own
  // decision, 2026-09-20: ship the client-side count now rather than
  // build out real persistence for a wallet-panel row.
  const { itemCount: basketItemCount } = useProductBasket();

  // Mobile-portrait only (stacked) -- on desktop/landscape this whole
  // section stack was never the crowding problem (permanent right column
  // or an on-demand drawer, both already sized to their own chrome), so
  // it stays exactly as it always has: no strip, no collapse, always
  // expanded. Collapsed by default on first visit; a saved value always
  // wins after that, so a member's own choice sticks across visits.
  const [collapsed, setCollapsed] = useState(() => {
    if (!stacked) return false;
    try {
      const saved = localStorage.getItem(STATS_COLLAPSED_KEY);
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!stacked) return;
    try { localStorage.setItem(STATS_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed, stacked]);

  const dayType = sacred.isSabbath ? 'Sabbath' : sacred.isFeast ? sacred.feastName || 'Feast Day' : 'Regular Day';
  const low = !!address && balance !== null && balance < LOW_BALANCE_THRESHOLD;

  const growthRows: { label: string; val: number }[] = [
    { label: 'Seeds planted', val: stats.seeds },
    { label: 'Seeds growing', val: stats.orchards },
    { label: 'Active sowers', val: stats.sowers },
    { label: 'Harvest forming', val: stats.members },
  ];

  // Compact strip value -- same address/error/loading/balance already read
  // above for the full Wallet card, never a second query. Error shows its
  // own compact state (never a stale/last-good number) per the same
  // "three distinct states, never a bare guess" rule the full card follows.
  const walletStrip = !user ? null : address && error ? (
    <span className="flex items-center gap-1 text-orange-300">
      <Wallet className="h-3.5 w-3.5" /> Unavailable
    </span>
  ) : (
    <span className={`flex items-center gap-1 ${low ? 'text-orange-300' : 'text-amber-100/80'}`}>
      <Wallet className="h-3.5 w-3.5" />
      {!address ? '—' : loading && balance === null ? <Loader2 className="h-3 w-3 animate-spin" /> : `$${(balance ?? 0).toFixed(2)}`}
    </span>
  );

  const Section = stacked
    ? ({ children }: { children: ReactNode }) => (
        <section className="rounded-lg border border-amber-500/15 bg-black/25 p-3">{children}</section>
      )
    : ({ children }: { children: ReactNode }) => <section>{children}</section>;
  const Divider = stacked ? () => null : () => <div className="border-t border-amber-500/10" />;

  return (
    <div
      className={`${stacked ? 'flex flex-col gap-3' : 'gap-5'} bg-[#140c06] px-4 py-4 ${stacked ? '' : 'overflow-y-auto'} ${className}`}
      // Only the desktop (non-stacked) variant owns its own scroll -- the
      // last row (Your Growth) sat trapped under the fixed bottom bar/
      // radio pill with no bottom padding accounting for either at all.
      // The stacked mobile-portrait variant scrolls at a parent level
      // instead (StallInteriorView.tsx's own root div, `max-lg:portrait:
      // overflow-y-auto`) -- fixed there directly, via a Tailwind
      // arbitrary-value class reading the same --bottom-chrome-h var,
      // since an inline style on that div would also apply (harmlessly,
      // but needlessly) to the desktop/landscape layout it also wraps.
      style={stacked ? undefined : BOTTOM_CHROME_PADDING_STYLE}
    >
      {stacked && (
        // One block, collapsed by default -- was 5 full cards pushing the
        // stall image itself off-screen on mobile portrait. Tap anywhere
        // on the strip toggles; desktop/landscape (stacked=false) never
        // renders this at all, so nothing here touches that layout.
        //
        // "My stats", not "Stall stats": the balance in it is the VIEWER's
        // own wallet (useLiveWalletBalance on user.solana_wallet_address),
        // whoever's stall this is. Confirmed live 2026-09-21 -- the same
        // $14.27 showed on Grove Station and J & T Photography -- where
        // "Stall stats" reads as the owner's money.
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          className="flex w-full items-center gap-3 rounded-lg border border-amber-500/15 bg-black/25 px-3 py-2.5 text-left text-xs"
        >
          {walletStrip}
          {isOwner && ownerId && (
            <span className="flex items-center gap-1 text-amber-100/80">
              <Eye className="h-3.5 w-3.5" />
              {visitorCountLoading && visitorCount === null ? <Loader2 className="h-3 w-3 animate-spin" /> : visitorCount ?? 0}
            </span>
          )}
          <span className="flex-1 min-w-0 truncate text-right font-serif tracking-[0.1em] uppercase text-amber-400/70">
            My stats
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-amber-400/70 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      )}
      {(!stacked || !collapsed) && (
      <>
      <Section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">💰 Wallet</h3>
        {user && (
          // Three distinct states, never a bare "?" (2026-09-20 bug: a
          // failed balance read rendered as an unexplained question mark
          // with no way to act on it). A failed read is its own row --
          // a button that retries, not the Link to payout settings the
          // healthy/loading states use, since tapping it should fix the
          // problem in place rather than navigate away from it.
          address && error ? (
            <button
              type="button"
              onClick={() => refetch()}
              className="flex w-full items-center justify-between rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-left transition-colors hover:bg-orange-500/15"
            >
              <span className="flex items-center gap-1.5 text-xs text-amber-100/70">
                <Wallet className="h-3.5 w-3.5" /> USDC balance
              </span>
              <span className="text-xs font-semibold text-orange-300">Balance unavailable — tap to retry</span>
            </button>
          ) : (
            <Link
              to="/settings/payouts"
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                low ? 'border-orange-500/40 bg-orange-500/10' : 'border-amber-500/15 bg-black/25 hover:bg-black/35'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs text-amber-100/70">
                <Wallet className="h-3.5 w-3.5" /> {address ? 'USDC balance' : 'Connect wallet'}
              </span>
              <span className={`text-sm font-semibold ${low ? 'text-orange-300' : 'text-amber-200'}`}>
                {!address ? '—' : loading && balance === null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `$${(balance ?? 0).toFixed(2)}`}
              </span>
            </Link>
          )
        )}
        {user && (
          <Link
            to="/products/basket"
            className="mt-2 flex items-center justify-between rounded-lg border border-amber-500/15 bg-black/25 px-3 py-2 transition-colors hover:bg-black/35"
          >
            <span className="flex items-center gap-1.5 text-xs text-amber-100/70">
              <ShoppingBasket className="h-3.5 w-3.5" /> My basket
            </span>
            <span className="text-sm font-semibold text-amber-200">
              {basketItemCount} item{basketItemCount === 1 ? '' : 's'}
            </span>
          </Link>
        )}
      </Section>

      {isOwner && ownerId && (
        <>
          <Divider />
          <Section>
            <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">👀 Visitors</h3>
            <div className="flex items-center justify-between rounded-lg border border-amber-500/15 bg-black/25 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-amber-100/70">
                <Eye className="h-3.5 w-3.5" /> Unique visitors
              </span>
              <span className="text-sm font-semibold text-amber-200">
                {visitorCountLoading && visitorCount === null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : visitorCount ?? 0}
              </span>
            </div>
          </Section>
        </>
      )}

      <Divider />

      <Section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">📅 Today</h3>
        <p className="font-serif text-lg text-amber-100">Year {sacred.date.year}</p>
        <p className="text-xs text-amber-100/60 mt-1 leading-relaxed">
          Month {sacred.date.month} · Day {sacred.date.day}<br />
          Day {sacred.weekDay} · {dayType}
        </p>
      </Section>

      <Divider />

      <Section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">🌾 Omer</h3>
        <p className="text-sm text-amber-100/90">Omer {sacred.omer ?? 0}/{sacred.omerTotal}</p>
        {sacred.nextFeast && (
          <p className="text-xs text-amber-100/50 mt-1">Next: {sacred.nextFeast}</p>
        )}
      </Section>

      <Divider />

      <Section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">🌱 Your Growth</h3>
        <div className="space-y-1.5">
          {growthRows.map(({ label, val }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-amber-100/60">{label}</span>
              <span className="text-amber-200 font-semibold">{val}</span>
            </div>
          ))}
        </div>
      </Section>
      </>
      )}
    </div>
  );
}
