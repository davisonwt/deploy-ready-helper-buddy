import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ChevronRight, Heart, MessageCircle, ShoppingBag, TreePine, Music, BookOpen, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface MemryFeedItem {
  id: string;
  type: 'photo' | 'video' | 'product' | 'orchard' | 'music' | 'book';
  title: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  authorName: string;
  authorAvatar?: string;
  authorId?: string;
  price?: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  photo: { label: 'Photo', icon: Camera, gradient: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(21 90% 48%))' },
  video: { label: 'Video', icon: Play, gradient: 'linear-gradient(135deg, hsl(335 78% 42%), hsl(346 77% 50%))' },
  product: { label: 'Seed', icon: ShoppingBag, gradient: 'linear-gradient(135deg, hsl(142 71% 45%), hsl(142 76% 36%))' },
  orchard: { label: 'Orchard', icon: TreePine, gradient: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(33 90% 50%))' },
  music: { label: 'Music', icon: Music, gradient: 'linear-gradient(135deg, hsl(271 81% 56%), hsl(280 87% 40%))' },
  book: { label: 'Book', icon: BookOpen, gradient: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(224 76% 48%))' },
};

function MemryCard({ item, index }: { item: MemryFeedItem; index: number }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.photo;
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-border/30 overflow-hidden bg-card"
    >
      {/* Media Preview */}
      {(item.mediaUrl || item.thumbnailUrl) && (
        <Link to="/memry" className="block relative aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={item.thumbnailUrl || item.mediaUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Type badge */}
          <span
            className="absolute top-2 left-2 text-[9px] font-bold text-white px-2 py-0.5 rounded-full backdrop-blur-sm"
            style={{ background: config.gradient }}
          >
            <config.icon className="w-2.5 h-2.5 inline mr-1 -mt-px" />
            {config.label}
          </span>
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}
          {item.price != null && item.price > 0 && (
            <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              R{item.price.toFixed(0)}
            </span>
          )}
        </Link>
      )}

      {/* Author + Title */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar className="w-6 h-6">
            <AvatarImage src={item.authorAvatar || undefined} />
            <AvatarFallback className="text-[9px] bg-primary/15 text-primary">
              {item.authorName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-foreground truncate">{item.authorName}</span>
          <span className="text-[9px] text-muted-foreground ml-auto whitespace-nowrap">{timeAgo}</span>
        </div>

        {item.title && (
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{item.title}</p>
        )}
        {item.caption && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.caption}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2 pt-1.5 border-t border-border/20">
          <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <Heart className="w-3 h-3" /> {item.likeCount}
          </button>
          <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <MessageCircle className="w-3 h-3" /> {item.commentCount}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const InlineMemryFeed: React.FC = () => {
  const { data: feedItems, isLoading } = useQuery({
    queryKey: ['inline-memry-feed'],
    queryFn: async () => {
      const items: MemryFeedItem[] = [];

      // Fetch memry_posts (photos/videos)
      const { data: memryPosts } = await supabase
        .from('memry_posts')
        .select('id, user_id, media_url, media_type, caption, like_count, comment_count, created_at')
        .order('created_at', { ascending: false })
        .limit(6);

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, created_at, sower_id, sowers(user_id)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      // Fetch orchards
      const { data: orchards } = await supabase
        .from('orchards')
        .select('id, name, description, images, user_id, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      // Collect user IDs for profile lookup
      const userIds = new Set<string>();
      (memryPosts || []).forEach((p: any) => userIds.add(p.user_id));
      (products || []).forEach((p: any) => {
        const uid = (p.sowers as any)?.user_id;
        if (uid) userIds.add(uid);
      });
      (orchards || []).forEach((o: any) => userIds.add(o.user_id));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Transform memry_posts
      (memryPosts || []).forEach((post: any) => {
        const profile = profileMap.get(post.user_id);
        items.push({
          id: `memry-${post.id}`,
          type: post.media_type === 'video' ? 'video' : 'photo',
          title: '',
          caption: post.caption,
          mediaUrl: post.media_url,
          authorName: profile?.display_name || 'Sower',
          authorAvatar: profile?.avatar_url,
          authorId: post.user_id,
          likeCount: post.like_count || 0,
          commentCount: post.comment_count || 0,
          createdAt: post.created_at,
        });
      });

      // Transform products
      (products || []).forEach((product: any) => {
        const uid = (product.sowers as any)?.user_id;
        const profile = uid ? profileMap.get(uid) : null;
        items.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          caption: product.description,
          mediaUrl: product.image_url,
          thumbnailUrl: product.image_url,
          authorName: profile?.display_name || 'Sower',
          authorAvatar: profile?.avatar_url,
          price: product.price,
          likeCount: 0,
          commentCount: 0,
          createdAt: product.created_at,
        });
      });

      // Transform orchards
      (orchards || []).forEach((orchard: any) => {
        const profile = profileMap.get(orchard.user_id);
        const coverImage = orchard.images?.[0];
        items.push({
          id: `orchard-${orchard.id}`,
          type: 'orchard',
          title: orchard.name,
          caption: orchard.description,
          mediaUrl: coverImage,
          thumbnailUrl: coverImage,
          authorName: profile?.display_name || 'Sower',
          authorAvatar: profile?.avatar_url,
          likeCount: 0,
          commentCount: 0,
          createdAt: orchard.created_at,
        });
      });

      // Sort all by date
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items.slice(0, 10);
    },
    staleTime: 3 * 60 * 1000,
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-bold text-foreground">S2G Memry</h2>
        </div>
        <Link to="/memry" className="text-xs font-semibold text-orange-500 flex items-center gap-0.5">
          Open Full Feed <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-muted/30 animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : (feedItems || []).length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-border/20 bg-card">
          <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No Memry posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {(feedItems || []).map((item, i) => (
            <MemryCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </section>
  );
};
