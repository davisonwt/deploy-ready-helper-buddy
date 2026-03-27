import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ChevronRight, ChevronLeft, ShoppingBag, TreePine, Music, Play, Pause, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
import { globalAudioManager } from '@/utils/globalAudioManager';

interface SowerMemry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  products: { id: string; name: string; imageUrl?: string; price?: number }[];
  orchards: { id: string; name: string; imageUrl?: string }[];
  memryPosts: { id: string; mediaUrl?: string; caption?: string; mediaType?: string }[];
}

/** Inline 30s music snippet that auto-plays when visible */
function InlineMusicSnippet({ mediaUrl, isVisible }: { mediaUrl: string; isVisible: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const PREVIEW_DURATION = 30;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let urlToResolve = mediaUrl;
        if (mediaUrl.includes('manifest.json')) {
          try {
            const resp = await fetch(mediaUrl);
            const manifest = await resp.json();
            if (manifest.tracks?.[0]?.url) urlToResolve = manifest.tracks[0].url;
          } catch { /* ignore */ }
        }
        const url = await resolveAudioUrl(urlToResolve, { bucketForKeys: 'music-tracks' });
        if (!cancelled) setResolvedUrl(url);
      } catch {
        if (!cancelled) setResolvedUrl(mediaUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [mediaUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    globalAudioManager.register(audio);
    return () => { globalAudioManager.unregister(audio); };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;

    if (!isVisible) {
      audio.pause();
      setPlaying(false);
      return;
    }

    audio.src = resolvedUrl;
    audio.load();
    globalAudioManager.play(audio);
    const p = audio.play();
    if (p) p.then(() => setPlaying(true)).catch(() => setPlaying(false));

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= PREVIEW_DURATION) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
      }
    };
    const onEnd = () => { setPlaying(false); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.pause();
      audio.src = '';
    };
  }, [resolvedUrl, isVisible]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { globalAudioManager.play(audio); audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 z-10">
      <Music className={`w-10 h-10 text-white/80 mb-2 ${playing ? 'animate-pulse' : ''}`} />
      <audio ref={audioRef} preload="auto" className="hidden" />
      <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1.5 backdrop-blur-sm">
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }} className="text-white">
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <div className="w-20 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(currentTime / PREVIEW_DURATION) * 100}%` }} />
        </div>
        <span className="text-white text-[9px] font-mono">{Math.floor(currentTime)}s/{PREVIEW_DURATION}s</span>
      </div>
    </div>
  );
}

/** Generate a short CaaS story blurb per sower */
function generateCaaSStory(sower: SowerMemry): string {
  const name = sower.displayName;
  const seedCount = sower.products.length;
  const orchardCount = sower.orchards.length;
  const postCount = sower.memryPosts.length;
  const musicCount = sower.memryPosts.filter(p => p.mediaType === 'music').length;

  if (musicCount > 0 && seedCount > 0) {
    return `${name} is sowing through sound and seed — ${musicCount} track${musicCount !== 1 ? 's' : ''} shared, ${seedCount} seed${seedCount !== 1 ? 's' : ''} planted. A journey of creative giving.`;
  }
  if (seedCount > 0 && orchardCount > 0) {
    return `${name} has planted ${seedCount} seed${seedCount !== 1 ? 's' : ''} and tended ${orchardCount} orchard${orchardCount !== 1 ? 's' : ''} — growing something meaningful for the community.`;
  }
  if (seedCount > 0) {
    return `${name} stepped forward with ${seedCount} seed${seedCount !== 1 ? 's' : ''} sown into the community. Every seed tells a story of purpose.`;
  }
  if (orchardCount > 0) {
    return `${name} is cultivating ${orchardCount} orchard${orchardCount !== 1 ? 's' : ''} — inviting the community to rally around a shared vision.`;
  }
  if (postCount > 0) {
    return `${name} is sharing their journey through ${postCount} memr${postCount !== 1 ? 'ies' : 'y'} — each one a window into their story.`;
  }
  return `${name} has joined the community as a sower — watch this space as their story unfolds.`;
}

function SowerMemryCard({ sower, index }: { sower: SowerMemry; index: number }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Collect all preview items with type info
  const previewItems = [
    ...sower.memryPosts.filter(p => p.mediaUrl).map(p => ({ url: p.mediaUrl!, type: p.mediaType || 'image' })),
    ...sower.products.filter(p => p.imageUrl).map(p => ({ url: p.imageUrl!, type: 'image' })),
    ...sower.orchards.filter(o => o.imageUrl).map(o => ({ url: o.imageUrl!, type: 'image' })),
  ];

  // IntersectionObserver for viewport tracking
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Audio plays when card is both in view AND hovered
  const isActive = isInView && isHovered;

  const currentItem = previewItems[imgIdx];
  const isMusic = currentItem?.type === 'music';

  const goLeft = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setImgIdx(i => (i - 1 + previewItems.length) % previewItems.length);
  };
  const goRight = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setImgIdx(i => (i + 1) % previewItems.length);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
    >
      <Link
        to={`/member/${sower.userId}`}
        className="block rounded-2xl border border-border/20 overflow-hidden bg-card hover:border-primary/30 transition-colors"
      >
        {/* Media carousel */}
        {previewItems.length > 0 ? (
          <div className="relative h-36 bg-muted overflow-hidden">
            {isMusic && currentItem ? (
              <InlineMusicSnippet mediaUrl={currentItem.url} isVisible={isActive} />
            ) : currentItem ? (
              <img src={currentItem.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : null}

            {/* Left / Right arrows */}
            {previewItems.length > 1 && (
              <>
                <button
                  onClick={goLeft}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goRight}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* Counter */}
                <span className="absolute top-1.5 right-1.5 z-20 bg-black/50 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                  {imgIdx + 1}/{previewItems.length}
                </span>
              </>
            )}
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
        .select('id, title, cover_image_url, price, sower_id')
        .eq('status', 'active');

      const sowerIds = [...new Set((activeProducts || []).map(p => p.sower_id).filter(Boolean))];

      let sowerToUser: Record<string, string> = {};
      let allUserIds = new Set<string>();

      if (sowerIds.length > 0) {
        const { data: sowers } = await supabase.from('sowers').select('id, user_id').in('id', sowerIds);
        (sowers || []).forEach(s => { sowerToUser[s.id] = s.user_id; allUserIds.add(s.user_id); });
      }

      const { data: orchards } = await supabase.from('orchards').select('id, title, images, user_id').eq('status', 'active');
      (orchards || []).forEach(o => allUserIds.add(o.user_id));

      const userIdArr = Array.from(allUserIds);
      let memryPosts: any[] = [];
      if (userIdArr.length > 0) {
        const { data } = await supabase.from('memry_posts').select('id, user_id, media_url, media_type, caption').in('user_id', userIdArr).order('created_at', { ascending: false }).limit(30);
        memryPosts = data || [];
      }

      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIdArr);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const sowerMap = new Map<string, SowerMemry>();
      const getOrCreate = (userId: string): SowerMemry => {
        if (!sowerMap.has(userId)) {
          const prof = profileMap.get(userId);
          sowerMap.set(userId, { userId, displayName: prof?.display_name || 'Sower', avatarUrl: prof?.avatar_url || undefined, products: [], orchards: [], memryPosts: [] });
        }
        return sowerMap.get(userId)!;
      };

      (activeProducts || []).forEach(p => {
        const uid = sowerToUser[p.sower_id];
        if (!uid) return;
        getOrCreate(uid).products.push({ id: p.id, name: p.title, imageUrl: p.cover_image_url || undefined, price: p.price || undefined });
      });

      (orchards || []).forEach(o => {
        getOrCreate(o.user_id).orchards.push({ id: o.id, name: o.title, imageUrl: o.images?.[0] || undefined });
      });

      memryPosts.forEach(m => {
        getOrCreate(m.user_id).memryPosts.push({ id: m.id, mediaUrl: m.media_url, caption: m.caption, mediaType: m.media_type });
      });

      return Array.from(sowerMap.values()).slice(0, 8);
    },
    staleTime: 3 * 60 * 1000,
  });

  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <Camera className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold text-foreground">S2G Memry</h2>
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
