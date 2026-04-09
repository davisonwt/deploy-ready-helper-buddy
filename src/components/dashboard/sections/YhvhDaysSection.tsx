import React, { useState } from 'react';
import { Calendar, Gem, CircleDot, BookOpen, Video } from 'lucide-react';
import { OmerCountBanner } from '@/components/OmerCountBanner';
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
import { KeeperHelpButton } from './KeeperHelpButton';
import { SectionHeading } from './SectionHeading';
import { SubSectionLabel } from './SubSectionLabel';

interface YhvhDaysSectionProps {
  theme: DashboardTheme;
  calendarData: any;
  currentTime: Date;
  communityUnread: number;
}

const daysCards = [
  { href: '/enochian-calendar-design', title: "Ed's Beads", subtitle: 'Sacred calendar beadwork', icon: Gem, gradient: 'linear-gradient(135deg, #be185d, #a855f7)' },
  { href: '/wheels-in-itself', title: 'Wheels in Itself', subtitle: 'Prophetic wheel patterns', icon: CircleDot, gradient: 'linear-gradient(135deg, #ea580c, #f59e0b)' },
];

const studiesCards = [
  { href: '/scriptural-study', title: 'Scriptural Study Q&A', subtitle: 'Dive deep into the Word', icon: BookOpen, gradient: 'linear-gradient(135deg, #92400e, #d97706)' },
  { href: '/364yhvh-videos', title: 'Videos', subtitle: 'Watch & learn', icon: Video, gradient: 'linear-gradient(135deg, #7c2d12, #b45309)' },
];

type TabId = 'days' | 'studies';

export const YhvhDaysSection: React.FC<YhvhDaysSectionProps> = ({
  theme, calendarData, currentTime, communityUnread,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('days');
  const dayInfo = calendarData ? getDayInfo(calendarData.dayOfYear) : null;

  const tabs: { id: TabId; label: string; emoji: string; colors: [string, string] }[] = [
    { id: 'days', label: 'Days', emoji: '📿', colors: ['#be185d', '#a855f7'] },
    { id: 'studies', label: 'Studies', emoji: '📖', colors: ['#92400e', '#d97706'] },
  ];

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={Calendar}
        title="364yhvh"
        subtitle="Sacred calendar, studies & community"
        theme={theme}
        gradientColors={['#be185d', '#a855f7']}
        rightSlot={<KeeperHelpButton sectionName="364yhvh" />}
      />

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 transition-all duration-300"
          >
            <SubSectionLabel
              emoji={tab.emoji}
              label={tab.label}
              gradientColors={activeTab === tab.id ? tab.colors : ['#374151', '#4b5563']}
            />
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'days' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <SecurityQuestionsAlert />
            <SabbathDashboardBanner />
          </div>

          <OmerCountBanner theme={theme} />

          <div className="grid grid-cols-2 gap-3">
            {daysCards.map((card) => (
              <GradientGatewayCard key={card.title} {...card} />
            ))}
          </div>

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

          <div
            className="rounded-xl p-4 border"
            style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
          >
            <WeatherWidget compact theme={theme} />
            <DailyPlantingTip currentTheme={theme} />
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
          >
            <TopSowersTeaser theme={theme} />
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
          >
            <SeedEngagementWidget theme={theme} />
          </div>

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
      )}

      {activeTab === 'studies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {studiesCards.map((card) => (
              <GradientGatewayCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
