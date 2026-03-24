import React from 'react';
import { Calendar } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SabbathDashboardBanner } from '@/components/SabbathDashboardBanner';
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert';
import WeatherWidget from '@/components/weather/WeatherWidget';
import LiveTimezoneDisplay from '@/components/dashboard/LiveTimezoneDisplay';
import { DailyPlantingTip } from '@/components/garden/DailyPlantingTip';
import { TopSowersTeaser } from '../TopSowersTeaser';
import { SeedEngagementWidget } from '../SeedEngagementWidget';
import { getDayInfo } from '@/utils/sacredCalendar';

interface YhvhDaysSectionProps {
  theme: DashboardTheme;
  calendarData: any;
  currentTime: Date;
  communityUnread: number;
}

export const YhvhDaysSection: React.FC<YhvhDaysSectionProps> = ({
  theme,
  calendarData,
  currentTime,
  communityUnread,
}) => {
  const dayInfo = calendarData ? getDayInfo(calendarData.dayOfYear) : null;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Calendar className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            364yhvh Days
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Sacred calendar, weather & community
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <SecurityQuestionsAlert />
        <SabbathDashboardBanner />
      </div>

      {/* Calendar Card */}
      {calendarData && (
        <div
          className="rounded-xl p-4 border space-y-2"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📅</span>
            <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
              Day {calendarData.dayOfMonth}, Month {calendarData.month}
            </h3>
          </div>
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            Weekday {calendarData.weekday} • Part {calendarData.part}/18 • Day {calendarData.dayOfYear} of 364
          </p>
          {dayInfo?.feastName && (
            <p className="text-xs italic" style={{ color: theme.textPrimary }}>
              🕊️ {dayInfo.feastName}
            </p>
          )}
          <p className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>
            {currentTime.toLocaleString(undefined, {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      )}

      {/* Weather */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
      >
        <WeatherWidget compact theme={theme} />
        <DailyPlantingTip currentTheme={theme} />
      </div>

      {/* Top Sowers */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
      >
        <TopSowersTeaser theme={theme} />
      </div>

      {/* Engagement */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
      >
        <SeedEngagementWidget theme={theme} />
      </div>

      {/* Timezone */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🌍</span>
          <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>Global Time Zones</h3>
        </div>
        <LiveTimezoneDisplay />
      </div>
    </div>
  );
};
