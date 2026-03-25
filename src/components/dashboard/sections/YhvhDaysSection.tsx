import React from 'react';
import { Calendar, Gem, CircleDot, BookOpen } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SabbathDashboardBanner } from '@/components/SabbathDashboardBanner';
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert';
import WeatherWidget from '@/components/weather/WeatherWidget';
import LiveTimezoneDisplay from '@/components/dashboard/LiveTimezoneDisplay';
import { DailyPlantingTip } from '@/components/garden/DailyPlantingTip';
import { TopSowersTeaser } from '../TopSowersTeaser';
import { SeedEngagementWidget } from '../SeedEngagementWidget';
import { getDayInfo } from '@/utils/sacredCalendar';
import { GradientGatewayCard } from './GradientGatewayCard';

interface YhvhDaysSectionProps {
  theme: DashboardTheme;
  calendarData: any;
  currentTime: Date;
  communityUnread: number;
}

const gatewayCards = [
  { href: '/enochian-calendar-design', title: "Ed's Beads", subtitle: 'Sacred calendar beadwork', icon: Gem, gradient: 'linear-gradient(135deg, #be185d, #a855f7)' },
  { href: '/wheels-in-itself', title: 'Wheels in Itself', subtitle: 'Prophetic wheel patterns', icon: CircleDot, gradient: 'linear-gradient(135deg, #ea580c, #f59e0b)' },
  { href: '/scriptural-study', title: 'Scriptural Study Q&A', subtitle: 'Dive deep into the Word', icon: BookOpen, gradient: 'linear-gradient(135deg, #92400e, #d97706)' },
];

export const YhvhDaysSection: React.FC<YhvhDaysSectionProps> = ({
  theme, calendarData, currentTime, communityUnread,
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

      {/* Gateway Cards */}
      <div className="grid grid-cols-2 gap-3">
        {gatewayCards.slice(0, 2).map((card) => (
          <GradientGatewayCard key={card.title} {...card} />
        ))}
      </div>
      <GradientGatewayCard {...gatewayCards[2]} className="w-full" />

      {/* Calendar Card */}
      {calendarData && (
        <div
          className="rounded-2xl p-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #581c87, #7e22ce)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📅</span>
            <h3 className="text-sm font-bold text-white">
              Day {calendarData.dayOfMonth}, Month {calendarData.month}
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Weekday {calendarData.weekday} • Part {calendarData.part}/18 • Day {calendarData.dayOfYear} of 364
          </p>
          {dayInfo?.feastName && (
            <p className="text-xs italic text-white/80 mt-1">🕊️ {dayInfo.feastName}</p>
          )}
          <p className="text-[10px] font-mono text-white/50 mt-1">
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
