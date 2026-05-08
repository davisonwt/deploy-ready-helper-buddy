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
  Search, Bell, Radio, ArrowLeft, Gift, Sparkles, Loader2, X, Send, Square,
  ChevronLeft, ChevronRight, ChevronDown,
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
import { type WanderingRole, WANDERING_BADGES } from '@/components/marketplace/WanderingBadgeBar';
import { launchConfetti, playSoundEffect } from '@/utils/confetti';
import { LiveNowStrip } from '@/components/live/LiveNowStrip';
import LiveStage from '@/components/live/LiveStage';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';
import { BirthdayCelebration } from '@/components/celebrations/BirthdayCelebration';

type FeedTab = 'following' | 'foryou' | 'local';

type FeedKind =
  | 'seed' | 'product' | 'music' | 'video' | 'story' | 'book' | 'studies'
  | 'radio_live' | 'radio_recorded' | 'classroom' | 'skilldrop' | 'premium_room' | 'orchard';

interface FeedItem {
  key: string;
  kind: FeedKind;
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  images?: string[] | null;
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

interface SeedMessage {
  id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  created_at: string;
  sender_profile?: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

type ActionPanelState = {
  mode: 'message' | 'voice' | 'gift';
  item: FeedItem;
  roomId?: string | null;
  messages: SeedMessage[];
  loading: boolean;
  error?: string | null;
} | null;

const sowerName = (p: any) => {
  const dn = (p?.display_name || '').trim();
  if (dn) return dn;
  const full = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
  if (full) return full;
  const first = (p?.first_name || '').trim();
  if (first) return first;
  return 'Sower';
};

const wanderingFor = (item: { kind: FeedItem['kind']; wandering_role?: string | null; type?: string | null }): WanderingRole | null => {
  // Always respect the sower's chosen wandering identity if present
  if (item.wandering_role && WANDERING_BADGES.find((b) => b.key === item.wandering_role as WanderingRole)) {
    return item.wandering_role as WanderingRole;
  }
  // No auto-derivation from media type — wandering badge = seller identity, not category.
  // Without an explicit choice, show no badge rather than a misleading one.
  return null;
};

export default function TribalAliveFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { code: referralCode } = useReferralCode();
  const { addToBasket } = useProductBasket();
  const { goLive, endLive, liveSeeds } = useTribalLiveOrchard();

  const [tab, setTab] = useState<FeedTab>('foryou');
  const [wanderingRole, setWanderingRole] = useState<WanderingRole | null>(null);
  const [kindFilter, setKindFilter] = useState<FeedKind | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeRoom, setActiveRoom] = useState<{
    room: string;
    title: string;
    mode: 'audio' | 'video';
    /** When set, render the rich LiveStage overlay (host's Go-Live) instead of a bare 1:1 Jitsi iframe */
    liveSeed?: {
      seedId: string;
      isHost: boolean;
      sowerUserId?: string | null;
      images?: string[];
      mediaUrl?: string | null;
      mediaKind?: 'audio' | 'video';
    } | null;
  } | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [actionPanel, setActionPanel] = useState<ActionPanelState>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Load everything everyone planted across ALL content surfaces
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [
          seedsRes, productsRes, djTracksRes, radioLiveRes, radioRecRes,
          videosRes, memryRes, booksRes, premiumRes, classRes, skillRes, orchardsRes,
        ] = await Promise.all([
          supabase.from('seeds')
            .select('id, title, description, images, video_url, gifter_id, category, created_at')
            .order('created_at', { ascending: false }).limit(40),
          supabase.from('products')
            .select('id, title, description, type, cover_image_url, image_urls, file_url, price, sower_id, wandering_role, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false }).limit(80),
          supabase.from('dj_music_tracks')
            .select('id, track_title, artist_name, file_url, cover_image_url, preview_url, price, dj_id, wandering_role, music_genre, upload_date, created_at, radio_djs!inner(id, user_id, dj_name, avatar_url)')
            .eq('is_public', true)
            .order('upload_date', { ascending: false }).limit(80),
          supabase.from('radio_live_sessions')
            .select('id, status, started_at, ended_at, created_at, schedule_id')
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('radio_automated_sessions')
            .select('id, schedule_id, playback_status, current_track_index, created_at')
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('community_videos')
            .select('id, title, description, video_url, thumbnail_url, uploader_id, created_at, status')
            .in('status', ['approved', 'published'])
            .order('created_at', { ascending: false }).limit(60),
          supabase.from('memry_posts')
            .select('id, user_id, content_type, media_url, thumbnail_url, caption, content_category, created_at')
            .order('created_at', { ascending: false }).limit(40),
          supabase.from('sower_books')
            .select('id, title, description, cover_image_url, image_urls, sower_id, user_id, bestowal_value, wandering_role, created_at')
            .eq('is_available', true)
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('premium_rooms')
            .select('id, title, description, room_type, price, artwork, creator_id, created_at')
            .eq('is_public', true)
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('classroom_sessions')
            .select('id, title, description, instructor_id, recording_url, scheduled_at, status, session_fee, is_free, created_at')
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('skilldrop_sessions')
            .select('id, title, description, presenter_id, recording_url, scheduled_at, status, session_fee, created_at')
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('orchards')
            .select('id, title, description, images, video_url, user_id, category, status, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false }).limit(30),
        ]);

        if (cancelled) return;

        // Collect every user_id we need to resolve to a profile
        const sowerIds = Array.from(new Set([
          ...(seedsRes.data || []).map((s: any) => s.gifter_id),
          ...(productsRes.data || []).map((p: any) => p.sower_id),
          ...(videosRes.data || []).map((v: any) => v.uploader_id),
          ...(memryRes.data || []).map((m: any) => m.user_id),
          ...(booksRes.data || []).map((b: any) => b.user_id || b.sower_id),
          ...(premiumRes.data || []).map((r: any) => r.creator_id),
          ...(classRes.data || []).map((c: any) => c.instructor_id),
          ...(skillRes.data || []).map((c: any) => c.presenter_id),
          ...(orchardsRes.data || []).map((o: any) => o.user_id),
          ...((djTracksRes.data || []).map((t: any) => t.radio_djs?.user_id)),
        ].filter(Boolean)));

        const profileMap: Record<string, any> = {};
        if (sowerIds.length) {
          const [byUserId, byProfileId] = await Promise.all([
            supabase.from('profiles')
              .select('id, user_id, first_name, last_name, display_name, avatar_url')
              .in('user_id', sowerIds as string[]),
            supabase.from('profiles')
              .select('id, user_id, first_name, last_name, display_name, avatar_url')
              .in('id', sowerIds as string[]),
          ]);
          [...(byUserId.data || []), ...(byProfileId.data || [])].forEach((p: any) => {
            if (p.user_id) profileMap[p.user_id] = p;
            if (p.id) profileMap[p.id] = p;
          });
        }

        const handleOf = (p: any) =>
          p?.display_name?.toLowerCase().replace(/\s+/g, '') || null;

        const seedItems: FeedItem[] = (seedsRes.data || []).map((s: any) => ({
          key: `seed-${s.id}`, kind: 'seed', id: s.id,
          title: s.title || 'Untitled seed',
          description: s.description,
          image: (s.images && s.images[0]) || null,
          images: Array.isArray(s.images) ? s.images.filter(Boolean) : null,
          video_url: s.video_url || null,
          sower_id: s.gifter_id,
          sower_name: sowerName(profileMap[s.gifter_id]),
          sower_avatar: profileMap[s.gifter_id]?.avatar_url || null,
          sower_handle: handleOf(profileMap[s.gifter_id]),
          wandering_role: wanderingFor({ kind: 'seed' }),
          created_at: s.created_at,
          href: `/seed/${s.id}`,
        }));

        const productItems: FeedItem[] = (productsRes.data || []).map((p: any) => {
          const typeLc = (p.type || '').toLowerCase();
          const isMusic = typeLc === 'music';
          const isAudio = isMusic || /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(p.file_url || '');
          const isVideo = !isMusic && (typeLc === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(p.file_url || ''));
          const isBook  = typeLc === 'ebook' || typeLc === 'book';
          const kind: FeedKind = isMusic ? 'music' : isBook ? 'book' : isVideo ? 'video' : 'product';
          return {
            key: `product-${p.id}`, kind, id: p.id,
            title: p.title || 'Untitled creation',
            description: p.description,
            image: p.cover_image_url || (p.image_urls && p.image_urls[0]) || null,
            images: (() => {
              // For music singles: ONLY use the cover art, never image_urls
              // (image_urls often contain the sower's profile/portrait photos,
              // which the user does NOT want shown as the song cover).
              if (isMusic) {
                return p.cover_image_url ? [p.cover_image_url] : null;
              }
              const arr: string[] = [];
              if (p.cover_image_url) arr.push(p.cover_image_url);
              if (Array.isArray(p.image_urls)) p.image_urls.forEach((u: string) => { if (u && !arr.includes(u)) arr.push(u); });
              return arr.length ? arr : null;
            })(),
            audio_url: isAudio ? p.file_url : null,
            video_url: isVideo ? p.file_url : null,
            price: Number(p.price ?? 2),
            sower_id: p.sower_id,
            sower_name: sowerName(profileMap[p.sower_id]),
            sower_avatar: profileMap[p.sower_id]?.avatar_url || null,
            sower_handle: handleOf(profileMap[p.sower_id]),
            wandering_role: wanderingFor({ kind: 'product', wandering_role: p.wandering_role || (isMusic ? 'hearth' : null), type: p.type }),
            created_at: p.created_at,
            href: `/products`,
          };
        });

        // 🎵 DJ tracks (Davison's 26 songs etc.) — these were missing from the feed
        const djItems: FeedItem[] = (djTracksRes.data || []).map((t: any) => {
          const dj = t.radio_djs || {};
          const ownerId = dj.user_id || null;
          return {
            key: `dj-${t.id}`, kind: 'music', id: t.id,
            title: t.track_title || 'Untitled track',
            description: t.artist_name || dj.dj_name || null,
            image: t.cover_image_url || null,
            audio_url: t.preview_url || t.file_url || null,
            price: Number(t.price ?? 2),
            sower_id: ownerId,
            sower_name: sowerName(profileMap[ownerId]) !== 'Sower' ? sowerName(profileMap[ownerId]) : (dj.dj_name || 'Sower'),
            sower_avatar: profileMap[ownerId]?.avatar_url || dj.avatar_url || null,
            sower_handle: handleOf(profileMap[ownerId]),
            wandering_role: (t.wandering_role as WanderingRole) || 'hearth',
            created_at: t.upload_date || t.created_at,
            href: `/grove-station`,
          };
        });

        const radioLiveItems: FeedItem[] = (radioLiveRes.data || []).map((r: any) => ({
          key: `radio-live-${r.id}`, kind: 'radio_live', id: r.id,
          title: r.status === 'live' ? '🔴 Live tribal radio' : 'Radio session (live archive)',
          description: r.status === 'live' ? 'Live now in the orchard — tap to join' : 'A past live broadcast',
          image: null,
          sower_id: null,
          sower_name: 'Tribal Radio',
          wandering_role: 'whisperer',
          created_at: r.created_at,
          href: `/grove-station?session=${r.id}`,
        }));

        const radioRecItems: FeedItem[] = (radioRecRes.data || []).map((r: any) => ({
          key: `radio-rec-${r.id}`, kind: 'radio_recorded', id: r.id,
          title: '📻 Pre-recorded radio session',
          description: 'Tap to listen to this scheduled broadcast',
          image: null,
          sower_id: null,
          sower_name: 'Tribal Radio',
          wandering_role: 'whisperer',
          created_at: r.created_at,
          href: `/grove-station?automated=${r.id}`,
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
          sower_handle: handleOf(profileMap[v.uploader_id]),
          wandering_role: 'story',
          created_at: v.created_at,
          href: `/community-videos`,
        }));

        // 📖 Memry posts (Coming Into Truth's intro videos, Amber's photo, etc.)
        const storyItems: FeedItem[] = (memryRes.data || []).map((m: any) => {
          const isVid = (m.content_type || '').toLowerCase() === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.media_url || '');
          return {
            key: `memry-${m.id}`, kind: 'story', id: m.id,
            title: m.caption?.split('\n')[0]?.slice(0, 80) || 'Tribal story',
            description: m.caption,
            image: m.thumbnail_url || (!isVid ? m.media_url : null),
            video_url: isVid ? m.media_url : null,
            sower_id: m.user_id,
            sower_name: sowerName(profileMap[m.user_id]),
            sower_avatar: profileMap[m.user_id]?.avatar_url || null,
            sower_handle: handleOf(profileMap[m.user_id]),
            wandering_role: 'story',
            created_at: m.created_at,
            href: `/memry`,
          };
        });

        // 📚 Sower books (Davison's shadow-measurement book etc.)
        const bookItems: FeedItem[] = (booksRes.data || []).map((b: any) => {
          const owner = b.user_id || b.sower_id;
          return {
            key: `book-${b.id}`, kind: 'book', id: b.id,
            title: b.title || 'Untitled book',
            description: b.description,
            image: b.cover_image_url || (b.image_urls && b.image_urls[0]) || null,
            images: (() => {
              const arr: string[] = [];
              if (b.cover_image_url) arr.push(b.cover_image_url);
              if (Array.isArray(b.image_urls)) b.image_urls.forEach((u: string) => { if (u && !arr.includes(u)) arr.push(u); });
              return arr.length ? arr : null;
            })(),
            price: Number(b.bestowal_value ?? 0) || null,
            sower_id: owner,
            sower_name: sowerName(profileMap[owner]),
            sower_avatar: profileMap[owner]?.avatar_url || null,
            sower_handle: handleOf(profileMap[owner]),
            wandering_role: (b.wandering_role as WanderingRole) || 'story',
            created_at: b.created_at,
            href: `/products`,
          };
        });

        const premiumItems: FeedItem[] = (premiumRes.data || []).map((r: any) => ({
          key: `premium-${r.id}`, kind: 'premium_room', id: r.id,
          title: r.title || 'Premium room',
          description: r.description,
          image: r.artwork || null,
          price: Number(r.price ?? 0) || null,
          sower_id: r.creator_id,
          sower_name: sowerName(profileMap[r.creator_id]),
          sower_avatar: profileMap[r.creator_id]?.avatar_url || null,
          sower_handle: handleOf(profileMap[r.creator_id]),
          wandering_role: 'whisperer',
          created_at: r.created_at,
          href: `/premium-room/${r.id}`,
        }));

        const classItems: FeedItem[] = (classRes.data || []).map((c: any) => ({
          key: `class-${c.id}`, kind: 'classroom', id: c.id,
          title: c.title || 'Classroom session',
          description: c.description,
          image: null,
          video_url: c.recording_url || null,
          price: c.is_free ? 0 : Number(c.session_fee ?? 0),
          sower_id: c.instructor_id,
          sower_name: sowerName(profileMap[c.instructor_id]),
          sower_avatar: profileMap[c.instructor_id]?.avatar_url || null,
          sower_handle: handleOf(profileMap[c.instructor_id]),
          wandering_role: 'whisperer',
          created_at: c.created_at,
          href: `/classroom`,
        }));

        const skillItems: FeedItem[] = (skillRes.data || []).map((c: any) => ({
          key: `skill-${c.id}`, kind: 'skilldrop', id: c.id,
          title: c.title || 'SkillDrop',
          description: c.description,
          image: null,
          video_url: c.recording_url || null,
          price: Number(c.session_fee ?? 0),
          sower_id: c.presenter_id,
          sower_name: sowerName(profileMap[c.presenter_id]),
          sower_avatar: profileMap[c.presenter_id]?.avatar_url || null,
          sower_handle: handleOf(profileMap[c.presenter_id]),
          wandering_role: 'whisperer',
          created_at: c.created_at,
          href: `/skilldrop`,
        }));

        const orchardItems: FeedItem[] = (orchardsRes.data || []).map((o: any) => ({
          key: `orchard-${o.id}`, kind: 'orchard', id: o.id,
          title: o.title || 'Orchard',
          description: o.description,
          image: (o.images && o.images[0]) || null,
          images: Array.isArray(o.images) ? o.images.filter(Boolean) : null,
          video_url: o.video_url || null,
          sower_id: o.user_id,
          sower_name: sowerName(profileMap[o.user_id]),
          sower_avatar: profileMap[o.user_id]?.avatar_url || null,
          sower_handle: handleOf(profileMap[o.user_id]),
          wandering_role: null,
          created_at: o.created_at,
          href: `/orchard/${o.id}`,
        }));

        const mergedRaw = [
          ...seedItems, ...productItems, ...djItems, ...radioLiveItems, ...radioRecItems,
          ...videoItems, ...storyItems, ...bookItems, ...premiumItems,
          ...classItems, ...skillItems, ...orchardItems,
        ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        // De-duplicate music singles: the same song often exists in both
        // `products` (type=music) and `dj_music_tracks`. Keep the first
        // occurrence per (owner, normalized title) for music/audio kinds.
        const seenMusic = new Set<string>();
        const deduped = mergedRaw.filter((it) => {
          if (it.kind !== 'music') return true;
          const key = `${it.sower_id || 'anon'}::${(it.title || '').trim().toLowerCase()}`;
          if (seenMusic.has(key)) return false;
          seenMusic.add(key);
          return true;
        });

        // Weighted interleave by sower: the sower with the most seeds gets
        // a bigger slice of each round (e.g. 3 of theirs, then 1-2 of the
        // next, then 1 of the smallest), so the feed feels alive with the
        // tribe rather than dominated by one voice OR starved of the most
        // active sower.
        const buckets = new Map<string, FeedItem[]>();
        deduped.forEach((it) => {
          const k = it.sower_id || `__anon-${it.kind}`;
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k)!.push(it);
        });
        const ranked = Array.from(buckets.entries())
          .sort((a, b) => b[1].length - a[1].length); // most seeds first

        const max = ranked[0]?.[1].length || 1;
        const weightFor = (count: number) => {
          const ratio = count / max;
          if (ratio >= 0.66) return 3;
          if (ratio >= 0.33) return 2;
          return 1;
        };

        const merged: FeedItem[] = [];
        const cursors = new Map<string, number>(ranked.map(([k]) => [k, 0]));
        let drained = false;
        while (!drained) {
          drained = true;
          for (const [k, list] of ranked) {
            const take = weightFor(list.length);
            const start = cursors.get(k) || 0;
            const slice = list.slice(start, start + take);
            if (slice.length) {
              merged.push(...slice);
              cursors.set(k, start + slice.length);
              drained = false;
            }
          }
        }


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
    if (kindFilter) list = list.filter((i) => i.kind === kindFilter);
    if (tab === 'following' && followingIds.size > 0) {
      list = list.filter((i) => i.sower_id && followingIds.has(i.sower_id));
    } else if (tab === 'following') {
      list = [];
    }
    return list;
  }, [items, wanderingRole, kindFilter, tab, followingIds]);

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

  /* ───────── auto-advance: prompt at 15s, roll at 21s ───────── */
  const [autoPrompt, setAutoPrompt] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);

  useEffect(() => {
    setAutoPrompt(false);
    if (autoPaused || filtered.length < 2) return;
    const promptT = setTimeout(() => setAutoPrompt(true), 15000);
    const advanceT = setTimeout(() => {
      const next = cardRefs.current[activeIdx + 1];
      if (next) next.scrollIntoView({ behavior: 'smooth' });
      setAutoPrompt(false);
    }, 21000);
    return () => { clearTimeout(promptT); clearTimeout(advanceT); };
  }, [activeIdx, filtered.length, autoPaused]);

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
        toast({ title: 'Share link copied', description: 'Your referral code is burned into the link.' });
      }
    } catch {/* dismissed */}
  };

  const ensureSeedRoom = async (item: FeedItem) => {
    if (!user) { navigate('/login'); return null; }
    if (!item.sower_id) {
      toast({ title: 'No sower attached', description: 'This seed has no contactable creator.' });
      return null;
    }
    if (item.sower_id === user.id) {
      toast({ title: 'That is you 🌱', description: 'You are looking at your own seed.' });
      return null;
    }

    const { data: rows, error: findErr } = await supabase
      .from('chat_participants')
      .select('room_id, user_id, chat_rooms!inner(id, room_type, is_active)')
      .eq('chat_rooms.room_type', 'direct')
      .eq('chat_rooms.is_active', true)
      .in('user_id', [user.id, item.sower_id]);
    if (findErr) throw findErr;

    const counts: Record<string, number> = {};
    (rows || []).forEach((row: any) => {
      if (row?.room_id) counts[row.room_id] = (counts[row.room_id] || 0) + 1;
    });
    let roomId = Object.entries(counts).find(([, count]) => count >= 2)?.[0] || null;

    if (!roomId) {
      const { data: room, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({ name: `Seed chat · ${item.title}`.slice(0, 80), room_type: 'direct', created_by: user.id, is_active: true })
        .select('id')
        .single();
      if (roomErr) throw roomErr;
      roomId = room.id as string;
    }

    const { error: selfPartErr } = await supabase
      .from('chat_participants')
      .upsert({ room_id: roomId, user_id: user.id, is_active: true }, { onConflict: 'room_id,user_id', ignoreDuplicates: false });
    if (selfPartErr) throw selfPartErr;

    const { error: partErr } = await supabase
      .from('chat_participants')
      .upsert({ room_id: roomId, user_id: item.sower_id, is_active: true }, { onConflict: 'room_id,user_id', ignoreDuplicates: false });
    if (partErr) throw partErr;

    return roomId;
  };

  const fetchSeedMessages = async (roomId: string, item: FeedItem): Promise<SeedMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const needle = item.title.trim().toLowerCase();
    const seedMessages = (data || []).filter((message: any) =>
      (message.content || '').toLowerCase().includes(needle)
    );
    const senderIds = Array.from(new Set(seedMessages.map((m: any) => m.sender_id).filter(Boolean)));
    if (!senderIds.length) return seedMessages as SeedMessage[];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url')
      .in('user_id', senderIds as string[]);
    return seedMessages.map((message: any) => ({
      ...message,
      sender_profile: (profiles || []).find((profile: any) => profile.user_id === message.sender_id) || null,
    })) as SeedMessage[];
  };

  const openActionPanel = async (mode: 'message' | 'voice' | 'gift', item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    setActionPanel({ mode, item, messages: [], loading: mode !== 'gift', roomId: null });
    if (mode === 'gift') return;

    try {
      const roomId = await ensureSeedRoom(item);
      if (!roomId) { setActionPanel(null); return; }
      const messages = await fetchSeedMessages(roomId, item);
      setActionPanel({ mode, item, roomId, messages, loading: false });
    } catch (error: any) {
      console.error('Seed action panel error:', error);
      setActionPanel({ mode, item, messages: [], roomId: null, loading: false, error: error.message || 'Could not open this seed conversation.' });
    }
  };

  const refreshActionMessages = async (roomId: string, item: FeedItem, mode: 'message' | 'voice') => {
    const messages = await fetchSeedMessages(roomId, item);
    setActionPanel({ mode, item, roomId, messages, loading: false });
  };

  const sendSeedText = async (text: string) => {
    if (!actionPanel || !user) return;
    const roomId = actionPanel.roomId || await ensureSeedRoom(actionPanel.item);
    if (!roomId) return;
    await supabase.rpc('send_chat_message', {
      p_room_id: roomId,
      p_content: `🌱 ${actionPanel.item.title}\n${text.trim()}`,
      p_message_type: 'text',
    });
    await refreshActionMessages(roomId, actionPanel.item, 'message');
  };

  const sendSeedVoice = async (audioBlob: Blob, duration: number) => {
    if (!actionPanel || !user) return;
    const roomId = actionPanel.roomId || await ensureSeedRoom(actionPanel.item);
    if (!roomId) return;
    const fileName = `voice-${actionPanel.item.kind}-${actionPanel.item.id}-${Date.now()}.webm`;
    const filePath = `${user.id}/seed-voice/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, audioBlob, { contentType: 'audio/webm', upsert: false });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(filePath);
    await supabase.rpc('send_chat_message', {
      p_room_id: roomId,
      p_content: `🎙️ Voice message for ${actionPanel.item.title} (${duration}s)`,
      p_message_type: 'voice',
      p_file_url: publicUrl,
      p_file_name: fileName,
      p_file_type: 'audio' as any,
      p_file_size: audioBlob.size,
    });
    await refreshActionMessages(roomId, actionPanel.item, 'voice');
  };

  const handleFreewillGift = async (amount: number | 'heart') => {
    if (!actionPanel || !user) return;
    const item = actionPanel.item;
    if (amount === 'heart') {
      const roomId = await ensureSeedRoom(item);
      if (!roomId) return;
      await supabase.rpc('send_chat_message', {
        p_room_id: roomId,
        p_content: `❤️ A heart for ${item.title}`,
        p_message_type: 'text',
      });
      toast({ title: 'Heart sent', description: `Sent to ${item.sower_name}.` });
      setActionPanel(null);
      return;
    }

    addToBasket({
      id: `freewill-${item.kind}-${item.id}-${amount}-${Date.now()}`,
      title: `Freewill gift to ${item.sower_name} · ${item.title}`,
      price: amount,
      cover_image_url: item.image || undefined,
      sower_id: item.sower_id || undefined,
      bestowal_count: 0,
      sowers: { display_name: item.sower_name },
    } as any);
    toast({ title: 'Gift added', description: `$${amount < 1 ? amount.toFixed(2) : amount} freewill gift is in your basket.` });
  };

  const handleBestow = (item: FeedItem) => {
    // Live radio is the only kind that isn't bestowable — just navigate to the room.
    if (item.kind === 'radio_live') {
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

  // Open seed-specific ChatApp message panel with the sower
  const handleMessage = (item: FeedItem) => {
    openActionPanel('message', item);
  };

  // Seed-specific voice message panel
  const handleVoice = (item: FeedItem) => {
    openActionPanel('voice', item);
  };

  const handleGift = (item: FeedItem) => openActionPanel('gift', item);

  // 1:1 Jitsi video call
  const handleVideo = (item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    if (!item.sower_id) return;
    const room = `s2g_dm_${[user.id, item.sower_id].sort().join('_').replace(/-/g, '')}_video`;
    setActiveRoom({ room, title: `Video with ${item.sower_name}`, mode: 'video' });
  };

  // Broadcast THIS seed live to the orchard (host) — or step into an existing live (viewer)
  const handleGoLive = async (item: FeedItem) => {
    if (!user) { navigate('/login'); return; }
    const imgs = (item.images && item.images.length ? item.images : (item.image ? [item.image] : [])).filter(Boolean) as string[];
    const mediaKind: 'audio' | 'video' | undefined =
      item.audio_url ? 'audio' : item.video_url ? 'video' : undefined;
    const mediaUrl = item.audio_url || item.video_url || null;

    // If someone in the orchard is already live on this seed, JOIN their room instead.
    const liveHere = liveSeeds.find((p) => p.seed_id === item.id);
    if (liveHere) {
      setActiveRoom({
        room: liveHere.jitsi_room,
        title: `Live: ${item.title}`,
        mode: 'video',
        liveSeed: {
          seedId: item.id,
          isHost: liveHere.user_id === user.id,
          sowerUserId: item.sower_id,
          images: imgs,
          mediaUrl,
          mediaKind,
        },
      });
      return;
    }

    const presence = await goLive({ id: item.id, title: item.title, image: item.image });
    if (!presence) return;
    setActiveRoom({
      room: presence.jitsi_room,
      title: `Live: ${item.title}`,
      mode: 'video',
      liveSeed: {
        seedId: item.id,
        isHost: true,
        sowerUserId: item.sower_id,
        images: imgs,
        mediaUrl,
        mediaKind,
      },
    });
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
      {/* Vertical snap feed — full bleed under the overlays */}
      <main
        ref={containerRef}
        className="absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-contain"
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
                onGift={() => handleGift(item)}
                onGoLive={() => handleGoLive(item)}
                onShare={() => handleShare(item)}
                onFollow={() => toggleFollow(item.sower_id)}
              />
            </div>
          ))
        )}
      </main>

      {/* Auto-advance prompt: appears at 15s, advances at 21s unless dismissed */}
      {autoPrompt && !autoPaused && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-30 bg-black/80 backdrop-blur border border-emerald-400/40 rounded-2xl px-4 py-3 shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center gap-3 animate-fade-in">
          <span className="text-sm text-emerald-100">Roll to next seed in 6s?</span>
          <button
            onClick={() => { setAutoPaused(true); setAutoPrompt(false); }}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            Stay here
          </button>
          <button
            onClick={() => {
              const next = cardRefs.current[activeIdx + 1];
              if (next) next.scrollIntoView({ behavior: 'smooth' });
              setAutoPrompt(false);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black"
          >
            Roll now →
          </button>
        </div>
      )}

      {/* Top overlay: Back + Following / For You / Local + Search/Bell */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4 pr-5 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-white/90 hover:text-white"
          aria-label="Back to my orchard"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-semibold">SeedFlow</span>
          <span className="text-base">🌱</span>
        </button>

        <nav className="flex items-center gap-4 text-xs sm:text-sm font-semibold">
          {(['following', 'foryou', 'local'] as FeedTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative pb-1 transition whitespace-nowrap',
                tab === t ? 'text-white' : 'text-white/55 hover:text-white/80'
              )}
              title={
                t === 'following'
                  ? 'Inner Circle — mutual connections, your closest trust layer'
                  : t === 'foryou'
                  ? 'Tribe Feed — full network activity'
                  : 'Around Me — geo-local seeds & products'
              }
            >
              {t === 'following' ? 'Inner Circle' : t === 'foryou' ? 'Tribe Feed' : 'Around Me'}
              {tab === t && (
                <motion.span
                  layoutId="tabUnderline"
                  className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-amber-400"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/products')}
            className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Tribe celebrations + Live Now strip — festive birthday banner above live sessions */}
      <div className="absolute inset-x-0 top-11 z-30">
        <BirthdayCelebration />
        <LiveNowStrip />
      </div>

      {/* Compact filter row — two dropdowns instead of two pill rows */}
      <div className="absolute inset-x-0 top-[10.5rem] z-20 flex items-center gap-2 px-3 py-1.5">
        {/* Wandering / sower-identity dropdown */}
        <div className="relative">
          <select
            aria-label="Filter by wandering identity"
            value={wanderingRole ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'heart') { navigate('/tribal-hearts'); return; }
              setWanderingRole(v ? (v as WanderingRole) : null);
            }}
            className="appearance-none rounded-full bg-black/55 backdrop-blur-md text-white text-xs font-medium pl-3 pr-7 py-1.5 border border-white/15 hover:bg-black/70 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
          >
            <option value="">🌿 All Seeds</option>
            {WANDERING_BADGES.map((b) => (
              <option key={b.key} value={b.key}>
                {b.emoji} Wandering {b.label.charAt(0) + b.label.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
        </div>

        {/* Content-kind dropdown */}
        <div className="relative">
          <select
            aria-label="Filter by content type"
            value={kindFilter ?? ''}
            onChange={(e) => setKindFilter((e.target.value || null) as FeedKind | null)}
            className="appearance-none rounded-full bg-black/55 backdrop-blur-md text-white text-xs font-medium pl-3 pr-7 py-1.5 border border-white/15 hover:bg-black/70 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
          >
            <option value="">✨ All</option>
            <option value="music">🎵 Music</option>
            <option value="video">🎬 Videos</option>
            <option value="book">📚 Books</option>
            <option value="radio_live">🔴 Radio · Live</option>
            <option value="radio_recorded">📻 Radio · Recorded</option>
            <option value="classroom">🎓 Classroom</option>
            <option value="skilldrop">🛠️ SkillDrop</option>
            <option value="premium_room">👑 Premium Room</option>
            <option value="studies">📓 Studies</option>
            <option value="orchard">🌳 Orchards</option>
            <option value="product">🛍️ Products</option>
            <option value="seed">🌱 Seeds</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
        </div>

        {/* Active-filter chip resets */}
        {(wanderingRole || kindFilter) && (
          <button
            onClick={() => { setWanderingRole(null); setKindFilter(null); }}
            className="ml-auto rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-[10px] px-2 py-1"
          >
            Clear filters ✕
          </button>
        )}
      </div>


      {/* Jitsi overlay */}
      <AnimatePresence>
        {actionPanel && (
          <SeedActionPanel
            panel={actionPanel}
            currentUserId={user?.id || null}
            onClose={() => setActionPanel(null)}
            onSendText={sendSeedText}
            onSendVoice={sendSeedVoice}
            onGift={handleFreewillGift}
          />
        )}
        {activeRoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/60 px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-white">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                {activeRoom.title}
                {activeRoom.liveSeed?.isHost && (
                  <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    🎤 You are hosting
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={async () => {
                  if (activeRoom.liveSeed?.isHost) {
                    await endLive({ seedId: activeRoom.liveSeed.seedId, seedTitle: activeRoom.title });
                  }
                  setActiveRoom(null);
                }}
              >
                Close
              </Button>
            </div>
            {activeRoom.liveSeed ? (
              <LiveStage
                seedId={activeRoom.liveSeed.seedId}
                title={activeRoom.title}
                jitsiRoom={activeRoom.room}
                isHost={activeRoom.liveSeed.isHost}
                sowerUserId={activeRoom.liveSeed.sowerUserId ?? null}
                images={activeRoom.liveSeed.images ?? []}
                mediaUrl={activeRoom.liveSeed.mediaUrl ?? null}
                mediaKind={activeRoom.liveSeed.mediaKind}
                className="flex-1"
              />
            ) : (
              <iframe
                title={activeRoom.title}
                src={`https://${JITSI_DOMAIN}/${activeRoom.room}#config.prejoinPageEnabled=false&config.disableDeepLinking=true${activeRoom.mode === 'audio' ? '&config.startWithVideoMuted=true' : ''}`}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="flex-1 border-0"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── card with 45s preview + action rail ───────── */

function FeedCard({
  item, isActive, isFollowing,
  onBestow, onMessage, onVoice, onVideo, onGift, onGoLive, onShare, onFollow,
}: {
  item: FeedItem;
  isActive: boolean;
  isFollowing: boolean;
  onBestow: () => void;
  onMessage: () => void;
  onVoice: () => void;
  onVideo: () => void;
  onGift: () => void;
  onGoLive: () => void;
  onShare: () => void;
  onFollow: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const PREVIEW = 45; // seconds

  const gallery = (item.images && item.images.length > 0)
    ? item.images
    : (item.image ? [item.image] : []);
  const hasGallery = gallery.length > 1;
  const currentImg = gallery[imgIdx] || item.image || null;

  // Reset to first image when card changes
  useEffect(() => { setImgIdx(0); }, [item.key]);

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
  // All sower creations (seeds, products, music, books, videos, stories, orchards) are bestowable.
  // Only pure live broadcasts (radio_live) keep a non-bestow CTA.
  const showBestow = item.kind !== 'radio_live';
  const previewable = !!(item.audio_url || item.video_url);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950">
      {/* Blurred ambient background (fills, but doesn't crop the real media) */}
      {currentImg && (
        <img
          src={currentImg}
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
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted={false}
          preload="metadata"
        />
      ) : currentImg ? (
        <img
          key={currentImg}
          src={currentImg}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[20rem] opacity-10">
          {badge?.emoji ?? '🌱'}
        </div>
      )}
      {item.audio_url && (
        <audio ref={audioRef} src={item.audio_url} preload="metadata" />
      )}

      {/* Image carousel arrows + dots — only when there are multiple images */}
      {hasGallery && !item.video_url && (
        <>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 sm:left-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + gallery.length) % gallery.length); }}
              aria-label="Previous image"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-black/80 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % gallery.length); }}
              aria-label="Next image"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-black/80 transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute left-1/2 top-3 -translate-x-1/2 z-10 flex gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
            {gallery.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                )}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

      {/* Right action rail — TikTok-style vertical column over the media */}
      <div className="absolute right-2 bottom-4 top-[12rem] z-10 flex flex-col items-center justify-start gap-1 overflow-y-auto no-scrollbar sm:right-3 sm:bottom-6 sm:top-[13rem] sm:gap-1.5">
        <RailButton icon={<MessageCircle className="h-4 w-4" />} label="Message" onClick={onMessage} />
        <RailButton icon={<Mic className="h-4 w-4" />} label="Voice" onClick={onVoice} />
        <RailButton icon={<Video className="h-4 w-4" />} label="Video" onClick={onVideo} />
        <RailButton icon={<Heart className="h-4 w-4" />} label="Heart" onClick={onGift} />
        <RailButton icon={<Radio className="h-4 w-4" />} label="Go Live" onClick={onGoLive} accent />
        <RailButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={onShare} />
      </div>

      {/* Left content stack — compact identity only, no oversized seed title overlay */}
      <div className="absolute bottom-4 left-3 right-16 z-10 sm:left-5 sm:right-20">
        <div className="mb-2 max-w-md rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-semibold leading-tight text-white/90 backdrop-blur-md ring-1 ring-white/10">
          {item.title}
        </div>
        <div className="flex max-w-md items-center gap-2 rounded-xl bg-black/55 p-2.5 backdrop-blur-md ring-1 ring-white/15">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10">
            {item.sower_avatar ? (
              <img src={item.sower_avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{item.sower_name[0]}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold leading-tight">{item.sower_name}</div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              {badge && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-none"
                  style={{
                    background: `linear-gradient(135deg, ${badge.color}40, ${badge.color}15)`,
                    border: `1px solid ${badge.color}66`,
                    color: badge.color,
                  }}
                >
                  <span>{badge.emoji}</span> {badge.label}{item.kind === 'product' && item.audio_url ? ' · Music' : ''}
                </span>
              )}
              {showBestow && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold leading-none text-amber-200 ring-1 ring-amber-400/50">
                  <Gift className="h-3 w-3" /> R{Number(item.price ?? 2).toFixed(0)}
                </span>
              )}
            </div>
          </div>
          {item.sower_id && (
            <button
              onClick={onFollow}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-bold transition',
                isFollowing
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-primary text-primary-foreground hover:scale-105'
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

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

function SeedActionPanel({
  panel, currentUserId, onClose, onSendText, onSendVoice, onGift,
}: {
  panel: NonNullable<ActionPanelState>;
  currentUserId: string | null;
  onClose: () => void;
  onSendText: (text: string) => Promise<void>;
  onSendVoice: (audioBlob: Blob, duration: number) => Promise<void>;
  onGift: (amount: number | 'heart') => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const secondsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [panel.messages.length, panel.loading]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const submitText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSendText(text);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (sending) return;
    setSending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      secondsRef.current = 0;
      setSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const duration = Math.max(1, secondsRef.current);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setSending(true);
        try {
          await onSendVoice(blob, duration);
        } finally {
          setSending(false);
          setSeconds(0);
        }
      };

      recorder.start();
      setRecording(true);
    } finally {
      setSending(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const sendGift = async (amount: number | 'heart') => {
    if (sending) return;
    setSending(true);
    try {
      await onGift(amount);
    } finally {
      setSending(false);
    }
  };

  const title = panel.mode === 'message'
    ? 'Seed messages'
    : panel.mode === 'voice'
    ? 'Voice messages'
    : 'Freewill gifts';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end justify-center bg-background/70 px-3 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <motion.section
        initial={{ y: 28, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 28, scale: 0.98 }}
        className="flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">{title}</h2>
            <p className="truncate text-xs text-muted-foreground">{panel.item.title} · {panel.item.sower_name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {panel.mode === 'gift' ? (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: '10c', value: 0.1 },
                { label: '50c', value: 0.5 },
                { label: '$1', value: 1 },
                { label: '$5', value: 5 },
                { label: '$10', value: 10 },
              ].map((gift) => (
                <Button key={gift.label} disabled={sending} onClick={() => sendGift(gift.value)} className="h-12 rounded-full">
                  {gift.label}
                </Button>
              ))}
              <Button disabled={sending} variant="outline" onClick={() => sendGift('heart')} className="h-12 rounded-full gap-2">
                <Heart className="h-4 w-4" /> Heart
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {panel.loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : panel.error ? (
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{panel.error}</p>
              ) : panel.messages.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No messages for this seed yet.</p>
              ) : (
                panel.messages.map((message) => {
                  const mine = message.sender_id === currentUserId;
                  const sender = message.sender_profile?.display_name || message.sender_profile?.first_name || (mine ? 'You' : panel.item.sower_name);
                  return (
                    <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[82%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                        <div className="mb-1 text-[10px] font-semibold opacity-70">{sender}</div>
                        {message.file_url ? <audio controls src={message.file_url} className="h-9 max-w-full" /> : <p className="whitespace-pre-wrap">{message.content}</p>}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border p-3">
              {panel.mode === 'message' ? (
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={2}
                    placeholder="Write a message..."
                    className="min-h-12 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button disabled={sending || !text.trim()} onClick={submitText} size="icon" className="h-12 w-12 rounded-full" aria-label="Send message">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold tabular-nums">{recording ? `Recording ${seconds}s` : 'Tap to record a voice message'}</div>
                  <Button disabled={sending && !recording} onClick={recording ? stopRecording : startRecording} className="h-12 rounded-full gap-2">
                    {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                    {recording ? 'Stop' : 'Record'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </motion.section>
    </motion.div>
  );
}

function RailButton({
  icon, label, onClick, accent,
}: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 text-white/95 hover:text-white">
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition active:scale-90 sm:h-9 sm:w-9',
          accent
            ? 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-[0_0_10px_rgba(244,63,94,0.55)]'
            : 'bg-black/45 ring-1 ring-white/20 hover:bg-black/65'
        )}
      >
        {icon}
      </span>
      <span className="text-[8px] font-semibold drop-shadow leading-none sm:text-[9px]">{label}</span>
    </button>
  );
}

function FilterPill({
  active, color, emoji, label, onClick,
}: { active: boolean; color: string; emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur transition whitespace-nowrap',
        active
          ? 'text-white shadow-[0_0_14px_rgba(0,0,0,0.5)]'
          : 'bg-black/40 text-white/80 ring-1 ring-white/15 hover:bg-black/60'
      )}
      style={active ? { background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 0 16px ${color}66` } : undefined}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
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
          ? 'Your Inner Circle is empty'
          : hasRole
          ? 'Nothing in this Wandering yet'
          : 'The orchard is quiet'}
      </h2>
      <p className="mb-5 max-w-md text-sm text-white/60">
        {tab === 'following'
          ? 'Inner Circle shows mutual connections — your closest trust layer. Follow sowers in the Tribe Feed and once they follow back they appear here.'
          : 'Try a different filter, or be the first to plant something.'}
      </p>
      <div className="flex gap-2">
        {tab === 'following' && (
          <Button onClick={onSwitch} className="bg-amber-500 text-black hover:bg-amber-400">Browse Tribe Feed</Button>
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
