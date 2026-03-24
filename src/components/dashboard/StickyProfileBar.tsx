import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardTheme } from '@/utils/dashboardThemes';

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
  theme: DashboardTheme;
}

export const StickyProfileBar: React.FC<StickyProfileBarProps> = ({
  profile,
  unreadMessages,
  calendarData,
  theme,
}) => {
  const displayName = profile?.first_name || profile?.display_name || 'Friend';

  return (
    <div
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-2.5">
        {/* Left: Avatar + Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/profile">
            <Avatar
              className="w-9 h-9 border-2 ring-2"
              style={{
                borderColor: theme.accent + '66',
                boxShadow: `0 0 0 2px ${theme.accent}33`,
              }}
            >
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback
                className="text-sm font-bold"
                style={{ backgroundColor: theme.accent + '20', color: theme.textPrimary }}
              >
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>
              Shalom, {displayName} 🌱
            </p>
            {calendarData && (
              <p className="text-[10px] truncate" style={{ color: theme.textSecondary }}>
                Year {calendarData.year} • Month {calendarData.month} • Day {calendarData.dayOfMonth}
              </p>
            )}
          </div>
        </div>

        {/* Right: Notifications + Settings */}
        <div className="flex items-center gap-1">
          <Link
            to="/communications-hub"
            className="relative p-2 rounded-full transition-colors"
            style={{ color: theme.textSecondary }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.secondaryButton; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Bell className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
                style={{ backgroundColor: theme.accent, color: theme.textPrimary }}
              >
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="p-2 rounded-full transition-colors"
            style={{ color: theme.textSecondary }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.secondaryButton; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
