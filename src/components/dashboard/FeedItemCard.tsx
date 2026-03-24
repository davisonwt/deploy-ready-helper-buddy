import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Calendar, Cloud, Trophy, Heart, Megaphone, Users, Sprout, DollarSign, Radio, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  priority: number; // lower = higher in feed
  title: string;
  subtitle?: string;
  emoji?: string;
  linkTo?: string;
  children?: React.ReactNode;
  meta?: Record<string, any>;
}

const typeStyles: Record<DashboardFeedType, { icon: React.ReactNode; accent: string }> = {
  'stat-summary': { icon: <TrendingUp className="w-4 h-4" />, accent: 'hsl(188 78% 41%)' },
  'calendar-note': { icon: <Calendar className="w-4 h-4" />, accent: 'hsl(43 74% 66%)' },
  'weather': { icon: <Cloud className="w-4 h-4" />, accent: 'hsl(199 89% 50%)' },
  'social-proof': { icon: <Trophy className="w-4 h-4" />, accent: 'hsl(142 76% 36%)' },
  'engagement': { icon: <Heart className="w-4 h-4" />, accent: 'hsl(0 84% 60%)' },
  'promo': { icon: <Megaphone className="w-4 h-4" />, accent: 'hsl(270 75% 45%)' },
  'live-session': { icon: <Radio className="w-4 h-4" />, accent: 'hsl(0 84% 60%)' },
  'earnings': { icon: <DollarSign className="w-4 h-4" />, accent: 'hsl(142 76% 36%)' },
  'community-chat': { icon: <MessageSquare className="w-4 h-4" />, accent: 'hsl(33 100% 82%)' },
};

interface FeedItemCardProps {
  item: DashboardFeedItem;
  index: number;
}

export const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, index }) => {
  const style = typeStyles[item.type];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 250, damping: 28 }}
      className={cn(
        'rounded-2xl border border-border/20 overflow-hidden',
        'backdrop-blur-sm hover:border-primary/30 transition-all duration-300'
      )}
      style={{ backgroundColor: 'hsl(212 49% 24% / 0.7)' }}
    >
      {/* Header strip */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: style.accent + '20', color: style.accent }}
        >
          {item.emoji ? <span className="text-sm">{item.emoji}</span> : style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground truncate">{item.title}</h3>
          {item.subtitle && (
            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
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
