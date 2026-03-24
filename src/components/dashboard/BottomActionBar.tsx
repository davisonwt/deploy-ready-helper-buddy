import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, Radio, TreePine, MoreHorizontal, GraduationCap, Dumbbell, Zap, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const BottomActionBar: React.FC = () => {
  const [showMore, setShowMore] = useState(false);

  const primaryActions = [
    { to: '/create-orchard', icon: Plus, label: 'Plant', color: 'hsl(142 76% 36%)' },
    { to: '/communications-hub', icon: MessageSquare, label: 'Chat', color: 'hsl(188 78% 41%)' },
    { to: '/grove-station', icon: Radio, label: 'Radio', color: 'hsl(43 74% 66%)' },
    { to: '/browse-orchards', icon: TreePine, label: 'Browse', color: 'hsl(270 75% 45%)' },
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
              className="max-w-md mx-auto rounded-2xl border border-border/20 backdrop-blur-xl p-3 grid grid-cols-4 gap-2"
              style={{ backgroundColor: 'hsl(212 49% 24% / 0.95)' }}
            >
              {moreActions.map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to} onClick={() => setShowMore(false)}>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-card/50 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 backdrop-blur-xl safe-area-bottom"
        style={{ backgroundColor: 'hsl(210 67% 12% / 0.95)' }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {primaryActions.map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-card/30 transition-colors min-w-[56px]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-card/30 transition-colors min-w-[56px]"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-card/50">
              {showMore ? (
                <X className="w-4.5 h-4.5 text-muted-foreground" />
              ) : (
                <MoreHorizontal className="w-4.5 h-4.5 text-muted-foreground" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">More</span>
          </button>
        </div>
      </div>
    </>
  );
};
