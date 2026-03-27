import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Sprout, TreePine, MessageSquare, GraduationCap,
  Zap, Radio, Calendar, CloudRain, Settings, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AppSidebarProps {
  radioLive?: boolean;
  userProfile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

const navItems = [
  { to: '/dashboard', label: 'Feed', icon: Home, color: '#185FA5' },
  { to: '/my-orchards', label: 'My Garden', icon: Sprout, color: '#3B6D11' },
  { to: '/browse-orchards', label: 'Orchards', icon: TreePine, color: '#0F6E56' },
  { to: '/communications-hub', label: 'ChatApp', icon: MessageSquare, color: '#1D9E75' },
  { to: '/explore-sessions?type=classroom', label: 'Classrooms', icon: GraduationCap, color: '#378ADD' },
  { to: '/explore-sessions?type=skilldrop', label: 'SkillDrop', icon: Zap, color: '#534AB7' },
  { to: '/grove-station', label: 'Radio', icon: Radio, color: '#E24B4A', liveIndicator: true },
  { to: '/enochian-calendar-design', label: '364yhvh Days', icon: Calendar, color: '#3C3489' },
  { to: '/tithing', label: 'Let It Rain', icon: CloudRain, color: '#533AB7' },
];

const adminItems = [
  { to: '/admin/analytics', label: "GoSat's", icon: Settings, color: '#BA7517' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ radioLive, userProfile }) => {
  const navigate = useNavigate();
  const initials = (userProfile?.display_name || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col h-full py-4">
      {/* Logo + User */}
      <div className="px-3 mb-5">
        <NavLink to="/dashboard" className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground tracking-tight">Sow2Grow</span>
            <span className="text-[10px] text-muted-foreground">364yhvh community farm</span>
          </div>
        </NavLink>
        {/* User row */}
        <div className="flex items-center gap-2 px-1">
          <Avatar className="w-7 h-7">
            {userProfile?.avatar_url && <AvatarImage src={userProfile.avatar_url} />}
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground truncate">{userProfile?.display_name || 'Keeper'}</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] transition-colors',
                'hover:bg-accent/10',
                isActive
                  ? 'font-medium'
                  : 'text-muted-foreground'
              )}
              style={({ isActive }) => isActive ? { backgroundColor: `${item.color}18` } : undefined}
            >
              <div
                className="relative w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: item.color }}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
                {item.liveIndicator && radioLive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-card" />
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin */}
      <div className="px-2 pt-2 border-t border-border/20 mt-1 space-y-1">
        {adminItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] transition-colors',
                'hover:bg-accent/10',
                isActive ? 'font-medium' : 'text-muted-foreground'
              )}
              style={({ isActive }) => isActive ? { backgroundColor: `${item.color}18` } : undefined}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: item.color }}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Plant Button */}
      <div className="px-2 pt-3">
        <button
          onClick={() => navigate('/create-orchard')}
          className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D9E75' }}
        >
          <Plus className="w-4 h-4" />
          Plant
        </button>
      </div>
    </div>
  );
};
