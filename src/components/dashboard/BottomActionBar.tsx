import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, Radio, TreePine, MoreHorizontal, GraduationCap, Dumbbell, Zap, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { PlantModal } from '@/components/grove/PlantModal';

interface BottomActionBarProps {
  theme: DashboardTheme;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({ theme }) => {
  const [showMore, setShowMore] = useState(false);
  const [plantModalOpen, setPlantModalOpen] = useState(false);

  const primaryActions = [
    { to: '/communications-hub', icon: MessageSquare, label: 'Chat' },
    { to: '/grove-station', icon: Radio, label: 'Radio' },
    { to: '/browse-orchards', icon: TreePine, label: 'Browse' },
  ];

  const moreActions = [
    { to: '/create-session?type=classroom', icon: GraduationCap, label: 'Classroom' },
    { to: '/create-session?type=training', icon: Dumbbell, label: 'Training' },
    { to: '/create-session?type=skilldrop', icon: Zap, label: 'SkillDrop' },
    { to: '/profile?tab=journal', icon: BookOpen, label: 'Journal' },
  ];

  return (
    <>
      {/* Expanded more panel */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-[72px] left-0 right-0 z-50 px-4 pb-2"
          >
            <div
              className="max-w-md mx-auto rounded-2xl border backdrop-blur-xl p-3 grid grid-cols-4 gap-2"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              }}
            >
              {moreActions.map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to} onClick={() => setShowMore(false)}>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors"
                    style={{ color: theme.textSecondary }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.secondaryButton; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Icon className="w-5 h-5" style={{ color: theme.accent }} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl safe-area-bottom"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {/* Plant button */}
          <button
            onClick={() => setPlantModalOpen(true)}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-colors min-w-[56px]"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.secondaryButton; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.accent + '20' }}
            >
              <Plus className="w-4 h-4" style={{ color: theme.accent }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>Plant</span>
          </button>

          {primaryActions.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-colors min-w-[56px]"
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.secondaryButton; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.accent + '20' }}
              >
                <Icon className="w-4 h-4" style={{ color: theme.accent }} />
              </div>
              <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-colors min-w-[56px]"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.secondaryButton; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.secondaryButton }}
            >
              {showMore ? (
                <X className="w-4 h-4" style={{ color: theme.textSecondary }} />
              ) : (
                <MoreHorizontal className="w-4 h-4" style={{ color: theme.textSecondary }} />
              )}
            </div>
            <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>More</span>
          </button>
        </div>
      </div>

      <PlantModal open={plantModalOpen} onOpenChange={setPlantModalOpen} />
    </>
  );
};
