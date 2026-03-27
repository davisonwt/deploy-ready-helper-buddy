import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatRoomData {
  id: string;
  name: string;
  description?: string | null;
  isCommunity: boolean;
  currentListeners: number;
  lastMessagePreview?: string | null;
}

export const ChatRoomCard: React.FC<{ data: ChatRoomData; index: number }> = ({ data, index }) => {
  return (
    <Link to={`/communications-hub?room=${data.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="rounded-xl border border-border/20 p-3 hover:border-primary/40 transition-all group"
        style={{ backgroundColor: 'hsl(212 49% 24% / 0.5)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: data.isCommunity ? 'hsl(var(--primary) / 0.2)' : 'hsl(212 49% 30%)' }}
          >
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {data.name}
            </p>
            {data.description && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{data.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{data.currentListeners}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
