import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Sprout, TreePine, MessageSquare, Calendar,
  CloudRain, Settings, Users, BarChart3, Sparkles, Film, Bot, Heart
} from 'lucide-react';
import { useTribalHeartsAccess } from '@/hooks/useTribalHeartsAccess';
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

const heartsItem = { to: '/tribal-hearts', label: 'Tribal Hearts', desc: 'Garden of connections', icon: Heart, gradient: 'linear-gradient(135deg, #E8537A, #5A9E1E)' };

const adminItems = [
  { to: '/admin/dashboard', label: "GoSat's", desc: 'Admin dashboard', icon: Settings, gradient: 'linear-gradient(135deg, #BA7517, #D4952A)' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ radioLive, userProfile }) => {
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const { isGosat, isAdmin } = useRoles();
  const { hasAccess: hasHeartsAccess } = useTribalHeartsAccess();
  const visibleNavItems = hasHeartsAccess ? [...navItems, heartsItem] : navItems;
  const initials = (userProfile?.display_name || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden py-4">
      {/* Logo + User */}
      <div className="mb-5 shrink-0 px-3">
        <NavLink to="/dashboard" className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-foreground">Sow2Grow</span>
            <span className="text-[10px] text-muted-foreground">364yhvh community farm</span>
          </div>
        </NavLink>
        <div className="flex items-center gap-2 px-1">
          <Avatar className="h-7 w-7">
            {userProfile?.avatar_url && <AvatarImage src={userProfile.avatar_url} />}
            <AvatarFallback className="bg-primary/20 text-[10px] text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-foreground">{userProfile?.display_name || 'Keeper'}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        <div className="flex min-h-full flex-col pb-28">
          <nav className="space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-xl p-2.5 transition-all',
                    'hover:scale-[1.02] hover:shadow-lg',
                    isActive ? 'ring-2 ring-white/30 shadow-lg' : 'opacity-85 hover:opacity-100'
                  )}
                  style={{ background: item.gradient }}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <Icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="min-w-0 flex flex-col leading-tight">
                    <span className="truncate text-[13px] font-bold text-white">{item.label}</span>
                    <span className="truncate text-[10px] text-white/70">{item.desc}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {(isGosat || isAdmin) && (
            <div className="mt-auto space-y-2 border-t border-border/20 pt-3">
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 rounded-xl p-2.5 transition-all',
                      'hover:scale-[1.02] hover:shadow-lg',
                      isActive ? 'ring-2 ring-white/30 shadow-lg' : 'opacity-85 hover:opacity-100'
                    )}
                    style={{ background: item.gradient }}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="min-w-0 flex flex-col leading-tight">
                      <span className="truncate text-[13px] font-bold text-white">{item.label}</span>
                      <span className="truncate text-[10px] text-white/70">{item.desc}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PlantModal open={plantModalOpen} onOpenChange={setPlantModalOpen} />
    </div>
  );
};
