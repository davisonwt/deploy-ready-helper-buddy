import React, { useState } from 'react';
import { Radio, GraduationCap, Zap, Dumbbell, X, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const liveOptions = [
  { href: '/communications-hub?tab=classroom&create=1', label: 'Classroom', sublabel: 'Teach & mentor', icon: GraduationCap, gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
  { href: '/communications-hub?tab=skilldrop&create=1', label: 'SkillDrop', sublabel: 'Share a skill', icon: Zap, gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
  { href: '/communications-hub?tab=training&create=1', label: 'Training', sublabel: 'Lead a workout', icon: Dumbbell, gradient: 'linear-gradient(135deg, #7c3aed, #db2777)' },
  { href: '/communications-hub?tab=radio&create=1', label: 'Radio', sublabel: 'Go on air', icon: Radio, gradient: 'linear-gradient(135deg, #db2777, #ef4444)' },
];

export const GoLiveFAB: React.FC = () => {
  const [open, setOpen] = useState(false);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483640] pointer-events-none">
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Options Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 md:right-56 w-56 space-y-2 pointer-events-auto"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 px-1 mb-1">
              Go Live As…
            </p>
            {liveOptions.map((opt, i) => (
              <motion.div
                key={opt.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={opt.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl p-3 shadow-lg transition-all hover:scale-[1.02]"
                  style={{ background: opt.gradient }}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <opt.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">{opt.label}</span>
                    <span className="text-[9px] text-white/60">{opt.sublabel}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 right-4 md:right-56 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center pointer-events-auto"
        style={{
          background: open
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #dc2626, #f43f5e)',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.5)',
        }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Video className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </div>,
    document.body
  );
};
