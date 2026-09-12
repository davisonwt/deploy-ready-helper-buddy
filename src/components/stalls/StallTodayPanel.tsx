import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Loader2 } from 'lucide-react';
import { useSacredNow } from '@/hooks/useSacredNow';
import { useCommunityGrowthStats } from '@/hooks/useCommunityGrowthStats';
import { useAuth } from '@/hooks/useAuth';
import { useLiveWalletBalance } from '@/lib/payments/liveWalletBalance';

interface Props {
  className?: string;
  /** Each section (Wallet, Today, Omer, Growth) as its own bordered wood card with a gap between, instead of one continuous panel with hairline dividers -- the mobile-portrait stall interior page (StallInteriorView) stacks these below the pannable image. */
  stacked?: boolean;
}

const LOW_BALANCE_THRESHOLD = 5;

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
export default function StallTodayPanel({ className = '', stacked = false }: Props) {
  const sacred = useSacredNow();
  const stats = useCommunityGrowthStats();
  const { user } = useAuth();
  const address = user?.solana_wallet_address || null;
  const { balance, error, loading } = useLiveWalletBalance(address);

  const dayType = sacred.isSabbath ? 'Sabbath' : sacred.isFeast ? sacred.feastName || 'Feast Day' : 'Regular Day';
  const low = !!address && balance !== null && balance < LOW_BALANCE_THRESHOLD;

  const growthRows: { label: string; val: number }[] = [
    { label: 'Seeds planted', val: stats.seeds },
    { label: 'Seeds growing', val: stats.orchards },
    { label: 'Active sowers', val: stats.sowers },
    { label: 'Harvest forming', val: stats.members },
  ];

  const Section = stacked
    ? ({ children }: { children: ReactNode }) => (
        <section className="rounded-lg border border-amber-500/15 bg-black/25 p-3">{children}</section>
      )
    : ({ children }: { children: ReactNode }) => <section>{children}</section>;
  const Divider = stacked ? () => null : () => <div className="border-t border-amber-500/10" />;

  return (
    <div className={`${stacked ? 'flex flex-col gap-3' : 'gap-5'} bg-[#140c06] px-4 py-4 ${stacked ? '' : 'overflow-y-auto'} ${className}`}>
      <Section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">💰 Wallet</h3>
        {user && (
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
              {!address ? '—' : loading && balance === null && !error ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : error ? '?' : `$${(balance ?? 0).toFixed(2)}`}
            </span>
          </Link>
        )}
      </Section>

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
    </div>
  );
}
