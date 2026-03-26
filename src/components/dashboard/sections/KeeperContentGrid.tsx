import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TreePine, Leaf, Music, BookOpen, Megaphone, Video, ChefHat, Grid3X3, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { LucideIcon } from 'lucide-react';

interface KeeperContentGridProps {
  theme: DashboardTheme;
  variant: 'personal' | 'tribal';
}

interface GridItem {
  label: string;
  icon: LucideIcon;
  href: string;
  gradient: string;
  count?: number;
}

const personalItems: GridItem[] = [
  { label: 'Orchards', icon: TreePine, href: '/my-orchards', gradient: 'linear-gradient(135deg, #166534, #22c55e)' },
  { label: 'Seeds', icon: Leaf, href: '/my-seeds', gradient: 'linear-gradient(135deg, #15803d, #4ade80)' },
  { label: 'Music', icon: Music, href: '/my-music', gradient: 'linear-gradient(135deg, #581c87, #a855f7)' },
  { label: 'Library', icon: BookOpen, href: '/my-library', gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)' },
  { label: 'Biz Ads', icon: Megaphone, href: '/my-ads', gradient: 'linear-gradient(135deg, #92400e, #f59e0b)' },
  { label: 'Videos', icon: Video, href: '/my-videos', gradient: 'linear-gradient(135deg, #be123c, #f43f5e)' },
];

const tribalItems: GridItem[] = [
  { label: 'Orchards', icon: TreePine, href: '/memry?filter=orchards', gradient: 'linear-gradient(135deg, #14532d, #16a34a)' },
  { label: 'Seeds', icon: Leaf, href: '/memry?filter=seeds', gradient: 'linear-gradient(135deg, #064e3b, #10b981)' },
  { label: 'Music', icon: Music, href: '/memry?filter=music', gradient: 'linear-gradient(135deg, #6b21a8, #c084fc)' },
  { label: 'Library', icon: BookOpen, href: '/memry?filter=library', gradient: 'linear-gradient(135deg, #1d4ed8, #60a5fa)' },
  { label: 'Biz Ads', icon: Megaphone, href: '/memry?filter=ads', gradient: 'linear-gradient(135deg, #78350f, #d97706)' },
  { label: 'Videos', icon: Video, href: '/memry?filter=videos', gradient: 'linear-gradient(135deg, #9f1239, #e11d48)' },
  { label: 'Cooking', icon: ChefHat, href: '/memry?filter=cooking', gradient: 'linear-gradient(135deg, #9a3412, #ea580c)' },
];

export const KeeperContentGrid: React.FC<KeeperContentGridProps> = ({ theme, variant }) => {
  const [expanded, setExpanded] = useState(false);
  const items = variant === 'personal' ? personalItems : tribalItems;
  const title = variant === 'personal' ? 'My Content Grid' : 'S2G Tribal Content';

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all"
        style={{ background: theme.secondaryButton }}
      >
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4" style={{ color: theme.accent }} />
          <span className="font-bold text-sm" style={{ color: theme.textPrimary }}>
            {title}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: theme.textSecondary }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: theme.textSecondary }} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 mt-3">
              {items.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="rounded-xl aspect-square flex flex-col items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: item.gradient }}
                >
                  <item.icon className="w-6 h-6 text-white/90" />
                  <span className="text-[9px] font-bold text-white/80">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full text-white/70">
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
