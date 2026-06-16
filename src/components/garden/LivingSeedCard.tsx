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
  showCardNavigation?: boolean;
  onPreviousCard?: () => void;
  onNextCard?: () => void;
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
  showCardNavigation = false, onPreviousCard, onNextCard,
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

  // (chat + realtime moved into LiveStageOverlay)

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

        {showCardNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous seed"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreviousCard?.(); }}
              className="absolute left-2 top-16 z-[20] flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#060a12]/85 text-slate-50 shadow-2xl backdrop-blur transition hover:bg-[#0f172a]"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Next seed"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNextCard?.(); }}
              className="absolute right-2 top-16 z-[20] flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#060a12]/85 text-slate-50 shadow-2xl backdrop-blur transition hover:bg-[#0f172a]"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}


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
          <div className="mt-2 flex flex-wrap gap-1.5">
            <div className="flex-1 min-w-[70px]">
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
            <Link to={openPath} className="flex-1 min-w-[70px]" style={{ textDecoration: 'none' }}>
              <LivingButton variant="enter" height={38} borderRadius={10} fontSize={11} letterSpacing="0px">
                📂 Open
              </LivingButton>
            </Link>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`${openPath}?action=bestow`); }}
              className="flex-1 min-w-[70px] inline-flex items-center justify-center rounded-[10px] border border-amber-400/60 bg-gradient-to-r from-amber-500/30 to-yellow-500/25 text-[11px] font-extrabold uppercase tracking-wider text-amber-100 hover:from-amber-500/45 hover:to-yellow-500/40 transition"
              style={{ height: 38 }}
              aria-label="Bestow to this seed"
            >
              🎁 Bestow
            </button>
            <div className="flex-1 min-w-[70px]">
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
          <LiveStageOverlay
            seedId={seedId}
            title={title}
            subtitle={subtitle}
            jitsiRoom={activeRoom}
            isHost={liveHere[0]?.user_id === user?.id || (!isLiveHere)}
            isRadio={isRadio}
            sowerUserId={sowerUserId}
            whispererSharePct={whispererSharePct}
            images={imgList}
            mediaUrl={mediaUrl}
            mediaKind={mediaKind}
            openPath={openPath}
            onClose={handleEndRoom}
          />
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
