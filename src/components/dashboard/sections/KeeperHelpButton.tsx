import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface KeeperHelpButtonProps {
  sectionName: string;
}

export const KeeperHelpButton: React.FC<KeeperHelpButtonProps> = ({ sectionName }) => {
  return (
    <motion.div whileTap={{ scale: 0.95 }}>
      <Link
        to={`/communications?room=keeper-help&topic=${encodeURIComponent(sectionName)}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <HelpCircle className="w-3 h-3" />
        Ask about {sectionName}
      </Link>
    </motion.div>
  );
};
