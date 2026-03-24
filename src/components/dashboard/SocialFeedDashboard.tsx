import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StickyProfileBar } from './StickyProfileBar';
import { BottomActionBar } from './BottomActionBar';
import { StatsFloatingButton } from './StatsFloatingButton';

// Section system
import { SectionNavBar } from './SectionNavBar';
import { DashboardSection } from './DashboardSection';
import { DASHBOARD_SECTIONS, getAllSectionThemes } from './sectionConfig';
import { ChatAppSection } from './sections/ChatAppSection';
import { YhvhDaysSection } from './sections/YhvhDaysSection';
import { MyGardenSection } from './sections/MyGardenSection';
import { MemrySection } from './sections/MemrySection';

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
  const [activeSection, setActiveSection] = useState('chatapp');
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

      {/* === CHATAPP SECTION === */}
      <DashboardSection ref={setSectionRef('chatapp')} id="chatapp" theme={sectionThemes['chatapp']}>
        <ChatAppSection theme={sectionThemes['chatapp']} />
      </DashboardSection>

      {/* === 364YHVH DAYS SECTION === */}
      <DashboardSection ref={setSectionRef('364yhvh')} id="364yhvh" theme={sectionThemes['364yhvh']}>
        <YhvhDaysSection
          theme={sectionThemes['364yhvh']}
          calendarData={calendarData}
          currentTime={currentTime}
          communityUnread={communityUnread}
        />
      </DashboardSection>

      {/* === MY GARDEN SECTION === */}
      <DashboardSection ref={setSectionRef('garden')} id="garden" theme={sectionThemes['garden']}>
        <MyGardenSection theme={sectionThemes['garden']} stats={stats} />
      </DashboardSection>

      {/* === S2G MEMRY SECTION === */}
      <DashboardSection ref={setSectionRef('memry')} id="memry" theme={sectionThemes['memry']} className="pb-24">
        <MemrySection theme={sectionThemes['memry']} />
      </DashboardSection>

      <BottomActionBar theme={sectionThemes[activeSection] || currentTheme} />
      <div className="hidden sm:block">
        <StatsFloatingButton theme={sectionThemes[activeSection] || currentTheme} />
      </div>
    </div>
  );
};
