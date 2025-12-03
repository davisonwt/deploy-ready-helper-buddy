import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart3, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function StatsFloatingButton() {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="fixed top-36 right-6 z-50"
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
                onClick={() => {
                  setShowTooltip(false);
                  navigate('/stats');
                }}
                className="h-14 w-14 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 shadow-lg border-2 border-amber-400/30 hover:border-amber-400 transition-all duration-300 hover:scale-110 hover:shadow-2xl"
                aria-label="View My Stats"
              >
                <BarChart3 className="h-6 w-6 text-white" />
              </Button>
            </motion.div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-amber-900/95 border-amber-500 text-amber-100">
          <p className="font-semibold">View Detailed Stats</p>
          <p className="text-xs text-amber-200/80">See your growth, achievements & more</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

