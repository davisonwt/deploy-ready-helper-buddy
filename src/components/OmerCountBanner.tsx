import React from 'react';
import { getTodayOmerCounts, type OmerCycle } from '@/utils/omerCount';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface OmerCountBannerProps {
  theme?: DashboardTheme;
  compact?: boolean;
  /** Override month/day instead of using today */
  month?: number;
  day?: number;
}

export const OmerCountBanner: React.FC<OmerCountBannerProps> = ({
  theme,
  compact = false,
  month,
  day,
}) => {
  const cycles = month && day
    ? (await import('@/utils/omerCount')).getOmerCounts(month, day)
    : getTodayOmerCounts();

  if (cycles.length === 0) return null;

  return (
    <div className="space-y-2">
      {cycles.map((cycle) => (
        <OmerCycleCard key={cycle.shortLabel} cycle={cycle} theme={theme} compact={compact} />
      ))}
    </div>
  );
};

function OmerCycleCard({
  cycle,
  theme,
  compact,
}: {
  cycle: OmerCycle;
  theme?: DashboardTheme;
  compact: boolean;
}) {
  const pct = (cycle.count / cycle.total) * 100;
  const remaining = cycle.total - cycle.count;

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
        style={{
          background: theme?.cardBg ?? 'hsl(var(--card))',
          border: `1px solid ${theme?.cardBorder ?? 'hsl(var(--border))'}`,
          color: theme?.textPrimary ?? 'hsl(var(--foreground))',
        }}
      >
        <span>{cycle.emoji}</span>
        <span className={cycle.color}>{cycle.shortLabel} {cycle.count}/50</span>
        <span className="text-[10px] opacity-60">→ {cycle.feast}</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-3 shadow-md"
      style={{
        background: theme?.cardBg ?? 'hsl(var(--card))',
        border: `1px solid ${theme?.cardBorder ?? 'hsl(var(--border))'}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cycle.emoji}</span>
          <div>
            <p
              className="text-sm font-bold leading-tight"
              style={{ color: theme?.textPrimary ?? 'hsl(var(--foreground))' }}
            >
              {cycle.label}
            </p>
            <p
              className="text-[10px]"
              style={{ color: theme?.textSecondary ?? 'hsl(var(--muted-foreground))' }}
            >
              {remaining} day{remaining !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
        <div
          className="text-2xl font-black tabular-nums"
          style={{ color: theme?.accent ?? 'hsl(var(--primary))' }}
        >
          {cycle.count}
          <span className="text-xs font-medium opacity-50">/50</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: theme?.secondaryButton ?? 'hsl(var(--muted))' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              cycle.shortLabel === 'Omer'
                ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                : cycle.shortLabel === 'Wine'
                ? 'linear-gradient(90deg, #be123c, #f43f5e)'
                : 'linear-gradient(90deg, #059669, #34d399)',
          }}
        />
      </div>
    </div>
  );
}
