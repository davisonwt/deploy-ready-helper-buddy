/**
 * TribalAliveFeedPage — "Step Into the Orchard"
 *
 * Worldwide live tribal seeds. Built on:
 *  - useTribalLiveOrchard (Supabase Realtime presence + bloom broadcasts)
 *  - Jitsi for the actual Go Live room
 *  - Existing seeds table for "serendipity" discovery (recent global seeds)
 *
 * This page is intentionally NOT the dashboard. The dashboard is calm and
 * personal. This page is buzzing, global, alive.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Sparkles, Globe2, Users, Video, Heart, Share2,
  Leaf, TreePine, MessageCircle, ArrowLeft, Zap, Shuffle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useReferralCode } from '@/hooks/useReferralCode';
import { useToast } from '@/hooks/use-toast';
import { useTribalLiveOrchard, type LivePresence, type BloomStage } from '@/hooks/useTribalLiveOrchard';
import { JITSI_DOMAIN } from '@/lib/jitsi-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DiscoverSeed {
  id: string;
  kind: 'seed' | 'product' | 'radio';
  title: string;
  description?: string | null;
  image?: string | null;
  sower: string;
  sower_id?: string | null;
  created_at: string;
  href: string;
  badge: string; // emoji
}

const BLOOM_META: Record<BloomStage, { emoji: string; label: string; color: string }> = {
  seed: { emoji: '🌱', label: 'Sprout', color: '#a3e635' },
  leaf: { emoji: '🌿', label: 'Leaf',   color: '#22c55e' },
  tree: { emoji: '🌳', label: 'Tree',   color: '#15803d' },
};

const sowerName = (p: any) =>
  p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Anonymous Sower';

const productBadge = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'music': return '🎵';
    case 'book':  return '📚';
    case 'video': return '🎬';
    case 'home':  return '🏡';
    case 'art':   return '🎨';
    default:      return '🛍️';
  }
};

export default function TribalAliveFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { code: referralCode } = useReferralCode();
  const {
    liveSeeds, blooms, recentBloom, liveCount,
    goLive, endLive, sendBloom,
  } = useTribalLiveOrchard();

  const [discover, setDiscover] = useState<DiscoverSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [serendipityIndex, setSerendipityIndex] = useState(0);
  const [activeRoom, setActiveRoom] = useState<{ room: string; title: string } | null>(null);

  // Pull EVERYTHING the tribe has planted: seeds + products + recorded radio sessions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [seedsRes, productsRes, radioRes, videosRes] = await Promise.all([
          supabase
            .from('seeds')
            .select('id, title, description, images, gifter_id, created_at, profiles:gifter_id (first_name, last_name, display_name)')
            .order('created_at', { ascending: false })
            .limit(40),
          supabase
            .from('products')
            .select('id, title, description, type, cover_image_url, image_urls, sower_id, created_at, sowers:sower_id (display_name, first_name, last_name)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(60),
          supabase
            .from('radio_live_sessions')
            .select('id, status, started_at, ended_at, created_at, schedule_id, radio_schedule:schedule_id (show_id, radio_shows:show_id (show_name, description, show_image_url, dj_id, radio_djs:dj_id (display_name, first_name, last_name)))')
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('community_videos')
            .select('id, title, description, video_url, thumbnail_url, uploader_id, created_at, profiles:uploader_id (first_name, last_name, display_name)')
            .order('created_at', { ascending: false })
            .limit(40),
        ]);

        if (cancelled) return;

        const seedsItems: DiscoverSeed[] = (seedsRes.data || []).map((s: any) => ({
          id: s.id,
          kind: 'seed',
          title: s.title || 'Untitled seed',
          description: s.description,
          image: (s.images && s.images[0]) || null,
          sower: sowerName(s.profiles),
          sower_id: s.gifter_id,
          created_at: s.created_at,
          href: `/seed/${s.id}`,
          badge: '🌱',
        }));

        const productItems: DiscoverSeed[] = (productsRes.data || []).map((p: any) => ({
          id: p.id,
          kind: 'product',
          title: p.title || 'Untitled product',
          description: p.description,
          image: p.cover_image_url || (p.image_urls && p.image_urls[0]) || null,
          sower: sowerName(p.sowers),
          sower_id: p.sower_id,
          created_at: p.created_at,
          href: `/products`,
          badge: productBadge(p.type),
        }));

        const radioItems: DiscoverSeed[] = (radioRes.data || []).map((r: any) => {
          const show = r?.radio_schedule?.radio_shows;
          const dj = show?.radio_djs;
          return {
            id: r.id,
            kind: 'radio',
            title: show?.show_name || 'Live radio session',
            description: show?.description || (r.status === 'live' ? '🔴 Live now' : 'Recorded session'),
            image: show?.show_image_url || null,
            sower: sowerName(dj),
            sower_id: show?.dj_id,
            created_at: r.created_at,
            href: `/grove-station?session=${r.id}`,
            badge: r.status === 'live' ? '📻🔴' : '📻',
          };
        });

        const videoItems: DiscoverSeed[] = (videosRes.data || []).map((v: any) => ({
          id: v.id,
          kind: 'radio', // grouped under broadcasts visually
          title: v.title || 'Recorded broadcast',
          description: v.description || 'Recorded session',
          image: v.thumbnail_url || null,
          sower: sowerName(v.profiles),
          sower_id: v.uploader_id,
          created_at: v.created_at,
          href: `/community-videos`,
          badge: '🎬',
        }));

        const combined = [...seedsItems, ...productItems, ...radioItems, ...videoItems]
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        setDiscover(combined);
      } catch (e) {
        console.warn('[tribal-alive] discover load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Soft pulse toast when a NEW seed goes live
  const [seenLiveIds, setSeenLiveIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fresh = liveSeeds.filter((p) => !seenLiveIds.has(p.user_id + ':' + p.seed_id));
    if (fresh.length && seenLiveIds.size > 0) {
      const f = fresh[0];
      toast({
        title: '🔴 A tribe seed just bloomed live',
        description: `${f.display_name} is live: "${f.seed_title}"`,
      });
    }
    if (fresh.length) {
      setSeenLiveIds((prev) => {
        const next = new Set(prev);
        fresh.forEach((p) => next.add(p.user_id + ':' + p.seed_id));
        return next;
      });
    }
  }, [liveSeeds, seenLiveIds, toast]);

  const inviteOrigin = 'https://sow2growapp.com';

  const buildShareUrl = (path: string) => {
    const url = new URL(path, inviteOrigin);
    if (referralCode) url.searchParams.set('ref', referralCode);
    return url.toString();
  };

  const handleShare = async (seed: { id: string; title: string; href?: string }) => {
    const url = buildShareUrl(seed.href || `/seed/${seed.id}`);
    const text = `🌿 "${seed.title}" is alive in the Sow2Grow orchard. Step in:\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: seed.title, text, url });
      else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Invitation copied', description: 'Your referral code is burned into the link.' });
      }
    } catch {/* user dismissed */}
  };

  const handleGoLive = async (seed: { id: string; title: string; image?: string | null }) => {
    if (!user) { navigate('/login'); return; }
    const presence = await goLive(seed);
    if (!presence) return;
    setActiveRoom({ room: presence.jitsi_room, title: seed.title });
  };

  const handleJoinLive = (p: LivePresence) => {
    setActiveRoom({ room: p.jitsi_room, title: p.seed_title });
  };

  const handleEndRoom = async () => {
    setActiveRoom(null);
    await endLive();
  };

  // Serendipity: rotate through discover pool
  const serendipitySeed = useMemo(() => {
    if (!discover.length) return null;
    return discover[serendipityIndex % discover.length];
  }, [discover, serendipityIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950 text-white">
      {/* Floating fireflies */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-emerald-300/70 shadow-[0_0_12px_4px_rgba(110,231,183,0.6)]"
            initial={{ x: `${(i * 53) % 100}%`, y: `${(i * 31) % 100}%`, opacity: 0.2 }}
            animate={{
              x: [`${(i * 53) % 100}%`, `${((i * 53) + 30) % 100}%`, `${(i * 53) % 100}%`],
              y: [`${(i * 31) % 100}%`, `${((i * 31) + 25) % 100}%`, `${(i * 31) % 100}%`],
              opacity: [0.2, 0.9, 0.2],
            }}
            transition={{ duration: 8 + (i % 5), repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] p-4 md:p-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2 text-white/80 hover:bg-emerald-500/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Orchard
          </Button>
          <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
            <Globe2 className="mr-1 h-3 w-3" /> Worldwide
          </Badge>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/40 via-slate-900/60 to-emerald-900/40 p-6 md:p-8 backdrop-blur"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <motion.span
                  className="inline-block h-2 w-2 rounded-full bg-rose-400"
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
                <span className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Tribal Alive Feed</span>
              </div>
              <h1 className="bg-gradient-to-r from-emerald-200 via-lime-200 to-emerald-300 bg-clip-text text-3xl font-extrabold leading-tight text-transparent md:text-5xl">
                The orchard is awake. Right now.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">
                Every glowing seed below is a tribe member sharing live — text them, voice them, video them,
                or tap a bloom. No phone numbers, no emails. Just the garden.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-black/30 px-4 py-3">
              <Radio className="h-5 w-5 text-rose-400" />
              <div>
                <div className="text-2xl font-bold leading-none text-white">{liveCount}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">live now</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
          {/* LIVE seeds */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-200">Live in the orchard</h2>
            </div>

            {liveSeeds.length === 0 ? (
              <EmptyLive onSerendipity={() => setSerendipityIndex((i) => i + 1)} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {liveSeeds.map((p) => (
                    <LiveSeedCard
                      key={p.user_id + ':' + p.seed_id}
                      presence={p}
                      blooms={blooms[p.seed_id]}
                      recentBloom={recentBloom?.seed_id === p.seed_id ? recentBloom.stage : null}
                      onJoin={() => handleJoinLive(p)}
                      onBloom={(stage) => sendBloom(p.seed_id, stage)}
                      onShare={() => handleShare({ id: p.seed_id, title: p.seed_title })}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Serendipity strip */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-emerald-300" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-200">
                    Serendipity — meet a seed outside your circle
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10"
                  onClick={() => setSerendipityIndex((i) => i + 1)}
                >
                  <Shuffle className="mr-1 h-3 w-3" /> Surprise me
                </Button>
              </div>
              {loading ? (
                <div className="h-44 animate-pulse rounded-2xl bg-white/5" />
              ) : serendipitySeed ? (
                <SerendipityCard
                  seed={serendipitySeed}
                  onGoLive={() => handleGoLive({ id: serendipitySeed.id, title: serendipitySeed.title, image: serendipitySeed.image })}
                  onShare={() => handleShare(serendipitySeed)}
                />
              ) : null}
            </div>

            {/* Tribe garden — every seed, product & broadcast from everyone */}
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <TreePine className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-200">
                  The whole tribe garden
                </h2>
                <span className="text-xs text-white/50">· {discover.length} items</span>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : discover.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/60">
                  Nothing planted yet. Be the first to sow a seed, list a product, or go live on the radio.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {discover.slice(0, 24).map((item) => (
                    <motion.div
                      key={`${item.kind}-${item.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-emerald-950/40 transition hover:border-emerald-400/40"
                    >
                      <Link to={item.href} className="block">
                        <div className="relative aspect-video w-full bg-emerald-500/10">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-4xl">{item.badge}</div>
                          )}
                          <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs backdrop-blur">
                            {item.badge} {item.kind}
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="line-clamp-1 text-sm font-bold text-white">{item.title}</h3>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/60">by {item.sower}</p>
                        </div>
                      </Link>
                      <div className="flex items-center justify-between gap-2 border-t border-white/5 p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-emerald-200 hover:bg-emerald-500/10"
                          onClick={() => handleGoLive({ id: item.id, title: item.title, image: item.image })}
                        >
                          <Video className="mr-1 h-3 w-3" /> Go live
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-white/70 hover:bg-white/10"
                          onClick={() => handleShare(item)}
                        >
                          <Share2 className="mr-1 h-3 w-3" /> Share
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side: pulse + bloom feed */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/20 bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-300" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-amber-200">Pulse</h3>
              </div>
              <p className="text-sm text-white/70">
                {liveCount === 0
                  ? 'No seeds live yet. Be the first — go live from any of your seeds.'
                  : `${liveCount} ${liveCount === 1 ? 'seed is' : 'seeds are'} blooming live. Tap any to step in.`}
              </p>
              <Button
                className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-lime-500 text-black hover:opacity-90"
                onClick={() => navigate('/dashboard')}
              >
                <Video className="mr-2 h-4 w-4" /> Go live from my seed
              </Button>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-300" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-200">Latest blooms</h3>
              </div>
              <AnimatePresence mode="popLayout">
                {recentBloom ? (
                  <motion.div
                    key={recentBloom.at}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-white/80"
                  >
                    <span className="text-2xl">{BLOOM_META[recentBloom.stage].emoji}</span>{' '}
                    Someone watered a seed.
                  </motion.div>
                ) : (
                  <div className="text-xs text-white/50">
                    Tap 🌱 / 🌿 / 🌳 on any live seed to water it. Reactions ripple to everyone watching.
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-300" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-200">Tribe rules</h3>
              </div>
              <ul className="space-y-1 text-xs text-white/70">
                <li>• All comms inside the garden — no phone, no email.</li>
                <li>• Anyone can go live from any seed, any time.</li>
                <li>• Bestow while watching — instant support, no friction.</li>
                <li>• Your referral code is burned into every share.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Jitsi live room overlay */}
      <AnimatePresence>
        {activeRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/60 px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-white">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                Live: <span className="font-semibold">{activeRoom.title}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={handleEndRoom}>
                Close
              </Button>
            </div>
            <iframe
              title={activeRoom.title}
              src={`https://${JITSI_DOMAIN}/${activeRoom.room}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="flex-1 border-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── sub-components ───────── */

function LiveSeedCard({
  presence, blooms, recentBloom, onJoin, onBloom, onShare,
}: {
  presence: LivePresence;
  blooms?: { seed: number; leaf: number; tree: number };
  recentBloom: BloomStage | null;
  onJoin: () => void;
  onBloom: (s: BloomStage) => void;
  onShare: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 to-slate-900/70 p-4 shadow-[0_0_30px_-10px_rgba(16,185,129,0.5)]"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        animate={{ boxShadow: [
          '0 0 0 0 rgba(16,185,129,0.45)',
          '0 0 0 12px rgba(16,185,129,0)',
        ] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <div className="relative flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-500/10">
          {presence.seed_image ? (
            <img src={presence.seed_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">🌱</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge className="border-rose-400/40 bg-rose-500/15 text-rose-200">🔴 LIVE</Badge>
            <span className="truncate text-xs text-white/60">@{presence.display_name}</span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{presence.seed_title}</h3>
        </div>
      </div>

      {/* Bloom totals */}
      <div className="relative mt-3 flex items-center gap-3 text-xs text-white/70">
        {(['seed', 'leaf', 'tree'] as BloomStage[]).map((s) => (
          <button
            key={s}
            onClick={() => onBloom(s)}
            className="group/bloom flex items-center gap-1 rounded-full border border-emerald-400/20 bg-black/30 px-2 py-1 transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
            title={`Send a ${BLOOM_META[s].label}`}
          >
            <motion.span
              animate={recentBloom === s ? { scale: [1, 1.5, 1], y: [0, -6, 0] } : {}}
              transition={{ duration: 0.6 }}
            >
              {BLOOM_META[s].emoji}
            </motion.span>
            <span>{blooms?.[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-500 to-lime-500 text-black hover:opacity-90"
          onClick={onJoin}
        >
          <Video className="mr-1 h-3 w-3" /> Step in
        </Button>
        <Link to={`/seed/${presence.seed_id}`} className="block">
          <Button size="sm" variant="outline" className="w-full border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10">
            <MessageCircle className="mr-1 h-3 w-3" /> Open seed
          </Button>
        </Link>
      </div>
      <div className="relative mt-2 flex items-center justify-between text-[11px] text-white/50">
        <span>Started {new Date(presence.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <button onClick={onShare} className="flex items-center gap-1 hover:text-emerald-300">
          <Share2 className="h-3 w-3" /> Share
        </button>
      </div>
    </motion.div>
  );
}

function SerendipityCard({
  seed, onGoLive, onShare,
}: {
  seed: DiscoverSeed;
  onGoLive: () => void;
  onShare: () => void;
}) {
  return (
    <motion.div
      key={seed.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/30 to-slate-900/70"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[180px,1fr]">
        <div className="aspect-square w-full bg-emerald-500/10 sm:aspect-auto">
          {seed.image ? (
            <img src={seed.image} alt={seed.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">{seed.badge || '🌱'}</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-200/80">
            <span className="text-base leading-none">{seed.badge}</span>
            <TreePine className="h-3 w-3" /> {seed.kind === 'product' ? 'Product' : seed.kind === 'radio' ? 'Radio' : 'Seed'} · {seed.sower}
          </div>
          <h3 className="mt-1 text-lg font-bold text-white">{seed.title}</h3>
          {seed.description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/70">{seed.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={seed.href}>
              <Button size="sm" variant="outline" className="border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10">
                Open
              </Button>
            </Link>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-lime-500 text-black hover:opacity-90" onClick={onGoLive}>
              <Video className="mr-1 h-3 w-3" /> Go live with this
            </Button>
            <Button size="sm" variant="ghost" className="text-emerald-200 hover:bg-emerald-500/10" onClick={onShare}>
              <Share2 className="mr-1 h-3 w-3" /> Share
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyLive({ onSerendipity }: { onSerendipity: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border border-dashed border-emerald-400/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="mb-3 text-5xl">🌱</div>
      <h3 className="text-lg font-semibold text-white">The orchard is quiet — for a moment.</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/60">
        Nobody is live worldwide right now. Be the first spark — or wander into a discovered seed below.
      </p>
      <Button
        className="mt-4 bg-gradient-to-r from-emerald-500 to-lime-500 text-black hover:opacity-90"
        onClick={onSerendipity}
      >
        <Shuffle className="mr-2 h-4 w-4" /> Surprise me with a seed
      </Button>
    </motion.div>
  );
}
