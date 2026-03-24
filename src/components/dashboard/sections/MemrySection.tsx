import React from 'react';
import { Camera, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { BrowseSection } from './BrowseSection';
import { ExploreSection } from './ExploreSection';

interface MemrySectionProps {
  theme: DashboardTheme;
}

export const MemrySection: React.FC<MemrySectionProps> = ({ theme }) => {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
            <Camera className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
              S2G Memry
            </h2>
            <p className="text-[10px]" style={{ color: theme.textSecondary }}>
              Discover & browse all feeds
            </p>
          </div>
        </div>
        <Link to="/memry" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          Open Feed <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Browse Orchards */}
      <BrowseSection theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      {/* Explore & Quick Paths */}
      <ExploreSection theme={theme} />
    </div>
  );
};
