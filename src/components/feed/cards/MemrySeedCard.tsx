import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Send, Gift, ChevronLeft, ChevronRight, Play, Pause, Music, MessageSquare, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
import { globalAudioManager } from '@/utils/globalAudioManager';
import { unlockHtmlMediaElement } from '@/utils/unlockHtmlMediaElement';

interface MemrySeedCardProps {
  post: {
    id: string;
    user_id: string;
    content_type: string;
    media_url: string;
    image_urls?: string[];
    audio_url?: string;
    caption: string;
    likes_count: number;
    comments_count: number;
    product_id?: string;
    product_price?: number;
    product_title?: string;
    product_type?: string;
    category?: string;
    orchard_id?: string;
    book_id?: string;
    profiles?: {
      display_name: string;
      avatar_url: string;
      username: string;
    };
    user_liked?: boolean;
    sower_seed_number?: number;
  };
  user: any;
  isFollowing: boolean;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onOpenComments: (postId: string) => void;
  onPrivateMessage?: (targetUserId: string, seedCaption: string) => void;
}

const toHandle = (value?: string) => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return 'sower';
  return v.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'sower';
};

// ── 30-second audio preview player ──
const SeedAudioPreview: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const PREVIEW_DURATION = 30;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Handle manifest.json for album products
        let urlToResolve = audioUrl;
        if (audioUrl.includes('manifest.json')) {
          try {
            const resp = await fetch(audioUrl);
            const manifest = await resp.json();
            if (manifest.tracks?.length > 0) urlToResolve = manifest.tracks[0].url;
          } catch {}
        }
        const url = await resolveAudioUrl(urlToResolve, { bucketForKeys: 'dj-music' });
        if (!cancelled) setResolvedUrl(url);
      } catch {
        if (!cancelled) setResolvedUrl(audioUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    globalAudioManager.register(audio);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      audio.pause();
      audio.currentTime = 0;
      globalAudioManager.unregister(audio);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;

    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      try {
        setLoading(true);
        await unlockHtmlMediaElement();
        if (audio.src !== resolvedUrl) {
          audio.src = resolvedUrl;
          audio.load();
        }
        if (audio.currentTime >= PREVIEW_DURATION || audio.currentTime === 0) {
          audio.currentTime = 0;
        }
        globalAudioManager.play(audio);
        await audio.play();
        setPlaying(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          setPlaying(false);
          setCurrentTime(0);
        }, PREVIEW_DURATION * 1000);
      } catch {
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= PREVIEW_DURATION) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
      }
    };
    const onEnd = () => { setPlaying(false); };
    const onPause = () => {
      setPlaying(false);
      if (audio.currentTime === 0) setCurrentTime(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="relative z-20 flex-shrink-0 w-[108px] sm:w-[116px]">
      <audio ref={audioRef} preload="metadata" playsInline className="hidden" />
      <div className="h-8 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2">
        <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform flex-shrink-0" disabled={loading || !resolvedUrl}>
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(currentTime / PREVIEW_DURATION) * 100}%` }} />
        </div>
        <span className="text-white text-[8px] font-mono flex-shrink-0">
          {Math.floor(currentTime)}s/{PREVIEW_DURATION}s
        </span>
      </div>
    </div>
  );
};

export const MemrySeedCard: React.FC<MemrySeedCardProps> = ({
  post,
  user,
  isFollowing,
  onLike,
  onFollow,
  onOpenComments,
  onPrivateMessage,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToBasket } = useProductBasket();
  const [imgIdx, setImgIdx] = useState(0);
  const [inlineMsg, setInlineMsg] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  const allImages = [post.media_url];
  const hasMultipleImages = false;
  const isProduct = post.content_type === 'new_product';
  const isOrchard = post.content_type === 'new_orchard';
  const isBook = post.content_type === 'new_book';
  const isMusic = post.content_type === 'music';
  const isSeed = isProduct || isOrchard || isBook;
  const categoryText = String(post.category || post.product_type || post.content_type || '').toLowerCase();
  const hasAudio = !!(post.audio_url || isMusic || categoryText.includes('music') || categoryText.includes('audio'));

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.55),
      { threshold: [0.55] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView || !hasAudio) return;
    const localAudios = cardRef.current?.querySelectorAll('audio') ?? [];
    localAudios.forEach((audioEl) => {
      audioEl.pause();
      audioEl.currentTime = 0;
    });
  }, [isInView, hasAudio]);

  // Determine seed type label
  const getSeedTypeLabel = () => {
    if (isMusic) return '🎵 Music';
    if (isBook) return '📚 Book';
    if (isOrchard) return '🌳 Orchard';
    const cat = (post.category || post.product_type || '').toLowerCase();
    if (cat.includes('music')) return '🎵 Music';
    if (cat.includes('e-book') || cat.includes('ebook')) return '📱 E-Book';
    if (cat.includes('book')) return '📚 Book';
    if (cat.includes('art')) return '🎨 Art';
    if (cat.includes('produce')) return '🥬 Produce';
    if (cat.includes('file')) return '📄 File';
    if (isProduct) return '🌱 Product';
    return '🌱 Seed';
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/memry?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'S2G Memry', text: post.caption, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied!' });
      }
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied!' });
    }
  };

  const handleSendMessage = async () => {
    if (!inlineMsg.trim() || !user) return;
    const realPostId = post.id.replace(/^(product|book|music|orchard)-/, '');
    const { error } = await supabase.from('memry_comments').insert({
      post_id: realPostId,
      user_id: user.id,
      content: inlineMsg.trim(),
    });
    if (!error) {
      toast({ title: 'Message sent! 💬' });
      setInlineMsg('');
    }
  };

  const handlePrivateMessage = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to message', variant: 'destructive' });
      return;
    }
    if (onPrivateMessage) {
      onPrivateMessage(post.user_id, post.caption);
    }
  };

  const handleBestow = () => {
    if (isProduct && post.product_id) {
      const productId = post.product_id.replace('product-', '');
      addToBasket({
        id: productId,
        title: post.product_title || post.caption.replace('🌱 SEED: ', ''),
        price: post.product_price || 0,
        cover_image_url: post.media_url,
        sower_id: post.user_id,
        bestowal_count: 1,
        sowers: { display_name: post.profiles?.display_name || 'Sower' },
      });
      toast({ title: 'Added to basket! 🛒' });
      navigate('/products/basket');
    } else if (isOrchard && post.orchard_id) {
      navigate(`/orchard/${post.orchard_id}`);
    } else if (isBook && post.book_id) {
      const bookId = post.book_id.replace('book-', '');
      addToBasket({
        id: bookId,
        title: post.product_title || post.caption.replace('📚 BOOK: ', ''),
        price: post.product_price || 0,
        cover_image_url: post.media_url,
        sower_id: post.user_id,
        bestowal_count: 1,
        sowers: { display_name: post.profiles?.display_name || 'Sower' },
      });
      toast({ title: 'Book added to basket! 📚' });
      navigate('/products/basket');
    } else {
      navigate(`/member/${post.user_id}`);
    }
  };

  return (
    <div ref={cardRef} className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md">
      {/* ── Section 1: Image Zone ── */}
      <div className="relative w-full" style={{ height: 340 }}>
        {/* Seed image */}
        {isMusic && !post.media_url && !post.image_urls?.length ? (
          <div className="w-full h-full bg-gradient-to-br from-violet-700 via-purple-600 to-pink-500 flex items-center justify-center">
            <Music className="w-20 h-20 text-white/30" />
          </div>
        ) : post.media_url && /\.(mp4|webm|mov)(\?|$)/i.test(post.media_url) ? (
          <video
            src={post.media_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            poster={post.image_urls?.[0]}
            onError={(e) => {
              const t = e.target as HTMLVideoElement;
              if (!t.dataset.fallback) {
                t.dataset.fallback = '1';
                t.poster = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';
              }
            }}
          />
        ) : (
          <img
            src={allImages[imgIdx] || post.media_url}
            alt={post.caption}
            className="w-full h-full object-cover"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              if (!t.dataset.fallback) {
                t.dataset.fallback = '1';
                t.src = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';
              }
            }}
          />
        )}

        {/* Top-left: Badge with seed type */}
        {(isSeed || isMusic || isProduct) && (
          <Badge className="absolute top-3 left-3 z-10 bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
            {getSeedTypeLabel()} — New Available
          </Badge>
        )}

        {/* Top-right: Slide count pill */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            {imgIdx + 1} / {allImages.length}
          </div>
        )}

        {!!post.sower_seed_number && (
          <div className="absolute top-3 right-3 z-10 translate-y-8 bg-background/75 text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border border-border/50">
            Seed #{post.sower_seed_number}
          </div>
        )}

        {/* Image navigation arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={() => setImgIdx(Math.max(0, imgIdx - 1))}
              disabled={imgIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImgIdx(Math.min(allImages.length - 1, imgIdx + 1))}
              disabled={imgIdx === allImages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Sower row + title overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-3">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Link to={`/member/${post.user_id}`}>
              <Avatar className="w-9 h-9 border-2 border-white/70 shadow">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-xs">
                  {post.profiles?.display_name?.[0] || 'S'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link to={`/member/${post.user_id}`} className="text-white font-bold text-sm truncate hover:underline">
                  {post.profiles?.display_name || 'Sower'}
                </Link>
                {(isSeed || isMusic) && (
                  <span className="bg-emerald-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{getSeedTypeLabel()}</span>
                )}
                {isFollowing && (
                  <span className="bg-white/20 text-white/80 text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">Following</span>
                )}
              </div>
              <p className="text-white/60 text-[11px]">@{toHandle(post.profiles?.username || post.profiles?.display_name)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-white font-semibold text-[16px] leading-tight line-clamp-2 drop-shadow flex-1">
              {post.product_title || post.caption}
            </p>
            {hasAudio && (
              <SeedAudioPreview audioUrl={post.audio_url || post.media_url} />
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Actions Row ── */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 flex-nowrap">
          <button onClick={() => onLike(post.id)} className="flex items-center gap-1 text-muted-foreground hover:text-pink-500 transition-colors">
            <Heart className={`w-[18px] h-[18px] ${post.user_liked ? 'text-pink-500 fill-pink-500' : ''}`} />
            <span className="text-xs font-medium">{post.likes_count}</span>
          </button>
          <button onClick={() => onOpenComments(post.id)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="w-[18px] h-[18px]" />
            <span className="text-xs font-medium">{post.comments_count}</span>
          </button>
          <button onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="w-[18px] h-[18px]" />
          </button>
          {user && post.user_id !== user?.id && (
            <button onClick={handlePrivateMessage} className="text-muted-foreground hover:text-blue-500 transition-colors" title={`Private message ${post.profiles?.display_name || 'sower'}`}>
              <Lock className="w-[16px] h-[16px]" />
            </button>
          )}
          <div className="flex-1" />
          <Input
            placeholder={user ? `Say something...` : 'Sign in to comment'}
            value={inlineMsg}
            onChange={(e) => setInlineMsg(e.target.value)}
            disabled={!user}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); }
            }}
            className="h-8 text-xs rounded-full px-4 w-[52%] min-w-[220px] bg-muted border-border"
          />
          {user && (
            <button onClick={handleSendMessage} className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center flex-shrink-0 transition-colors">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ── Section 3: Hairline divider ── */}
      <div className="h-px bg-border/50" />

      {/* ── Section 4: Bestow bar ── */}
      <button
        onClick={handleBestow}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 transition-colors text-amber-950 font-bold text-sm rounded-b-2xl"
      >
        <Gift className="w-4 h-4" />
        {isBook ? 'Bestow & Get This Book' : isMusic ? 'Bestow & Get This Track' : 'Bestow & Get This Seed'}
      </button>
    </div>
  );
};
