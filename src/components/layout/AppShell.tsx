import React, { ReactNode, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSidebar } from './AppSidebar';
import { RightContextPanel } from './RightContextPanel';
import { MobileBottomTabs } from './MobileBottomTabs';
import { GoLiveFAB } from '../dashboard/GoLiveFAB';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu, Users } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
  calendarData?: any;
  communityCount?: number;
  radioLive?: boolean;
  radioListeners?: number;
  hideGoLiveFAB?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  calendarData,
  communityCount = 0,
  radioLive = false,
  radioListeners = 0,
  hideGoLiveFAB = false,
}) => {
  const isMobile = useIsMobile();

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile top bar with menu + tribes buttons */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-3 py-2 bg-card/95 backdrop-blur-xl border-b border-border/30">
          <button
            onClick={() => setLeftOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted/40 text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-foreground">S2G</span>
          <button
            onClick={() => setRightOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted/40 text-foreground"
            aria-label="Open tribes panel"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>

        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>
        <MobileBottomTabs radioLive={radioLive} />
        {!hideGoLiveFAB && <GoLiveFAB />}

        {/* Left drawer — full sidebar navigation */}
        <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0 bg-card overflow-y-auto">
            <div onClick={() => setLeftOpen(false)}>
              <AppSidebar radioLive={radioLive} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Right drawer — Tribes / community panel */}
        <Sheet open={rightOpen} onOpenChange={setRightOpen}>
          <SheetContent side="right" className="w-[85vw] max-w-[300px] p-0 bg-card overflow-y-auto">
            <RightContextPanel
              calendarData={calendarData}
              communityCount={communityCount}
              radioLive={radioLive}
              radioListeners={radioListeners}
            />
          </SheetContent>
        </Sheet>
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
      {!hideGoLiveFAB && <GoLiveFAB />}
    </div>
  );
};
