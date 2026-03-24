import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FeedItemCard, DashboardFeedItem } from './FeedItemCard';
import { StickyProfileBar } from './StickyProfileBar';
import { BottomActionBar } from './BottomActionBar';
import { StatsCards } from './StatsCards';
import { TopSowersTeaser } from './TopSowersTeaser';
import { SeedEngagementWidget } from './SeedEngagementWidget';
import { SabbathDashboardBanner } from '@/components/SabbathDashboardBanner';
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert';
import { WalletSetupPrompt } from '@/components/wallet/WalletSetupPrompt';
import { SowerBalanceCard } from '@/components/wallet/SowerBalanceCard';
import WeatherWidget from '@/components/weather/WeatherWidget';
import LiveTimezoneDisplay from '@/components/dashboard/LiveTimezoneDisplay';
import { DailyPlantingTip } from '@/components/garden/DailyPlantingTip';
import { StatsFloatingButton } from './StatsFloatingButton';
import { getDayInfo } from '@/utils/sacredCalendar';
import { MessageSquare } from 'lucide-react';

// Section system
import { SectionNavBar } from './SectionNavBar';
import { DashboardSection } from './DashboardSection';
import { DASHBOARD_SECTIONS, getAllSectionThemes } from './sectionConfig';
import { RadioSection } from './sections/RadioSection';
import { BrowseSection } from './sections/BrowseSection';
import { ChatSection } from './sections/ChatSection';
import { GardenSection } from './sections/GardenSection';
import { ExploreSection } from './sections/ExploreSection';

interface SocialFeedDashboardProps {
  profile: any;
  calendarData: any;
  stats: any;
  unreadMessages: number;
  communityUnread: number;
  currentTheme: any;
  currentTime: Date;
  user: any;
}

export const SocialFeedDashboard: React.FC<SocialFeedDashboardProps> = ({
  profile,
  calendarData,
  stats,
  unreadMessages,
  communityUnread,
  currentTheme,
  currentTime,
  user,
}) => {
  const [activeSection, setActiveSection] = useState('home');
  const sectionThemes = getAllSectionThemes();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    DASHBOARD_SECTIONS.forEach((section) => {
      const el = sectionRefs.current[section.id];
      if (!el) return;
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(section.id);
          }
        },
        { threshold: 0.3, rootMargin: '-80px 0px -40% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const handleSectionClick = useCallback((sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  // Build home feed items
  const feedItems: DashboardFeedItem[] = [];
  const homeTheme = sectionThemes['home'] || currentTheme;

  // 1. Alerts
  feedItems.push({
    id: 'alerts',
    type: 'stat-summary',
    priority: 0,
    title: 'Alerts',
    children: (
      <div className="space-y-2">
        <SecurityQuestionsAlert />
        <SabbathDashboardBanner />
      </div>
    ),
  });

  // 2. Wallet
  feedItems.push({
    id: 'wallet-setup',
    type: 'earnings',
    priority: 1,
    title: 'Wallet',
    emoji: '💰',
    subtitle: 'Your balance & setup',
    children: (
      <div className="space-y-3">
        <WalletSetupPrompt variant="card" />
        <SowerBalanceCard compact theme={homeTheme} />
      </div>
    ),
  });

  // 3. Stats
  feedItems.push({
    id: 'stats',
    type: 'stat-summary',
    priority: 2,
    title: 'Your Garden',
    emoji: '📊',
    subtitle: `${stats.totalFollowers} followers · ${stats.totalOrchards} seeds · ${stats.totalBestowals} bestowals`,
    children: <StatsCards theme={homeTheme} />,
  });

  // 4. Calendar
  if (calendarData) {
    const dayInfo = getDayInfo(calendarData.dayOfYear);
    feedItems.push({
      id: 'calendar',
      type: 'calendar-note',
      priority: 3,
      title: `Day ${calendarData.dayOfMonth}, Month ${calendarData.month}`,
      emoji: '📅',
      subtitle: calendarData.season,
      linkTo: '/profile?tab=journal',
      children: (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Weekday {calendarData.weekday} • Part {calendarData.part}/18 • Day {calendarData.dayOfYear} of 364
          </p>
          {dayInfo?.feastName && (
            <p className="text-xs text-foreground/80 italic line-clamp-2">
              {dayInfo.feastName}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            {currentTime.toLocaleString(undefined, {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      ),
    });
  }

  // 5. Weather
  feedItems.push({
    id: 'weather',
    type: 'weather',
    priority: 4,
    title: 'Weather',
    emoji: '🌤️',
    subtitle: 'Your local conditions',
    linkTo: '/weather',
    children: (
      <div>
        <WeatherWidget compact theme={homeTheme} />
        <DailyPlantingTip currentTheme={homeTheme} />
      </div>
    ),
  });

  // 6. Top Sowers
  feedItems.push({
    id: 'top-sowers',
    type: 'social-proof',
    priority: 5,
    title: 'Top Sowers',
    emoji: '🏆',
    subtitle: 'Community leaders this week',
    children: <TopSowersTeaser theme={homeTheme} />,
  });

  // 7. Engagement
  feedItems.push({
    id: 'engagement',
    type: 'engagement',
    priority: 6,
    title: 'Seed Engagement',
    emoji: '❤️',
    subtitle: 'Loves & comments on your seeds',
    children: <SeedEngagementWidget theme={homeTheme} />,
  });

  // 8. Community Chat preview
  feedItems.push({
    id: 'community-chat',
    type: 'community-chat',
    priority: 7,
    title: 'Community ChatApp',
    emoji: '💬',
    subtitle: communityUnread > 0 ? `${communityUnread} new messages` : 'Join the conversation',
    linkTo: '/community-chat',
    children: (
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-xs text-foreground/80">
          {communityUnread > 0 ? `${communityUnread} unread` : 'Tap to join'}
        </span>
        {communityUnread > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
            {communityUnread}
          </span>
        )}
      </div>
    ),
  });

  // 9. Timezone
  feedItems.push({
    id: 'timezone',
    type: 'stat-summary',
    priority: 8,
    title: 'Global Time Zones',
    emoji: '🌍',
    linkTo: '/grove-station',
    children: <LiveTimezoneDisplay />,
  });

  feedItems.sort((a, b) => a.priority - b.priority);

  return (
    <div className="min-h-screen relative">
      {/* Sticky Profile Bar */}
      <StickyProfileBar
        profile={profile}
        unreadMessages={unreadMessages}
        calendarData={calendarData}
        theme={sectionThemes[activeSection] || currentTheme}
      />

      {/* Sticky Section Nav */}
      <SectionNavBar
        activeSectionId={activeSection}
        sectionThemes={sectionThemes}
        onSectionClick={handleSectionClick}
      />

      {/* === HOME SECTION === */}
      <DashboardSection
        ref={setSectionRef('home')}
        id="home"
        theme={sectionThemes['home']}
      >
        {feedItems.map((item, i) => (
          <FeedItemCard key={item.id} item={item} index={i} theme={sectionThemes['home']} />
        ))}
      </DashboardSection>

      {/* === RADIO SECTION === */}
      <DashboardSection
        ref={setSectionRef('radio')}
        id="radio"
        theme={sectionThemes['radio']}
      >
        <RadioSection theme={sectionThemes['radio']} />
      </DashboardSection>

      {/* === BROWSE SECTION === */}
      <DashboardSection
        ref={setSectionRef('browse')}
        id="browse"
        theme={sectionThemes['browse']}
      >
        <BrowseSection theme={sectionThemes['browse']} />
      </DashboardSection>

      {/* === CHAT SECTION === */}
      <DashboardSection
        ref={setSectionRef('chat')}
        id="chat"
        theme={sectionThemes['chat']}
      >
        <ChatSection theme={sectionThemes['chat']} />
      </DashboardSection>

      {/* === GARDEN SECTION === */}
      <DashboardSection
        ref={setSectionRef('garden')}
        id="garden"
        theme={sectionThemes['garden']}
      >
        <GardenSection theme={sectionThemes['garden']} />
      </DashboardSection>

      {/* === EXPLORE SECTION === */}
      <DashboardSection
        ref={setSectionRef('explore')}
        id="explore"
        theme={sectionThemes['explore']}
        className="pb-24"
      >
        <ExploreSection theme={sectionThemes['explore']} />
      </DashboardSection>

      {/* Bottom Action Bar */}
      <BottomActionBar theme={sectionThemes[activeSection] || currentTheme} />

      {/* Stats floating button */}
      <div className="hidden sm:block">
        <StatsFloatingButton theme={sectionThemes[activeSection] || currentTheme} />
      </div>
    </div>
  );
};
