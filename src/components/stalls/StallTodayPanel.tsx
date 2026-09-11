import { useSacredNow } from '@/hooks/useSacredNow';
import { useCommunityGrowthStats } from '@/hooks/useCommunityGrowthStats';

interface Props {
  className?: string;
}

/**
 * Today/calendar card + Omer + Your Growth, restyled gold-on-dark-wood for
 * "the stall is the frame" (Farm-Stalls batch 2e) -- the same information
 * as the Cockpit sidebar's right panel (DashboardPage.jsx), minus the
 * SeedFlow tip box (not part of this batch's scope). Fetches its own data
 * (useSacredNow, useCommunityGrowthStats) rather than taking it as props,
 * so it can be dropped into the stall interior's desktop column or mobile
 * drawer without the parent needing to know about sacred-date/stats state.
 */
export default function StallTodayPanel({ className = '' }: Props) {
  const sacred = useSacredNow();
  const stats = useCommunityGrowthStats();

  const dayType = sacred.isSabbath ? 'Sabbath' : sacred.isFeast ? sacred.feastName || 'Feast Day' : 'Regular Day';

  const growthRows: { label: string; val: number }[] = [
    { label: 'Seeds planted', val: stats.seeds },
    { label: 'Seeds growing', val: stats.orchards },
    { label: 'Active sowers', val: stats.sowers },
    { label: 'Harvest forming', val: stats.members },
  ];

  return (
    <div className={`gap-5 bg-[#140c06] px-4 py-4 overflow-y-auto ${className}`}>
      <section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">📅 Today</h3>
        <p className="font-serif text-lg text-amber-100">Year {sacred.date.year}</p>
        <p className="text-xs text-amber-100/60 mt-1 leading-relaxed">
          Month {sacred.date.month} · Day {sacred.date.day}<br />
          Day {sacred.weekDay} · {dayType}
        </p>
      </section>

      <div className="border-t border-amber-500/10" />

      <section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">🌾 Omer</h3>
        <p className="text-sm text-amber-100/90">Omer {sacred.omer ?? 0}/{sacred.omerTotal}</p>
        {sacred.nextFeast && (
          <p className="text-xs text-amber-100/50 mt-1">Next: {sacred.nextFeast}</p>
        )}
      </section>

      <div className="border-t border-amber-500/10" />

      <section>
        <h3 className="font-serif text-xs tracking-[0.12em] uppercase text-amber-400/80 mb-2">🌱 Your Growth</h3>
        <div className="space-y-1.5">
          {growthRows.map(({ label, val }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-amber-100/60">{label}</span>
              <span className="text-amber-200 font-semibold">{val}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
