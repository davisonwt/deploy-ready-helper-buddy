import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StickyProfileBarProps {
  profile: {
    display_name?: string;
    first_name?: string;
    avatar_url?: string;
  } | null;
  unreadMessages: number;
  calendarData: {
    year: number;
    month: number;
    dayOfMonth: number;
    weekday: number;
    season: string;
  } | null;
}

export const StickyProfileBar: React.FC<StickyProfileBarProps> = ({
  profile,
  unreadMessages,
  calendarData,
}) => {
  const displayName = profile?.first_name || profile?.display_name || 'Friend';

  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/20"
      style={{ backgroundColor: 'hsl(210 67% 12% / 0.92)' }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-2.5">
        {/* Left: Avatar + Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/profile">
            <Avatar className="w-9 h-9 border-2 border-primary/40 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-foreground text-sm font-bold">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              Shalom, {displayName} 🌱
            </p>
            {calendarData && (
              <p className="text-[10px] text-muted-foreground truncate">
                Year {calendarData.year} • Month {calendarData.month} • Day {calendarData.dayOfMonth}
              </p>
            )}
          </div>
        </div>

        {/* Right: Notifications + Settings */}
        <div className="flex items-center gap-1">
          <Link
            to="/communications-hub"
            className="relative p-2 rounded-full hover:bg-card/50 transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="p-2 rounded-full hover:bg-card/50 transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
};
