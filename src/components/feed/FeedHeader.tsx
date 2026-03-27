import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FeedHeaderProps {
  profile: any;
  calendarData: any;
  unreadMessages: number;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
  profile,
  calendarData,
  unreadMessages,
}) => {
  const displayName = profile?.first_name || profile?.display_name || 'Friend';

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/20">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/profile">
            <Avatar className="w-9 h-9 border-2 border-primary/30">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary">
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

        <div className="flex items-center gap-1">
          <Link
            to="/communications-hub"
            className="relative p-2 rounded-full hover:bg-accent/10 transition-colors text-muted-foreground"
          >
            <Bell className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="p-2 rounded-full hover:bg-accent/10 transition-colors text-muted-foreground"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
