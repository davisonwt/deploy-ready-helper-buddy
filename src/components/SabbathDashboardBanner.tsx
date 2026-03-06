import React from 'react';
import { useSabbathContext } from '@/contexts/SabbathContext';
import { motion } from 'framer-motion';

/**
 * A prominent Sabbath banner for dashboards.
 * Shows a peaceful message explaining commerce is paused.
 */
export const SabbathDashboardBanner: React.FC = () => {
  const { isSabbath, loading } = useSabbathContext();

  if (loading || !isSabbath) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="rounded-2xl border border-emerald-700/30 overflow-hidden mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.25), rgba(20, 83, 45, 0.15), rgba(6, 95, 70, 0.20))',
      }}
    >
      <div className="px-6 py-5 text-center">
        {/* Decorative top element */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
          <span className="text-3xl">🕊️</span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-emerald-500/40" />
        </div>

        <h2 className="text-xl font-serif font-bold text-emerald-200 tracking-wide mb-1">
          Shabbat Shalom
        </h2>
        <p className="text-emerald-300/70 text-sm max-w-md mx-auto leading-relaxed">
          It is the Sabbath — a day set apart for rest. All commerce, purchases, and payments are paused until the next sunrise.
        </p>

        {/* What's available */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-700/30 px-3 py-1 text-xs text-emerald-300/80">
            ✅ Free content & studies
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-700/30 px-3 py-1 text-xs text-emerald-300/80">
            ✅ Chat & community
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-700/30 px-3 py-1 text-xs text-emerald-300/80">
            ✅ Calendar & journal
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 border border-red-700/20 px-3 py-1 text-xs text-red-300/60">
            🚫 Purchases paused
          </span>
        </div>

        <p className="text-emerald-600/50 text-[10px] mt-3 italic">
          "Remember the Sabbath day, to keep it set-apart." — Exodus 20:8
        </p>
      </div>
    </motion.div>
  );
};

export default SabbathDashboardBanner;
