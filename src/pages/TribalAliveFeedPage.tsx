/**
 * TribalAliveFeedPage — "SeedFlow"
 *
 * Vertical, TikTok-style tribal feed of EVERYTHING anyone planted:
 *   seeds + products (music/book/video/art/home) + recorded radio + community videos.
 *
 * Each card carries the full action stack the tribe expects:
 *   • 45s preview play (audio/video)
 *   • Bestow & Get This Seed (instant basket)
 *   • Message  → in-house ChatApp DM with the sower (no email/phone ever surfaced)
 *   • Voice    → Jitsi 1:1 audio room with the sower
 *   • Video    → Jitsi 1:1 video room with the sower
 *   • Like / Bloom reactions
 *   • Share (referral burned in)
 *   • Go Live  → broadcast THIS seed to the orchard via Jitsi presence
 *
 * Top: Following / For You / Local tabs + Wandering badge filter bar.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Heart, MessageCircle, Mic, Video, Share2,
  Search, Bell, Radio, ArrowLeft, Gift, Sparkles, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useReferralCode } from '@/hooks/useReferralCode';
import { useToast } from '@/hooks/use-toast';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { JITSI_DOMAIN } from '@/lib/jitsi-config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import WanderingBadgeBar, { type WanderingRole, WANDERING_BADGES } from '@/components/marketplace/WanderingBadgeBar';
import { launchConfetti, playSoundEffect } from '@/utils/confetti';

type FeedTab = 'following' | 'foryou' | 'local';

interface FeedItem {
  key: string;
  kind: 'seed' | 'product' | 'radio' | 'video';
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
  price?: number | null;
  sower_id: string | null;
  sower_name: string;
  sower_avatar?: string | null;
  sower_handle?: string | null;
  wandering_role?: WanderingRole | null;
  created_at: string;
  href: string;
}

const sowerName = (p: any) =>
  p?.display_name ||
  `${p?.first_name || ''} ${p?.last_name || ''}`.trim() ||
  'Tribe member';

const wanderingFor = (item: { kind: FeedItem['kind']; wandering_role?: string | null; type?: string | null }): WanderingRole | null => {
  if (item.wandering_role && WANDERING_BADGES.find((b) => b.key === item.wandering_role as WanderingRole)) {
    return item.wandering_role as WanderingRole;
  }
  if (item.kind === 'video') return 'story';
  if (item.kind === 'radio') return 'whisperer';
  if (item.kind === 'seed') return 'hearth';
  // products: lean on type
  switch ((item.type || '').toLowerCase()) {
    case 'music': return 'whisperer';
    case 'book': case 'ebook': return 'story';
    case 'video': return 'story';
    case 'home': return 'pillow';
    default: return null;
  }
};

export default function TribalAliveFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { code: referralCode } = useReferralCode();
  const { addToBasket } = useProductBasket();
  const { goLive } = useTribalLiveOrchard();

  const [tab, setTab] = useState<FeedTab>('foryou');
  const [wanderingRole, setWanderingRole] = useState<WanderingRole | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeRoom, setActiveRoom] = useState<{ room: string; title: string; mode: 'audio' | 'video' } | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Load everything everyone planted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [seedsRes, productsRes, radioRes, videosRes] = await Promise.all([
          supabase.from('seeds')
            .select('id, title, description, images, video_url, gifter_id, category, created_at')
            .order('created_at', { ascending: false }).limit(60),
          supabase.from('products')
            .select('id, title, description, type, cover_image_url, image_urls, file_url, price, sower_id, wandering_role, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false }).limit(80),
          supabase.from('radio_live_sessions')
            .select('id, status, started_at, ended_at, created_at, schedule_id')
            .order('created_at', { ascending: false }).limit(30),
          supabase.from('community_videos')
            .select('id, title, description, video_url, thumbnail_url, uploader_id, created_at')
            .order('created_at', { ascending: false }).limit(60),
        ]);

        if (cancelled) return;

        const sowerIds = Array.from(new Set([
          ...(seedsRes.data || []).map((s: any) => s.gifter_id),
          ...(productsRes.data || []).map((p: any) => p.sower_id),
          ...(videosRes.data || []).map((v: any) => v.uploader_id),
        ].filter(Boolean)));

        const profileMap: Record<string, any> = {};
        if (sowerIds.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, user_id, first_name, last_name, display_name, avatar_url')
            .in('user_id', sowerIds as string[]);
          (profs || []).forEach((p: any) => { profileMap[p.user_id] = p; });
        }

        const seedItems: FeedItem[] = (seedsRes.data || []).map((s: any) => ({
          key: `seed-${s.id}`, kind: 'seed', id: s.id,
          title: s.title || 'Untitled seed',
          description: s.description,
          image: (s.images && s.images[0]) || null,
          video_url: s.video_url || null,
          sower_id: s.gifter_id,
          sower_name: sowerName(profileMap[s.gifter_id]),
          sower_avatar: profileMap[s.gifter_id]?.avatar_url || null,
          sower_handle: profileMap[s.gifter_id]?.display_name?.toLowerCase().replace(/\s+/g, '') || null,
          wandering_role: wanderingFor({ kind: 'seed' }),
          created_at: s.created_at,
          href: `/seed/${s.id}`,
        }));

        const productItems: FeedItem[] = (productsRes.data || []).map((p: any) => {
          const isAudio = (p.type || '').toLowerCase() === 'music' || /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(p.file_url || '');
          const isVideo = (p.type || '').toLowerCase() === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(p.file_url || '');
          return {
            key: `product-${p.id}`, kind: 'product', id: p.id,
            title: p.title || 'Untitled creation',
            description: p.description,
            image: p.cover_image_url || (p.image_urls && p.image_urls[0]) || null,
            audio_url: isAudio ? p.file_url : null,
            video_url: isVideo ? p.file_url : null,
            price: Number(p.price ?? 2),
            sower_id: p.sower_id,
            sower_name: sowerName(profileMap[p.sower_id]),
            sower_avatar: profileMap[p.sower_id]?.avatar_url || null,
            sower_handle: profileMap[p.sower_id]?.display_name?.toLowerCase().replace(/\s+/g, '') || null,
            wandering_role: wanderingFor({ kind: 'product', wandering_role: p.wandering_role, type: p.type }),
            created_at: p.created_at,
            href: `/products`,
          };
        });

        const radioItems: FeedItem[] = (radioRes.data || []).map((r: any) => ({
          key: `radio-${r.id}`, kind: 'radio', id: r.id,
          title: r.status === 'live' ? '🔴 Live tribal radio' : 'Recorded radio session',
          description: r.status === 'live' ? 'Live now in the orchard' : 'A past broadcast — tap to listen',
          image: null,
          sower_id: null,
          sower_name: 'Tribal Radio',
          wandering_role: 'whisperer',
          created_at: r.created_at,
          href: `/grove-station?session=${r.id}`,
        }));

        const videoItems: FeedItem[] = (videosRes.data || []).map((v: any) => ({
          key: `video-${v.id}`, kind: 'video', id: v.id,
          title: v.title || 'Tribal broadcast',
          description: v.description,
          image: v.thumbnail_url || null,
          video_url: v.video_url || null,
          sower_id: v.uploader_id,
          sower_name: sowerName(profileMap[v.uploader_id]),
          sower_avatar: profileMap[v.uploader_id]?.avatar_url || null,
          sower_handle: profileMap[v.uploader_id]?.display_name?.toLowerCase().replace(/\s+/g, '') || null,
          wandering_role: 'story',
          created_at: v.created_at,
          href: `/community-videos`,
        }));

        const merged = [...seedItems, ...productItems, ...radioItems, ...videoItems]
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        setItems(merged);
      } catch (e) {
        console.warn('[seedflow] load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filtered view: tab + wandering role
  const filtered = useMemo(() => {
    let list = items;
    if (wanderingRole) list = list.filter((i) => i.wandering_role === wanderingRole);
    if (tab === 'following' && followingIds.size > 0) {
      list = list.filter((i) => i.sower_id && followingIds.has(i.sower_id));
    } else if (tab === 'following') {
      // No follows yet — show empty hint
      list = [];
    }
    return list;
  }, [items, wanderingRole, tab, followingIds]);

  // Snap-scroll: track which card is centered → autoplays its preview
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
      { root, threshold: [0.6] }
    );
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [filtered.length]);

  /* ───────── actions ───────── */

  const inviteOrigin = 'https://sow2growapp.com';
  const buildShareUrl = (path: string) => {
    const url = new URL(path, inviteOrigin);
    if (referralCode) url.searchParams.set('ref', referralCode);
    return url.toString();
  };

  const handleShare = async (item: FeedItem) => {
    const url = buildShareUrl(item.href);
    const text = `🌿 "${item.title}" is alive in the Sow2Grow orchard. Step in:\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text, url });
      else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Invitation copied', description: 'Your referral code is burned into the link.' });
      }
    } catch {/* dismissed */}
  };

  const handleBestow = (item: FeedItem) => {
    if (item.kind !== 'product' && item.kind !== 'seed') {
      navigate(item.href);
      return;
    }
    addToBasket({
      id: item.id,
      title: item.title,
      price: Number(item.price ?? 2),
      cover_image_url: item.image || undefined,
      sower_id: item.sower_id || undefined,
      bestowal_count: 0,
      sowers: { display_name: item.sower_name },
    } as any);
    launchConfetti();
    playSoundEffect('bestow', 0.8);
    navigate('/products/basket');
  };

  // Open private 1:1 ChatApp DM thread with sower
  const handleMessage = (item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    if (!item.sower_id) {
      toast({ title: 'No sower attached', description: 'This item has no contactable creator.' });
      return;
    }
    if (item.sower_id === user.id) {
      toast({ title: 'That is you 🌱', description: 'You are looking at your own seed.' });
      return;
    }
    // Route into the in-house ChatApp with the sower as the target
    navigate(`/communications-hub?dm=${item.sower_id}#chats`);
  };

  // 1:1 Jitsi audio call
  const handleVoice = (item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    if (!item.sower_id) return;
    const room = `s2g_dm_${[user.id, item.sower_id].sort().join('_').replace(/-/g, '')}_audio`;
    setActiveRoom({ room, title: `Voice with ${item.sower_name}`, mode: 'audio' });
  };

  // 1:1 Jitsi video call
  const handleVideo = (item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    if (!item.sower_id) return;
    const room = `s2g_dm_${[user.id, item.sower_id].sort().join('_').replace(/-/g, '')}_video`;
    setActiveRoom({ room, title: `Video with ${item.sower_name}`, mode: 'video' });
  };

  // Broadcast THIS seed live to the orchard
  const handleGoLive = async (item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    const presence = await goLive({ id: item.id, title: item.title, image: item.image });
    if (!presence) return;
    setActiveRoom({ room: presence.jitsi_room, title: `Live: ${item.title}`, mode: 'video' });
  };

  const toggleFollow = (sowerId: string | null) => {
    if (!sowerId) return;
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (next.has(sowerId)) next.delete(sowerId);
      else next.add(sowerId);
      return next;
    });
  };

  /* ───────── render ───────── */

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      {/* Top bar — Following / For You / Local */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/80 hover:text-white"
          aria-label="Back to my orchard"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">SeedFlow</span>
          <span className="text-xl">🌱</span>
        </button>

        <nav className="flex items-center gap-6 text-sm font-semibold">
          {(['following', 'foryou', 'local'] as FeedTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative pb-1 transition',
                tab === t ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
            >
              {t === 'following' ? 'Following' : t === 'foryou' ? 'For You' : 'Local'}
              {tab === t && (
                <motion.span
                  layoutId="tabUnderline"
                  className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-amber-400"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Wandering badge filter — pinned to the top, horizontally scrollable */}
      <div className="relative z-20 border-b border-white/10 bg-black/70 backdrop-blur-md px-2 sm:px-4 pt-1">
        <WanderingBadgeBar activeRole={wanderingRole} onRoleChange={setWanderingRole} />
      </div>

      {/* Vertical snap feed */}
      <main
        ref={containerRef}
        className="relative flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
        style={{ scrollSnapStop: 'always' }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} onSwitch={() => setTab('foryou')} onClearRole={() => setWanderingRole(null)} hasRole={!!wanderingRole} />
        ) : (
          filtered.map((item, idx) => (
            <div
              key={item.key}
              ref={(el) => { cardRefs.current[idx] = el; }}
              data-idx={idx}
              className="relative h-full w-full snap-start snap-always"
              style={{ scrollSnapStop: 'always' }}
            >
              <FeedCard
                item={item}
                isActive={idx === activeIdx}
                isFollowing={item.sower_id ? followingIds.has(item.sower_id) : false}
                onBestow={() => handleBestow(item)}
                onMessage={() => handleMessage(item)}
                onVoice={() => handleVoice(item)}
                onVideo={() => handleVideo(item)}
                onGoLive={() => handleGoLive(item)}
                onShare={() => handleShare(item)}
                onFollow={() => toggleFollow(item.sower_id)}
              />
            </div>
          ))
        )}
      </main>


      {/* Jitsi overlay */}
      <AnimatePresence>
        {activeRoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/60 px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                {activeRoom.title}
              </div>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setActiveRoom(null)}>
                Close
              </Button>
            </div>
            <iframe
              title={activeRoom.title}
              src={`https://${JITSI_DOMAIN}/${activeRoom.room}#config.prejoinPageEnabled=false&config.disableDeepLinking=true${activeRoom.mode === 'audio' ? '&config.startWithVideoMuted=true' : ''}`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="flex-1 border-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── card with 45s preview + action rail ───────── */

function FeedCard({
  item, isActive, isFollowing,
  onBestow, onMessage, onVoice, onVideo, onGoLive, onShare, onFollow,
}: {
  item: FeedItem;
  isActive: boolean;
  isFollowing: boolean;
  onBestow: () => void;
  onMessage: () => void;
  onVoice: () => void;
  onVideo: () => void;
  onGoLive: () => void;
  onShare: () => void;
  onFollow: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const PREVIEW = 45; // seconds

  // Stop media when card leaves view
  useEffect(() => {
    if (!isActive) {
      audioRef.current?.pause();
      videoRef.current?.pause();
      setPlaying(false);
      setTime(0);
    }
  }, [isActive]);

  const togglePlay = useCallback(() => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    if (playing) {
      media.pause();
      setPlaying(false);
    } else {
      media.currentTime = 0;
      media.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [playing]);

  // 45s cap
  useEffect(() => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;
    const onTime = () => {
      setTime(media.currentTime);
      if (media.currentTime >= PREVIEW) {
        media.pause();
        media.currentTime = 0;
        setPlaying(false);
        setTime(0);
      }
    };
    const onEnd = () => { setPlaying(false); setTime(0); };
    media.addEventListener('timeupdate', onTime);
    media.addEventListener('ended', onEnd);
    return () => {
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('ended', onEnd);
    };
  }, []);

  const badge = WANDERING_BADGES.find((b) => b.key === item.wandering_role);
  const showBestow = item.kind === 'product' || item.kind === 'seed';
  const previewable = !!(item.audio_url || item.video_url);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950">
      {/* Blurred ambient background (fills, but doesn't crop the real media) */}
      {item.image && (
        <img
          src={item.image}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl scale-110"
        />
      )}

      {/* Foreground media — fully visible, never cropped on phone */}
      {item.video_url ? (
        <video
          ref={videoRef}
          src={item.video_url}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
          muted={false}
          preload="metadata"
        />
      ) : item.image ? (
        <img
          src={item.image}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[20rem] opacity-10">
          {badge?.emoji ?? '🌱'}
        </div>
      )}
      {item.audio_url && (
        <audio ref={audioRef} src={item.audio_url} preload="metadata" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

      {/* Right action rail — compact, fully on-screen */}
      <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3 sm:right-3 sm:gap-4">
        <RailButton
          icon={<MessageCircle className="h-5 w-5" />}
          label="Message"
          onClick={onMessage}
        />
        <RailButton
          icon={<Mic className="h-5 w-5" />}
          label="Voice"
          onClick={onVoice}
        />
        <RailButton
          icon={<Video className="h-5 w-5" />}
          label="Video"
          onClick={onVideo}
        />
        <RailButton
          icon={<Heart className="h-5 w-5" />}
          label="Like"
          onClick={onShare}
        />
        <RailButton
          icon={<Radio className="h-5 w-5" />}
          label="Go Live"
          onClick={onGoLive}
          accent
        />
        <RailButton
          icon={<Share2 className="h-4 w-4" />}
          label="Share"
          onClick={onShare}
        />
      </div>

      {/* Left content stack */}
      <div className="absolute bottom-4 left-3 right-24 z-10 sm:left-5 sm:right-28">
        {badge && (
          <div
            className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${badge.color}40, ${badge.color}15)`,
              border: `1px solid ${badge.color}66`,
              color: badge.color,
            }}
          >
            <span>{badge.emoji}</span> {badge.label}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-white/30 bg-white/10">
            {item.sower_avatar ? (
              <img src={item.sower_avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm">{item.sower_name[0]}</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{item.sower_name}</div>
            {item.sower_handle && <div className="truncate text-xs text-white/60">@{item.sower_handle}</div>}
          </div>
          {item.sower_id && (
            <button
              onClick={onFollow}
              className={cn(
                'ml-2 rounded-full px-4 py-1 text-xs font-bold transition',
                isFollowing
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-black hover:scale-105'
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <h2 className="mt-2 text-lg font-bold sm:text-xl">{item.title}</h2>
        {item.description && (
          <p className="mt-1 line-clamp-2 max-w-md text-sm text-white/80">{item.description}</p>
        )}

        {showBestow && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-400/50">
            <Gift className="h-3 w-3" /> R{Number(item.price ?? 2).toFixed(0)}
          </div>
        )}

        {/* 45s preview row */}
        {previewable && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-black/40 p-2 pr-4 backdrop-blur">
            <button
              onClick={togglePlay}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg hover:scale-105"
              aria-label={playing ? 'Pause preview' : 'Play 45s preview'}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(time / PREVIEW) * 100}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-white/70">
              {Math.floor(time)}s / {PREVIEW}s
            </span>
          </div>
        )}

        {/* Bestow CTA */}
        {showBestow && (
          <button
            onClick={onBestow}
            className="mt-3 w-full max-w-md rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] hover:scale-[1.02] active:scale-100"
          >
            🎁 Bestow & Get This Seed
          </button>
        )}
        {!showBestow && (
          <button
            onClick={onBestow}
            className="mt-3 w-full max-w-md rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-6 py-3 text-base font-bold text-black hover:scale-[1.02]"
          >
            <Sparkles className="mr-2 inline h-4 w-4" /> Open this seed
          </button>
        )}
      </div>
    </div>
  );
}

function RailButton({
  icon, label, onClick, accent,
}: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 text-white/90 hover:text-white">
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition active:scale-90',
          accent
            ? 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
            : 'bg-white/15 hover:bg-white/25'
        )}
      >
        {icon}
      </span>
      <span className="text-[9px] font-semibold drop-shadow leading-none">{label}</span>
    </button>
  );
}

function EmptyState({
  tab, onSwitch, onClearRole, hasRole,
}: { tab: FeedTab; onSwitch: () => void; onClearRole: () => void; hasRole: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-6xl">🌱</div>
      <h2 className="mb-2 text-xl font-bold">
        {tab === 'following'
          ? 'You are not following anyone yet'
          : hasRole
          ? 'Nothing in this Wandering yet'
          : 'The orchard is quiet'}
      </h2>
      <p className="mb-5 max-w-md text-sm text-white/60">
        {tab === 'following'
          ? 'Tap Follow on any sower in the For You feed and they will land here.'
          : 'Try a different filter, or be the first to plant something.'}
      </p>
      <div className="flex gap-2">
        {tab === 'following' && (
          <Button onClick={onSwitch} className="bg-amber-500 text-black hover:bg-amber-400">Browse For You</Button>
        )}
        {hasRole && (
          <Button variant="outline" onClick={onClearRole} className="border-white/20 bg-transparent text-white hover:bg-white/10">
            Clear filter
          </Button>
        )}
      </div>
    </div>
  );
}
