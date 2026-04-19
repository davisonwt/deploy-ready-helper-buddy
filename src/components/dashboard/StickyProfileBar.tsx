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
      className="sticky top-0 z-40 elev-sticky grain-overlay"
      style={{ borderColor: theme.cardBorder }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Left: Avatar + Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/profile" className="relative">
            <span
              aria-hidden
              className="absolute inset-0 -m-[3px] rounded-full opacity-80"
              style={{
                background: `conic-gradient(from 140deg, ${theme.accent}, hsl(var(--amber-500)), ${theme.accent})`,
                filter: 'blur(2px)',
              }}
            />
            <Avatar className="relative w-10 h-10 ring-2 ring-background">
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
            <p className="font-display text-[17px] leading-tight truncate" style={{ color: theme.textPrimary }}>
              Shalom, <span className="text-gold-gradient font-medium">{displayName}</span> 🌱
            </p>
            {calendarData && (
              <p className="text-[10px] tracking-wide uppercase mt-0.5 truncate" style={{ color: theme.textSecondary, opacity: 0.85 }}>
                Year {calendarData.year} · Month {calendarData.month} · Day {calendarData.dayOfMonth}
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
