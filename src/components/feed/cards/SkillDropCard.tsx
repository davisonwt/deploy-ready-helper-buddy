import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface SkillDropData {
  id: string;
  title: string;
  description?: string;
  instructor?: string;
}

export const SkillDropCard: React.FC<{ data: SkillDropData }> = ({ data }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border/30 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-s2g-amber/15 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-s2g-amber" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-s2g-amber uppercase tracking-wider font-semibold">
            SkillDrop
          </span>
          <p className="text-sm font-semibold text-foreground mt-0.5">{data.title}</p>
          {data.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
          )}
          <Link to="/explore-sessions?type=skilldrop" className="mt-2 block">
            <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg">
              <Zap className="w-3 h-3 mr-1" />
              Learn
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
