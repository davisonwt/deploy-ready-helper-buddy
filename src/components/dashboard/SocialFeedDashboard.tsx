import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StickyProfileBar } from './StickyProfileBar';
import { BottomActionBar } from './BottomActionBar';
import { StatsFloatingButton } from './StatsFloatingButton';
import { GoLiveFAB } from './GoLiveFAB';
import { PrivateChatsDrawer } from '@/components/chat/PrivateChatsDrawer';

// Section system
import { SectionNavBar } from './SectionNavBar';
import { DashboardSection } from './DashboardSection';
import { DASHBOARD_SECTIONS, getAllSectionThemes } from './sectionConfig';
import { DashboardOverviewSection } from './sections/DashboardOverviewSection';
import { ChatAppSection } from './sections/ChatAppSection';
import { MemrySection } from './sections/MemrySection';
import { YhvhDaysSection } from './sections/YhvhDaysSection';
import { MyGardenSection } from './sections/MyGardenSection';
import { LetItRainSection } from './sections/LetItRainSection';
import { GosatsSection } from './sections/GosatsSection';

// Interstitial Memry carousels
import { MemryFeedCarousel } from './sections/MemryFeedCarousel';

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
  const [activeSection, setActiveSection] = useState('dashboard');
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const sectionThemes = getAllSectionThemes();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    DASHBOARD_SECTIONS.forEach((section) => {
      const el = sectionRefs.current[section.id];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(section.id);
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
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  return (
    <div className="min-h-screen relative">
      <StickyProfileBar
        profile={profile}
        unreadMessages={unreadMessages}
        calendarData={calendarData}
        theme={sectionThemes[activeSection] || currentTheme}
      />

      <SectionNavBar
        activeSectionId={activeSection}
        sectionThemes={sectionThemes}
        onSectionClick={handleSectionClick}
      />

      {/* === DASHBOARD OVERVIEW === */}
      <DashboardSection ref={setSectionRef('dashboard')} id="dashboard" theme={sectionThemes['dashboard']}>
        <DashboardOverviewSection
          theme={sectionThemes['dashboard']}
          profile={profile}
          calendarData={calendarData}
          stats={stats}
          unreadMessages={unreadMessages}
          communityUnread={communityUnread}
        />
      </DashboardSection>

      {/* === INTERSTITIAL: Tribal Orchards + Live Feed === */}
      <div className="px-4 max-w-md mx-auto">
        <MemryFeedCarousel variant="orchards" />
        <MemryFeedCarousel variant="live" />
      </div>

      {/* === CHATAPP SECTION === */}
      <DashboardSection ref={setSectionRef('chatapp')} id="chatapp" theme={sectionThemes['chatapp']}>
        <ChatAppSection theme={sectionThemes['chatapp']} />
      </DashboardSection>

      {/* === S2G MEMRY SECTION === */}
      <DashboardSection ref={setSectionRef('memry')} id="memry" theme={sectionThemes['memry']}>
        <MemrySection theme={sectionThemes['memry']} />
      </DashboardSection>

      {/* === INTERSTITIAL: Tribal Music === */}
      <div className="px-4 max-w-md mx-auto">
        <MemryFeedCarousel variant="music" />
      </div>

      {/* === 364YHVH DAYS SECTION === */}
      <DashboardSection ref={setSectionRef('364yhvh')} id="364yhvh" theme={sectionThemes['364yhvh']}>
        <YhvhDaysSection
          theme={sectionThemes['364yhvh']}
          calendarData={calendarData}
          currentTime={currentTime}
          communityUnread={communityUnread}
        />
      </DashboardSection>

      {/* === INTERSTITIAL: Tribal Library === */}
      <div className="px-4 max-w-md mx-auto">
        <MemryFeedCarousel variant="library" />
      </div>

      {/* === MY GARDEN SECTION === */}
      <DashboardSection ref={setSectionRef('garden')} id="garden" theme={sectionThemes['garden']}>
        <MyGardenSection theme={sectionThemes['garden']} stats={stats} />
      </DashboardSection>

      {/* === INTERSTITIAL: Tribal Biz Ads === */}
      <div className="px-4 max-w-md mx-auto">
        <MemryFeedCarousel variant="bizads" />
      </div>

      {/* === LET IT RAIN SECTION === */}
      <DashboardSection ref={setSectionRef('letitrain')} id="letitrain" theme={sectionThemes['letitrain']}>
        <LetItRainSection theme={sectionThemes['letitrain']} />
      </DashboardSection>

      {/* === GOSAT'S SECTION === */}
      <DashboardSection ref={setSectionRef('gosats')} id="gosats" theme={sectionThemes['gosats']} className="pb-24">
        <GosatsSection theme={sectionThemes['gosats']} />
      </DashboardSection>

      {/* Go Live FAB */}
      <GoLiveFAB />

      {/* Quick Connect Chat FAB */}
      <motion.button
        onClick={() => setChatDrawerOpen(true)}
        className="fixed bottom-[88px] right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg backdrop-blur-md border border-primary/20"
        style={{
          backgroundColor: (sectionThemes[activeSection] || currentTheme).accent,
          color: 'white',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-bold">Chat</span>
      </motion.button>

      {/* Private Chats Drawer (overlay on feed) */}
      <PrivateChatsDrawer isOpen={chatDrawerOpen} onClose={() => setChatDrawerOpen(false)} />

      <BottomActionBar theme={sectionThemes[activeSection] || currentTheme} />
      <div className="hidden sm:block">
        <StatsFloatingButton theme={sectionThemes[activeSection] || currentTheme} />
      </div>
    </div>
  );
};
