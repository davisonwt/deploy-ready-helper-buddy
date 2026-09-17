import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, Store, UserX, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useStallTemplates } from '@/hooks/useStallTemplates';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import StallInteriorView from '@/components/stalls/StallInteriorView';
import StallFrontGate from '@/components/stalls/StallFrontGate';
import { readAndClearPendingWelcomeInviter } from '@/lib/referral';
import { STALL_TIER_LABEL, resolveStallHotspots, type StallHotspot, type StallTier } from '@/lib/stalls/stallTypes';

interface StallRow {
  id: string;
  user_id: string;
  name: string;
  tagline: string | null;
  tier: StallTier;
  front_image_path: string | null;
  interior_image_path: string | null;
  hotspots: StallHotspot[] | null;
  published: boolean;
  enter_via_front: boolean;
}

/**
 * Public visitor route: opens straight into the interior -- no
 * intermediate "tap to step inside" front page. The shop-front card only
 * renders as a fallback if the interior image itself fails to load (a
 * broken/expired storage URL), and tapping it retries the load. Same
 * StallInteriorView the Cockpit owner view uses. Owner view is identical
 * to the visitor view except an "Edit stall" pill top-right (Farm-Stalls
 * batch 2b, task 4) -- Bestow happens per-item inside StallHotspotSheet,
 * not as a stall-level button here.
 *
 * RLS (stalls_owner_all / stalls_read_published) already restricts a
 * non-owner to a published row only -- the query here doesn't filter on
 * published itself, so the owner can preview a draft.
 */
export default function StallVisitPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const templates = useStallTemplates();

  const [stall, setStall] = useState<StallRow | null | undefined>(undefined); // undefined = loading
  const [interiorFailed, setInteriorFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  // S2G-run "places" (stalls.enter_via_front) open on the front/gate image
  // first -- this is local, per-mount state, not part of the URL ("not a
  // route change" per spec): visiting /stall/<username> is always the same
  // address whether the gate or the interior is currently showing.
  //
  // Tribal Gardens cards still land straight in the interior, gate skipped
  // entirely -- StallsFeedPage.openStall already tags that one navigation
  // with #open (nothing else in the app does), so it doubles as the "came
  // from a feed card, not the nav" signal with no new plumbing.
  //
  // `?live=1` is the same idea for a live-session invite link
  // (shareStallLink's `opts.live`, burned into the URL at share time by
  // the sharer's own client, which already knows for certain the stall is
  // live) -- an explicit, synchronous signal read on the very first
  // render, not dependent on THIS visitor's own realtime presence
  // subscription completing first. See the ownerIsLive effect below for
  // the plain-URL (no signal) case.
  const [entered, setEntered] = useState(() => {
    if (window.location.hash.startsWith('#open')) return true;
    return new URLSearchParams(window.location.search).get('live') === '1';
  });

  useEffect(() => {
    if (!username) { setStall(null); return; }
    let alive = true;
    (async () => {
      // Narrow anon-callable RPC -- public_profiles itself is granted to
      // `authenticated` only, and this route must work for a signed-out
      // visitor. Resolves to null for no user, no stall, or an
      // unpublished one, all treated identically below.
      const { data: ownerId } = await supabase.rpc('get_stall_owner_id_by_username' as any, { _username: username });
      if (!ownerId) { if (alive) setStall(null); return; }

      const { data } = await supabase
        .from('stalls')
        .select('id, user_id, name, tagline, tier, front_image_path, interior_image_path, hotspots, published, enter_via_front')
        .eq('user_id', ownerId)
        .maybeSingle();
      if (alive) setStall((data as unknown as StallRow | null) ?? null);
    })();
    return () => { alive = false; };
  }, [username]);

  // The interior is the default view -- this just confirms the interior
  // image itself actually loads; the shop-front card is the fallback if
  // it doesn't.
  useEffect(() => {
    if (!stall?.interior_image_path) return;
    let alive = true;
    setInteriorFailed(false);
    const img = new Image();
    img.onerror = () => { if (alive) setInteriorFailed(true); };
    img.src = stall.interior_image_path;
    return () => { alive = false; };
  }, [stall?.interior_image_path, retryNonce]);

  const isOwner = !!user && !!stall && user.id === stall.user_id;
  // Also gates the front gate itself below -- a visitor arriving (invite
  // link or otherwise) while the owner is live must never be made to tap
  // through an empty-looking gate/interior first. Confirmed live,
  // 2026-09-14: Davison live at Scripture Study, a guest opening the
  // invite link still landed on the front gate, then the plain interior --
  // this check used to only feed the broken-image fallback card's badge.
  const { liveSeeds } = useTribalLiveOrchard();
  const ownerIsLive = !!stall && liveSeeds.some((p) => p.user_id === stall.user_id);
  // The plain /stall/<username> URL (no ?live=1 signal, e.g. a bookmark or
  // an old link) must still land a visitor already-on-this-page in the
  // live once one starts/is detected -- ownerIsLive itself races
  // presence-sync (liveSeeds is empty for the first ~1-2s after a fresh
  // or logged-out client's realtime channel subscribes), so the very
  // FIRST render's gate-vs-interior choice can't be trusted alone.
  // Re-evaluates reactively instead of once: the moment ownerIsLive flips
  // true -- whenever presence actually finishes syncing -- this dismisses
  // the gate even if it was already showing, rather than leaving the
  // visitor stranded on whatever the first render happened to decide.
  useEffect(() => {
    if (ownerIsLive) setEntered(true);
  }, [ownerIsLive]);

  // Stall invite links ("come see my shop"): a referred signup queues the
  // inviter's display name (useAuth.jsx's register(), src/lib/referral.ts)
  // right after claim_referral_code resolves a real referrer -- shown
  // here, once, wherever the visitor actually lands back after the
  // mandatory onboarding chain (readPendingReturn already sent them back
  // to this exact stall). Gated on `user` so it only ever fires for an
  // actually-signed-in visitor, never while still loading/anonymous.
  useEffect(() => {
    if (!user) return;
    const inviter = readAndClearPendingWelcomeInviter();
    if (inviter) toast.success(`${inviter} invited you — welcome!`);
  }, [user]);

  // Never a blind history.back() -- with the returnTo/chatReturnTo dance
  // (SeedCard.tsx's Message/Bestow actions, ChatApp.tsx, ProductBasketPage.tsx)
  // now replacing entries instead of pushing, back() here could still
  // land on a stale intermediate entry depending on exactly how the
  // visitor arrived, and a wrong hop there is how the "close -> lands
  // back on the chat -> Back -> stall -> forever" loop happened. Track
  // the real origin explicitly instead: whoever navigated here passes
  // state.from (StallsFeedPage, TribalAliveFeedPage's SeedCard sower
  // link, MemberProfilePage); no state means a direct/shared link, so
  // there's nothing meaningful to go back to -- land on the stalls feed.
  const handleClose = () => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from || '/stalls-feed', { replace: true });
  };

  if (stall === undefined) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!stall || (!stall.published && !isOwner)) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <UserX className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">This stall isn't open yet.</p>
        <Link to="/" className="text-sm underline text-muted-foreground">Back to Sow2Grow</Link>
      </div>
    );
  }

  if (!stall.front_image_path || !stall.interior_image_path) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Store className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">This stall is still being built.</p>
      </div>
    );
  }

  if (stall.enter_via_front && stall.front_image_path && !entered && !ownerIsLive) {
    return (
      <StallFrontGate
        frontImageUrl={stall.front_image_path}
        stallName={stall.name}
        onEnter={() => setEntered(true)}
        onClose={handleClose}
      />
    );
  }

  if (!interiorFailed) {
    return (
      <StallInteriorView
        ownerId={stall.user_id}
        username={username ?? null}
        interiorImageUrl={stall.interior_image_path}
        stallName={stall.name}
        hotspots={resolveStallHotspots(stall.interior_image_path, stall.hotspots, templates)}
        isOwner={isOwner}
        onClose={stall.enter_via_front ? () => setEntered(false) : handleClose}
      />
    );
  }

  // Interior image failed to load -- fall back to the shop front so the
  // visitor isn't stuck on a blank screen. Tapping retries the load.
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {!stall.published && isOwner && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          Preview only -- this stall isn't published yet.
        </div>
      )}

      <button type="button" onClick={() => setRetryNonce((n) => n + 1)} className="block w-full text-left">
        <Card className="overflow-hidden hover:opacity-95 transition-opacity">
          {/* Portrait phones (<lg, portrait): pannable sideways, same
              reasoning as StallsFeedPage's cards -- a landscape front image
              squeezed into a 16:9 box here is just as unreadably short as
              it was in the feed. Landscape phones/tablets and desktop keep
              the object-contain box below, unchanged. */}
          <div data-pan-scroll className="hidden max-lg:portrait:block relative w-full h-[70vh] overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="relative h-full w-max mx-auto snap-center">
              <img
                src={stall.front_image_path}
                alt={stall.name}
                onLoad={(e) => {
                  const scrollEl = e.currentTarget.closest('[data-pan-scroll]') as HTMLDivElement | null;
                  if (scrollEl) scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2;
                }}
                className="block h-full w-auto max-w-none"
              />
            </div>
          </div>

          <div className="relative aspect-[16/9] sm:aspect-[21/9] max-lg:portrait:hidden">
            {/* Blurred cover copy fills the frame behind the real image --
                the real image itself is object-contain so it's never
                cropped or stretched, whatever its own aspect ratio (same
                treatment as MyStallCard / the Cockpit hero). Name/tagline
                sit in their own strip below (not overlaid) so they can
                never cover any part of the image. */}
            <img src={stall.front_image_path} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70" />
            <div className="absolute inset-0 bg-black/20" />
            <img src={stall.front_image_path} alt={stall.name} className="absolute inset-0 w-full h-full object-contain" />
            {ownerIsLive && (
              <span className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                <Radio className="h-3 w-3" /> LIVE
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-3 p-4">
            <div>
              <h1 className="font-bold text-xl">{stall.name}</h1>
              {stall.tagline && <p className="text-sm text-muted-foreground">{stall.tagline}</p>}
            </div>
            <span className="text-[11px] font-medium bg-muted rounded-full px-2 py-0.5 shrink-0">
              {STALL_TIER_LABEL[stall.tier]}
            </span>
          </div>
          <CardContent className="py-3 text-sm text-muted-foreground border-t">Couldn't load the interior -- tap to try again</CardContent>
        </Card>
      </button>
    </div>
  );
}
