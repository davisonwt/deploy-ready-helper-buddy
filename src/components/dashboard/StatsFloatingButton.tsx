import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronUp, Activity, TreePine, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useMyStats } from '@/hooks/useMyStats';
import { formatCurrency } from '@/utils/formatters';

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
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { stats } = useMyStats();

  const accentColor = theme?.accent || '#f59e0b';
  const cardBg = theme?.cardBg || 'rgba(30, 41, 59, 0.9)';
  const borderColor = theme?.cardBorder || 'rgba(255,255,255,0.1)';
  const textPrimary = theme?.textPrimary || '#ffffff';
  const textSecondary = theme?.textSecondary || 'rgba(255,255,255,0.6)';

  return (
    <>
      {/* Slim bottom bar - positioned above mobile nav */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40"
        style={{ 
          height: '56px',
        }}
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
            onClick={() => setSheetOpen(true)}
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
            {stats && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: accentColor + '25', color: accentColor }}
              >
                {stats.dailyNewFollowers + (stats.registeredSowersDelta > 0 ? stats.registeredSowersDelta : 0)}
              </span>
            )}
          </button>

          {/* Right: Your Progress */}
          <button
            onClick={() => navigate('/stats')}
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

      {/* Expandable Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t max-h-[60vh] backdrop-blur-xl"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: textPrimary }} className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: accentColor }} />
              Live Activities
            </SheetTitle>
            <SheetDescription style={{ color: textSecondary }}>
              Your real-time dashboard activity
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Quick stats in sheet */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: accentColor + '10', borderColor: accentColor + '30' }}
                >
                  <p className="text-xs" style={{ color: textSecondary }}>New Followers Today</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
                    {stats.dailyNewFollowers}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: accentColor + '10', borderColor: accentColor + '30' }}
                >
                  <p className="text-xs" style={{ color: textSecondary }}>Daily Bestowals</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
                    {formatCurrency(stats.dailyBestowals)}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: accentColor + '10', borderColor: accentColor + '30' }}
                >
                  <p className="text-xs" style={{ color: textSecondary }}>Total Followers</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
                    {stats.followers.toLocaleString()}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: accentColor + '10', borderColor: accentColor + '30' }}
                >
                  <p className="text-xs" style={{ color: textSecondary }}>Registered Sowers</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
                    {stats.registeredSowers.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setSheetOpen(false);
                navigate('/stats');
              }}
              className="w-full min-h-[44px] rounded-xl font-medium"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                color: textPrimary,
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Detailed Stats
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
