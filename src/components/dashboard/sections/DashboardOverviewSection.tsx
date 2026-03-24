import React from 'react';
import { Home } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SabbathDashboardBanner } from '@/components/SabbathDashboardBanner';
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert';

interface DashboardOverviewSectionProps {
  theme: DashboardTheme;
  profile: any;
  calendarData: any;
  stats: any;
  unreadMessages: number;
  communityUnread: number;
}

export const DashboardOverviewSection: React.FC<DashboardOverviewSectionProps> = ({
  theme,
  profile,
  calendarData,
  stats,
  unreadMessages,
  communityUnread,
}) => {
  const displayName = profile?.display_name || profile?.first_name || 'Sower';

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Home className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            Dashboard
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Welcome back, {displayName}
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <SecurityQuestionsAlert />
        <SabbathDashboardBanner />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4 border text-center"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{unreadMessages}</p>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>Unread Messages</p>
        </div>
        <div
          className="rounded-xl p-4 border text-center"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{communityUnread}</p>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>Community Updates</p>
        </div>
        <div
          className="rounded-xl p-4 border text-center"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{stats.totalOrchards}</p>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>Active Orchards</p>
        </div>
        <div
          className="rounded-xl p-4 border text-center"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <p className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{stats.totalFollowers}</p>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>Followers</p>
        </div>
      </div>

      {/* Calendar Quick View */}
      {calendarData && (
        <div
          className="rounded-xl p-4 border"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📅</span>
            <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
              Today: Day {calendarData.dayOfMonth}, Month {calendarData.month}
            </h3>
          </div>
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            {calendarData.season} • Year {calendarData.year}
          </p>
        </div>
      )}
    </div>
  );
};
