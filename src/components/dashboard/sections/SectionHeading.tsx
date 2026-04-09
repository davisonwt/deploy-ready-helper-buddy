import React from 'react';
import { LucideIcon } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface SectionHeadingProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  theme: DashboardTheme;
  /** Two CSS colors for the gradient text, e.g. ['#14b8a6','#06b6d4'] */
  gradientColors?: [string, string];
  rightSlot?: React.ReactNode;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  icon: Icon,
  title,
  subtitle,
  theme,
  gradientColors,
  rightSlot,
}) => {
  const [from, to] = gradientColors || [theme.accent, theme.textPrimary];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className="p-2.5 rounded-xl shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${from}22, ${to}22)`,
            border: `1px solid ${from}33`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: from }} />
        </div>
        <div>
          <h2
            className="text-lg font-extrabold tracking-tight"
            style={{
              backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: `drop-shadow(0 0 8px ${from}40)`,
            }}
          >
            {title}
          </h2>
          <p className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>
            {subtitle}
          </p>
        </div>
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </div>
  );
};
