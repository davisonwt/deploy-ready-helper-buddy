import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Sprout, TreePine, MessageSquare, Calendar,
  CloudRain, Settings, Users, BarChart3, Sparkles, Film, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlantModal } from '@/components/grove/PlantModal';
import { useRoles } from '@/hooks/useRoles';

interface AppSidebarProps {
  radioLive?: boolean;
  userProfile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

const navItems = [
  { to: '/dashboard', label: 'Feed', desc: 'Community updates', icon: Home, gradient: 'linear-gradient(135deg, #185FA5, #2E86DE)' },
  { to: '/my-orchards', label: 'My Garden', desc: 'Your seeds & orchards', icon: Sprout, gradient: 'linear-gradient(135deg, #3B6D11, #5A9E1E)' },
  { to: '/browse-orchards', label: 'Tribal Gardens', desc: 'All tribal seeds & orchards', icon: TreePine, gradient: 'linear-gradient(135deg, #0F6E56, #1DAA85)' },
  { to: '/communications-hub', label: 'ChatApp', desc: 'Tribe messaging', icon: MessageSquare, gradient: 'linear-gradient(135deg, #1D9E75, #34D399)' },
  { to: '/enochian-calendar-design', label: '364yhvh', desc: "Scripture & spiritual hub", icon: Calendar, gradient: 'linear-gradient(135deg, #3C3489, #6355C7)' },
  { to: '/tithing', label: 'Let It Rain', desc: 'Bestow blessings', icon: CloudRain, gradient: 'linear-gradient(135deg, #533AB7, #8B5CF6)' },
  { to: '/my-s2g-tribe', label: 'My Tribe', desc: 'Invite & grow your tribe', icon: Users, gradient: 'linear-gradient(135deg, #0E7490, #22D3EE)' },
  { to: '/marketing-videos', label: 'Marketing Videos', desc: 'Share videos with your code', icon: Film, gradient: 'linear-gradient(135deg, #B85042, #D4A843)' },
  { to: '/s2g-agents', label: 'S2G Agents', desc: 'Your tribal AI workforce', icon: Bot, gradient: 'linear-gradient(135deg, #1F2937, #4B5563)' },
  { to: '/stats', label: 'Stats', desc: 'Your progress & stats', icon: BarChart3, gradient: 'linear-gradient(135deg, #1E6A5A, #2DA88A)' },
  { to: '/tribe-ambassador', label: 'Ambassador', desc: 'Join the inner circle', icon: Sparkles, gradient: 'linear-gradient(135deg, #0d9488, #f59e0b)' },
];

const adminItems = [
  { to: '/admin/dashboard', label: "GoSat's", desc: 'Admin dashboard', icon: Settings, gradient: 'linear-gradient(135deg, #BA7517, #D4952A)' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ radioLive, userProfile }) => {
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const { isGosat, isAdmin } = useRoles();
  const initials = (userProfile?.display_name || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col py-4 overflow-hidden">
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

      {/* Nav Items — gradient cards */}
      <nav className="px-2 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 p-2.5 rounded-xl transition-all',
                'hover:scale-[1.02] hover:shadow-lg',
                isActive ? 'ring-2 ring-white/30 shadow-lg' : 'opacity-85 hover:opacity-100'
              )}
              style={{ background: item.gradient }}
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-bold text-white truncate">{item.label}</span>
                <span className="text-[10px] text-white/70 truncate">{item.desc}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin — only visible for GoSat/Admin roles */}
      {(isGosat || isAdmin) && (
        <div className="px-2 pt-3 mt-auto border-t border-border/20 space-y-2">
          {adminItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 p-2.5 rounded-xl transition-all',
                  'hover:scale-[1.02] hover:shadow-lg',
                  isActive ? 'ring-2 ring-white/30 shadow-lg' : 'opacity-85 hover:opacity-100'
                )}
                style={{ background: item.gradient }}
              >
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[13px] font-bold text-white truncate">{item.label}</span>
                  <span className="text-[10px] text-white/70 truncate">{item.desc}</span>
                </div>
              </NavLink>
            );
          })}
        </div>
      )}

      <PlantModal open={plantModalOpen} onOpenChange={setPlantModalOpen} />
    </div>
  );
};
