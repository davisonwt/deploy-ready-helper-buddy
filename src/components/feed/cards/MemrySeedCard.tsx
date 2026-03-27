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
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [playing, setPlaying] = useState(false);
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
        const url = await resolveAudioUrl(urlToResolve, { bucketForKeys: 'music-tracks' });
        if (!cancelled) setResolvedUrl(url);
      } catch {
        if (!cancelled) setResolvedUrl(audioUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    globalAudioManager.register(audio);
    return () => { globalAudioManager.unregister(audio); };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.src = resolvedUrl;
      globalAudioManager.play(audio);
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
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
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  return (
    <div className="absolute bottom-14 left-3 right-3 z-20">
      <audio ref={audioRef} preload="none" className="hidden" />
      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5">
        <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform flex-shrink-0">
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(currentTime / PREVIEW_DURATION) * 100}%` }} />
        </div>
        <span className="text-white text-[10px] font-mono flex-shrink-0">
          {Math.floor(currentTime)}s/{PREVIEW_DURATION}s
        </span>
        <Music className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
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

  const allImages = post.image_urls && post.image_urls.length > 1 ? post.image_urls : [post.media_url];
  const hasMultipleImages = allImages.length > 1;
  const isProduct = post.content_type === 'new_product';
  const isOrchard = post.content_type === 'new_orchard';
  const isBook = post.content_type === 'new_book';
  const isMusic = post.content_type === 'music';
  const isSeed = isProduct || isOrchard || isBook;
  const hasAudio = !!(post.audio_url || isMusic);

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
    <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-md">
      {/* ── Section 1: Image Zone ── */}
      <div className="relative w-full" style={{ height: 340 }}>
        {/* Seed image */}
        {isMusic && !post.image_urls?.length ? (
          <div className="w-full h-full bg-gradient-to-br from-violet-700 via-purple-600 to-pink-500 flex items-center justify-center">
            <Music className="w-20 h-20 text-white/30" />
          </div>
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

        {/* Top-left: Badge */}
        {(isSeed || isMusic) && (
          <Badge className="absolute top-3 left-3 z-10 bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
            {isProduct ? '🌱 New Seed Available' : isBook ? '📚 New Book Available' : isMusic ? '🎵 Music Seed' : '🌳 New Orchard Planted'}
          </Badge>
        )}

        {/* Top-right: Slide count pill */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            {imgIdx + 1} / {allImages.length}
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

        {/* 30s audio preview player */}
        {hasAudio && (
          <SeedAudioPreview audioUrl={post.audio_url || post.media_url} />
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
                {isSeed && (
                  <span className="bg-emerald-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Seed</span>
                )}
                {isFollowing && (
                  <span className="bg-white/20 text-white/80 text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">Following</span>
                )}
              </div>
              <p className="text-white/60 text-[11px]">@{toHandle(post.profiles?.username || post.profiles?.display_name)}</p>
            </div>
          </div>

          <p className="text-white font-semibold text-[16px] leading-tight line-clamp-2 drop-shadow">
            {post.product_title || post.caption}
          </p>
        </div>
      </div>

      {/* ── Section 2: Actions Row ── */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Heart + count */}
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1 text-muted-foreground hover:text-pink-500 transition-colors"
        >
          <Heart className={`w-[18px] h-[18px] ${post.user_liked ? 'text-pink-500 fill-pink-500' : ''}`} />
          <span className="text-xs font-medium">{post.likes_count}</span>
        </button>

        {/* Comment + count */}
        <button
          onClick={() => onOpenComments(post.id)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          <span className="text-xs font-medium">{post.comments_count}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="w-[18px] h-[18px]" />
        </button>

        {/* Private message button */}
        {user && post.user_id !== user?.id && (
          <button
            onClick={handlePrivateMessage}
            className="text-muted-foreground hover:text-blue-500 transition-colors"
            title={`Private message ${post.profiles?.display_name || 'sower'}`}
          >
            <Lock className="w-[16px] h-[16px]" />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Message input pill + send — wider */}
        <Input
          placeholder={user ? `Say something...` : 'Sign in to comment'}
          value={inlineMsg}
          onChange={(e) => setInlineMsg(e.target.value)}
          disabled={!user}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="h-7 text-[11px] rounded-full px-3 flex-1 min-w-0 bg-muted border-border"
        />
        {user && (
          <button
            onClick={handleSendMessage}
            className="w-7 h-7 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        )}
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
