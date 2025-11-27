'use client';

import { motion } from 'framer-motion';
import type { SacredTime } from './hooks/useSacredTime';

interface ThroneCenterProps {
  sacred: SacredTime;
}

/**
 * Central Throne - The heart of Ezekiel's vision
 * Displays current sacred time information
 */
export const ThroneCenter = ({ sacred }: ThroneCenterProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-900/80 via-orange-900/80 to-yellow-900/80 backdrop-blur-sm border-2 border-amber-500/50 shadow-2xl flex flex-col items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Central gem/eye */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-radial from-amber-400 via-orange-500 to-red-600 shadow-inner"
            animate={{
              boxShadow: [
                '0 0 20px rgba(255, 215, 0, 0.8)',
                '0 0 30px rgba(255, 165, 0, 0.6)',
                '0 0 20px rgba(255, 215, 0, 0.8)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Sacred part number */}
        <motion.div
          className="relative z-10 text-amber-300 font-bold text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {sacred.sacredPart}
        </motion.div>

        {/* Creature indicator */}
        <motion.div
          className="absolute -bottom-2 text-xs text-amber-400/80 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {sacred.creature}
        </motion.div>
      </motion.div>
    </div>
  );
};

