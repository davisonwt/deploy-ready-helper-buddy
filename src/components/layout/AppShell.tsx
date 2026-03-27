import React, { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSidebar } from './AppSidebar';
import { RightContextPanel } from './RightContextPanel';
import { MobileBottomTabs } from './MobileBottomTabs';

interface AppShellProps {
  children: ReactNode;
  calendarData?: any;
  communityCount?: number;
  radioLive?: boolean;
  radioListeners?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  calendarData,
  communityCount = 0,
  radioLive = false,
  radioListeners = 0,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>
        <MobileBottomTabs radioLive={radioLive} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar — fixed 220px */}
      <aside className="w-[220px] flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-border/30 bg-card/60">
        <AppSidebar radioLive={radioLive} />
      </aside>

      {/* Center — flexible */}
      <main className="flex-1 min-w-0 overflow-auto h-screen">
        {children}
      </main>

      {/* Right Panel — fixed 200px */}
      <aside className="w-[200px] flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-border/30 bg-card/40">
        <RightContextPanel
          calendarData={calendarData}
          communityCount={communityCount}
          radioLive={radioLive}
          radioListeners={radioListeners}
        />
      </aside>
    </div>
  );
};
