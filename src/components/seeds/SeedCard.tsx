import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, MessageCircle, Phone, Video as VideoIcon, Share2, BookOpen, X, UserPlus, UserCheck, Radio, ChevronLeft, ChevronRight, Volume2, VolumeX, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSocialActions } from '@/hooks/useSocialActions';
import { useGiftBestowal } from '@/hooks/useGiftBestowal';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { ConfirmBestowModal } from '@/components/payments/ConfirmBestowModal';
import PreviewPlayer from '@/components/media/PreviewPlayer';
import SignedImg from '@/components/media/SignedImg';
import { resolvePlayableUrl } from '@/lib/media/resolvePlayableUrl';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import ReportButton from '@/components/moderation/ReportButton';
import StoryPdfViewer from '@/components/stalls/StoryPdfViewer';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';
import { WHISPER_SHARE_PERCENT } from '@/lib/whisperer/policy';
import type { PayoutProviderId } from '@/lib/payments/providerFees';
import { toast } from 'sonner';

export type SeedCardKind = 'seed' | 'orchard' | 'music' | 'book' | 'video';
export type SeedCardVariant = 'compact' | 'feed';

export interface SeedCardProps {
  /** The underlying row's real id -- a products.id / orchards.id (or a dj_music_tracks.id / sower_books.id when `isProductRow` is false). */
  id: string;
  kind: SeedCardKind;
  title: string;
  subtitle?: string | null;
  cover?: string | null;
  ownerId: string;
  ownerName?: string | null;
  ownerAvatar?: string | null;
  /** Base bestow amount -- falls back to $5 (chat-tip default) when unset/zero. */
  price?: number | null;
  /** Where the cover/title tap and "Open" navigate. */
  openPath: string;
  /**
   * True when `id` is a real `products.id` (or `orchards.id` for kind
   * 'orchard') -- Heart (product_likes/orchard_likes) and the Whisperer
   * badge/apply (product_whisperer_assignments) are both FK'd to those
   * tables, so both are hidden rather than broken for a row sourced from
   * somewhere else (e.g. dj_music_tracks, the legacy sower_books table).
   * Default true.
   */
  isProductRow?: boolean;
  /** Music only -- the row's own 45s clip URL. */
  previewUrl?: string | null;
  /** Music only, when `isProductRow` -- get-seed-file upgrade target so the owner/buyer hears the full track. */
  productId?: string | null;
  /** Book only -- a `.pdf` file_url. Enables "Read a page" (a 2-page StoryPdfViewer preview). Omit/null for an .epub or no file. */
  pdfUrl?: string | null;
  /** Hide the avatar/name row -- for a context where every card already shares one obvious owner (e.g. inside that owner's own StallHotspotSheet). Follow still applies if shown. */
  hideSowerLine?: boolean;
  className?: string;

  /** 'compact' (default) is the stall-row/grid card; 'feed' is the full-bleed TikTok-style layout (Tribal Gardens live feed). */
  variant?: SeedCardVariant;
  /** Feed only -- a gallery; falls back to [cover] when unset. Ignored when videoUrl is set. */
  images?: string[] | null;
  /** Feed only -- when set, renders as full-bleed video instead of an image, autoplaying muted while `isActive`. */
  videoUrl?: string | null;
  /**
   * Feed only -- resolves `videoUrl` to something actually playable (e.g.
   * signing a private-bucket URL) before autoplay starts. Defaults to the
   * shared resolvePlayableUrl (the 4 buckets every other seed card's
   * preview already covers) -- pass this when the caller's own video
   * storage lives somewhere broader (e.g. TribalAliveFeedPage's own
   * resolver, which also covers a dedicated 'videos' bucket and others
   * this shared one doesn't know about).
   */
  resolveVideoUrl?: (raw: string) => Promise<string | null>;
  /** Feed only -- sower avatar/name becomes a Link to /stall/:username when present. */
  ownerUsername?: string | null;
  /** Feed only -- a role/category chip shown beside the gold Whisperer badge (e.g. a wandering-role badge). */
  chip?: { emoji: string; label: string; color: string } | null;
  /** Feed only -- short "what you get" text appended to the Bestow button; defaults to a sensible per-kind phrase. */
  bestowWhatYouGet?: string | null;
  /** Feed only -- true while this card is the one centered/visible in the feed; gates autoplay. Caller-driven (the feed page already tracks this via its own IntersectionObserver). */
  isActive?: boolean;

  /**
   * Overrides -- when provided, REPLACE SeedCard's own default handler for
   * that action instead of running it. Built for a page with its own
   * richer existing system for that action (e.g. TribalAliveFeedPage's
   * in-feed SeedActionPanel messaging/DirectCallOverlay and its own
   * kind-specific checkout, both predating SeedCard and not something this
   * component should silently replace). Every other caller leaves these
   * unset and gets SeedCard's own defaults.
   */
  onMessageOverride?: () => void;
  onVoiceOverride?: () => void;
  onVideoOverride?: () => void;
  onShareOverride?: () => void;
  onBestowOverride?: () => void;
  onFollowOverride?: () => void;
  /**
   * Paired with onFollowOverride -- when the caller already tracks follow
   * state in bulk (e.g. one `followingIds` set covering an entire feed,
   * cheaper than a per-card query), pass the current value here instead of
   * letting SeedCard run its own per-card follow-status query.
   */
  isFollowingOverride?: boolean;
  /** Feed only -- an extra rail action distinct from Heart (a small gift, not a like). Rail button only renders when this is set. */
  onGift?: () => void;
  /** Feed only -- an extra rail action, unconditional (unlike Step In, which only ever shows on an actually-live orchard card). Rail button only renders when this is set. */
  onGoLiveExtra?: () => void;
  /**
   * Overrides SeedCard's own KIND_REPORT_TYPE[kind]-derived Report target
   * -- pass explicit `{type, id}`, or `null` to hide Report entirely (e.g.
   * live/session content that isn't a discrete reportable listing). Needed
   * because a caller's own kind taxonomy can be finer-grained than
   * SeedCardKind (e.g. TribalAliveFeedPage's FeedKind has 'product'
   * distinct from 'seed', each with a different real report target_type).
   */
  reportTarget?: { type: string; id: string } | null;
}

const KIND_REPORT_TYPE: Record<SeedCardKind, string> = {
  seed: 'seed',
  orchard: 'orchard',
  music: 'music_track',
  book: 'book',
  video: 'community_video',
};

const KIND_PLACEHOLDER: Record<SeedCardKind, 'product' | 'music' | 'ebook' | 'orchard' | 'video'> = {
  seed: 'product',
  orchard: 'orchard',
  music: 'music',
  book: 'ebook',
  video: 'video',
};

const KIND_WHAT_YOU_GET: Record<SeedCardKind, string> = {
  seed: 'this seed',
  orchard: 'this planting',
  music: 'the full track',
  book: 'the full book',
  video: 'this video',
};

/**
 * The one shared card for every seed/product/orchard/track/book (Flow v2
 * build-order step 2) -- built from StallHotspotSheet.tsx's own item cards,
 * the closest existing thing to the target action set. Renders whichever of
 * the decided actions apply to `kind`: sample play (45s music, via the same
 * usePreviewPlayer/PreviewPlayer every other seed card already shares) or
 * "Read a page" (book, a 2-page StoryPdfViewer preview), Bestow (Donate
 * merged in), Message/Voice/Video (get_or_create_direct_room, same RPC
 * ChatApp's own call buttons use), Heart, Follow (sower line), Share,
 * Report, Step In (orchard cards only, only while actually live), and a
 * gold Whisperer-% badge + "Whisper this" apply -- both read/write
 * product_whisperer_assignments for real, no hardcoded fallback percent.
 *
 * The badge itself reads get_active_whisperer_badge (supabase/migrations/
 * 20260911190000_whisperer_active_badge_rpc.sql), a narrow SECURITY DEFINER
 * RPC that exposes only {seed_id, commission_percent} for an active row --
 * readable by any viewer, unlike a direct product_whisperer_assignments
 * select, whose RLS ("sower or the whisperer on that row" only) would
 * otherwise hide a real active relationship from everyone else. "My own
 * pending/active application" status still reads the table directly (RLS
 * correctly scopes that to the applying whisperer, which is exactly who
 * should see it).
 *
 * Two variants share every bit of the state/logic above: 'compact' (the
 * original grid/stall-row card, default, unchanged) and 'feed' (full-bleed,
 * TikTok-style -- built for the Tribal Gardens live feed). Feed adds a
 * gallery/video with autoplay-muted-while-active + tap-to-unmute, a sower
 * link to /stall/:username, a real "Bestow $X — what you get" label, and
 * puts "Whisper this" (3-state: apply -> Application pending -> Whispering
 * ✓) under Follow next to the Whisperer badge and an optional role/tier
 * chip.
 */
export default function SeedCard({
  id, kind, title, subtitle, cover, ownerId, ownerName, ownerAvatar,
  price, openPath, isProductRow = true, previewUrl, productId, pdfUrl,
  hideSowerLine, className = '',
  variant = 'compact', images, videoUrl, resolveVideoUrl, ownerUsername, chip, bestowWhatYouGet, isActive,
  onMessageOverride, onVoiceOverride, onVideoOverride, onShareOverride, onBestowOverride,
  onFollowOverride, isFollowingOverride,
  onGift, onGoLiveExtra, reportTarget,
}: SeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { followUser, unfollowUser, likeProduct, likeOrchard, shareContent } = useSocialActions();
  const { send: sendGift, loading: bestowing } = useGiftBestowal();
  const { liveSeeds, goLive: _goLive, endLive } = useTribalLiveOrchard();
  void _goLive; // Step In only ever joins an already-live orchard here -- starting a new session is the Owner Menu's own Go Live, not this card's job.

  const isFeed = variant === 'feed';
  const viewerIsOwner = !!user && user.id === ownerId;
  const heartEnabled = kind === 'orchard' || isProductRow;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [bestowOpen, setBestowOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [starting, setStarting] = useState<'message' | 'voice' | 'video' | null>(null);

  // Feed-only: gallery position + video autoplay/mute
  const [imgIdx, setImgIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gallery = images && images.length > 0 ? images : cover ? [cover] : [];
  const hasGallery = isFeed && !videoUrl && gallery.length > 1;
  const feedCover = gallery[imgIdx] ?? cover ?? null;

  useEffect(() => { setImgIdx(0); }, [id]);

  // Signs the URL when it's in a known private bucket (same resolver every
  // other seed card's preview already uses) -- a no-op passthrough for an
  // already-public one, so this is safe whether or not the feed's video
  // storage needs signing.
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isFeed || !videoUrl) { setResolvedVideoUrl(null); return; }
    let alive = true;
    (resolveVideoUrl ?? resolvePlayableUrl)(videoUrl).then((url) => { if (alive) setResolvedVideoUrl(url); });
    return () => { alive = false; };
  }, [isFeed, videoUrl, resolveVideoUrl]);

  useEffect(() => {
    if (!isFeed || !resolvedVideoUrl) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (isActive) el.play().catch(() => {});
    else el.pause();
  }, [isFeed, resolvedVideoUrl, isActive, muted]);

  // Whisperer badge/apply state
  const whispererFkColumn = kind === 'orchard' ? 'orchard_id' : 'product_id';
  const [myWhispererId, setMyWhispererId] = useState<string | null>(null);
  const [badgePct, setBadgePct] = useState<number | null>(null);
  const [myAssignmentStatus, setMyAssignmentStatus] = useState<'pending' | 'active' | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (isFollowingOverride !== undefined) return; // caller tracks this itself
    if (!user || viewerIsOwner) { setIsFollowing(false); return; }
    let alive = true;
    supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', ownerId).maybeSingle()
      .then(({ data }) => { if (alive) setIsFollowing(!!data); });
    return () => { alive = false; };
  }, [user, ownerId, viewerIsOwner, isFollowingOverride]);

  const following = isFollowingOverride !== undefined ? isFollowingOverride : isFollowing;

  useEffect(() => {
    if (!user || !heartEnabled) { setIsLiked(false); return; }
    let alive = true;
    const table = kind === 'orchard' ? 'orchard_likes' : 'product_likes';
    const col = kind === 'orchard' ? 'orchard_id' : 'product_id';
    supabase.from(table).select('id').eq(col, id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setIsLiked(!!data); });
    return () => { alive = false; };
  }, [user, id, kind, heartEnabled]);

  useEffect(() => {
    if (!isProductRow) return;
    let alive = true;
    // Public-safe: get_active_whisperer_badge (supabase/migrations/
    // 20260911190000_whisperer_active_badge_rpc.sql) exposes only
    // {seed_id, commission_percent} for an active row, readable by any
    // viewer -- unlike a direct product_whisperer_assignments select,
    // whose RLS only returns rows the caller is party to (sower or the
    // whisperer on that row), which would hide the badge from everyone
    // else even when a real active relationship exists.
    supabase.rpc('get_active_whisperer_badge', { _seed_id: id }).then(({ data }) => {
      if (!alive || !data || data.length === 0) return;
      setBadgePct(Number(data[0].commission_percent));
    });
    return () => { alive = false; };
  }, [isProductRow, id]);

  useEffect(() => {
    if (!isProductRow || !user) return;
    let alive = true;
    (async () => {
      const { data: w } = await supabase.from('whisperers').select('id').eq('user_id', user.id).maybeSingle();
      const wid = (w as { id?: string } | null)?.id ?? null;
      if (alive) setMyWhispererId(wid);
      if (!wid) return;
      // RLS (product_whisperer_assignments) only returns rows the caller is
      // party to -- fine here, this is specifically MY OWN request status.
      const { data: rows } = await supabase
        .from('product_whisperer_assignments')
        .select('status')
        .eq(whispererFkColumn, id)
        .eq('whisperer_id', wid)
        .in('status', ['pending', 'active']);
      if (!alive || !rows || rows.length === 0) return;
      setMyAssignmentStatus((rows[0] as { status: string }).status as 'pending' | 'active');
    })();
    return () => { alive = false; };
  }, [isProductRow, user, id, whispererFkColumn]);

  const liveHere = kind === 'orchard' ? liveSeeds.filter((p) => p.seed_id === id) : [];
  const isLiveHere = liveHere.length > 0;
  const effectiveReportTarget = reportTarget !== undefined ? reportTarget : { type: KIND_REPORT_TYPE[kind], id };

  const openDetail = () => navigate(openPath);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onFollowOverride) { onFollowOverride(); return; }
    if (!user) { toast.error('Please login to follow'); return; }
    if (isFollowing) {
      const r = await unfollowUser(ownerId);
      if (r.success) setIsFollowing(false);
    } else {
      const r = await followUser(ownerId, kind === 'orchard' ? 'orchard' : 'product', id);
      if (r.success) setIsFollowing(true);
    }
  };

  const handleHeart = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!user) { toast.error('Please login to like'); return; }
    const r = kind === 'orchard' ? await likeOrchard(id) : await likeProduct(id);
    setIsLiked(r.success);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onShareOverride) { onShareOverride(); return; }
    await shareContent('page', openPath, title);
  };

  const startDirectRoom = async (): Promise<string | null> => {
    if (!user) { navigate('/login'); return null; }
    const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
      user1_id: user.id,
      user2_id: ownerId,
    });
    if (error || !roomId) { toast.error('Could not start a conversation.'); return null; }
    return roomId;
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onMessageOverride) { onMessageOverride(); return; }
    setStarting('message');
    const roomId = await startDirectRoom();
    setStarting(null);
    if (roomId) navigate(`/chatapp?room=${roomId}`);
  };

  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const which: 'voice' | 'video' = e.currentTarget.getAttribute('data-call') === 'video' ? 'video' : 'voice';
    if (which === 'voice' && onVoiceOverride) { onVoiceOverride(); return; }
    if (which === 'video' && onVideoOverride) { onVideoOverride(); return; }
    setStarting(which);
    const roomId = await startDirectRoom();
    setStarting(null);
    if (roomId) window.open(`/call/chat_room/${roomId}`, '_blank', 'noopener,noreferrer');
  };

  const handleBestowConfirm = async (provider: PayoutProviderId) => {
    const amount = price && price > 0 ? price : 5;
    const result = await sendGift({
      recipientId: ownerId,
      amount,
      contextKind: 'chat_tip',
      contextId: id,
      provider,
      message: `Bestowal for "${title}"`,
    });
    if (result.success) {
      toast.success(`${ownerName ?? 'They'} will receive your bestowal!`);
      setBestowOpen(false);
    }
  };

  const handleBestowClick = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onBestowOverride) { onBestowOverride(); return; }
    setBestowOpen(true);
  };

  const handleStepIn = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (isLiveHere) setActiveRoom(liveHere[0].jitsi_room);
  };

  const handleEndRoom = async () => {
    setActiveRoom(null);
    await endLive();
  };

  const handleWhisperThis = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!myWhispererId) return;
    setApplying(true);
    const payload: Record<string, unknown> = {
      whisperer_id: myWhispererId,
      sower_id: ownerId,
      commission_percent: WHISPER_SHARE_PERCENT,
      [whispererFkColumn]: id,
    };
    const { error } = await supabase.from('product_whisperer_assignments').insert(payload as never);
    setApplying(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'You already have an open request for this.' : 'Failed to send request.');
      return;
    }
    setMyAssignmentStatus('pending');
    toast.success('Request sent — the sower must approve before you earn anything.');
  };

  const bestowLabel = price && price > 0
    ? `Bestow $${price.toFixed(2)} — ${bestowWhatYouGet ?? KIND_WHAT_YOU_GET[kind]}`
    : `Bestow — ${bestowWhatYouGet ?? KIND_WHAT_YOU_GET[kind]}`;

  const whisperBlock = isProductRow && !viewerIsOwner && user && (
    myAssignmentStatus ? (
      <p className={isFeed ? 'text-xs text-white/70' : 'text-[11px] text-amber-100/50'}>
        {isFeed
          ? (myAssignmentStatus === 'active' ? 'Whispering ✓' : 'Application pending')
          : `Whisper application ${myAssignmentStatus === 'active' ? 'approved' : 'pending'}`}
      </p>
    ) : myWhispererId ? (
      <button
        type="button"
        onClick={handleWhisperThis}
        disabled={applying}
        className={isFeed
          ? 'text-xs font-bold text-amber-300 hover:text-amber-200 disabled:opacity-50'
          : 'w-full rounded-md border border-amber-400/60 text-amber-300 text-[11px] font-bold py-1.5 hover:bg-amber-500/10 transition-colors disabled:opacity-50'}
      >
        {applying ? 'Sending…' : 'Whisper this'}
      </button>
    ) : (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate('/become-a-whisperer'); }}
        className={isFeed ? 'text-xs text-white/60 underline underline-offset-2' : 'w-full text-[11px] text-amber-100/50 underline underline-offset-2'}
      >
        Become a whisperer to apply
      </button>
    )
  );

  const pdfModal = pdfPreviewOpen && pdfUrl && (
    <div className="fixed inset-0 z-[10050] bg-black/80 flex items-center justify-center p-4" onClick={() => setPdfPreviewOpen(false)}>
      <div className="max-w-md w-full max-h-[85vh] overflow-y-auto rounded-xl bg-[#180f08] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-amber-100/70">Read a page — {title}</p>
          <button type="button" onClick={() => setPdfPreviewOpen(false)} aria-label="Close">
            <X className="h-4 w-4 text-amber-100/70" />
          </button>
        </div>
        <StoryPdfViewer url={pdfUrl} maxPages={2} />
      </div>
    </div>
  );

  const liveOverlay = activeRoom && (
    <LiveStageOverlay
      seedId={id}
      title={title}
      subtitle={subtitle ?? undefined}
      jitsiRoom={activeRoom}
      isHost={liveHere[0]?.user_id === user?.id}
      sowerUserId={ownerId}
      images={cover ? [cover] : []}
      mediaKind="orchard"
      openPath={openPath}
      onClose={handleEndRoom}
    />
  );

  const bestowModal = (
    <ConfirmBestowModal
      isOpen={bestowOpen}
      onClose={() => setBestowOpen(false)}
      title={title}
      amount={price && price > 0 ? price : 5}
      onConfirm={handleBestowConfirm}
      confirming={bestowing}
      actionLabel="Bestow"
      enablePaystack
    />
  );

  if (isFeed) {
    return (
      <>
        <div className={`relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 ${className}`}>
          {feedCover && (
            <img src={feedCover} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl scale-110" />
          )}

          {videoUrl ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} className="absolute inset-0 h-full w-full">
              <video
                ref={videoRef}
                src={resolvedVideoUrl ?? undefined}
                poster={feedCover ?? undefined}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                loop
                preload="none"
              />
              <span className="absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur ring-1 ring-white/20">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </span>
            </button>
          ) : feedCover ? (
            <img src={feedCover} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[20rem] opacity-10">🌱</div>
          )}

          {hasGallery && (
            <>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 sm:left-3">
                <button type="button" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + gallery.length) % gallery.length); }} aria-label="Previous image" className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-black/80 transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % gallery.length); }} aria-label="Next image" className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-black/80 transition">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute left-1/2 top-3 -translate-x-1/2 z-10 flex gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
                {gallery.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                ))}
              </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

          {/* Right action rail */}
          <div className="absolute right-2 bottom-4 top-[12rem] z-10 flex flex-col items-center justify-start gap-1 overflow-y-auto no-scrollbar sm:right-3 sm:bottom-6 sm:top-[13rem] sm:gap-1.5">
            <FeedRailButton icon={<MessageCircle className="h-4 w-4" />} label="Message" onClick={handleMessage} disabled={starting === 'message'} />
            <FeedRailButton icon={<Phone className="h-4 w-4" />} label="Voice" onClick={handleCall} disabled={starting === 'voice'} dataCall="voice" />
            <FeedRailButton icon={<VideoIcon className="h-4 w-4" />} label="Video" onClick={handleCall} disabled={starting === 'video'} dataCall="video" />
            {heartEnabled && (
              <FeedRailButton icon={<Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />} label="Heart" onClick={handleHeart} />
            )}
            {onGift && <FeedRailButton icon={<Gift className="h-4 w-4" />} label="Gift" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGift(); }} />}
            {(onGoLiveExtra || (kind === 'orchard' && isLiveHere)) && (
              <FeedRailButton
                icon={<Radio className="h-4 w-4" />}
                label={kind === 'orchard' && isLiveHere && !onGoLiveExtra ? 'Step In' : 'Go Live'}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGoLiveExtra ? onGoLiveExtra() : handleStepIn(e); }}
                accent
              />
            )}
            <FeedRailButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={handleShare} />
            {!viewerIsOwner && effectiveReportTarget && (
              <div className="flex flex-col items-center gap-0.5 text-white/95">
                <ReportButton
                  targetType={effectiveReportTarget.type}
                  targetId={effectiveReportTarget.id}
                  size="icon"
                  variant="ghost"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/20 hover:bg-black/65 hover:text-white text-white/95 backdrop-blur transition active:scale-90 sm:h-9 sm:w-9"
                />
                <span className="text-[8px] font-semibold drop-shadow leading-none sm:text-[9px]">Report</span>
              </div>
            )}
          </div>

          {/* Left content stack */}
          <div className="absolute bottom-4 left-3 right-16 z-10 sm:left-5 sm:right-20">
            <button type="button" onClick={openDetail} className="mb-2 block max-w-md rounded-lg bg-black/50 px-2.5 py-1.5 text-left text-xs font-semibold leading-tight text-white/90 backdrop-blur-md ring-1 ring-white/10">
              {title}
            </button>

            {!hideSowerLine && (
              <div className="flex max-w-md items-center gap-2 rounded-xl bg-black/55 p-2.5 backdrop-blur-md ring-1 ring-white/15 text-white">
                {ownerUsername ? (
                  <Link to={`/stall/${ownerUsername}`} className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10">
                    {ownerAvatar ? <img src={ownerAvatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{(ownerName ?? '?')[0]}</div>}
                  </Link>
                ) : (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10">
                    {ownerAvatar ? <img src={ownerAvatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{(ownerName ?? '?')[0]}</div>}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {ownerUsername ? (
                    <Link to={`/stall/${ownerUsername}`} className="block truncate text-base font-bold leading-tight hover:underline">{ownerName}</Link>
                  ) : (
                    <div className="truncate text-base font-bold leading-tight">{ownerName}</div>
                  )}
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                    {chip && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-none"
                        style={{ background: `linear-gradient(135deg, ${chip.color}40, ${chip.color}15)`, border: `1px solid ${chip.color}66`, color: chip.color }}
                      >
                        <span>{chip.emoji}</span> {chip.label}
                      </span>
                    )}
                    {badgePct != null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-950">
                        🎤 {badgePct}%
                      </span>
                    )}
                  </div>
                </div>
                {!viewerIsOwner && (
                  <button
                    onClick={handleFollow}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${following ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary text-primary-foreground hover:scale-105'}`}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            )}

            {whisperBlock && <div className="mt-1.5">{whisperBlock}</div>}

            {kind === 'music' && (previewUrl || productId) && (
              <FeedPreviewRow id={id} previewUrl={previewUrl ?? null} productId={isProductRow ? productId : null} />
            )}

            {kind === 'book' && pdfUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPdfPreviewOpen(true); }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-black/55"
              >
                <BookOpen className="h-3.5 w-3.5" /> Read a page
              </button>
            )}

            {!viewerIsOwner && (
              <button
                onClick={handleBestowClick}
                className="mt-3 w-full max-w-md rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] hover:scale-[1.02] active:scale-100"
              >
                🎁 {bestowLabel}
              </button>
            )}
          </div>
        </div>

        {pdfModal}
        {liveOverlay}
        {bestowModal}
      </>
    );
  }

  return (
    <>
      <Card className={`overflow-hidden bg-[#180f08] border-amber-500/20 ${className}`}>
        <button type="button" onClick={openDetail} className="block w-full text-left relative">
          <div className="relative aspect-square">
            {cover && !imageFailed ? (
              <SignedImg src={cover} alt={title} className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
            ) : (
              <GradientPlaceholder type={KIND_PLACEHOLDER[kind]} title={title} className="w-full h-full" />
            )}
            {kind === 'music' && (previewUrl || productId) && (
              <PreviewPlayer id={id} previewUrl={previewUrl ?? null} productId={isProductRow ? productId : null} />
            )}
            {badgePct != null && (
              <span className="absolute top-2 left-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow">
                🎤 Whisperer {badgePct}%
              </span>
            )}
            {kind === 'orchard' && isLiveHere && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                <Radio className="h-3 w-3" /> LIVE
              </span>
            )}
          </div>
        </button>

        <div className="p-3 space-y-2">
          <button type="button" onClick={openDetail} className="block w-full text-left">
            <p className="font-serif font-semibold text-amber-50 truncate">{title}</p>
            {subtitle && <p className="text-xs text-amber-100/50 line-clamp-2 mt-0.5">{subtitle}</p>}
          </button>

          {!hideSowerLine && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={ownerAvatar ?? undefined} />
                <AvatarFallback className="bg-amber-950/60 text-amber-200">{(ownerName ?? '?')[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-amber-100/60 truncate flex-1">{ownerName}</span>
              {!viewerIsOwner && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={!user}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:underline disabled:opacity-50"
                >
                  {following ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          )}

          {kind === 'book' && pdfUrl && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPdfPreviewOpen(true); }}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200 hover:underline"
            >
              <BookOpen className="h-3.5 w-3.5" /> Read a page
            </button>
          )}

          {kind === 'orchard' && isLiveHere && (
            <button
              type="button"
              onClick={handleStepIn}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-1.5 transition-colors"
            >
              <Radio className="h-3.5 w-3.5" /> Step In
            </button>
          )}

          {!viewerIsOwner && (
            <button
              type="button"
              onClick={handleBestowClick}
              className="w-full rounded-md bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 text-xs font-bold py-1.5 transition-colors"
            >
              Bestow {price && price > 0 ? `$${price.toFixed(2)}` : ''}
            </button>
          )}

          {whisperBlock}

          <div className="flex items-center justify-between pt-1">
            {!viewerIsOwner ? (
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Message" onClick={handleMessage} disabled={starting === 'message'} className="p-1.5 rounded-full hover:bg-amber-500/10 text-amber-100/60 disabled:opacity-50">
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Voice call" data-call="voice" onClick={handleCall} disabled={starting === 'voice'} className="p-1.5 rounded-full hover:bg-amber-500/10 text-amber-100/60 disabled:opacity-50">
                  <Phone className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Video call" data-call="video" onClick={handleCall} disabled={starting === 'video'} className="p-1.5 rounded-full hover:bg-amber-500/10 text-amber-100/60 disabled:opacity-50">
                  <VideoIcon className="h-4 w-4" />
                </button>
              </div>
            ) : <span />}
            <div className="flex items-center gap-1">
              {heartEnabled && (
                <button type="button" aria-label="Heart" onClick={handleHeart} disabled={!user} className="p-1.5 rounded-full hover:bg-amber-500/10 disabled:opacity-50">
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-amber-100/60'}`} />
                </button>
              )}
              <button type="button" aria-label="Share" onClick={handleShare} className="p-1.5 rounded-full hover:bg-amber-500/10 text-amber-100/60">
                <Share2 className="h-4 w-4" />
              </button>
              {!viewerIsOwner && effectiveReportTarget && (
                <ReportButton targetType={effectiveReportTarget.type} targetId={effectiveReportTarget.id} variant="ghost" size="icon" className="h-7 w-7 text-amber-100/60 hover:bg-amber-500/10" />
              )}
            </div>
          </div>
        </div>
      </Card>

      {pdfModal}
      {liveOverlay}
      {bestowModal}
    </>
  );
}

function FeedRailButton({ icon, label, onClick, disabled, accent, dataCall }: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  accent?: boolean;
  dataCall?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-call={dataCall}
      aria-label={label}
      className="flex flex-col items-center gap-0.5 text-white/95 disabled:opacity-50"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur ring-1 transition active:scale-90 sm:h-9 sm:w-9 ${accent ? 'bg-rose-500/80 ring-rose-300/40' : 'bg-black/45 ring-white/20 hover:bg-black/65'}`}>
        {icon}
      </span>
      <span className="text-[8px] font-semibold drop-shadow leading-none sm:text-[9px]">{label}</span>
    </button>
  );
}

/**
 * Feed variant's 45s preview row -- same usePreviewPlayer every other seed
 * card shares. PreviewPlayer itself is `absolute bottom-0 inset-x-0`,
 * designed to sit inside a `relative`-positioned box (normally a cover
 * image); a plain fixed-height relative box gives it the same "fills the
 * bar" effect here.
 */
function FeedPreviewRow({ id, previewUrl, productId }: { id: string; previewUrl: string | null; productId?: string | null }) {
  return (
    <div className="relative mt-2 h-11 max-w-md overflow-hidden rounded-2xl bg-black/40">
      <PreviewPlayer id={id} previewUrl={previewUrl} productId={productId} />
    </div>
  );
}
