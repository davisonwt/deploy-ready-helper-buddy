import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Send, Gift, ChevronLeft, ChevronRight, Play, Pause, Music, Lock, Sparkles } from 'lucide-react';
import { SowerStoryStrip } from './SowerStoryStrip';
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
import { dedupeUrls, isAudioUrl, isVideoUrl, normalizeMediaUrl } from '@/utils/memryFeedMedia';

const isManifestUrl = (url?: string) => /manifest\.json(?:[?#]|$)/i.test(String(url || ''));
const isPlayableAudioUrl = (url?: string) => isAudioUrl(url) || isManifestUrl(url);

interface MemrySeedCardProps {
  post: {
    id: string;
    user_id: string;
    content_type: string;
    media_url: string;
    media?: { type: 'image' | 'video' | 'audio'; url: string }[];
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
    content_category?: string;
  };
  user: any;
  isFollowing: boolean;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onOpenComments: (postId: string) => void;
  onPrivateMessage?: (targetUserId: string, seedCaption: string) => void;
  /** True when this orchard has received an Elder Council blessing */
  isBlessed?: boolean;
}

const toHandle = (value?: string) => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return 'sower';
  return v.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'sower';
};

const stripFeedTitlePrefix = (value?: string) =>
  String(value || '')
    .replace(/^(🌱\s*)?seed:\s*/i, '')
    .replace(/^(🎵\s*)?music:\s*/i, '')
    .replace(/^(📚\s*)?book:\s*/i, '')
    .trim();

/* ── 30-second audio preview player ── */
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
    return () => { cancelled = true; };
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
        if (audio.src !== resolvedUrl) { audio.src = resolvedUrl; audio.load(); }
        if (audio.currentTime >= PREVIEW_DURATION || audio.currentTime === 0) audio.currentTime = 0;
        globalAudioManager.play(audio);
        await audio.play();
        setPlaying(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          audio.pause(); audio.currentTime = 0; setPlaying(false); setCurrentTime(0);
        }, PREVIEW_DURATION * 1000);
      } catch { setPlaying(false); } finally { setLoading(false); }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { setCurrentTime(audio.currentTime); if (audio.currentTime >= PREVIEW_DURATION) { audio.pause(); audio.currentTime = 0; setPlaying(false); } };
    const onEnd = () => setPlaying(false);
    const onPause = () => { setPlaying(false); if (audio.currentTime === 0) setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); audio.removeEventListener('pause', onPause); };
  }, []);

  return (
    <div className="flex-shrink-0 w-[108px] sm:w-[116px]">
      <audio ref={audioRef} preload="metadata" playsInline className="hidden" />
      <div className="h-8 flex items-center gap-1.5 bg-muted/80 rounded-full px-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(); }}
          className="text-foreground hover:scale-110 transition-transform flex-shrink-0 border-0 p-0 bg-transparent cursor-pointer"
          disabled={loading || !resolvedUrl}
          aria-label={playing ? 'Pause preview' : 'Play preview'}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1 h-[2px] bg-foreground/20 rounded-full overflow-hidden">
          <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${(currentTime / PREVIEW_DURATION) * 100}%` }} />
        </div>
        <span className="text-foreground text-[8px] font-mono flex-shrink-0">
          {Math.floor(currentTime)}s/{PREVIEW_DURATION}s
        </span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   REBUILT FROM SCRATCH — zero absolute, zero z-index, pure flow
   ══════════════════════════════════════════════════════════════ */

export const MemrySeedCard: React.FC<MemrySeedCardProps> = ({
  post, user, isFollowing, onLike, onFollow, onOpenComments, onPrivateMessage, isBlessed = false,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToBasket } = useProductBasket();
  const [imgIdx, setImgIdx] = useState(0);
  const [inlineMsg, setInlineMsg] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const fallbackMedia = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';
  const mediaUrl = normalizeMediaUrl(post.media_url || '');
  const normalizedPayloadMedia = (post.media || []).map((item) => ({ type: item.type, url: normalizeMediaUrl(item.url) })).filter((item) => Boolean(item.url));
  const payloadMediaUrls = dedupeUrls(normalizedPayloadMedia.map((item) => item.url));
  const normalizedPostAudioUrl = normalizeMediaUrl(post.audio_url || '');
  const normalizedContentType = String(post.content_type || '').toLowerCase();
  const isMusicPost = normalizedContentType === 'music';
  const normalizedImageUrls = (post.image_urls || []).map((url) => normalizeMediaUrl(url)).filter(Boolean);
  const mediaCandidates = dedupeUrls([...payloadMediaUrls, mediaUrl, ...normalizedImageUrls, normalizedPostAudioUrl].filter(Boolean));

  const videoCandidates = dedupeUrls([
    ...normalizedPayloadMedia.filter((item) => item.type === 'video').map((item) => item.url),
    ...(isMusicPost ? [] : mediaCandidates.filter((url) => isVideoUrl(url))),
  ]);
  const imageCandidates = dedupeUrls([
    ...normalizedPayloadMedia.filter((item) => item.type === 'image').map((item) => item.url),
    ...normalizedImageUrls,
    ...mediaCandidates.filter((url) => !isVideoUrl(url) && !isAudioUrl(url)),
  ]);
  const audioCandidates = dedupeUrls([
    ...normalizedPayloadMedia.filter((item) => item.type === 'audio').map((item) => item.url),
    normalizedPostAudioUrl,
    ...mediaCandidates.filter((url) => isAudioUrl(url)),
  ]);

  const primaryVideoUrl = videoCandidates[0] || '';
  const isVideo = !isMusicPost && (videoCandidates.length > 0 || (normalizedContentType === 'video' && isVideoUrl(mediaUrl)));
  const allImages = (() => {
    const imgs = imageCandidates;
    if (imgs.length > 0) return imgs;
    if (isVideo) return [];
    return [fallbackMedia];
  })();
  const resolvedVideoSrc = primaryVideoUrl || mediaUrl;
  const hasMultipleImages = allImages.length > 1;

  const isProduct = post.content_type === 'new_product';
  const isOrchard = post.content_type === 'new_orchard';
  const isBook = post.content_type === 'new_book';
  const isMusic = post.content_type === 'music';
  const isSeed = isProduct || isOrchard || isBook;
  const titleText = stripFeedTitlePrefix(post.product_title || post.caption);
  const categoryText = String(post.category || post.product_type || post.content_type || '').toLowerCase();
  const audioPreviewUrl = isMusic ? (post.audio_url || audioCandidates[0] || '') : (audioCandidates[0] || mediaUrl);
  const hasAudio = !!((isMusic || categoryText.includes('music') || categoryText.includes('audio')) && audioPreviewUrl && isPlayableAudioUrl(audioPreviewUrl) && !isVideo);

  useEffect(() => { setImgIdx((c) => Math.min(c, Math.max(0, allImages.length - 1))); }, [allImages.length]);

  useEffect(() => {
    setVideoPlaying(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, [resolvedVideoSrc, post.id]);

  const toggleVideoPlayback = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play().catch(() => {});
    else vid.pause();
  };

  /* Intersection observer for auto-pause */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.55), { threshold: [0.55] });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView || !hasAudio) return;
    const localAudios = cardRef.current?.querySelectorAll('audio') ?? [];
    localAudios.forEach((audioEl) => { audioEl.pause(); audioEl.currentTime = 0; });
  }, [isInView, hasAudio]);

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
      if (navigator.share) await navigator.share({ title: 'S2G Memry', text: post.caption, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); toast({ title: 'Link copied!' }); }
    } catch { await navigator.clipboard.writeText(shareUrl); toast({ title: 'Link copied!' }); }
  };

  const handleSendMessage = async () => {
    if (!inlineMsg.trim() || !user) return;
    const realPostId = post.id.replace(/^(product|book|music|orchard)-/, '');
    const { error } = await supabase.from('memry_comments').insert({ post_id: realPostId, user_id: user.id, content: inlineMsg.trim() });
    if (!error) { toast({ title: 'Message sent! 💬' }); setInlineMsg(''); }
  };

  const handlePrivateMessage = async () => {
    if (!user) { toast({ title: 'Sign in required', description: 'Please sign in to message', variant: 'destructive' }); return; }
    if (onPrivateMessage) onPrivateMessage(post.user_id, post.caption);
  };

  const handleBestow = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const resolveId = (raw: string | undefined, prefix: string) => raw ? raw.replace(`${prefix}-`, '') : undefined;
    const productId = resolveId(post.product_id, 'product');
    const bookId = resolveId(post.book_id, 'book');
    if ((isProduct || isMusic) && productId) {
      addToBasket({ id: productId, title: post.product_title || post.caption.replace(/^(🌱 SEED:|🎵 MUSIC:)\s*/i, ''), price: post.product_price || 0, cover_image_url: post.media_url, sower_id: post.user_id, bestowal_count: 1, sowers: { display_name: post.profiles?.display_name || 'Sower' } });
      toast({ title: isMusic ? 'Track added to basket! 🎵' : 'Added to basket! 🛒' });
      navigate('/products/basket');
    } else if (isOrchard && post.orchard_id) {
      navigate(`/animated-orchard/${post.orchard_id}`);
    } else if (isBook && bookId) {
      addToBasket({ id: bookId, title: post.product_title || post.caption.replace('📚 BOOK: ', ''), price: post.product_price || 0, cover_image_url: post.media_url, sower_id: post.user_id, bestowal_count: 1, sowers: { display_name: post.profiles?.display_name || 'Sower' } });
      toast({ title: 'Book added to basket! 📚' });
      navigate('/products/basket');
    } else if (post.user_id) {
      navigate(`/sower/${post.user_id}?bestow=true`);
    }
  };

  /* ════════════════════════════════════════════
     RENDER — Pure document flow, NO absolute, NO z-index
     ════════════════════════════════════════════ */
  return (
    <div ref={cardRef} className="premium-card grain-overlay overflow-hidden flex flex-col">

      {/* ── ROW 1: Seed type badge (only for seeds/music) ── */}
      {(isSeed || isMusic) && (
        <div className="px-3 py-2 bg-card flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1">
            {getSeedTypeLabel()} — New Available
          </Badge>
          {!!post.sower_seed_number && (
            <span className="text-muted-foreground text-[10px] font-bold">Seed #{post.sower_seed_number}</span>
          )}
        </div>
      )}

      {/* ── ROW 2: Title ── */}
      {titleText && (
        <div className="px-3 py-1.5 bg-card">
          <p className="text-foreground font-semibold text-base leading-tight line-clamp-2">{titleText}</p>
        </div>
      )}

      {/* ── ROW 3: Media (image / video / music gradient) — 100% width, aspect ratio ── */}
      <div className="w-full">
        {isMusic && !post.media_url && !post.image_urls?.length ? (
          /* Music gradient placeholder */
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-violet-700 via-purple-600 to-pink-500 flex items-center justify-center">
            <Music className="w-20 h-20 text-white/30" />
          </div>
        ) : isVideo ? (
          /* Video — native element, full width, correct aspect ratio */
          <div className="w-full bg-black">
            <video
              ref={videoRef}
              src={resolvedVideoSrc}
              className="w-full block"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
              muted={false}
              playsInline
              preload="auto"
              loop
              poster={imageCandidates[0] || undefined}
              onPlaying={() => setVideoPlaying(true)}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onError={() => setVideoPlaying(false)}
            />
          </div>
        ) : (
          /* Image — full width, normal flow */
          <div className="w-full bg-black">
            <img
              src={allImages[Math.min(imgIdx, allImages.length - 1)]}
              alt={post.caption}
              className="w-full block"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = fallbackMedia; }
              }}
            />
          </div>
        )}
      </div>

      {/* ── ROW 3b: Image navigation (only if multiple images) ── */}
      {hasMultipleImages && (
        <div className="flex items-center justify-center gap-3 py-1.5 bg-card">
          <button
            onClick={() => setImgIdx(Math.max(0, imgIdx - 1))}
            disabled={imgIdx === 0}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-foreground disabled:opacity-20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground text-xs font-medium">{imgIdx + 1} / {allImages.length}</span>
          <button
            onClick={() => setImgIdx(Math.min(allImages.length - 1, imgIdx + 1))}
            disabled={imgIdx === allImages.length - 1}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-foreground disabled:opacity-20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── ROW 3c: Video play/pause button (only for video cards) ── */}
      {isVideo && (
        <div className="flex justify-end px-3 py-1.5 bg-card">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleVideoPlayback(); }}
            className="h-8 flex items-center gap-1.5 bg-muted/80 rounded-full px-3"
            aria-label={videoPlaying ? 'Pause video' : 'Play video'}
          >
            {videoPlaying ? <Pause className="w-3.5 h-3.5 text-foreground" /> : <Play className="w-3.5 h-3.5 text-foreground" />}
            <span className="text-foreground text-xs font-medium">{videoPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      )}

      {/* ── ROW 4: Sower avatar + name + audio preview ── */}
      <div className="px-3 py-2 bg-card flex items-center gap-2.5">
        <Link to={`/member/${post.user_id}`}>
          <Avatar className="w-9 h-9 border-2 border-border shadow">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-xs">
              {post.profiles?.display_name?.[0] || 'S'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/member/${post.user_id}`} className="text-foreground font-bold text-sm truncate hover:underline">
              {post.profiles?.display_name || 'Sower'}
            </Link>
            {(isSeed || isMusic) && (
              <span className="bg-emerald-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{getSeedTypeLabel()}</span>
            )}
            {isOrchard && isBlessed && (
              <span
                title="Blessed by the Elder Council"
                className="inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Council Blessed
              </span>
            )}
            {isFollowing && (
              <span className="bg-muted text-muted-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded-full">Following</span>
            )}
          </div>
          <p className="text-muted-foreground text-[11px]">@{toHandle(post.profiles?.username || post.profiles?.display_name)}</p>
        </div>
        {hasAudio && !!audioPreviewUrl && <SeedAudioPreview audioUrl={audioPreviewUrl} />}
      </div>

      {/* ── ROW 5: Sower Story Strip ── */}
      <SowerStoryStrip
        seedId={post.id}
        sowerName={post.profiles?.display_name || 'Sower'}
        seedTitle={post.product_title || post.caption}
        daysSincePlanted={0}
        bestowalsCount={post.likes_count || 0}
        engagements={post.comments_count || 0}
        seedCategory={getSeedTypeLabel()}
        sowerUserId={post.user_id}
        currentUserId={user?.id}
      />

      {/* ── ROW 6: Bestowal Value (books/music only) ── */}
      {(isBook || isMusic) && post.product_price != null && post.product_price > 0 && (
        <div className="px-3 py-1.5 bg-card">
          <span className="text-emerald-400 font-bold text-sm">Bestowal Value: ${post.product_price.toFixed(2)}</span>
        </div>
      )}

      {/* ── ROW 7: Action buttons row ── */}
      <div className="px-3 py-2.5 bg-card">
        <div className="flex items-center gap-3 flex-nowrap">
          <button onClick={() => onLike(post.id)} className="flex items-center gap-1 bg-transparent border-none p-0 text-muted-foreground hover:text-pink-500 transition-colors">
            <Heart className={`w-[18px] h-[18px] ${post.user_liked ? 'text-pink-500 fill-pink-500' : ''}`} />
            <span className="text-xs font-medium">{post.likes_count}</span>
          </button>
          <button onClick={() => onOpenComments(post.id)} className="flex items-center gap-1 bg-transparent border-none p-0 text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="w-[18px] h-[18px]" />
            <span className="text-xs font-medium">{post.comments_count}</span>
          </button>
          <button onClick={handleShare} className="bg-transparent border-none p-0 text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="w-[18px] h-[18px]" />
          </button>
          {user && post.user_id !== user?.id && (
            <button onClick={handlePrivateMessage} className="bg-transparent border-none p-0 text-muted-foreground hover:text-blue-400 transition-colors" title={`Private message ${post.profiles?.display_name || 'sower'}`}>
              <Lock className="w-[16px] h-[16px]" />
            </button>
          )}
          <div className="flex-1" />
          <Input
            placeholder={user ? 'Say something...' : 'Sign in to comment'}
            value={inlineMsg}
            onChange={(e) => setInlineMsg(e.target.value)}
            disabled={!user}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
            className="h-7 text-xs rounded-full px-3 w-[48%] min-w-[160px] bg-transparent border border-border text-foreground placeholder:text-muted-foreground"
          />
          {user && (
            <button onClick={handleSendMessage} className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center flex-shrink-0 transition-colors">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 8: Divider ── */}
      <div className="h-px bg-border/50" />

      {/* ── ROW 9: Bestow / Gift bar ── */}
      {(() => {
        const isHomemade = post.content_category === 'homemade' || post.content_category === 'testimony' || post.content_category === 'tutorial';
        const ctaLabel = isHomemade
          ? '🎁 Gift to Content Creator'
          : isBook ? '🎁 Bestow & Get This Book' : isMusic ? '🎁 Bestow & Get This Track' : '🎁 Bestow & Get This Seed';
        return (
          <button
            type="button"
            onClick={(e) => handleBestow(e)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 transition-colors text-amber-950 font-bold text-sm rounded-b-2xl"
          >
            <Gift className="w-4 h-4" />
            {ctaLabel}
          </button>
        );
      })()}
    </div>
  );
};

export default MemrySeedCard;
