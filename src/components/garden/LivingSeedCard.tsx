/**
 * LivingSeedCard — the universal "alive" seed card.
 *
 * Drop this anywhere a seed/orchard/music/book/video tile shows up and it
 * automatically:
 *   • shows a live pulse ring when someone (you or anyone) is broadcasting on this seed
 *   • lets the owner / any tribe member tap "Go Live" → opens a Jitsi room in an overlay
 *   • streams bloom reactions (🌱 → 🌿 → 🌳) to all viewers via Supabase Realtime
 *   • supports inline audio/video preview, Open, Share-with-referral
 *   • carries the same LivingButton animations used everywhere else
 *
 * Built on the existing useTribalLiveOrchard hook (presence + broadcast),
 * the existing JITSI_DOMAIN, the existing LivingButton component,
 * and the existing useReferralCode hook. No new tables, no DB writes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import LivingButton from '@/components/LivingButton';
import { useTribalLiveOrchard, type BloomStage } from '@/hooks/useTribalLiveOrchard';
import { useReferralCode } from '@/hooks/useReferralCode';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';

export interface LivingSeedCardProps {
  seedId: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  images?: string[];
  openPath: string;
  mediaUrl?: string | null;
  mediaKind?: 'audio' | 'video' | 'book' | 'orchard' | 'seed';
  badge?: { emoji: string; label: string; color: string };
  mine?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRepost?: () => void;
  onPark?: () => void;
  size?: 'compact' | 'full';
  className?: string;
  whispererSharePct?: number;
  /** sower (orchard owner) — used by the Bestow flow */
  sowerUserId?: string | null;
  /** radio mode unlocks the host music dropdown inside LiveStage */
  isRadio?: boolean;
}

const BLOOM_META: Record<BloomStage, { emoji: string; label: string }> = {
  seed: { emoji: '🌱', label: 'Sprout' },
  leaf: { emoji: '🌿', label: 'Leaf' },
  tree: { emoji: '🌳', label: 'Tree' },
};

export default function LivingSeedCard({
  seedId, title, subtitle, image, images, openPath,
  mediaUrl, mediaKind = 'seed',
  badge, mine, onEdit, onDelete, onRepost, onPark,
  size = 'compact', className = '',
  whispererSharePct = 10,
  sowerUserId, isRadio = false,
}: LivingSeedCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { code: referralCode } = useReferralCode();
  const { liveSeeds, blooms, recentBloom, goLive, endLive, sendBloom } = useTribalLiveOrchard();

  const [previewing, setPreviewing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // image carousel
  const imgList = (images && images.length ? images : (image ? [image] : [])).filter(Boolean) as string[];
  const [imgIdx, setImgIdx] = useState(0);
  const safeImgIdx = imgList.length ? imgIdx % imgList.length : 0;
  const currentImage = imgList[safeImgIdx] || image || null;

  // live overlay state
  const [overlayImgIdx, setOverlayImgIdx] = useState(0);
  void overlayImgIdx; void setOverlayImgIdx; // (kept for future inline use)

  // who's live on THIS seed right now
  const liveHere = useMemo(
    () => liveSeeds.filter((p) => p.seed_id === seedId),
    [liveSeeds, seedId]
  );
  const isLiveHere = liveHere.length > 0;
  const myBlooms = blooms[seedId] || { seed: 0, leaf: 0, tree: 0 };
  const recentForMe = recentBloom?.seed_id === seedId ? recentBloom.stage : null;

  // Stop preview if media changes
  useEffect(() => {
    setPreviewing(false);
    audioRef.current?.pause();
    videoRef.current?.pause();
  }, [mediaUrl, seedId]);

  const handlePlay = () => {
    if (previewing) {
      audioRef.current?.pause();
      videoRef.current?.pause();
      setPreviewing(false);
      return;
    }
    if ((mediaKind === 'audio' || mediaKind === 'video') && mediaUrl) {
      setPreviewing(true);
      setTimeout(() => {
        if (mediaKind === 'audio') audioRef.current?.play().catch(() => {});
        else videoRef.current?.play().catch(() => {});
      }, 0);
    } else {
      navigate(openPath);
    }
  };

  const handleGoLive = async () => {
    if (!user) { navigate('/login'); return; }
    // If someone else is already live on this seed, join their room
    if (isLiveHere) {
      setActiveRoom(liveHere[0].jitsi_room);
      return;
    }
    const presence = await goLive({ id: seedId, title, image: image || undefined });
    if (presence) setActiveRoom(presence.jitsi_room);
  };

  const handleEndRoom = async () => {
    setActiveRoom(null);
    await endLive();
  };

  // ── Live-room chat (Supabase realtime broadcast) ──
  useEffect(() => {
    if (!activeRoom) return;
    const ch = supabase.channel(`liveroom:${seedId}`);
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
      setChatMsgs(m => [...m.slice(-99), payload as any]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeRoom, seedId]);

  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text || !activeRoom) return;
    const msg = {
      id: Math.random().toString(36).slice(2),
      from: (user as any)?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest',
      text,
      at: Date.now(),
    };
    supabase.channel(`liveroom:${seedId}`).send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatMsgs(m => [...m.slice(-99), msg]);
    setChatDraft('');
  };

  const handleShare = async () => {
    const url = new URL(openPath, 'https://sow2growapp.com');
    if (referralCode) url.searchParams.set('ref', referralCode);
    const text = `🌿 "${title}" is alive in the Sow2Grow orchard. Step in:\n${url.toString()}`;
    try {
      if (navigator.share) await navigator.share({ title, text, url: url.toString() });
      else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Invitation copied', description: 'Your referral code is burned in.' });
      }
    } catch {/* dismissed */}
  };

  const cardHeight = size === 'full' ? 360 : 280;

  return (
    <>
      <section
        className={`relative overflow-hidden rounded-2xl border bg-[#0a0f1a] ${className}`}
        style={{
          borderColor: isLiveHere ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.27)',
          boxShadow: isLiveHere
            ? '0 0 36px -6px rgba(239,68,68,0.45)'
            : '0 0 24px rgba(34,197,94,0.06)',
          height: cardHeight,
          transition: 'border-color 0.4s, box-shadow 0.4s',
        }}
      >
        {/* live pulse ring */}
        {isLiveHere && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            animate={{ boxShadow: [
              '0 0 0 0 rgba(239,68,68,0.45)',
              '0 0 0 14px rgba(239,68,68,0)',
            ] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}

        {currentImage && (
          <img
            key={currentImage}
            src={currentImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50 transition-opacity duration-500"
          />
        )}
        {imgList.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + imgList.length) % imgList.length); }}
              className="absolute left-2 top-1/2 z-[5] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur hover:bg-black/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % imgList.length); }}
              className="absolute right-2 top-1/2 z-[5] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur hover:bg-black/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute left-1/2 top-2 z-[5] -translate-x-1/2 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur">
              {safeImgIdx + 1}/{imgList.length}
            </div>
          </>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #060a12 0%, rgba(34,197,94,0.13) 60%, transparent 100%)' }}
        />

        {/* inline preview */}
        {previewing && mediaKind === 'video' && mediaUrl && (
          <video
            ref={videoRef}
            src={mediaUrl}
            controls
            className="absolute inset-0 z-10 h-full w-full bg-black object-contain"
            onEnded={() => setPreviewing(false)}
          />
        )}
        {previewing && mediaKind === 'audio' && mediaUrl && (
          <div className="absolute left-3 right-3 top-3 z-10 rounded-lg bg-[#060a12]/85 p-2 backdrop-blur">
            <audio
              ref={audioRef}
              src={mediaUrl}
              controls
              className="w-full"
              onEnded={() => setPreviewing(false)}
            />
          </div>
        )}

        {/* badge */}
        {badge && (
          <div
            className="absolute left-3 top-3 z-[2] inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur"
            style={{
              background: `${badge.color}22`,
              border: `1px solid ${badge.color}66`,
              color: badge.color,
            }}
          >
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
          </div>
        )}

        {/* live chip */}
        {isLiveHere && (
          <div className="absolute right-3 top-3 z-[3] inline-flex items-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-100 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            Live · {liveHere.length}
          </div>
        )}

        {/* owner menu */}
        {mine && !isLiveHere && (
          <div className="absolute right-3 top-3 z-[4]">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#060a12]/70 text-lg font-extrabold text-slate-200 backdrop-blur"
              aria-label="Seed actions"
            >⋯</button>
            {menuOpen && (
              <div
                className="absolute right-0 top-10 min-w-[140px] rounded-lg border border-white/10 bg-[#0a0f1a] py-1 shadow-2xl"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <MenuItem label="✏️ Edit"   onClick={() => { setMenuOpen(false); onEdit?.(); }} />
                <MenuItem label="♻️ Repost" onClick={() => { setMenuOpen(false); onRepost?.(); }} />
                <MenuItem label="⏸ Park"   onClick={() => { setMenuOpen(false); onPark?.(); }} />
                <MenuItem label="🗑 Delete" onClick={() => { setMenuOpen(false); onDelete?.(); }} danger />
              </div>
            )}
          </div>
        )}

        {/* content */}
        <div className="absolute bottom-0 left-0 right-0 z-[2] p-3">
          <div className="text-base font-extrabold leading-tight text-slate-100">{title}</div>
          {subtitle && <div className="mt-0.5 line-clamp-1 text-xs text-slate-300/70">{subtitle}</div>}

          {/* bloom row */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/70">
            {(['seed', 'leaf', 'tree'] as BloomStage[]).map((s) => (
              <button
                key={s}
                onClick={() => sendBloom(seedId, s)}
                className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-black/35 px-1.5 py-0.5 transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
                title={`Send a ${BLOOM_META[s].label}`}
              >
                <motion.span
                  animate={recentForMe === s ? { scale: [1, 1.6, 1], y: [0, -6, 0] } : {}}
                  transition={{ duration: 0.6 }}
                >{BLOOM_META[s].emoji}</motion.span>
                <span>{myBlooms[s]}</span>
              </button>
            ))}
            <span
              className="ml-auto rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300"
              title="Whisperer share — what tribe members earn for hosting a live session on this seed"
            >🎤 {whispererSharePct}%</span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-1.5 py-0.5 text-white/60 hover:text-emerald-300"
              title="Share with my referral"
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
          </div>

          {/* action row */}
          <div className="mt-2 flex gap-1.5">
            <div className="flex-1">
              <LivingButton
                variant="play"
                isPlaying={previewing}
                onClick={handlePlay}
                height={38}
                borderRadius={10}
                fontSize={11}
                letterSpacing="0px"
              >
                {previewing ? '⏸ Pause' : '▶ Play'}
              </LivingButton>
            </div>
            <Link to={openPath} className="flex-1" style={{ textDecoration: 'none' }}>
              <LivingButton variant="enter" height={38} borderRadius={10} fontSize={11} letterSpacing="0px">
                📂 Open
              </LivingButton>
            </Link>
            <div className="flex-1">
              <LivingButton
                variant="live"
                onClick={handleGoLive}
                height={38}
                borderRadius={10}
                fontSize={11}
                letterSpacing="0px"
              >
                {isLiveHere ? '🔴 Step in' : '🔴 Go Live'}
              </LivingButton>
            </div>
          </div>
        </div>
      </section>

      {/* Live Room overlay — host video + seed media + chat */}
      <AnimatePresence>
        {activeRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex flex-col bg-black"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/60 px-4 py-2 text-white">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                Live: <span className="font-semibold">{title}</span>
                <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  🎤 Whisperer earns {whispererSharePct}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFaceless(f => !f)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
                  title="Hide face — guests see the seed image instead"
                >
                  {faceless ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {faceless ? 'Show face' : 'Faceless'}
                </button>
                <button
                  onClick={() => navigate(openPath)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
                >
                  <MessageCircle className="h-3 w-3" /> Open seed
                </button>
                <button
                  onClick={handleEndRoom}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
                >
                  <X className="h-3 w-3" /> Close
                </button>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 flex-col md:flex-row">
              {/* LEFT: Stage (host video + presentation tabs + guest boxes) */}
              <div className="relative flex-1 min-h-[40vh] bg-black">
                <LiveStage
                  seedId={seedId}
                  title={title}
                  jitsiRoom={activeRoom}
                  isHost={liveHere[0]?.user_id === user?.id || (!isLiveHere)}
                  isRadio={isRadio}
                  sowerUserId={sowerUserId}
                  whispererSharePct={whispererSharePct}
                  images={imgList}
                  mediaUrl={mediaUrl}
                  mediaKind={mediaKind}
                />
              </div>

              {/* RIGHT: seed media + chat */}
              <div className="flex w-full md:w-[360px] flex-col border-l border-white/5 bg-[#0a0f1a] text-white">
                <div className="border-b border-white/5 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">🌱 Seed Media</div>
                  <div className="mt-1 truncate text-sm font-bold">{title}</div>
                  {subtitle && <div className="mt-0.5 line-clamp-2 text-xs text-white/60">{subtitle}</div>}
                </div>

                {/* Image carousel */}
                {imgList.length > 0 && (
                  <div className="relative h-44 bg-black">
                    <img
                      key={imgList[overlayImgIdx % imgList.length]}
                      src={imgList[overlayImgIdx % imgList.length]}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                    {imgList.length > 1 && (
                      <>
                        <button
                          aria-label="Previous"
                          onClick={() => setOverlayImgIdx(i => (i - 1 + imgList.length) % imgList.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85"
                        ><ChevronLeft className="h-4 w-4" /></button>
                        <button
                          aria-label="Next"
                          onClick={() => setOverlayImgIdx(i => (i + 1) % imgList.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85"
                        ><ChevronRight className="h-4 w-4" /></button>
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold">
                          {(overlayImgIdx % imgList.length) + 1}/{imgList.length}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Inline media */}
                {mediaUrl && mediaKind === 'video' && (
                  <video src={mediaUrl} controls className="w-full bg-black" />
                )}
                {mediaUrl && mediaKind === 'audio' && (
                  <audio src={mediaUrl} controls className="w-full p-2" />
                )}

                {/* Chat */}
                <div className="flex flex-1 min-h-0 flex-col">
                  <div className="border-b border-t border-white/5 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    💬 Live Chat
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {chatMsgs.length === 0 && (
                      <div className="p-3 text-center text-xs text-white/40 italic">
                        Be the first to say hello.
                      </div>
                    )}
                    {chatMsgs.map(m => (
                      <div key={m.id} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs">
                        <div className="font-bold text-emerald-300">{m.from}</div>
                        <div className="text-white/85">{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                    className="flex gap-1.5 border-t border-white/5 p-2"
                  >
                    <input
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      placeholder="Ask the host…"
                      className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-black hover:bg-emerald-400"
                      aria-label="Send"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-white/5 ${danger ? 'text-rose-400' : 'text-slate-200'}`}
    >
      {label}
    </button>
  );
}
