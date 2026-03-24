import React from 'react';
import { Dumbbell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface Props {
  theme: DashboardTheme;
}

export const TrainingSubSection: React.FC<Props> = ({ theme }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>Training</h3>
        </div>
        <Link to="/communications-hub" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="rounded-xl p-3 text-center border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
        <p className="text-[10px]" style={{ color: theme.textSecondary }}>No active training sessions right now</p>
      </div>
    </div>
  );
};
