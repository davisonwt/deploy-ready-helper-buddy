import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sprout, MessageSquare, Radio, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, GraduationCap, Zap, Calendar, CloudRain, Settings, X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileBottomTabsProps {
  radioLive?: boolean;
}

const moreItems = [
  { to: '/browse-orchards', label: 'Orchards', icon: TreePine },
  { to: '/explore-sessions?type=classroom', label: 'Classrooms', icon: GraduationCap },
  { to: '/explore-sessions?type=skilldrop', label: 'SkillDrop', icon: Zap },
  { to: '/enochian-calendar-design', label: '364yhvh Days', icon: Calendar },
  { to: '/tithing', label: 'Let It Rain', icon: CloudRain },
  { to: '/admin/analytics', label: "GoSat's", icon: Settings },
];

export const MobileBottomTabs: React.FC<MobileBottomTabsProps> = ({ radioLive }) => {
  const [showMore, setShowMore] = useState(false);

  const tabs = [
    { to: '/dashboard', label: 'Feed', icon: Home },
    { to: '/my-orchards', label: 'Plant', icon: Sprout },
    { to: '/communications-hub', label: 'Chat', icon: MessageSquare },
    { to: '/grove-station', label: 'Radio', icon: Radio, live: true },
  ];

  return (
    <>
      {/* More overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 rounded-t-2xl p-4 pb-8"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-foreground">More</span>
                <button onClick={() => setShowMore(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMore(false)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-accent/10 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[52px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.live && radioLive && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-muted-foreground min-w-[52px]"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>
    </>
  );
};
