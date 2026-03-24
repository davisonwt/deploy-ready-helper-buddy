import React from 'react';
import { FeedItemCard, DashboardFeedItem } from './FeedItemCard';
import { StickyProfileBar } from './StickyProfileBar';
import { BottomActionBar } from './BottomActionBar';
import { StatsCards } from './StatsCards';
import { TopSowersTeaser } from './TopSowersTeaser';
import { SeedEngagementWidget } from './SeedEngagementWidget';
import { SabbathDashboardBanner } from '@/components/SabbathDashboardBanner';
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert';
import { WalletSetupPrompt } from '@/components/wallet/WalletSetupPrompt';
import { SowerBalanceCard } from '@/components/wallet/SowerBalanceCard';
import WeatherWidget from '@/components/weather/WeatherWidget';
import LiveTimezoneDisplay from '@/components/dashboard/LiveTimezoneDisplay';
import { DailyPlantingTip } from '@/components/garden/DailyPlantingTip';
import { StatsFloatingButton } from './StatsFloatingButton';
import { getDayInfo } from '@/utils/sacredCalendar';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Music, BookOpen, Megaphone, Car, Wrench } from 'lucide-react';

interface SocialFeedDashboardProps {
  profile: any;
  calendarData: any;
  stats: any;
  unreadMessages: number;
  communityUnread: number;
  currentTheme: any;
  currentTime: Date;
  user: any;
}

export const SocialFeedDashboard: React.FC<SocialFeedDashboardProps> = ({
  profile,
  calendarData,
  stats,
  unreadMessages,
  communityUnread,
  currentTheme,
  currentTime,
  user,
}) => {
  // Build feed items sorted by priority
  const feedItems: DashboardFeedItem[] = [];
  let idx = 0;

  // 1. Security + Sabbath (priority 0 — always top)
  feedItems.push({
    id: 'alerts',
    type: 'stat-summary',
    priority: 0,
    title: 'Alerts',
    children: (
      <div className="space-y-2">
        <SecurityQuestionsAlert />
        <SabbathDashboardBanner />
      </div>
    ),
  });

  // 2. Wallet setup (priority 1)
  feedItems.push({
    id: 'wallet-setup',
    type: 'earnings',
    priority: 1,
    title: 'Wallet',
    emoji: '💰',
    subtitle: 'Your balance & setup',
    children: (
      <div className="space-y-3">
        <WalletSetupPrompt variant="card" />
        <SowerBalanceCard compact />
      </div>
    ),
  });

  // 3. Stats strip (priority 2)
  feedItems.push({
    id: 'stats',
    type: 'stat-summary',
    priority: 2,
    title: 'Your Garden',
    emoji: '📊',
    subtitle: `${stats.totalFollowers} followers · ${stats.totalOrchards} seeds · ${stats.totalBestowals} bestowals`,
    children: <StatsCards theme={currentTheme} />,
  });

  // 4. Calendar note (priority 3)
  if (calendarData) {
    const dayInfo = getDayInfo(calendarData.dayOfYear);
    feedItems.push({
      id: 'calendar',
      type: 'calendar-note',
      priority: 3,
      title: `Day ${calendarData.dayOfMonth}, Month ${calendarData.month}`,
      emoji: '📅',
      subtitle: calendarData.season,
      linkTo: '/profile?tab=journal',
      children: (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Weekday {calendarData.weekday} • Part {calendarData.part}/18 • Day {calendarData.dayOfYear} of 364
          </p>
          {dayInfo?.feastName && (
            <p className="text-xs text-foreground/80 italic line-clamp-2">
              {dayInfo.feastName}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            {currentTime.toLocaleString(undefined, {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      ),
    });
  }

  // 5. Weather (priority 4)
  feedItems.push({
    id: 'weather',
    type: 'weather',
    priority: 4,
    title: 'Weather',
    emoji: '🌤️',
    subtitle: 'Your local conditions',
    linkTo: '/weather',
    children: (
      <div>
        <WeatherWidget compact />
        <DailyPlantingTip currentTheme={currentTheme} />
      </div>
    ),
  });

  // 6. Top Sowers (priority 5)
  feedItems.push({
    id: 'top-sowers',
    type: 'social-proof',
    priority: 5,
    title: 'Top Sowers',
    emoji: '🏆',
    subtitle: 'Community leaders this week',
    children: <TopSowersTeaser theme={currentTheme} />,
  });

  // 7. Engagement (priority 6)
  feedItems.push({
    id: 'engagement',
    type: 'engagement',
    priority: 6,
    title: 'Seed Engagement',
    emoji: '❤️',
    subtitle: 'Loves & comments on your seeds',
    children: <SeedEngagementWidget theme={currentTheme} />,
  });

  // 8. Community Chat (priority 7)
  feedItems.push({
    id: 'community-chat',
    type: 'community-chat',
    priority: 7,
    title: 'Community ChatApp',
    emoji: '💬',
    subtitle: communityUnread > 0 ? `${communityUnread} new messages` : 'Join the conversation',
    linkTo: '/community-chat',
    children: (
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-xs text-foreground/80">
          {communityUnread > 0 ? `${communityUnread} unread` : 'Tap to join'}
        </span>
        {communityUnread > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
            {communityUnread}
          </span>
        )}
      </div>
    ),
  });

  // 9. Timezone (priority 8)
  feedItems.push({
    id: 'timezone',
    type: 'stat-summary',
    priority: 8,
    title: 'Global Time Zones',
    emoji: '🌍',
    linkTo: '/grove-station',
    children: <LiveTimezoneDisplay />,
  });

  // 10. Explore links (priority 9)
  feedItems.push({
    id: 'explore',
    type: 'promo',
    priority: 9,
    title: 'Explore',
    emoji: '🔮',
    subtitle: 'Discover more on S2G',
    children: (
      <div className="grid grid-cols-3 gap-2">
        <Link to="/364ttt">
          <Button size="sm" className="w-full rounded-xl text-[10px] font-bold gap-1 h-10" variant="secondary">
            <Music className="w-3.5 h-3.5" /> 364 TTT
          </Button>
        </Link>
        <Link to="/profile?tab=journal">
          <Button size="sm" className="w-full rounded-xl text-[10px] font-bold gap-1 h-10" variant="secondary">
            <BookOpen className="w-3.5 h-3.5" /> Journal
          </Button>
        </Link>
        <Link to="/communications-hub">
          <Button size="sm" className="w-full rounded-xl text-[10px] font-bold gap-1 h-10" variant="secondary">
            <MessageSquare className="w-3.5 h-3.5" /> Hub
          </Button>
        </Link>
      </div>
    ),
  });

  // 11. Join our team — promo (priority 10, shown at bottom)
  feedItems.push({
    id: 'join-team',
    type: 'promo',
    priority: 10,
    title: 'Join Our Team',
    emoji: '🌱',
    subtitle: 'Help grow the S2G community',
    children: (
      <div className="grid grid-cols-3 gap-2">
        <Link to="/become-whisperer">
          <Button size="sm" className="w-full rounded-xl text-[10px] font-bold gap-1 h-10" variant="secondary">
            <Megaphone className="w-3.5 h-3.5" /> Whisperer
          </Button>
        </Link>
        <Link to="/register-vehicle">
          <Button size="sm" className="w-full rounded-xl text-[10px] font-bold gap-1 h-10" variant="secondary">
            <Car className="w-3.5 h-3.5" /> Driver
          </Button>
        </Link>
        <Link to="/register-services">
          <Button size="sm" className="w-full rounded-xl text-[10px] font-bold gap-1 h-10" variant="secondary">
            <Wrench className="w-3.5 h-3.5" /> Services
          </Button>
        </Link>
      </div>
    ),
  });

  // Sort by priority
  feedItems.sort((a, b) => a.priority - b.priority);

  return (
    <div className="min-h-screen relative" style={{ background: currentTheme.background }}>
      {/* Sticky Profile Bar */}
      <StickyProfileBar
        profile={profile}
        unreadMessages={unreadMessages}
        calendarData={calendarData}
        theme={currentTheme}
      />

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-3 py-4 pb-24 space-y-3">
        {feedItems.map((item, i) => (
          <FeedItemCard key={item.id} item={item} index={i} theme={currentTheme} />
        ))}
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar />

      {/* Live Activities floating button */}
      <div className="hidden sm:block">
        <StatsFloatingButton theme={currentTheme} />
      </div>
    </div>
  );
};
