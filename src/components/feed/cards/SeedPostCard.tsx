import React from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface SeedPostData {
  id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  upvotes: number;
  replyCount: number;
  createdAt: string;
}

export const SeedPostCard: React.FC<{ data: SeedPostData }> = ({ data }) => {
  const timeAgo = formatDistanceToNow(new Date(data.createdAt), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border/30 p-4"
    >
      {/* Author */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={data.authorAvatar || undefined} />
          <AvatarFallback className="text-xs bg-primary/15 text-primary">
            {data.author.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.author}</p>
          <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
        </div>
      </div>

      {/* Content */}
      {data.title && (
        <p className="text-sm font-semibold text-foreground mb-1">{data.title}</p>
      )}
      <p className="text-[13px] text-foreground/80 leading-relaxed line-clamp-4">
        {data.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/20">
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <Heart className="w-3.5 h-3.5" />
          <span>{data.upvotes}</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{data.replyCount}</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </motion.div>
  );
};
