import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ChevronRight, Heart, ShoppingBag, TreePine, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

interface SowerMemry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  products: { id: string; name: string; imageUrl?: string; price?: number }[];
  orchards: { id: string; name: string; imageUrl?: string }[];
  memryPosts: { id: string; mediaUrl?: string; caption?: string; mediaType?: string }[];
}

function SowerMemryCard({ sower, index }: { sower: SowerMemry; index: number }) {
  const totalItems = sower.products.length + sower.orchards.length + sower.memryPosts.length;
  // Pick a preview image from any available content
  const previewImages = [
    ...sower.memryPosts.filter(p => p.mediaUrl).map(p => p.mediaUrl!),
    ...sower.products.filter(p => p.imageUrl).map(p => p.imageUrl!),
    ...sower.orchards.filter(o => o.imageUrl).map(o => o.imageUrl!),
  ].slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={`/member/${sower.userId}`}
        className="block rounded-2xl border border-border/20 overflow-hidden bg-card hover:border-primary/30 transition-colors"
      >
        {/* Image grid preview */}
        {previewImages.length > 0 ? (
          <div className={`grid ${previewImages.length >= 3 ? 'grid-cols-3' : previewImages.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-px h-28`}>
            {previewImages.map((img, i) => (
              <div key={i} className="overflow-hidden bg-muted">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-20 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Camera className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}

        {/* Sower info */}
        <div className="p-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-8 h-8 ring-2 ring-primary/20">
              <AvatarImage src={sower.avatarUrl || undefined} />
              <AvatarFallback className="text-xs bg-primary/15 text-primary font-bold">
                {sower.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{sower.displayName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {sower.products.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <ShoppingBag className="w-2.5 h-2.5" /> {sower.products.length} seed{sower.products.length !== 1 ? 's' : ''}
                  </span>
                )}
                {sower.orchards.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <TreePine className="w-2.5 h-2.5" /> {sower.orchards.length} orchard{sower.orchards.length !== 1 ? 's' : ''}
                  </span>
                )}
                {sower.memryPosts.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Camera className="w-2.5 h-2.5" /> {sower.memryPosts.length} post{sower.memryPosts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export const InlineMemryFeed: React.FC = () => {
  const { data: sowerFeeds, isLoading } = useQuery({
    queryKey: ['inline-memry-sower-feeds'],
    queryFn: async () => {
      // Get active sower IDs from products
      const { data: activeProducts } = await supabase
        .from('products')
        .select('id, name, image_url, price, sower_id')
        .eq('status', 'active');

      const sowerIds = [...new Set((activeProducts || []).map(p => p.sower_id).filter(Boolean))];

      // Get sower -> user_id mapping
      let sowerToUser: Record<string, string> = {};
      let allUserIds = new Set<string>();

      if (sowerIds.length > 0) {
        const { data: sowers } = await supabase
          .from('sowers')
          .select('id, user_id')
          .in('id', sowerIds);
        (sowers || []).forEach(s => {
          sowerToUser[s.id] = s.user_id;
          allUserIds.add(s.user_id);
        });
      }

      // Get active orchards
      const { data: orchards } = await supabase
        .from('orchards')
        .select('id, name, images, user_id')
        .eq('status', 'active');
      (orchards || []).forEach(o => allUserIds.add(o.user_id));

      // Get recent memry posts from these users
      const userIdArr = Array.from(allUserIds);
      let memryPosts: any[] = [];
      if (userIdArr.length > 0) {
        const { data } = await supabase
          .from('memry_posts')
          .select('id, user_id, media_url, media_type, caption')
          .in('user_id', userIdArr)
          .order('created_at', { ascending: false })
          .limit(30);
        memryPosts = data || [];
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIdArr);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Group by user
      const sowerMap = new Map<string, SowerMemry>();

      const getOrCreate = (userId: string): SowerMemry => {
        if (!sowerMap.has(userId)) {
          const prof = profileMap.get(userId);
          sowerMap.set(userId, {
            userId,
            displayName: prof?.display_name || 'Sower',
            avatarUrl: prof?.avatar_url || undefined,
            products: [],
            orchards: [],
            memryPosts: [],
          });
        }
        return sowerMap.get(userId)!;
      };

      // Map products
      (activeProducts || []).forEach(p => {
        const uid = sowerToUser[p.sower_id];
        if (!uid) return;
        const s = getOrCreate(uid);
        s.products.push({ id: p.id, name: p.name, imageUrl: p.image_url || undefined, price: p.price || undefined });
      });

      // Map orchards
      (orchards || []).forEach(o => {
        const s = getOrCreate(o.user_id);
        s.orchards.push({ id: o.id, name: o.name, imageUrl: o.images?.[0] || undefined });
      });

      // Map memry posts
      memryPosts.forEach(m => {
        const s = getOrCreate(m.user_id);
        s.memryPosts.push({ id: m.id, mediaUrl: m.media_url, caption: m.caption, mediaType: m.media_type });
      });

      return Array.from(sowerMap.values()).slice(0, 8);
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-muted/30 animate-pulse h-40" />
          ))}
        </div>
      ) : (sowerFeeds || []).length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-border/20 bg-card">
          <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No active sower content yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(sowerFeeds || []).map((sower, i) => (
            <SowerMemryCard key={sower.userId} sower={sower} index={i} />
          ))}
        </div>
      )}
    </section>
  );
};
