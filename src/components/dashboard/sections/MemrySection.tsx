import React from 'react';
import { Camera, ChevronRight, User, Building2, Megaphone, Video, Ear, Car, Wrench, CalendarPlus, HandHeart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { GradientGatewayCard } from './GradientGatewayCard';
import { BrowseSection } from './BrowseSection';
import { ExploreSection } from './ExploreSection';
import { KeeperHelpButton } from './KeeperHelpButton';
import { GigActionCards } from './GigActionCards';
import { PlantFeedCards } from './PlantFeedCards';

interface MemrySectionProps {
  theme: DashboardTheme;
}

const memryCards = [
  { href: '/memry?filter=individuals', title: 'Individuals', subtitle: 'Discover sowers', icon: User, gradient: 'linear-gradient(135deg, #ea580c, #f97316)' },
  { href: '/memry?filter=companies', title: 'Companies', subtitle: 'Browse businesses', icon: Building2, gradient: 'linear-gradient(135deg, #dc2626, #f97316)' },
  { href: '/memry?filter=ads', title: 'Ads', subtitle: 'Community adverts', icon: Megaphone, gradient: 'linear-gradient(135deg, #db2777, #f43f5e)' },
  { href: '/memry?filter=videos', title: 'Home Videos', subtitle: 'Community content', icon: Video, gradient: 'linear-gradient(135deg, #e11d48, #be185d)' },
  { href: '/community-whisperers', title: 'Whisperers', subtitle: 'Prayer & support', icon: Ear, gradient: 'linear-gradient(135deg, #a21caf, #db2777)' },
  { href: '/community-drivers', title: 'Drivers', subtitle: 'Community transport', icon: Car, gradient: 'linear-gradient(135deg, #d97706, #ea580c)' },
  { href: '/community-services', title: 'Services', subtitle: 'Local offerings', icon: Wrench, gradient: 'linear-gradient(135deg, #b45309, #d97706)' },
];

export const MemrySection: React.FC<MemrySectionProps> = ({ theme }) => {
  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
            <Camera className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
              S2G Memry
            </h2>
            <p className="text-[10px]" style={{ color: theme.textSecondary }}>
              Discover & browse all feeds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <KeeperHelpButton sectionName="S2G Memry" />
          <Link to="/memry" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
            Open Feed <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Sub-Category Cards */}
      <div className="grid grid-cols-2 gap-3">
        {memryCards.slice(0, 6).map((card) => (
          <GradientGatewayCard key={card.title} {...card} />
        ))}
      </div>
      <GradientGatewayCard {...memryCards[6]} className="w-full" />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      {/* === GIG ECONOMY: Book & Become === */}
      <GigActionCards theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      {/* Browse Orchards */}
      <BrowseSection theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      {/* Explore & Quick Paths */}
      <ExploreSection theme={theme} />
    </div>
  );
};
