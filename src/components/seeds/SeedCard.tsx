import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Phone, Video as VideoIcon, Share2, BookOpen, X, UserPlus, UserCheck, Radio } from 'lucide-react';
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
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import ReportButton from '@/components/moderation/ReportButton';
import StoryPdfViewer from '@/components/stalls/StoryPdfViewer';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';
import { WHISPER_SHARE_PERCENT } from '@/lib/whisperer/policy';
import type { PayoutProviderId } from '@/lib/payments/providerFees';
import { toast } from 'sonner';

export type SeedCardKind = 'seed' | 'orchard' | 'music' | 'book' | 'video';

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
 */
export default function SeedCard({
  id, kind, title, subtitle, cover, ownerId, ownerName, ownerAvatar,
  price, openPath, isProductRow = true, previewUrl, productId, pdfUrl,
  hideSowerLine, className = '',
}: SeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { followUser, unfollowUser, likeProduct, likeOrchard, shareContent } = useSocialActions();
  const { send: sendGift, loading: bestowing } = useGiftBestowal();
  const { liveSeeds, goLive: _goLive, endLive } = useTribalLiveOrchard();
  void _goLive; // Step In only ever joins an already-live orchard here -- starting a new session is the Owner Menu's own Go Live, not this card's job.

  const viewerIsOwner = !!user && user.id === ownerId;
  const heartEnabled = kind === 'orchard' || isProductRow;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [bestowOpen, setBestowOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [starting, setStarting] = useState<'message' | 'voice' | 'video' | null>(null);

  // Whisperer badge/apply state
  const whispererFkColumn = kind === 'orchard' ? 'orchard_id' : 'product_id';
  const [myWhispererId, setMyWhispererId] = useState<string | null>(null);
  const [badgePct, setBadgePct] = useState<number | null>(null);
  const [myAssignmentStatus, setMyAssignmentStatus] = useState<'pending' | 'active' | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!user || viewerIsOwner) { setIsFollowing(false); return; }
    let alive = true;
    supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', ownerId).maybeSingle()
      .then(({ data }) => { if (alive) setIsFollowing(!!data); });
    return () => { alive = false; };
  }, [user, ownerId, viewerIsOwner]);

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

  const openDetail = () => navigate(openPath);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
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
    setStarting('message');
    const roomId = await startDirectRoom();
    setStarting(null);
    if (roomId) navigate(`/chatapp?room=${roomId}`);
  };

  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const which: 'voice' | 'video' = e.currentTarget.getAttribute('data-call') === 'video' ? 'video' : 'voice';
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

  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
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
            <p className="font-semibold truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{subtitle}</p>}
          </button>

          {!hideSowerLine && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={ownerAvatar ?? undefined} />
                <AvatarFallback>{(ownerName ?? '?')[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate flex-1">{ownerName}</span>
              {!viewerIsOwner && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={!user}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          )}

          {kind === 'book' && pdfUrl && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPdfPreviewOpen(true); }}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
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
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBestowOpen(true); }}
              className="w-full rounded-md bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground text-xs font-bold py-1.5 transition-opacity"
            >
              Bestow {price && price > 0 ? `$${price.toFixed(2)}` : ''}
            </button>
          )}

          {isProductRow && !viewerIsOwner && user && (
            myAssignmentStatus ? (
              <p className="text-[11px] text-muted-foreground">
                Whisper application {myAssignmentStatus === 'active' ? 'approved' : 'pending'}
              </p>
            ) : myWhispererId ? (
              <button
                type="button"
                onClick={handleWhisperThis}
                disabled={applying}
                className="w-full rounded-md border border-amber-400/60 text-amber-600 dark:text-amber-300 text-[11px] font-bold py-1.5 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                {applying ? 'Sending…' : 'Whisper this'}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate('/become-a-whisperer'); }}
                className="w-full text-[11px] text-muted-foreground underline underline-offset-2"
              >
                Become a whisperer to apply
              </button>
            )
          )}

          <div className="flex items-center justify-between pt-1">
            {!viewerIsOwner ? (
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Message" onClick={handleMessage} disabled={starting === 'message'} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground disabled:opacity-50">
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Voice call" data-call="voice" onClick={handleCall} disabled={starting === 'voice'} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground disabled:opacity-50">
                  <Phone className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Video call" data-call="video" onClick={handleCall} disabled={starting === 'video'} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground disabled:opacity-50">
                  <VideoIcon className="h-4 w-4" />
                </button>
              </div>
            ) : <span />}
            <div className="flex items-center gap-1">
              {heartEnabled && (
                <button type="button" aria-label="Heart" onClick={handleHeart} disabled={!user} className="p-1.5 rounded-full hover:bg-accent disabled:opacity-50">
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                </button>
              )}
              <button type="button" aria-label="Share" onClick={handleShare} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground">
                <Share2 className="h-4 w-4" />
              </button>
              {!viewerIsOwner && (
                <ReportButton targetType={KIND_REPORT_TYPE[kind]} targetId={id} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </Card>

      {pdfPreviewOpen && pdfUrl && (
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
      )}

      {activeRoom && (
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
      )}

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
    </>
  );
}
