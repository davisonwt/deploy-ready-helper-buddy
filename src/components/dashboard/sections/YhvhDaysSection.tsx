import React, { useState } from 'react';
import { Calendar, Gem, CircleDot, BookOpen, Video, Clock, Radio, Play, Eye, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import StudyFeedList from '@/components/studies/StudyFeedList';
import { KeeperHelpButton } from './KeeperHelpButton';
import { SectionHeading } from './SectionHeading';
import { SubSectionLabel } from './SubSectionLabel';

interface YhvhDaysSectionProps {
  theme: DashboardTheme;
  calendarData: any;
  currentTime: Date;
  communityUnread: number;
}

type TabId = 'beads' | 'wheel' | 'studies' | 'schedule';

const tabs: { id: TabId; label: string; emoji: string; colors: [string, string] }[] = [
  { id: 'beads', label: "Ed's Beads", emoji: '📿', colors: ['#be185d', '#a855f7'] },
  { id: 'wheel', label: 'Wheel', emoji: '☸️', colors: ['#ea580c', '#f59e0b'] },
  { id: 'studies', label: 'Studies', emoji: '📖', colors: ['#92400e', '#d97706'] },
  { id: 'schedule', label: 'Schedule', emoji: '📅', colors: ['#581c87', '#7e22ce'] },
];

export const YhvhDaysSection: React.FC<YhvhDaysSectionProps> = ({
  theme, calendarData, currentTime, communityUnread,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('beads');
  const dayInfo = calendarData ? getDayInfo(calendarData.dayOfYear) : null;

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={Calendar}
        title="364yhvh"
        subtitle="Scripture, calendar & spiritual hub"
        theme={theme}
        gradientColors={['#be185d', '#a855f7']}
        rightSlot={<KeeperHelpButton sectionName="364yhvh" />}
      />

      {/* 4-option Tab Switcher */}
      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="transition-all duration-300"
          >
            <SubSectionLabel
              emoji={tab.emoji}
              label={tab.label}
              gradientColors={activeTab === tab.id ? tab.colors : ['#374151', '#4b5563']}
            />
          </button>
        ))}
      </div>

      {/* === Ed's Beads === */}
      {activeTab === 'beads' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <SecurityQuestionsAlert />
            <SabbathDashboardBanner />
          </div>

          <OmerCountBanner theme={theme} />

          <GradientGatewayCard
            href="/enochian-calendar-design"
            title="Ed's Beads"
            subtitle="Sacred bead calendar with monthly strands"
            icon={Gem}
            gradient="linear-gradient(135deg, #be185d, #a855f7)"
          />

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

      {/* === Wheel === */}
      {activeTab === 'wheel' && (
        <div className="space-y-4">
          <GradientGatewayCard
            href="/enochian-calendar-design?view=wheel"
            title="Wheels in Itself"
            subtitle="YHVH 8-wheel rotating prophetic calendar"
            icon={CircleDot}
            gradient="linear-gradient(135deg, #ea580c, #f59e0b)"
          />

          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #78350f, #b45309)' }}
          >
            <CircleDot className="w-12 h-12 text-amber-200 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Prophetic Wheel Patterns</h3>
            <p className="text-sm text-white/70 mb-4">
              Explore the interconnected wheels of the Creator's calendar system — see how time, seasons, and feasts align in the sacred 364-day cycle.
            </p>
            <Link
              to="/enochian-calendar-design?view=wheel"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #ea580c, #f59e0b)' }}
            >
              <Eye className="w-4 h-4" />
              Open Wheel View
            </Link>
          </div>
        </div>
      )}

      {/* === Studies === */}
      {activeTab === 'studies' && (
        <div className="space-y-4">
          <Link
            to="/upload-study"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}
          >
            <Upload className="w-4 h-4" />
            Upload a Study
          </Link>

          <GradientGatewayCard
            href="/scriptural-study"
            title="Scriptural Study Q&A"
            subtitle="End Times study companion with questions"
            icon={BookOpen}
            gradient="linear-gradient(135deg, #92400e, #d97706)"
          />
          <GradientGatewayCard
            href="/364yhvh-videos"
            title="Videos"
            subtitle="Watch & learn from scripture teachings"
            icon={Video}
            gradient="linear-gradient(135deg, #7c2d12, #b45309)"
          />

          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, #451a03, #78350f)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-amber-300" />
              <h3 className="text-sm font-bold text-white">The Complete Study</h3>
            </div>
            <p className="text-xs text-white/70 mb-3">
              Victory Already Won — an interactive study through 10 major End Times topics. Answer questions, light candles, and join live SkillDrop sessions to go deeper.
            </p>
            <Link
              to="/scriptural-study"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Start Studying
            </Link>
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
          >
            <StudyFeedList />
          </div>
        </div>
      )}

      {/* === Schedule === */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, #581c87, #7e22ce)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Radio className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Live & Recorded Sessions</h3>
                <p className="text-xs text-white/60">Scripture teachings, bead studies & diary</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/grove-station"
                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/30">
                  <Radio className="w-4 h-4 text-red-300" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">Live Now</span>
                  <p className="text-[10px] text-white/50">Join active spiritual broadcasts</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              </Link>

              <Link
                to="/explore-sessions?type=skilldrop"
                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/30">
                  <Clock className="w-4 h-4 text-amber-300" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">Upcoming Sessions</span>
                  <p className="text-[10px] text-white/50">SkillDrop & classroom teachings</p>
                </div>
              </Link>

              <Link
                to="/364yhvh-videos"
                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/30">
                  <Play className="w-4 h-4 text-purple-300" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">Pre-recorded</span>
                  <p className="text-[10px] text-white/50">Watch past teachings & replays</p>
                </div>
              </Link>
            </div>
          </div>

          <Link
            to="/communications-hub?tab=radio&create=1"
            className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #7c2d12, #b45309)' }}
          >
            🎙️ Go Live — Start a Spiritual Session
          </Link>
        </div>
      )}
    </div>
  );
};
