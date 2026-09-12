import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Heart, MessageCircle, Phone, Video as VideoIcon, Share2, BookOpen, X, UserPlus, UserCheck, Radio, ChevronLeft, ChevronRight, Volume2, VolumeX, Gift, Play, Pause, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSocialActions } from '@/hooks/useSocialActions';
import { useGiftBestowal } from '@/hooks/useGiftBestowal';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';
import { ConfirmBestowModal } from '@/components/payments/ConfirmBestowModal';
import { useSignedImages } from '@/lib/storage/signedImage';
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
   * 'orchard') -- the Whisperer badge/apply (product_whisperer_assignments)
   * is FK'd to those tables, so it's hidden rather than broken for a row
   * sourced from somewhere else (e.g. dj_music_tracks, the legacy
   * sower_books table). Default true.
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
  /** Untruncated description for the inline detail overlay (tapBehavior 'inline', non-music/book kinds) -- falls back to `subtitle` when unset. Separate from `subtitle` because some callers (e.g. StallHotspotSheet) truncate subtitle for the card body. */
  fullDescription?: string | null;
  /**
   * 'navigate' (default): tapping the cover/title calls navigate(openPath),
   * same as always. 'inline': tap never leaves the page -- music toggles
   * the 45s sample, book opens "Read a page" if a PDF exists (else does
   * nothing), everything else opens an in-place detail overlay (gallery,
   * full description, price, Bestow). Built for StallHotspotSheet, where
   * navigating away from the stall interior on a card tap was never right.
   */
  tapBehavior?: 'navigate' | 'inline';
  /**
   * Overrides the real-auth-derived viewerIsOwner check -- pass `false` to
   * force every owner-only affordance hidden and every visitor-only action
   * shown, even when the signed-in user genuinely is `ownerId` (Owner
   * Menu's "View as visitor" toggle). Leave unset for the real check.
   */
  forceViewerIsOwner?: boolean;

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
  /** An extra rail action distinct from Heart (Heart is itself a small gift now -- see below). Rail button only renders when this is set. */
  onGift?: () => void;
  /** An extra rail action, unconditional (unlike Step In/Go Live, which only ever shows on an actually-live orchard card). Rail button only renders when this is set. */
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

/** 10c / 50c / $1 / $5 / $10 -- Heart's small-gift picker amounts. */
const HEART_AMOUNTS = [0.1, 0.5, 1, 5, 10];

/**
 * The one shared card for every seed/product/orchard/track/book (Flow v2
 * build-order step 2) -- built from StallHotspotSheet.tsx's own item cards,
 * the closest existing thing to the target action set. Renders whichever of
 * the decided actions apply to `kind`: sample play (45s music, via the same
 * usePreviewPlayer/PreviewPlayer every other seed card already shares) or
 * "Read a page" (book, a 2-page StoryPdfViewer preview) or a ≤60s audio
 * sample (book, same play bar as music), Bestow (Donate merged in --
 * always rendered, greyed for the owner; a physical seed's Bestow goes to
 * the basket, everything else is a direct bestowal), Message/Voice/Video
 * (get_or_create_direct_room, same RPC ChatApp's own call buttons use),
 * Heart (a small gift, not a like -- see below), Follow (sower line),
 * Share, Report, Go Live/Step In (always on the rail, every kind -- lit
 * gold when the seed has a whisperer commission to promote, joins an
 * already-live session regardless), and a gold Whisperer-% badge +
 * "Whisper this" apply -- both read/write product_whisperer_assignments for
 * real, no hardcoded fallback percent.
 *
 * Heart is NOT product_likes/orchard_likes -- it opens a small-bestowal
 * amount picker (10c/50c/$1/$5/$10 USDC) that feeds the exact same
 * useGiftBestowal + ConfirmBestowModal path the main Bestow button uses
 * (same fee breakdown, same provider picker), just with that picked amount
 * instead of the card's own price. No product-purchase or like-table
 * writes happen here at all.
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
 * Two variants share every bit of the state/logic above, including the
 * exact same right-hand action rail (Message · Voice · Video · Heart · Go
 * Live/Step In · Share · Report), the sample bar (music/book), and the
 * full-width "🎁 Bestow & Get This Seed — $X" button -- 'compact'
 * (the grid/stall-row card, default) is the same card at a smaller size,
 * not a reduced one, and 'feed' (full-bleed, TikTok-style -- the Tribal
 * Gardens live feed) additionally supports a gallery/video with
 * autoplay-muted-while-active + tap-to-unmute, a sower link to
 * /stall/:username, and an optional role/tier chip beside the Whisperer
 * badge. The owner viewing their own card sees the whole rail greyed out
 * (rendered, not hidden, so they can see what a visitor gets) rather than
 * missing -- Owner Menu's "View as visitor" toggle (forceViewerIsOwner) is
 * what actually makes it live for them.
 */
export default function SeedCard({
  id, kind, title, subtitle, cover, ownerId, ownerName, ownerAvatar,
  price, openPath, isProductRow = true, previewUrl, productId, pdfUrl,
  hideSowerLine, className = '', fullDescription, tapBehavior = 'navigate', forceViewerIsOwner,
  variant = 'compact', images, videoUrl, resolveVideoUrl, ownerUsername, chip, isActive,
  onMessageOverride, onVoiceOverride, onVideoOverride, onShareOverride, onBestowOverride,
  onFollowOverride, isFollowingOverride,
  onGift, onGoLiveExtra, reportTarget,
}: SeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { followUser, unfollowUser, shareContent } = useSocialActions();
  const { send: sendGift, loading: bestowing } = useGiftBestowal();
  const { liveSeeds, goLive, endLive } = useTribalLiveOrchard();
  const { addToBasket } = useProductBasket();

  const isFeed = variant === 'feed';
  const isInline = tapBehavior === 'inline';
  const viewerIsOwner = forceViewerIsOwner !== undefined ? forceViewerIsOwner : (!!user && user.id === ownerId);
  // The owner sees their own rail rendered, not hidden -- just visually
  // disabled, so they know what a visitor gets. "View as visitor"
  // (forceViewerIsOwner=false) is what makes it live for them again.
  const railDisabled = viewerIsOwner;

  const [isFollowing, setIsFollowing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [bestowOpen, setBestowOpen] = useState(false);
  const [bestowAmount, setBestowAmount] = useState<number | null>(null);
  const [heartPickerOpen, setHeartPickerOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [detailOverlayOpen, setDetailOverlayOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [starting, setStarting] = useState<'message' | 'voice' | 'video' | null>(null);

  // Gallery position (both variants) + video autoplay/mute (feed only)
  const [imgIdx, setImgIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rawGallery = images && images.length > 0 ? images : cover ? [cover] : [];
  const gallery = useSignedImages(rawGallery);
  const hasGallery = !videoUrl && gallery.length > 1;
  const displayCover = gallery[imgIdx] ?? gallery[0] ?? null;

  useEffect(() => { setImgIdx(0); }, [id]);

  // useSignedImages (src/lib/storage/signedImage.ts) returns the raw,
  // unsigned URLs synchronously on first render, then replaces them with
  // real signed ones once its async signing effect resolves. A private
  // bucket's raw URL (formatted as if public) 400s immediately, so the
  // <img> below's onError can fire and set imageFailed=true BEFORE the
  // signed URL ever arrives -- a pure timing race, not a per-item data
  // problem (confirmed live: the covers that showed this were real,
  // existing storage objects). Once imageFailed flips true nothing ever
  // reset it, so the placeholder stuck around forever even after
  // displayCover was updated to a real, working signed URL. Reset it
  // whenever the URL actually changes so a freshly-resolved one gets its
  // own attempt.
  useEffect(() => { setImageFailed(false); }, [displayCover]);

  // One shared player instance for the whole card -- music kind only.
  // Rendered inline (not via the separate PreviewPlayer component) so a
  // tapBehavior='inline' card tap can drive the exact same toggle its own
  // play button uses, rather than two independent player instances.
  // Music gets the full 45s-preview-then-full-track flow (productId
  // upgrade); a book's audio sample IS the whole preview_url -- there's no
  // separate "full track" concept for a ≤60s reading, so no productId.
  const hasSamplePlayer = kind === 'music' || kind === 'book';
  const musicPlayer = usePreviewPlayer({
    id,
    previewUrl: hasSamplePlayer ? (previewUrl ?? null) : null,
    productId: kind === 'music' && isProductRow ? (productId ?? undefined) : undefined,
  });

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

  // The sower's own set commission (products/orchards.whisperer_commission_percent)
  // -- distinct from badgePct above (which only reflects an ACTIVE assigned
  // whisperer). Go Live is "lit" for either: a sower can open a seed to
  // whisperer promotion (a set commission > 0) before anyone has actually
  // taken it on.
  const [sowerCommissionPct, setSowerCommissionPct] = useState<number | null>(null);
  useEffect(() => {
    if (!isProductRow) return;
    let alive = true;
    const table = kind === 'orchard' ? 'orchards' : 'products';
    supabase.from(table).select('whisperer_commission_percent').eq('id', id).maybeSingle().then(({ data }) => {
      if (alive) setSowerCommissionPct(Number((data as { whisperer_commission_percent?: number | null } | null)?.whisperer_commission_percent ?? 0));
    });
    return () => { alive = false; };
  }, [isProductRow, kind, id]);

  // Physical vs digital checkout -- only a 'seed' (general product) row can
  // be physical (mugs, goods); music/book/video/orchard are never
  // basket-checkout items. products.delivery_type drives it; unset means
  // digital (the column's own default everywhere else in the app).
  const [productDeliveryType, setProductDeliveryType] = useState<'physical' | 'digital' | null>(null);
  useEffect(() => {
    if (!isProductRow || kind !== 'seed') return;
    let alive = true;
    supabase.from('products').select('delivery_type').eq('id', id).maybeSingle().then(({ data }) => {
      if (alive) setProductDeliveryType((data as { delivery_type?: string | null } | null)?.delivery_type === 'physical' ? 'physical' : 'digital');
    });
    return () => { alive = false; };
  }, [isProductRow, kind, id]);

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

  const liveHere = liveSeeds.filter((p) => p.seed_id === id);
  const isLiveHere = liveHere.length > 0;
  const effectiveReportTarget = reportTarget !== undefined ? reportTarget : { type: KIND_REPORT_TYPE[kind], id };

  // Go Live is always on the rail now (every kind, both variants). Lit
  // gold when this seed has a whisperer commission -- an active assigned
  // whisperer (badgePct) OR the sower's own set commission > 0 -- so a
  // whisperer can promote it; dim/disabled otherwise. Already-live keeps
  // the existing "Step In" (join) behavior regardless of commission -- a
  // visitor can always join a session already underway. A caller with its
  // own richer Go Live handling (onGoLiveExtra, e.g. TribalAliveFeedPage)
  // is unchanged -- always "Go Live", always enabled, its own logic.
  const hasWhispererCommission = badgePct != null || (sowerCommissionPct ?? 0) > 0;
  const goLiveLabel = !onGoLiveExtra && isLiveHere ? 'Step In' : 'Go Live';
  const goLiveTone: 'accent' | 'gold' | undefined =
    onGoLiveExtra || isLiveHere ? 'accent' : hasWhispererCommission ? 'gold' : undefined;
  const goLiveDisabled = railDisabled || (!onGoLiveExtra && !isLiveHere && !hasWhispererCommission);
  const goLiveTitle = !onGoLiveExtra && !isLiveHere && !hasWhispererCommission
    ? 'No whisperer commission on this seed'
    : goLiveLabel;

  const openDetail = (e?: React.MouseEvent) => {
    if (!isInline) { navigate(openPath); return; }
    e?.stopPropagation(); e?.preventDefault();
    if (kind === 'music') { musicPlayer.toggle(e); return; }
    if (kind === 'book') { if (pdfUrl) setPdfPreviewOpen(true); return; }
    setDetailOverlayOpen(true);
  };

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

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!user) { toast.error('Please login to send a gift'); return; }
    setHeartPickerOpen(true);
  };

  const chooseHeartAmount = (amount: number) => {
    setHeartPickerOpen(false);
    setBestowAmount(amount);
    setBestowOpen(true);
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

  // Whatever page this card's action was tapped from -- StallInteriorView
  // keeps the URL hash in sync with the open hotspot sheet via a raw
  // history.replaceState (#stall-kind=<kind>, src/components/stalls/
  // StallInteriorView.tsx), so a plain window.location read here already
  // has the right "come back to this exact sheet" address, no extra
  // plumbing through StallHotspotSheet/StallInteriorView needed. Only
  // meaningful for a genuine in-app SPA navigate (Message); Voice/Video
  // open the call in a new tab, where the original tab -- stall sheet and
  // all -- is untouched, so there's no "back" state to capture there.
  const captureStallReturn = (): { pathname: string; label?: string; from?: string } | null => {
    if (typeof window === 'undefined') return null;
    const { pathname, hash } = window.location;
    if (!pathname.startsWith('/stall/')) return null;
    // Tags this specific card onto the hash so the reopened sheet can
    // scroll it into view (StallHotspotSheet's scrollToItemId) -- stripped
    // back out by StallInteriorView's own hash-sync effect right after, so
    // it never lingers if the page is later reloaded/shared.
    const withSeed = hash ? `${hash}&seed=${id}` : hash;
    // Carries the CURRENT page's own origin (StallVisitPage's { from },
    // e.g. the stalls feed) forward -- otherwise the replace-navigate back
    // from chat/basket lands on this stall with no origin state at all,
    // and closing the interior from there would have nothing to fall back
    // to but the generic default.
    const from = (location.state as { from?: string } | null)?.from;
    return { pathname: `${pathname}${withSeed}`, label: ownerName ? `Back to ${ownerName}'s stall` : undefined, from };
  };

  // Attaches this seed's context (title, cover, a link back to this exact
  // stall sheet) as a quoted card on the room's first-ever message, so the
  // conversation doesn't lose track of what it was actually about once
  // the chat scrolls past that point. Only on a genuinely empty room --
  // never re-injected into an existing conversation the two of them
  // already had about something else. Direct chat_messages insert (not
  // the send_chat_message RPC, which has no system_metadata param) --
  // same RLS-safe pattern BookingRequestMessage.tsx already uses:
  // sender_id = auth.uid(), system_metadata.is_system left false/absent.
  const attachSeedReferenceIfFirstMessage = async (roomId: string) => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);
      if (count) return; // not the first message -- leave the existing thread alone
      const stallReturn = captureStallReturn();
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: null,
        message_type: 'seed_reference',
        system_metadata: {
          type: 'seed_reference',
          seed_id: id,
          title,
          cover: cover ?? null,
          href: stallReturn?.pathname ?? openPath,
        },
      } as never);
    } catch {
      // Best-effort context card -- never block the conversation from opening over this.
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onMessageOverride) { onMessageOverride(); return; }
    setStarting('message');
    const roomId = await startDirectRoom();
    if (roomId) await attachSeedReferenceIfFirstMessage(roomId);
    setStarting(null);
    if (roomId) {
      const returnTo = captureStallReturn();
      navigate(`/chatapp?room=${roomId}`, returnTo ? { state: { returnTo } } : undefined);
    }
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

  const effectiveBestowAmount = bestowAmount ?? (price && price > 0 ? price : 5);

  const handleBestowConfirm = async (provider: PayoutProviderId) => {
    const result = await sendGift({
      recipientId: ownerId,
      amount: effectiveBestowAmount,
      contextKind: 'chat_tip',
      contextId: id,
      provider,
      message: bestowAmount != null ? `A small gift for "${title}"` : `Bestowal for "${title}"`,
    });
    if (result.success) {
      toast.success(`${ownerName ?? 'They'} will receive your gift!`);
      setBestowOpen(false);
      setBestowAmount(null);
    }
  };

  // Physical goods (mugs/general products, products.delivery_type ===
  // 'physical') go to the basket -- same checkout path TribalAliveFeedPage's
  // own handleBestow already uses for a non-music, non-radio feed item.
  // Everything else (digital seeds, orchards, music, books) is a direct
  // bestowal via ConfirmBestowModal, unchanged.
  const isPhysical = kind === 'seed' && productDeliveryType === 'physical';

  const handleBestowClick = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onBestowOverride) { onBestowOverride(); return; }
    if (isPhysical) {
      addToBasket({
        id,
        title,
        price: price && price > 0 ? price : 0,
        cover_image_url: cover ?? undefined,
        sower_id: ownerId,
        bestowal_count: 0,
        type: kind,
        sowers: { display_name: ownerName ?? '' },
      });
      toast.success('Added to your basket');
      const returnTo = captureStallReturn();
      navigate('/products/basket', returnTo ? { state: { returnTo } } : undefined);
      return;
    }
    setBestowAmount(null);
    setBestowOpen(true);
  };

  const handleGoLiveClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (onGoLiveExtra) { onGoLiveExtra(); return; }
    if (!user) { navigate('/login'); return; }
    if (isLiveHere) { setActiveRoom(liveHere[0].jitsi_room); return; }
    if (!hasWhispererCommission) return;
    const presence = await goLive({ id, title, image: cover ?? undefined });
    if (presence) setActiveRoom(presence.jitsi_room);
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

  const bestowLabel = `Bestow & Get This Seed${price && price > 0 ? ` — $${price.toFixed(2)}` : ''}`;

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

  // tapBehavior 'inline' detail overlay -- mugs/other (any kind besides
  // music/book, which get their own inline tap behavior instead). Opens
  // in place over the stall interior rather than navigating away.
  const detailOverlay = detailOverlayOpen && (
    <div className="fixed inset-0 z-[10050] bg-black/80 flex items-center justify-center p-4" onClick={() => setDetailOverlayOpen(false)}>
      <div className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-xl bg-[#180f08] border border-amber-500/20" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-square">
          {displayCover ? (
            <>
              <img src={displayCover} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70" />
              <div className="absolute inset-0 bg-black/20" />
              <img src={displayCover} alt={title} className="absolute inset-0 w-full h-full object-contain" />
            </>
          ) : (
            <GradientPlaceholder type={KIND_PLACEHOLDER[kind]} title={title} className="w-full h-full" />
          )}
          {hasGallery && <GalleryChrome gallery={gallery} imgIdx={imgIdx} setImgIdx={setImgIdx} large />}
          <button type="button" onClick={() => setDetailOverlayOpen(false)} aria-label="Close" className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <h2 className="font-serif text-lg text-amber-50">{title}</h2>
          {(fullDescription ?? subtitle) && (
            <p className="text-sm text-amber-100/70 whitespace-pre-wrap">{fullDescription ?? subtitle}</p>
          )}
          {price != null && price > 0 && <p className="text-amber-300 font-semibold">${price.toFixed(2)}</p>}
          {!viewerIsOwner && (
            <button
              type="button"
              onClick={handleBestowClick}
              className="w-full rounded-md bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 text-sm font-bold py-2 transition-colors"
            >
              🎁 {bestowLabel}
            </button>
          )}
        </div>
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
      mediaKind={kind === 'orchard' ? 'orchard' : 'seed'}
      openPath={openPath}
      onClose={handleEndRoom}
    />
  );

  const bestowModal = (
    <ConfirmBestowModal
      isOpen={bestowOpen}
      onClose={() => { setBestowOpen(false); setBestowAmount(null); }}
      title={title}
      amount={effectiveBestowAmount}
      onConfirm={handleBestowConfirm}
      confirming={bestowing}
      actionLabel="Bestow"
      enablePaystack
    />
  );

  const heartPicker = heartPickerOpen && (
    <div className="fixed inset-0 z-[10060] bg-black/70 flex items-center justify-center p-4" onClick={() => setHeartPickerOpen(false)}>
      <div className="w-full max-w-xs rounded-xl bg-[#180f08] border border-amber-500/20 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-serif text-amber-100">Heart — a small gift</p>
          <button type="button" onClick={() => setHeartPickerOpen(false)} aria-label="Close">
            <X className="h-4 w-4 text-amber-100/70" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {HEART_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => chooseHeartAmount(amount)}
              className="flex-1 min-w-[3.5rem] rounded-md border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-sm font-bold py-2 transition-colors"
            >
              {amount < 1 ? `${Math.round(amount * 100)}¢` : `$${amount}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isFeed) {
    return (
      <>
        <div className={`relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 ${className}`}>
          {displayCover && (
            <img src={displayCover} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl scale-110" />
          )}

          {videoUrl ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} className="absolute inset-0 h-full w-full">
              <video
                ref={videoRef}
                src={resolvedVideoUrl ?? undefined}
                poster={displayCover ?? undefined}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                loop
                preload="none"
              />
              <span className="absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur ring-1 ring-white/20">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </span>
            </button>
          ) : displayCover ? (
            <img src={displayCover} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[20rem] opacity-10">🌱</div>
          )}

          {hasGallery && !videoUrl && <GalleryChrome gallery={gallery} imgIdx={imgIdx} setImgIdx={setImgIdx} large />}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

          {/* Right action rail -- greyed (not hidden) for the owner viewing
              their own card, so they can see what a visitor gets; Owner
              Menu's "View as visitor" is what makes it live for them. */}
          <div className="absolute right-2 bottom-4 top-[12rem] z-10 flex flex-col items-center justify-start gap-1 overflow-y-auto no-scrollbar sm:right-3 sm:bottom-6 sm:top-[13rem] sm:gap-1.5">
            <FeedRailButton icon={<MessageCircle className="h-4 w-4" />} label="Message" onClick={handleMessage} disabled={railDisabled || starting === 'message'} />
            <FeedRailButton icon={<Phone className="h-4 w-4" />} label="Voice" onClick={handleCall} disabled={railDisabled || starting === 'voice'} dataCall="voice" />
            <FeedRailButton icon={<VideoIcon className="h-4 w-4" />} label="Video" onClick={handleCall} disabled={railDisabled || starting === 'video'} dataCall="video" />
            <FeedRailButton icon={<Heart className="h-4 w-4" />} label="Heart" title="Heart — a small gift" onClick={handleHeartClick} disabled={railDisabled} />
            {onGift && <FeedRailButton icon={<Gift className="h-4 w-4" />} label="Gift" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGift(); }} disabled={railDisabled} />}
            <FeedRailButton
              icon={<Radio className="h-4 w-4" />}
              label={goLiveLabel}
              title={goLiveTitle}
              onClick={handleGoLiveClick}
              disabled={goLiveDisabled}
              tone={goLiveTone}
            />
            <FeedRailButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={handleShare} disabled={railDisabled} />
            {effectiveReportTarget && (
              <div className={`flex flex-col items-center gap-0.5 text-white/95 ${railDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
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
                  <Link to={`/stall/${ownerUsername}`} state={{ from: location.pathname }} className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10">
                    {ownerAvatar ? <img src={ownerAvatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{(ownerName ?? '?')[0]}</div>}
                  </Link>
                ) : (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10">
                    {ownerAvatar ? <img src={ownerAvatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{(ownerName ?? '?')[0]}</div>}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {ownerUsername ? (
                    <Link to={`/stall/${ownerUsername}`} state={{ from: location.pathname }} className="block truncate text-base font-bold leading-tight hover:underline">{ownerName}</Link>
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

            {hasSamplePlayer && musicPlayer.hasSource && (
              <div className="relative mt-2 h-11 max-w-md overflow-hidden rounded-2xl bg-black/40">
                <InlinePreviewBar player={musicPlayer} />
              </div>
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

            <button
              onClick={handleBestowClick}
              disabled={viewerIsOwner}
              className="mt-3 w-full max-w-md rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] hover:scale-[1.02] active:scale-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
            >
              🎁 {bestowLabel}
            </button>
          </div>
        </div>

        {pdfModal}
        {detailOverlay}
        {liveOverlay}
        {bestowModal}
        {heartPicker}
      </>
    );
  }

  return (
    <>
      <Card className={`overflow-hidden bg-[#180f08] border-amber-500/20 ${className}`}>
        <button type="button" onClick={openDetail} className="block w-full text-left relative">
          <div className="relative aspect-square">
            {displayCover && !imageFailed ? (
              <>
                {/* Blurred cover copy fills the square behind the real image --
                    the real image itself is object-contain so it's never
                    cropped, whatever its own aspect ratio (same treatment as
                    the stall front). */}
                <img src={displayCover} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70" />
                <div className="absolute inset-0 bg-black/20" />
                <img src={displayCover} alt={title} className="absolute inset-0 w-full h-full object-contain" onError={() => setImageFailed(true)} />
              </>
            ) : (
              <GradientPlaceholder type={KIND_PLACEHOLDER[kind]} title={title} className="w-full h-full" />
            )}
            {hasSamplePlayer && musicPlayer.hasSource && <InlinePreviewBar player={musicPlayer} />}
            {hasGallery && <GalleryChrome gallery={gallery} imgIdx={imgIdx} setImgIdx={setImgIdx} />}
            {badgePct != null && (
              <span className="absolute top-2 left-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow">
                🎤 Whisperer {badgePct}%
              </span>
            )}

            {/* Same right-hand action rail as the feed variant -- one card,
                two sizes, nothing dropped here. Greyed (not hidden) for the
                owner viewing their own card. */}
            <div className="absolute right-1 top-1 bottom-1 z-10 flex flex-col items-center justify-start gap-1 overflow-y-auto no-scrollbar">
              <FeedRailButton icon={<MessageCircle className="h-3.5 w-3.5" />} label="Message" onClick={handleMessage} disabled={railDisabled || starting === 'message'} />
              <FeedRailButton icon={<Phone className="h-3.5 w-3.5" />} label="Voice" onClick={handleCall} disabled={railDisabled || starting === 'voice'} dataCall="voice" />
              <FeedRailButton icon={<VideoIcon className="h-3.5 w-3.5" />} label="Video" onClick={handleCall} disabled={railDisabled || starting === 'video'} dataCall="video" />
              <FeedRailButton icon={<Heart className="h-3.5 w-3.5" />} label="Heart" title="Heart — a small gift" onClick={handleHeartClick} disabled={railDisabled} />
              {onGift && <FeedRailButton icon={<Gift className="h-3.5 w-3.5" />} label="Gift" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGift(); }} disabled={railDisabled} />}
              <FeedRailButton
                icon={<Radio className="h-3.5 w-3.5" />}
                label={goLiveLabel}
                title={goLiveTitle}
                onClick={handleGoLiveClick}
                disabled={goLiveDisabled}
                tone={goLiveTone}
              />
              <FeedRailButton icon={<Share2 className="h-3.5 w-3.5" />} label="Share" onClick={handleShare} disabled={railDisabled} />
              {effectiveReportTarget && (
                <div className={`flex flex-col items-center gap-0.5 text-white/95 ${railDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <ReportButton
                    targetType={effectiveReportTarget.type}
                    targetId={effectiveReportTarget.id}
                    size="icon"
                    variant="ghost"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/20 hover:bg-black/65 hover:text-white text-white/95 backdrop-blur transition active:scale-90"
                  />
                  <span className="text-[7px] font-semibold drop-shadow leading-none">Report</span>
                </div>
              )}
            </div>
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

          <button
            type="button"
            onClick={handleBestowClick}
            disabled={viewerIsOwner}
            className="w-full rounded-md bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 text-xs font-bold py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            🎁 {bestowLabel}
          </button>

          {whisperBlock}
        </div>
      </Card>

      {pdfModal}
      {detailOverlay}
      {liveOverlay}
      {bestowModal}
      {heartPicker}
    </>
  );
}

const RAIL_BUTTON_TONE: Record<'default' | 'accent' | 'gold', string> = {
  default: 'bg-black/45 ring-white/20 hover:bg-black/65',
  accent: 'bg-rose-500/80 ring-rose-300/40',
  gold: 'bg-gradient-to-b from-amber-400 to-amber-600 ring-amber-300/50',
};

function FeedRailButton({ icon, label, onClick, disabled, tone = 'default', dataCall, title }: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  tone?: 'default' | 'accent' | 'gold';
  dataCall?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-call={dataCall}
      aria-label={label}
      title={title ?? label}
      className="flex flex-col items-center gap-0.5 text-white/95 disabled:opacity-50"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur ring-1 transition active:scale-90 sm:h-9 sm:w-9 ${RAIL_BUTTON_TONE[tone]}`}>
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
/**
 * A 45s-sample play button + progress bar, driven by a `usePreviewPlayer`
 * instance the caller already owns (SeedCard keeps exactly one per card,
 * shared between the cover overlay, the feed content stack, and an inline
 * whole-card tap toggle -- never a second competing player instance for
 * the same id). Meant to sit inside a `relative`-positioned box.
 */
function InlinePreviewBar({ player }: { player: ReturnType<typeof usePreviewPlayer> }) {
  return (
    <div
      className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-2.5 py-2 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={player.toggle}
        aria-label={player.isPlaying ? 'Pause preview' : 'Play preview'}
        className="shrink-0 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center transition-colors"
      >
        {player.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : player.isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1 rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-[width] duration-150"
            style={{ width: `${Math.min(100, Math.max(0, player.progress * 100))}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] font-medium text-white/85 truncate">
          {player.isFullTrack ? 'Full track' : '45s preview'}
        </p>
      </div>
    </div>
  );
}

/** Left/right arrows + position dots over a multi-image gallery -- shared by both variants. */
function GalleryChrome({ gallery, imgIdx, setImgIdx, large }: {
  gallery: string[];
  imgIdx: number;
  setImgIdx: (fn: (i: number) => number) => void;
  large?: boolean;
}) {
  const btnSize = large ? 'h-10 w-10' : 'h-7 w-7';
  const iconSize = large ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <>
      <div className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 ${large ? 'sm:left-3' : ''}`}>
        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setImgIdx((i) => (i - 1 + gallery.length) % gallery.length); }} aria-label="Previous image" className={`grid ${btnSize} place-items-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-black/80 transition`}>
          <ChevronLeft className={iconSize} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setImgIdx((i) => (i + 1) % gallery.length); }} aria-label="Next image" className={`grid ${btnSize} place-items-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 hover:bg-black/80 transition`}>
          <ChevronRight className={iconSize} />
        </button>
      </div>
      <div className="absolute left-1/2 top-2 -translate-x-1/2 z-10 flex gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
        {gallery.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </>
  );
}
