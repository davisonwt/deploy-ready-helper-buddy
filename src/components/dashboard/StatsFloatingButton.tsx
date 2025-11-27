import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function StatsFloatingButton() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="fixed bottom-4 right-4 md:top-4 md:bottom-auto z-50"
    >
      <motion.div
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(251, 191, 36, 0.7)',
            '0 0 0 10px rgba(251, 191, 36, 0)',
            '0 0 0 0 rgba(251, 191, 36, 0)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="rounded-full"
      >
        <Button
          onClick={() => navigate('/stats')}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-2xl border-2 border-amber-400"
        >
          <BarChart3 className="h-6 w-6 text-white" />
        </Button>
      </motion.div>
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs text-amber-300 font-semibold bg-black/50 px-2 py-1 rounded">
          My Stats
        </span>
      </div>
    </motion.div>
  );
}

