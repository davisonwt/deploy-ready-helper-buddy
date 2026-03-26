import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Play, Headphones, Music, BookOpen, Megaphone, TreePine } from 'lucide-react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export type CarouselVariant = 'orchards' | 'music' | 'library' | 'bizads' | 'live';

interface CarouselCard {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

const VARIANT_CONFIG: Record<CarouselVariant, {
  label: string;
  headerGradient: string;
  headerIcon: LucideIcon;
  feedLink: string;
  cards: CarouselCard[];
}> = {
  orchards: {
    label: 'S2G Memry — Tribal Orchards',
    headerGradient: 'linear-gradient(135deg, #7c2d12, #ea580c)',
    headerIcon: TreePine,
    feedLink: '/memry?filter=orchards',
    cards: [
      { id: '1', title: 'Trending Orchards', subtitle: 'Most visited this week', gradient: 'linear-gradient(135deg, #9a3412, #f97316)', icon: TreePine, href: '/memry?filter=orchards&sort=trending' },
      { id: '2', title: 'New Plantings', subtitle: 'Fresh orchards today', gradient: 'linear-gradient(135deg, #7c2d12, #ea580c)', icon: TreePine, href: '/memry?filter=orchards&sort=new' },
      { id: '3', title: 'Top Sowers', subtitle: 'Community favourites', gradient: 'linear-gradient(135deg, #92400e, #d97706)', icon: TreePine, href: '/memry?filter=orchards&sort=top' },
    ],
  },
  music: {
    label: 'S2G Memry — Tribal Music',
    headerGradient: 'linear-gradient(135deg, #581c87, #a855f7)',
    headerIcon: Music,
    feedLink: '/memry?filter=music',
    cards: [
      { id: '1', title: 'Now Playing', subtitle: 'Live community tracks', gradient: 'linear-gradient(135deg, #6b21a8, #c084fc)', icon: Headphones, href: '/grove-station', badge: '🎵 LIVE' },
      { id: '2', title: 'Fresh Drops', subtitle: 'New music this week', gradient: 'linear-gradient(135deg, #7e22ce, #a855f7)', icon: Music, href: '/memry?filter=music&sort=new' },
      { id: '3', title: 'Top Tracks', subtitle: 'Most bestowed songs', gradient: 'linear-gradient(135deg, #581c87, #9333ea)', icon: Music, href: '/memry?filter=music&sort=top' },
    ],
  },
  library: {
    label: 'S2G Memry — Tribal Library',
    headerGradient: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
    headerIcon: BookOpen,
    feedLink: '/memry?filter=library',
    cards: [
      { id: '1', title: 'E-Books', subtitle: 'Community publications', gradient: 'linear-gradient(135deg, #1e40af, #60a5fa)', icon: BookOpen, href: '/memry?filter=library&type=ebooks' },
      { id: '2', title: 'Study Guides', subtitle: 'Scriptural resources', gradient: 'linear-gradient(135deg, #1d4ed8, #93c5fd)', icon: BookOpen, href: '/memry?filter=library&type=guides' },
      { id: '3', title: 'Recipes', subtitle: 'Community cooking', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', icon: BookOpen, href: '/memry?filter=library&type=recipes' },
    ],
  },
  bizads: {
    label: 'S2G Memry — Tribal Biz Ads',
    headerGradient: 'linear-gradient(135deg, #78350f, #d97706)',
    headerIcon: Megaphone,
    feedLink: '/memry?filter=ads',
    cards: [
      { id: '1', title: 'Featured Ads', subtitle: 'Top sower promotions', gradient: 'linear-gradient(135deg, #92400e, #f59e0b)', icon: Megaphone, href: '/memry?filter=ads&sort=featured' },
      { id: '2', title: 'New Listings', subtitle: 'Fresh business ads', gradient: 'linear-gradient(135deg, #78350f, #d97706)', icon: Megaphone, href: '/memry?filter=ads&sort=new' },
      { id: '3', title: 'Local Services', subtitle: 'Near your area', gradient: 'linear-gradient(135deg, #b45309, #fbbf24)', icon: Megaphone, href: '/community-services' },
    ],
  },
  live: {
    label: 'Live Now',
    headerGradient: 'linear-gradient(135deg, #dc2626, #f43f5e)',
    headerIcon: Play,
    feedLink: '/communications',
    cards: [
      { id: '1', title: 'Live Classrooms', subtitle: 'Join a session', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', icon: Play, href: '/explore-sessions?type=classroom', badge: '● LIVE' },
      { id: '2', title: 'Live SkillDrop', subtitle: 'Learn something new', gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)', icon: Play, href: '/explore-sessions?type=skilldrop', badge: '● LIVE' },
      { id: '3', title: 'Live Radio', subtitle: 'Tune in now', gradient: 'linear-gradient(135deg, #db2777, #ef4444)', icon: Headphones, href: '/grove-station', badge: '🎙 ON AIR' },
    ],
  },
};

interface MemryFeedCarouselProps {
  variant: CarouselVariant;
}

export const MemryFeedCarousel: React.FC<MemryFeedCarouselProps> = ({ variant }) => {
  const config = VARIANT_CONFIG[variant];

  return (
    <div className="py-3">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: config.headerGradient }}
          >
            <config.headerIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold text-white/90">{config.label}</span>
        </div>
        <Link
          to={config.feedLink}
          className="text-[10px] font-semibold flex items-center gap-0.5 text-white/60 hover:text-white/90 transition-colors"
        >
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {config.cards.map((card) => (
          <motion.div
            key={card.id}
            whileTap={{ scale: 0.96 }}
            className="snap-start flex-shrink-0 w-[160px]"
          >
            <Link
              to={card.href}
              className="block rounded-2xl p-4 shadow-lg relative overflow-hidden h-[120px]"
              style={{ background: card.gradient }}
            >
              {card.badge && (
                <span className="absolute top-2 right-2 bg-white/25 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  {card.badge}
                </span>
              )}
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-white text-xs leading-tight">{card.title}</h4>
              <p className="text-[9px] text-white/60 mt-0.5">{card.subtitle}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
