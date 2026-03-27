import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Sprout, TreePine, MessageSquare, GraduationCap,
  Zap, Radio, Calendar, CloudRain, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  radioLive?: boolean;
}

const navItems = [
  { to: '/dashboard', label: 'Feed', icon: Home },
  { to: '/my-orchards', label: 'My Garden', icon: Sprout },
  { to: '/browse-orchards', label: 'Orchards', icon: TreePine },
  { to: '/communications-hub', label: 'ChatApp', icon: MessageSquare },
  { to: '/explore-sessions?type=classroom', label: 'Classrooms', icon: GraduationCap },
  { to: '/explore-sessions?type=skilldrop', label: 'SkillDrop', icon: Zap },
  { to: '/grove-station', label: 'Radio', icon: Radio, liveIndicator: true },
  { to: '/enochian-calendar-design', label: '364yhvh Days', icon: Calendar },
  { to: '/tithing', label: 'Let It Rain', icon: CloudRain },
];

const adminItems = [
  { to: '/admin/analytics', label: "GoSat's", icon: Settings },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ radioLive }) => {
  return (
    <div className="flex flex-col h-full py-4">
      {/* Logo */}
      <div className="px-4 mb-6">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-primary" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">
            Sow2Grow
          </span>
        </NavLink>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'hover:bg-accent/10 hover:text-foreground',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="w-[18px] h-[18px]" />
                {item.liveIndicator && radioLive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin section */}
      <div className="px-2 pt-2 border-t border-border/20 mt-2">
        {adminItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'hover:bg-accent/10 hover:text-foreground',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
