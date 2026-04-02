import React from 'react';
import { Compass, Music, BookOpen, MessageSquare, Megaphone, Car, Wrench, BedDouble } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface ExploreSectionProps {
  theme: DashboardTheme;
}

export const ExploreSection: React.FC<ExploreSectionProps> = ({ theme }) => {
  const btnClass = 'w-full rounded-xl text-[10px] font-bold gap-1 h-10 !text-[hsl(102_25%_25%)] [&_svg]:!text-[hsl(102_25%_25%)]';
  const btnStyle: React.CSSProperties = {
    background: theme.primaryButton,
    borderColor: theme.cardBorder,
    boxShadow: `0 8px 18px ${theme.shadow}`,
  };

  const tagStyle: React.CSSProperties = {
    backgroundColor: theme.secondaryButton,
    borderColor: theme.cardBorder,
    color: theme.textSecondary,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: theme.secondaryButton }}>
          <Compass className="w-4 h-4" style={{ color: theme.accent }} />
        </div>
        <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
          Explore & Connect
        </h2>
      </div>

      {/* Quick Paths */}
      <div className="space-y-2">
        <div className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={tagStyle}>
          Quick Paths
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/364ttt">
            <Button size="sm" className={btnClass} style={btnStyle}>
              <Music className="w-3.5 h-3.5" /> 364 TTT
            </Button>
          </Link>
          <Link to="/profile?tab=journal">
            <Button size="sm" className={btnClass} style={btnStyle}>
              <BookOpen className="w-3.5 h-3.5" /> Journal
            </Button>
          </Link>
          <Link to="/communications-hub">
            <Button size="sm" className={btnClass} style={btnStyle}>
              <MessageSquare className="w-3.5 h-3.5" /> Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Community Roles */}
      <div className="space-y-2">
        <div className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={tagStyle}>
          Community Roles
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/become-whisperer">
            <Button size="sm" className={btnClass} style={btnStyle}>
              <Megaphone className="w-3.5 h-3.5" /> Whisperer
            </Button>
          </Link>
          <Link to="/register-vehicle">
            <Button size="sm" className={btnClass} style={btnStyle}>
              <Car className="w-3.5 h-3.5" /> Driver
            </Button>
          </Link>
          <Link to="/register-services">
            <Button size="sm" className={btnClass} style={btnStyle}>
              <Wrench className="w-3.5 h-3.5" /> Services
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
