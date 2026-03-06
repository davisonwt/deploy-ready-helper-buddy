import React from 'react';
import { useSabbathContext } from '@/contexts/SabbathContext';
import { motion } from 'framer-motion';

interface SabbathGuardProps {
  children: React.ReactNode;
  /** What to show during Sabbath instead of the children (purchase buttons, etc.) */
  fallback?: React.ReactNode;
}

/**
 * Wraps any commerce/purchase element. 
 * On Sabbath: hides children, shows gentle rest message.
 * On regular days: renders children normally.
 */
export const SabbathGuard: React.FC<SabbathGuardProps> = ({ children, fallback }) => {
  const { isSabbath, loading } = useSabbathContext();

  if (loading) return <>{children}</>;

  if (isSabbath) {
    return (
      <>{fallback || <SabbathRestMessage />}</>
    );
  }

  return <>{children}</>;
};

export const SabbathRestMessage: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-xl border border-amber-700/30 bg-gradient-to-br from-amber-900/20 to-stone-900/30 p-4 text-center ${className}`}
  >
    <p className="text-2xl mb-2">🕊️</p>
    <p className="text-amber-200/90 text-sm font-serif font-semibold">Shabbat Shalom</p>
    <p className="text-amber-400/60 text-xs mt-1">
      It is the Sabbath — a day of rest. Commerce is paused until the next sunrise.
    </p>
  </motion.div>
);

export default SabbathGuard;
