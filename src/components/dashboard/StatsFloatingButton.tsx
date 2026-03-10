import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TreePine, ChevronUp, HelpCircle, Navigation, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MasteryModal } from '@/components/gamification/MasteryModal';
import { getCurrentTheme } from '@/utils/dashboardThemes';

interface LiveActivitiesBarProps {
  theme?: {
    accent: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    primaryButton: string;
    primaryButtonHover: string;
    shadow: string;
  };
}

export function StatsFloatingButton({ theme: propTheme }: LiveActivitiesBarProps) {
  const [masteryOpen, setMasteryOpen] = useState(false);
  const [autoTheme, setAutoTheme] = useState(getCurrentTheme());
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setAutoTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const theme = propTheme || autoTheme;
  const accentColor = theme.accent;
  const cardBg = theme.cardBg;
  const borderColor = theme.cardBorder;

  const extractHex = (value: string): string => {
    const match = value.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : '#26c6da';
  };

  const getContrastTextColor = (hex: string): string => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#0b1220' : '#ffffff';
  };

  const buttonTextColor = getContrastTextColor(extractHex(accentColor));
  const buttonBaseStyle = {
    background: theme.primaryButton,
    color: buttonTextColor,
    border: `1px solid ${theme.cardBorder}`,
    boxShadow: `0 6px 14px ${theme.shadow}`,
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, hover: boolean) => {
    e.currentTarget.style.background = hover ? theme.primaryButtonHover : theme.primaryButton;
  };

  const handleLiveActivities = () => {
    window.dispatchEvent(new CustomEvent('toggle-live-activity'));
  };

  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent('start-onboarding-tour'));
  };

  const handleHelp = () => {
    window.dispatchEvent(new CustomEvent('open-help-modal'));
  };

  return (
    <>
      {/* Slim bottom bar - positioned above mobile nav */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40"
        style={{ height: '56px' }}
      >
        <div
          className="h-full flex items-center justify-center gap-1 sm:gap-2 backdrop-blur-xl border-t"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}
        >
          {/* Live Activities */}
          <button
            onClick={handleLiveActivities}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="View Live Activities"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Activity className="h-4 w-4" style={{ color: accentColor }} />
            </motion.div>
            <span className="text-xs sm:text-sm font-semibold text-foreground">Live</span>
          </button>

          {/* Start Tour */}
          <button
            onClick={handleStartTour}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="Start Tour"
          >
            <Navigation className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-xs sm:text-sm font-semibold text-foreground">Tour</span>
          </button>

          {/* Help */}
          <button
            onClick={handleHelp}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="Help & Documentation"
          >
            <HelpCircle className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-xs sm:text-sm font-semibold text-foreground">Help</span>
          </button>

          {/* Stats */}
          <button
            onClick={() => navigate('/stats')}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="View Stats"
          >
            <BarChart3 className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-xs sm:text-sm font-semibold text-foreground">Stats</span>
          </button>

          {/* Your Progress */}
          <button
            onClick={() => setMasteryOpen(true)}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="View Your Progress"
          >
            <TreePine className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-xs sm:text-sm font-semibold text-foreground">Progress</span>
            <ChevronUp className="h-3 w-3 text-foreground/60" />
          </button>
        </div>
      </motion.div>

      {/* Mastery Modal (Your Progress) */}
      <MasteryModal isOpen={masteryOpen} onClose={() => setMasteryOpen(false)} />
    </>
  );
}
