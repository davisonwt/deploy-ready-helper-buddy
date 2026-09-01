import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { TribalHeart } from './BondingAnimation';

interface Props {
  partnerName: string;
  onStartChat: () => void;
  onBack: () => void;
}

/** Shown once, right after BondingAnimation finishes for a new mutual match. */
export const MatchScreen: React.FC<Props> = ({ partnerName, onStartChat, onBack }) => (
  <div
    className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative"
    style={{ background: 'radial-gradient(ellipse at top, hsl(20 30% 12%) 0%, hsl(20 35% 7%) 60%, hsl(0 0% 4%) 100%)' }}
  >
    <button
      onClick={onBack}
      className="absolute top-6 left-5 flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
      style={{ color: 'hsl(38 50% 75%)' }}
    >
      <ArrowLeft size={16} />
      Back
    </button>

    <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
      <TribalHeart size={72} color="unified" pulse strong />
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-3xl font-serif italic mt-6"
      style={{ color: 'hsl(38 95% 85%)' }}
    >
      You and {partnerName} are a match!
    </motion.h1>

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-sm leading-relaxed max-w-xs mx-auto mt-4"
      style={{ color: 'hsl(38 40% 75%)' }}
    >
      You never have to share a phone number or email here. Chat, send voice
      and video notes, and stay inside Wandering Hearts until you're both
      comfortable.
    </motion.p>

    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      onClick={onStartChat}
      className="mt-8 px-8 py-3.5 rounded-full font-semibold transition-all hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, hsl(15 85% 55%) 0%, hsl(25 95% 60%) 100%)',
        color: 'hsl(20 30% 12%)',
        boxShadow: '0 8px 30px hsl(15 80% 50% / 0.5)',
      }}
    >
      Start chatting
    </motion.button>
  </div>
);
