import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TreePine, ChevronUp } from 'lucide-react';
import { MasteryModal } from '@/components/gamification/MasteryModal';

interface LiveActivitiesBarProps {
  theme?: {
    accent: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    primaryButton: string;
    shadow: string;
  };
}

export function StatsFloatingButton({ theme }: LiveActivitiesBarProps) {
  const [masteryOpen, setMasteryOpen] = useState(false);

  const accentColor = theme?.accent || '#f59e0b';
  const cardBg = theme?.cardBg || 'rgba(30, 41, 59, 0.9)';
  const borderColor = theme?.cardBorder || 'rgba(255,255,255,0.1)';
  const textPrimary = theme?.textPrimary || '#ffffff';
  const textSecondary = theme?.textSecondary || 'rgba(255,255,255,0.6)';

  const handleLiveActivities = () => {
    // Toggle the existing LiveActivityWidget via custom event
    window.dispatchEvent(new CustomEvent('toggle-live-activity'));
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
          className="h-full flex items-center justify-between px-4 sm:px-6 backdrop-blur-xl border-t"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}
        >
          {/* Left: Live Activities */}
          <button
            onClick={handleLiveActivities}
            className="flex items-center gap-2 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ color: textPrimary }}
            aria-label="View Live Activities"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Activity className="h-4 w-4" style={{ color: accentColor }} />
            </motion.div>
            <span className="text-sm font-medium">Live Activities</span>
          </button>

          {/* Right: Your Progress */}
          <button
            onClick={() => setMasteryOpen(true)}
            className="flex items-center gap-2 min-h-[44px] px-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ color: textPrimary }}
            aria-label="View Your Progress"
          >
            <TreePine className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-sm font-medium">Your Progress</span>
            <ChevronUp className="h-3 w-3" style={{ color: textSecondary }} />
          </button>
        </div>
      </motion.div>

      {/* Mastery Modal (Your Progress) */}
      <MasteryModal isOpen={masteryOpen} onClose={() => setMasteryOpen(false)} />
    </>
  );
}
