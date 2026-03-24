import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Calendar, Cloud, Trophy, Heart, Megaphone, Radio, DollarSign, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardTheme } from '@/utils/dashboardThemes';

export type DashboardFeedType =
  | 'stat-summary'
  | 'calendar-note'
  | 'weather'
  | 'social-proof'
  | 'engagement'
  | 'promo'
  | 'live-session'
  | 'earnings'
  | 'community-chat';

export interface DashboardFeedItem {
  id: string;
  type: DashboardFeedType;
  priority: number;
  title: string;
  subtitle?: string;
  emoji?: string;
  linkTo?: string;
  children?: React.ReactNode;
  meta?: Record<string, any>;
}

const typeIcons: Record<DashboardFeedType, React.ReactNode> = {
  'stat-summary': <TrendingUp className="w-4 h-4" />,
  'calendar-note': <Calendar className="w-4 h-4" />,
  'weather': <Cloud className="w-4 h-4" />,
  'social-proof': <Trophy className="w-4 h-4" />,
  'engagement': <Heart className="w-4 h-4" />,
  'promo': <Megaphone className="w-4 h-4" />,
  'live-session': <Radio className="w-4 h-4" />,
  'earnings': <DollarSign className="w-4 h-4" />,
  'community-chat': <MessageSquare className="w-4 h-4" />,
};

interface FeedItemCardProps {
  item: DashboardFeedItem;
  index: number;
  theme: DashboardTheme;
}

export const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, index, theme }) => {
  const icon = typeIcons[item.type];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 250, damping: 28 }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        'backdrop-blur-sm transition-all duration-300'
      )}
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
      }}
    >
      {/* Header strip */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: theme.accent + '20', color: theme.accent }}
        >
          {item.emoji ? <span className="text-sm">{item.emoji}</span> : icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold truncate" style={{ color: theme.textPrimary }}>
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-[11px] truncate" style={{ color: theme.textSecondary }}>
              {item.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      {item.children && (
        <div className="px-4 pb-3 pt-1">
          {item.children}
        </div>
      )}
    </motion.div>
  );

  if (item.linkTo) {
    return <Link to={item.linkTo} className="block no-underline">{content}</Link>;
  }

  return content;
};
