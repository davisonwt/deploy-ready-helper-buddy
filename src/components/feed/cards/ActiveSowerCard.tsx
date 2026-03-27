import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

interface ActiveSowerData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  productCount: number;
  orchardCount: number;
}

export const ActiveSowerCard: React.FC<{ data: ActiveSowerData; index: number }> = ({ data, index }) => {
  return (
    <Link to={`/member/${data.userId}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        className="rounded-xl border border-border/20 p-3 hover:border-primary/40 transition-all group"
        style={{ backgroundColor: 'hsl(212 49% 24% / 0.6)' }}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-primary/30">
            <AvatarImage src={data.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-foreground text-sm font-bold">
              {data.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {data.displayName}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              {data.productCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShoppingBag className="w-3 h-3" /> {data.productCount} seed{data.productCount !== 1 ? 's' : ''}
                </span>
              )}
              {data.orchardCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Sprout className="w-3 h-3" /> {data.orchardCount} orchard{data.orchardCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[9px] font-bold border border-success/30">
            Active
          </span>
        </div>
      </motion.div>
    </Link>
  );
};
