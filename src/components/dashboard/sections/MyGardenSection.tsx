import React from 'react';
import { Sprout } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { WalletSetupPrompt } from '@/components/wallet/WalletSetupPrompt';
import { SowerBalanceCard } from '@/components/wallet/SowerBalanceCard';
import { StatsCards } from '../StatsCards';
import { GardenSection as GardenOrchards } from './GardenSection';

interface MyGardenSectionProps {
  theme: DashboardTheme;
  stats: any;
}

export const MyGardenSection: React.FC<MyGardenSectionProps> = ({ theme, stats }) => {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Sprout className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            My Garden
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            {stats.totalFollowers} followers · {stats.totalOrchards} seeds · {stats.totalBestowals} bestowals
          </p>
        </div>
      </div>

      {/* Wallet */}
      <div className="space-y-3">
        <WalletSetupPrompt variant="card" />
        <SowerBalanceCard compact theme={theme} />
      </div>

      {/* Stats */}
      <StatsCards theme={theme} />

      {/* Orchards */}
      <GardenOrchards theme={theme} />
    </div>
  );
};
