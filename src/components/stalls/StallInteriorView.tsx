import SignedImg from '@/components/media/SignedImg';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Pencil, Menu, CalendarDays, Eye, LogOut, Share2, Radio, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { useRoles } from '@/hooks/useRoles';
import { shareStallLink } from '@/lib/referral';
import { useBottomChromeElement } from '@/lib/layout/bottomChrome';
import StallHotspotSheet from './StallHotspotSheet';
import StallSideNav from './StallSideNav';
import StallTodayPanel from './StallTodayPanel';
import StallJoinSheet from './StallJoinSheet';
import StallChatSheet from './StallChatSheet';
import OwnerMenuItems from '@/components/owner/OwnerMenuItems';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';
import type { StallHotspot, TileKind } from '@/lib/stalls/stallTypes';

/**
 * Scripture Study gathering room (minimum version, 2026-09-13): the one
 * stall with a "go live" hotspot. No real seed backs this session -- the
 * account's own user_id doubles as the synthetic `seedId` every existing
 * live primitive keys off (useTribalLiveOrchard's presence, useLiveStage's
 * `stage:${seedId}` channel, gathering_sessions.seed_id, LiveStageOverlay's
 * `liveroom:${seedId}` chat) -- none of those columns/channels have a real
 * FK to `products`/`orchards`, confirmed live, so reusing this id needs no
 * engine change anywhere. Hardcoded like Companions Village's/Grove
 * Station's own pinned ids -- see supabase/migrations/
 * 20260913235500_scripture_study_stall.sql.
 */
const SCRIPTURE_STUDY_USER_ID = '50f485b8-8aa0-462f-a01d-9c2f18d2105e';

interface Props {
  /** Stall owner's user id -- the sheet pulls THEIR published items, never the viewer's. */
  ownerId: string;
  /** For the invite link (/stall/<username>) and its own "Share my stall"/Share button -- null only if the caller genuinely doesn't have it yet. */
  username?: string | null;
  interiorImageUrl: string;
  stallName: string;
  hotspots: StallHotspot[];
  onClose: () => void;
  /** True for the owner previewing their own stall -- shows the Owner Menu trigger top-left instead of nothing (batch 2b, task 4: otherwise identical to the visitor view). */
  isOwner?: boolean;
  /**
   * Flow v2 step 13: DashboardPage.jsx now renders this directly as
   * /cockpit's entire content -- there's no dashboard underneath to close
   * back to, so the corner close (X) button is hidden outright rather
   * than shown with nowhere to go. Used to swap it for a Log out button
   * in the same slot instead (this was otherwise the only screen an owner
   * landed on with no way to sign out) -- since removed: StallSideNav's
   * own logout row is always present on this exact screen (permanent
   * column >=1024px, or the nav drawer below it), making that swap a
   * second logout control for the same page. One logout control app-wide,
   * per Davison's 2026-09-20 instruction.
   */
  hideClose?: boolean;
  /**
   * Pre-flight fix (2026-09-13, Davison): DashboardPage.tsx's own bottom
   * bar and settlement-consent banner used to render as SIBLINGS of this
   * component with a higher raw z-index (10000/10001) than any sheet/
   * overlay THIS component opens (StallHotspotSheet, LiveStageOverlay,
   * StallJoinSheet). That doesn't work: this root div's own `z-[9999]` +
   * `position: fixed` makes it a stacking context, so every descendant's
   * z-index (however high) is compared to outside siblings as a single
   * unit at that level -- an external sibling at z-10000 always paints
   * over the WHOLE subtree, including its own internal 10000+/1000
   * overlays. Real, reproduced impact: going live from the owner's own
   * /cockpit hid LiveStage's hand-raise tray and spotlight requests
   * entirely behind the bottom bar, with no visible error -- a host could
   * never actually approve a guest. Accepting these as slots rendered
   * INSIDE this same stacking context (below, via z-[500]) lets
   * LiveStageOverlay/StallHotspotSheet/StallJoinSheet's own z-index
   * naturally cover them again, same as any other page's chrome.
   */
  bottomBar?: ReactNode;
  topBanner?: ReactNode;
}

/**
 * Full-screen "you're inside the stall" view (Farm-Stalls batch 2b).
 * The interior image is rendered object-contain with its painted-in
 * buttons intact; invisible hotspots are absolutely positioned over the
 * RENDERED image box (accounting for object-contain letterboxing, not the
 * raw container/viewport) using useContainImageRect. Tapping one slides
 * up StallHotspotSheet without navigating away. The old app-generated
 * tile strip is gone -- see the commit this shipped in for what that
 * means for wizard-configured `stalls.tiles` of kinds this batch doesn't
 * cover (products/services/orchard/custom).
 *
 * Owns the full viewport while mounted: sets AppContext.stallInteriorOpen
 * (hides the global FABs and the Cockpit's own Plant-Seed/Go-Live/Chat
 * bar) and locks body scroll, restoring both on unmount.
 *
 * "The stall is the frame" (batch 2e): >=1024px gets a permanent 3-column
 * layout -- StallSideNav (Cockpit nav, restyled) on the left, this same
 * image+hotspots column in the middle, StallTodayPanel (Today/Omer/Your
 * Growth, restyled) on the right. Below 1024px stays the full-screen
 * single column it always was, with the same two panels available as
 * slide-in drawers instead (see isNavDrawerOpen/isTodayDrawerOpen).
 * useContainImageRect measures containerRef itself, so the hotspot math is
 * unaffected either way -- it already accounts for whatever width the
 * image's own column actually has, not the viewport.
 */
/** Reads #stall-kind=<kind> off the current URL -- lets a fresh mount (e.g. after browser Back from an item-detail page) restore which sheet was open. */
function readKindFromHash(): string | null {
  const m = /(?:^|#)stall-kind=([a-z]+)/.exec(window.location.hash);
  return m ? m[1] : null;
}

/** A SeedCard's Message action tags `&seed=<id>` onto the hash (SeedCard.tsx's captureStallReturn) so the reopened sheet can scroll that exact card into view -- one-time use, stripped back out by the hash-sync effect right after. */
function readSeedIdFromHash(): string | null {
  const m = /[#&]seed=([a-zA-Z0-9-]+)/.exec(window.location.hash);
  return m ? m[1] : null;
}

/** Touch two-step: how long a hotspot's label pill shows on a first tap before it auto-hides (a second tap while it's showing opens the sheet). */
const TAP_PREVIEW_MS = 1500;

/** Stable per-hotspot identity for React keys and tap-preview tracking -- `id` when a box has one (drawn in the wizard), else its array position, since stalls.hotspots may hold many entries sharing the same `kind`. */
/** The smallest box a thumb can reliably hit. */
const MIN_TAP_PX = 44;

/**
 * Pixel geometry for one hotspot, never smaller than MIN_TAP_PX.
 *
 * The portrait path gets this floor from minWidth/minHeight, which anchors
 * at the top-left and slides a small box down and right off the object it
 * marks. Here the box grows around its own centre instead, so a 30px mug
 * stays centred on the mug. Measured on production before this: the Mugs
 * hotspot was 39px on its short side at 844x390.
 */
function withTapFloor(left: number, top: number, width: number, height: number): CSSProperties {
  const w = Math.max(width, MIN_TAP_PX);
  const h = Math.max(height, MIN_TAP_PX);
  return {
    left: left - (w - width) / 2,
    top: top - (h - height) / 2,
    width: w,
    height: h,
  };
}

function hotspotKey(h: StallHotspot, i: number): string {
  return h.id ?? `${h.kind}-${i}`;
}

const ROOM_HINT_SEEN_KEY = 's2g:stall-room-hint-seen';

/**
 * Below 1024px, StallSideNav / StallTodayPanel live in one of these
 * instead of a permanent column (batch 2e, task 2) -- same slide +
 * backdrop pattern as StallHotspotSheet (mount immediately, animate in on
 * the next frame, animate out then unmount on close).
 */
/** Exported for EmptyPlotView.tsx (the no-stall-yet /cockpit page) -- same
 * slide-in-drawer chrome for its own StallSideNav/StallTodayPanel, not
 * worth a second copy of this animation. */
export function StallDrawer({ side, open, onClose, children }: { side: 'left' | 'right'; open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  const sideClass = side === 'left' ? 'left-0 border-r' : 'right-0 border-l';
  const hiddenTransform = side === 'left' ? '-translate-x-full' : 'translate-x-full';

  return (
    <>
      <div
        className={`fixed inset-0 z-[9990] bg-black/60 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 z-[9991] ${sideClass} w-[260px] max-w-[80vw] flex flex-col bg-[#140c06] border-amber-500/25 shadow-2xl transition-transform duration-200 ease-out ${
          visible ? 'translate-x-0' : hiddenTransform
        }`}
      >
        {children}
      </div>
    </>
  );
}

export default function StallInteriorView({ ownerId, username, interiorImageUrl, stallName, hotspots, onClose, isOwner, hideClose, bottomBar, topBanner }: Props) {
  const { setStallInteriorOpen } = useAppContext();
  // Publishes this bar's real, measured height (not a hardcoded guess)
  // into --bottom-chrome-h -- see src/lib/layout/bottomChrome.ts's own
  // doc comment for why a fixed guess broke every time the bar's own
  // content (the radio button's "Radio"/"Stop"/"Reconnecting…" label,
  // or the separate floating radio pill) changed size.
  const bottomBarRef = useBottomChromeElement<HTMLDivElement>('stall-bottom-bar', !!bottomBar);
  const { user } = useAuth();
  const { toast } = useToast();
  // Pre-flight (2026-09-13, Davison): same "who's alive in the orchard
  // right now" presence used for the Tribal Gardens feed's LIVE badge
  // (StallsFeedPage.tsx's liveOwnerIds) -- this stall's own front/interior
  // had no equivalent indicator at all. A visitor landing directly on
  // /stall/:username via a shared link never saw the feed card, so this
  // was the one place a live class/broadcast gave no visible sign at all.
  const { liveSeeds, goLive, endLive } = useTribalLiveOrchard();
  // Scripture Study: presence is tracked under whichever real account
  // actually clicked Go Live (Davison's own, or any gosat's) -- not under
  // SCRIPTURE_STUDY_USER_ID itself, since that's a system account no one
  // logs in as. Matched by seed_id (the synthetic id above) instead of
  // user_id, so the LIVE badge below still lights up correctly regardless
  // of which admin/gosat is hosting.
  const scriptureStudyPresence = ownerId === SCRIPTURE_STUDY_USER_ID
    ? liveSeeds.find((p) => p.seed_id === SCRIPTURE_STUDY_USER_ID) ?? null
    : null;
  const ownerIsLive = liveSeeds.some((p) => p.user_id === ownerId) || !!scriptureStudyPresence;
  const { isAdminOrGosat } = useRoles();
  // The full-screen live overlay's jitsiRoom once joined/started -- same
  // one state this component needs regardless of whether the viewer is
  // hosting or just joining (LiveStageOverlay's own isHost prop already
  // derives host-ness from whether the CURRENT presence's user_id matches
  // the viewer, same as SeedCard.tsx's identical pattern).
  const [scriptureRoom, setScriptureRoom] = useState<string | null>(null);
  // goLive()'s own gathering_sessions.id -- see SeedCard.tsx's identical
  // hostSessionId state/comment. Only ever set when THIS viewer started or
  // resumed the live as host; stays null when just joining someone else's.
  const [scriptureHostSessionId, setScriptureHostSessionId] = useState<string | null>(null);
  const joinOrStartScriptureLive = async (asHost: boolean) => {
    if (scriptureStudyPresence) {
      if (asHost && scriptureStudyPresence.user_id === user?.id) {
        // The same host re-entering their own still-live session (e.g.
        // after a refresh) -- redo goLive() so its gathering_sessions
        // reuse-or-create logic runs and scriptureHostSessionId gets
        // populated; it reuses the existing un-ended row, no duplicate.
        const presence = await goLive({ id: SCRIPTURE_STUDY_USER_ID, title: 'Scripture Study — Live' });
        if (presence) { setScriptureRoom(presence.jitsi_room); setScriptureHostSessionId(presence.gatheringSessionId ?? null); }
        return;
      }
      setScriptureRoom(scriptureStudyPresence.jitsi_room);
      return;
    }
    if (!asHost) return; // no session to join, and this viewer can't start one
    const presence = await goLive({ id: SCRIPTURE_STUDY_USER_ID, title: 'Scripture Study — Live' });
    if (presence) { setScriptureRoom(presence.jitsi_room); setScriptureHostSessionId(presence.gatheringSessionId ?? null); }
  };
  const closeScriptureLive = async () => {
    setScriptureRoom(null);
    setScriptureHostSessionId(null);
    await endLive();
  };
  // Spec: a signed-in viewer landing on /stall/scripturestudy while it's
  // already live joins directly, no extra tap. Guarded on scriptureRoom so
  // this only ever fires once per mount (closing the overlay manually
  // shouldn't immediately reopen it).
  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (!user || !scriptureStudyPresence || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    setScriptureRoom(scriptureStudyPresence.jitsi_room);
  }, [user, scriptureStudyPresence]);
  // Companion to the auto-join above, for a visitor who isn't signed in
  // yet (a shared invite link is the common case) -- the live itself
  // (Daily call token, chat, raise-hand) is user-keyed everywhere else in
  // the app, so there's no anonymous viewer path to drop them into
  // directly. Surfacing the join sheet immediately, same trigger
  // (scriptureStudyPresence), means signing in is the ONLY tap standing
  // between "opened the link" and "in the live" -- once `user` becomes
  // truthy the effect above fires on its own next render. Own guard ref
  // so dismissing the sheet manually doesn't reopen it every re-render.
  const autoPromptedJoinRef = useRef(false);
  useEffect(() => {
    if (user || !scriptureStudyPresence || autoPromptedJoinRef.current) return;
    autoPromptedJoinRef.current = true;
    setShowJoinSheet(true);
  }, [user, scriptureStudyPresence]);
  const navigate = useNavigate();
  const [openKind, setOpenKind] = useState<StallHotspot['kind'] | null>(() => readKindFromHash() as StallHotspot['kind'] | null);
  // The specific hotspot's own label, captured at tap time -- "the sheet
  // opens by kind + label" (object hotspots batch): many boxes can share a
  // kind, so this can't be re-derived from openKind alone. Falls back to
  // the first hotspot of openKind's own label below when restored from a
  // URL hash (a fresh mount has no tapped box to remember).
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  // One-time: which card (if any) to scroll into view when the sheet
  // above opens on mount, arriving from a SeedCard Message action.
  const [initialScrollSeedId] = useState<string | null>(() => readSeedIdFromHash());
  // Which hotspot (by hotspotKey) is mid tap-preview -- keyed per-box, not
  // per-kind, so tapping one music box doesn't light up every other music
  // box sharing that kind.
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A real mouse, not just a wide viewport -- drives whether hotspots get
  // CSS hover affordances at all (touch's two-step tap-to-preview below is
  // the alternative, not a supplement -- some touch browsers linger a
  // :hover state after a tap, which is exactly what this sidesteps).
  const [isFinePointer] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  // "tap the things in the room" -- shown once ever (localStorage), not
  // just this session, since object hotspots are invisible by design and a
  // first-time visitor has no other cue they're there.
  const [showRoomHint, setShowRoomHint] = useState(() => {
    try { return typeof window !== 'undefined' && !window.localStorage.getItem(ROOM_HINT_SEEN_KEY); } catch { return true; }
  });
  const dismissRoomHint = () => {
    setShowRoomHint(false);
    try { window.localStorage.setItem(ROOM_HINT_SEEN_KEY, '1'); } catch { /* ignore */ }
  };
  // Mobile-only (<1024px): StallSideNav / StallTodayPanel as slide-in drawers instead of the desktop's permanent columns.
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isTodayDrawerOpen, setIsTodayDrawerOpen] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  // Owner Menu -> "View as visitor": renders everything (this view, the
  // hotspot sheets) exactly as a non-owner sees it -- all visitor action
  // icons, Bestow -- without actually signing out. effectiveIsOwner is the
  // one thing every owner-only affordance below checks instead of the raw
  // `isOwner` prop.
  const [viewingAsVisitor, setViewingAsVisitor] = useState(false);
  const effectiveIsOwner = isOwner && !viewingAsVisitor;
  // Stall invite links ("come see my shop"), guest gating: an
  // unauthenticated visitor can browse the front and interior read-only
  // (StallVisitPage has no ProtectedRoute), but tapping a painted hotspot
  // is the one point every actual interaction (rail actions, Bestow --
  // both live inside the sheet a tap would otherwise open) funnels
  // through, so gating it here covers all three without touching
  // SeedCard's own per-action guards used everywhere else in the app.
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  // "Message the sower" from the interior's own top bar -- opens in place
  // (StallChatSheet, a fixed overlay like StallJoinSheet's), never
  // navigate(), so the interior is never unmounted. Room id is resolved
  // lazily on tap via the same get_or_create_direct_room RPC SeedCard.tsx's
  // Message action already uses -- null while that call is in flight.
  const [showChatSheet, setShowChatSheet] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const handleOpenChat = async () => {
    if (!user) { setShowJoinSheet(true); return; }
    setChatRoomId(null);
    setShowChatSheet(true);
    const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
      user1_id: user.id,
      user2_id: ownerId,
    });
    if (error || !roomId) {
      toast({ variant: 'destructive', title: 'Could not start a conversation', description: error?.message });
      setShowChatSheet(false);
      return;
    }
    setChatRoomId(roomId);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);

  // Mobile-portrait-only (<1024px, portrait -- see the layout split in the
  // render below). The interior used to be a strip far wider than the
  // screen, panned sideways. Measured on production at 390x844, the
  // hotspots spanned 1008px of a 1141px strip inside a 390px window, so no
  // scroll position could ever show more than a third of them: three of
  // five sat entirely off screen. Centring the scroll and a "pan" pill
  // were both already there and neither helped, because you cannot pan
  // towards something you have no idea exists.
  //
  // It fits the width instead. The image is `w-full h-auto` and its
  // wrapper is exactly that box, so the hotspots' plain x/y/w/h
  // percentages still land correctly with no offset math, and every one is
  // on screen the moment the interior opens.
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const mobileImgRef = useRef<HTMLImageElement>(null);

  // "New seeds" (supabase/migrations/20260912140000_stall_visits.sql) --
  // viewerCutoff is the viewer's own last_seen_at for THIS stall as of
  // BEFORE this visit's own upsert (read first, upsert second, in the
  // same effect below -- reading it after upserting would make every
  // item look "not new" since last_seen_at would already be now()).
  // newSeedCounts is the per-kind new-item count (for the hotspot dots),
  // from the same RPC call the feed uses. dismissedKinds tracks which
  // kinds have had their sheet opened THIS session -- their dot
  // disappears immediately rather than waiting for a re-fetch (the
  // underlying "new" state doesn't change just because they looked; the
  // dot hiding is a local, one-way UI dismissal).
  const [viewerCutoff, setViewerCutoff] = useState<string | null>(null);
  const [newSeedCounts, setNewSeedCounts] = useState<Partial<Record<TileKind, number>>>({});
  const [dismissedKinds, setDismissedKinds] = useState<Set<TileKind>>(new Set());

  useEffect(() => {
    // Owner viewing their own stall (real or "view as visitor" hasn't been
    // toggled on) has nothing to be "new" to -- skip entirely, no upsert,
    // no RPC call.
    if (!user || effectiveIsOwner) return;
    let alive = true;
    (async () => {
      const { data: visitRow } = await supabase
        .from('stall_visits')
        .select('last_seen_at')
        .eq('viewer_id', user.id)
        .eq('stall_user_id', ownerId)
        .maybeSingle();
      const cutoff = (visitRow as { last_seen_at?: string } | null)?.last_seen_at
        ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      if (alive) setViewerCutoff(cutoff);

      const { data: countRows } = await supabase.rpc('stall_new_seed_counts' as any, { viewer: user.id });
      const mine = ((countRows ?? []) as { stall_user_id: string; per_kind: Partial<Record<TileKind, number>> | null }[])
        .find((r) => r.stall_user_id === ownerId);
      if (alive) setNewSeedCounts(mine?.per_kind ?? {});

      // Debounced, once per open -- this effect's deps (ownerId, viewer
      // identity, owner-mode) only change on a genuinely new stall/
      // session, not on every re-render of an already-mounted interior.
      await supabase.from('stall_visits').upsert(
        { viewer_id: user.id, stall_user_id: ownerId, last_seen_at: new Date().toISOString() },
        { onConflict: 'viewer_id,stall_user_id' },
      );
    })();
    return () => { alive = false; };
  }, [ownerId, user, effectiveIsOwner]);

  useEffect(() => {
    if (!showRoomHint) return;
    const t = setTimeout(dismissRoomHint, 4000);
    return () => clearTimeout(t);
  }, [showRoomHint]);

  useEffect(() => () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); }, []);

  function openHotspot(h: StallHotspot) {
    setOpenKind(h.kind);
    setOpenLabel(h.label);
  }

  // One tap opens, on every pointer type and every hotspot kind.
  //
  // Touch used to take TWO taps: the first only showed the box's glow + label
  // pill for TAP_PREVIEW_MS, standing in for the hover a mouse gets, and a
  // second tap within that window opened it. The window was 1500ms, so tap,
  // read the label, tap again and you had already missed it -- the box then
  // just re-previewed, forever. It read as a dead control, not a deliberate
  // two-step: a member could not get into her own stall's My Story on
  // 2026-09-18 and concluded she had no access at all.
  //
  // The discovery problem it solved is already solved by the room hint
  // ("tap the things in the room"), which every first-time visitor sees.
  function handleHotspotTap(h: StallHotspot, key: string) {
    if (!user) {
      setShowJoinSheet(true);
      return;
    }
    // Companions Village phase 1: a 'nav' hotspot leaves the stall
    // immediately (no sheet, no two-step touch preview) -- read straight
    // off the tapped hotspot rather than the kind-keyed activeHotspot
    // lookup below, since many 'nav' boxes can share the kind.
    if (h.kind === 'nav' && h.href) {
      navigate(h.href);
      return;
    }
    // Scripture Study: 'share' is exactly the header's own Share button,
    // just reachable from the painted plaque too -- never opens a sheet.
    if (h.kind === 'share') {
      void shareStallLink(username ?? stallName, stallName, user?.id, { live: ownerIsLive });
      return;
    }
    // 'go_live': hidden from the rendered hotspot list entirely for a
    // non-admin/gosat viewer (see the hotspots.filter below) -- this check
    // is a second guard, not the only one, in case a tap ever reaches here
    // some other way.
    if (h.kind === 'go_live') {
      if (!isAdminOrGosat) return;
      void joinOrStartScriptureLive(true);
      return;
    }
    // 'raise_hand'/'queue' while actually live: straight into the same
    // full-screen overlay every other Go-Live surface uses (LiveStage's own
    // guest raise-hand controls + host queue tray already live inside it)
    // -- no separate custom queue UI to build. Not live: falls through to
    // the ordinary static-text sheet below (STATIC_TEXT_KINDS).
    if ((h.kind === 'raise_hand' || h.kind === 'queue') && scriptureStudyPresence) {
      void joinOrStartScriptureLive(false);
      return;
    }
    dismissRoomHint();
    // "New seeds" gold dot disappears the moment this kind's sheet opens
    // -- a one-way dismissal, not a re-fetch (see dismissedKinds above).
    setDismissedKinds((prev) => (prev.has(h.kind) ? prev : new Set(prev).add(h.kind)));
    // Show the glow/pill for this box on the way in, so a touch visitor still
    // gets the same confirmation of WHAT they tapped that a mouse gets from
    // hover -- it just no longer gates the opening.
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (!isFinePointer) {
      setPreviewKey(key);
      previewTimerRef.current = setTimeout(() => setPreviewKey(null), TAP_PREVIEW_MS);
    }
    openHotspot(h);
  }

  /** Gold dot + per-kind count -- rendered on a painted hotspot button when it has unseen new seeds. */
  function NewSeedDot({ kind }: { kind: TileKind }) {
    const count = newSeedCounts[kind] ?? 0;
    if (count <= 0 || dismissedKinds.has(kind)) return null;
    return (
      <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-1 text-[10px] font-extrabold text-amber-950 shadow ring-2 ring-black/40">
        {count > 9 ? '9+' : count}
      </span>
    );
  }

  /**
   * One invisible box over an object. Fine pointer: CSS `group-hover`
   * drives the gold glow + label pill (isFinePointer just gates whether
   * those hover classes are present at all -- see handleHotspotTap for
   * why touch can't just rely on real :hover). Touch: `isPreviewing`
   * (this box's own tap-preview) drives the same glow/pill directly.
   */
  function HotspotButton({ h, hKey, style }: { h: StallHotspot; hKey: string; style: CSSProperties }) {
    const isPreviewing = previewKey === hKey;
    return (
      <button
        type="button"
        aria-label={h.label}
        onClick={() => handleHotspotTap(h, hKey)}
        className="group absolute outline-none"
        style={style}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-lg transition-all duration-200 ${
            isPreviewing ? 'bg-amber-400/10 shadow-[0_0_20px_6px_rgba(251,191,36,0.55)]' : ''
          } ${isFinePointer ? 'group-hover:bg-amber-400/10 group-hover:shadow-[0_0_20px_6px_rgba(251,191,36,0.55)]' : ''}`}
        />
        <span
          className={`pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-max max-w-[180px] -translate-x-1/2 rounded-md bg-black/85 px-2 py-1 text-center text-[11px] leading-tight shadow-lg transition-opacity duration-150 ${
            isPreviewing ? 'opacity-100' : isFinePointer ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
          }`}
        >
          <span className="font-semibold text-amber-200">{h.label}</span>
          {h.caption && <span className="block text-white/80">{h.caption}</span>}
        </span>
        <NewSeedDot kind={h.kind} />
      </button>
    );
  }

  useEffect(() => {
    setStallInteriorOpen(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      setStallInteriorOpen(false);
      document.body.style.overflow = prevOverflow;
    };
  }, [setStallInteriorOpen]);

  // Keeps the URL hash in sync with which sheet is open, without adding a
  // history entry of its own -- only an actual item-detail navigation
  // (StallHotspotSheet's openItemDetail) pushes history. Browser Back from
  // there lands on this same URL+hash, and this component's initial state
  // (readKindFromHash) re-opens the same sheet on remount.
  //
  // Passes window.history.state through as the new entry's state (instead
  // of null) -- this is a raw History API call bypassing React Router's
  // own history object, so it never touches location.state as React
  // Router tracks it, but it DOES overwrite the underlying browser entry's
  // state if given null, which would silently erase the { from } origin
  // state this same entry was navigated to with (StallVisitPage's
  // handleClose reads it). Losing that here reintroduced the navigation
  // loop this hash-sync was itself blamed for.
  useEffect(() => {
    const base = window.location.pathname + window.location.search;
    const next = openKind ? `${base}#stall-kind=${openKind}` : base;
    window.history.replaceState(window.history.state, '', next);
  }, [openKind]);

  // 'go_live' never renders as a paintable box for anyone but an admin/
  // gosat viewer -- everything else about it (including the guard inside
  // handleHotspotTap) stays the same regardless.
  const visibleHotspots = isAdminOrGosat ? hotspots : hotspots.filter((h) => h.kind !== 'go_live');

  const activeHotspot = openKind ? hotspots.find((h) => h.kind === openKind) ?? null : null;
  // openLabel is only set by an actual tap (openHotspot above) -- a fresh
  // mount restoring openKind from the URL hash has no tapped box to recall
  // it from, so fall back to the first hotspot of that kind's own label.
  const activeLabel = openLabel ?? activeHotspot?.label;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden max-lg:portrait:overflow-y-auto max-lg:portrait:pb-[var(--bottom-chrome-h,0px)]">
      {/* Mobile portrait (<1024px, portrait) -- header (≡ / name / ✕ for a
          visitor; owner gets a pencil before the ✕ too, opening the same
          Edit-stall menu the landscape/desktop branch has -- the tile-nav
          strip that used to live here is gone, and ≡ now opens the same
          left drawer the landscape/desktop branch below uses), then the
          interior itself: pannable sideways,
          filling the rest of the viewport (100dvh minus this 48px header)
          instead of a fixed ~70vh -- a 1216-wide interior shown at full
          width here was only ~270px tall (unreadable sign, untappable
          buttons); height = container height / width auto instead lets it
          render at full resolution, panned into view rather than shrunk to
          fit. Nothing is cropped. Hotspots are positioned with plain x/y/w/h
          percentages against their wrapper (mobileContainerRef, sized
          exactly to the image itself -- see the refs above), not computed
          via useContainImageRect -- since there's no letterboxing to
          account for here, they track correctly through panning as
          ordinary percentage-positioned children always do, with no JS
          measurement needed. min 44px hit area on every hotspot regardless
          of how small its painted button is. StallTodayPanel keeps
          following below, reached by scrolling down (the outer wrapper's
          own max-lg:portrait:overflow-y-auto), same as before.
          Landscape phone and desktop keep the layout below unchanged. */}
      <div className="hidden max-lg:portrait:flex flex-col w-full">
        {/* h-[48px] (a literal pixel value), not h-12 (3rem) -- below
            768px this app's own CSS drops the root font-size to 14px
            (src/index.css), which would make h-12 render at 42px, 6px
            short of the h-[calc(100dvh-48px)] the pan section below
            subtracts against. Pixels on both sides keeps them exact. */}
        <div className="sticky top-0 z-20 h-[48px] flex items-center justify-between gap-2 px-4 bg-[#0d0805]/95 backdrop-blur-sm border-b border-amber-500/15">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            aria-label="Open menu"
            className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold uppercase tracking-wide text-white/70">
            {ownerIsLive && (
              <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500 px-1.5 py-0.5 align-middle text-[9px] font-extrabold text-white">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </span>
            )}
            {stallName}
          </p>
          {/* Owner-only: pencil opens the same Edit-stall menu (OwnerMenuItems
              + "View as visitor") the landscape/desktop branch has, just as
              an icon here instead of a labelled pill -- the portrait header
              is real chrome with limited width (≡ + name + this + ✕), not a
              free-floating overlay over the image. A visitor (non-owner)
              sees plain ≡ / name / ✕, nothing added. */}
          {isOwner && (
            viewingAsVisitor ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setViewingAsVisitor(false)}
                className="shrink-0 text-amber-300 hover:bg-white/20 rounded-full"
                aria-label="Exit visitor view"
                title="Viewing as visitor — exit"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <div className="relative shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOwnerMenuOpen((v) => !v)}
                  className="text-white hover:bg-white/20 rounded-full"
                  aria-label="Owner menu"
                  aria-expanded={ownerMenuOpen}
                  title="Edit stall"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {ownerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setOwnerMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 min-w-[190px] rounded-lg border border-amber-500/20 bg-[#140c06] py-1.5 shadow-2xl z-[9999]">
                      <OwnerMenuItems
                        onNavigate={() => setOwnerMenuOpen(false)}
                        itemClassName="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/10 transition-colors"
                      />
                      {username && (
                        <button
                          type="button"
                          onClick={() => { shareStallLink(username, stallName, user?.id, { live: ownerIsLive }); setOwnerMenuOpen(false); }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/10 transition-colors"
                        >
                          <Share2 className="h-4 w-4 shrink-0" /> Share my stall
                        </button>
                      )}
                      <div className="my-1 border-t border-amber-500/15" />
                      <button
                        type="button"
                        onClick={() => { setViewingAsVisitor(true); setOwnerMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/10 transition-colors"
                      >
                        <Eye className="h-4 w-4 shrink-0" /> View as visitor
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          )}
          {/* Message the sower -- in place (StallChatSheet), never
              navigate(). Hidden for the owner viewing their own stall
              (effectiveIsOwner): there is no one to message. Shown for a
              logged-out visitor same as every other gated interior action
              -- tapping it opens the existing sign-in nudge, not a second
              one. */}
          {username && !effectiveIsOwner && (
            <button
              type="button"
              onClick={handleOpenChat}
              aria-label="Message the sower"
              title="Message the sower"
              className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          {/* Share (everyone, not owner-only -- "come see my shop" is meant
              to spread from any viewer, burning THEIR own referral code if
              signed in). "Share my stall" above is the owner-menu's own
              entry point to the exact same action. */}
          {username && (
            <button
              type="button"
              onClick={() => shareStallLink(username, stallName, user?.id, { live: ownerIsLive })}
              aria-label="Share this stall"
              title="Share this stall"
              className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {/* Hidden while a shelf sheet is open. The sheet is modal, so nothing
              behind it should be reachable -- and at 390px this X sat 114px
              above the sheet's own close, in the same thumb's reach. A member
              aiming to shut the shelf hit this instead and was thrown out of
              the stall (or back to the front gate, where one exists). */}
          {!openKind && !hideClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 text-white hover:bg-white/20 rounded-full"
              aria-label="Leave stall"
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>

        <div className="relative w-full">
          <div ref={mobileContainerRef} className="relative w-full">
              <SignedImg
                ref={mobileImgRef}
                src={interiorImageUrl}
                alt={stallName}
                className={`block w-full h-auto transition-[filter] duration-200 ${activeHotspot ? 'brightness-[0.55]' : 'brightness-100'}`}
              />
              {visibleHotspots.map((h, i) => (
                <HotspotButton
                  key={hotspotKey(h, i)}
                  h={h}
                  hKey={hotspotKey(h, i)}
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: `${h.w}%`,
                    height: `${h.h}%`,
                    minWidth: 44,
                    minHeight: 44,
                  }}
                />
              ))}
          </div>

          {showRoomHint && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                👆 tap the things in the room
              </span>
            </div>
          )}
        </div>

        <StallTodayPanel stacked className="px-4 py-4" ownerId={ownerId} isOwner={effectiveIsOwner} />
      </div>

      <div className="relative flex-1 min-h-0 max-lg:portrait:hidden flex">
        <StallSideNav
          onNavigate={onClose}
          className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-r lg:border-amber-500/15"
        />

        <div ref={containerRef} className="relative flex-1 min-h-0">
          <SignedImg
            ref={imgRef}
            src={interiorImageUrl}
            alt={stallName}
            className={`absolute inset-0 w-full h-full object-contain transition-[filter] duration-200 ${activeHotspot ? 'brightness-[0.55]' : 'brightness-100'}`}
          />

          {rect && visibleHotspots.map((h, i) => (
            <HotspotButton
              key={hotspotKey(h, i)}
              h={h}
              hKey={hotspotKey(h, i)}
              style={withTapFloor(
                rect.offsetX + (h.x / 100) * rect.width,
                rect.offsetY + (h.y / 100) * rect.height,
                (h.w / 100) * rect.width,
                (h.h / 100) * rect.height,
              )}
            />
          ))}

          {showRoomHint && (
            <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                👆 tap the things in the room
              </span>
            </div>
          )}

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTodayDrawerOpen(true)}
              aria-label="Open Today, Omer & Growth"
              className="lg:hidden flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            {username && !effectiveIsOwner && (
              <button
                type="button"
                onClick={handleOpenChat}
                aria-label="Message the sower"
                title="Message the sower"
                className="flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
            {username && (
              <button
                type="button"
                onClick={() => shareStallLink(username, stallName, user?.id, { live: ownerIsLive })}
                aria-label="Share this stall"
                title="Share this stall"
                className="flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {!openKind && !hideClose && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full"
                aria-label="Leave stall"
              >
                <X className="h-6 w-6" />
              </Button>
            )}
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              aria-label="Open menu"
              className="lg:hidden flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
            {viewingAsVisitor ? (
              <button
                type="button"
                onClick={() => setViewingAsVisitor(false)}
                className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Viewing as visitor — exit
              </button>
            ) : isOwner && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOwnerMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/70 transition-colors"
                  aria-label="Owner menu"
                  aria-expanded={ownerMenuOpen}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit stall
                </button>
                {ownerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setOwnerMenuOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 min-w-[190px] rounded-lg border border-amber-500/20 bg-[#140c06] py-1.5 shadow-2xl z-[9999]">
                      <OwnerMenuItems
                        onNavigate={() => setOwnerMenuOpen(false)}
                        itemClassName="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/10 transition-colors"
                      />
                      {username && (
                        <button
                          type="button"
                          onClick={() => { shareStallLink(username, stallName, user?.id, { live: ownerIsLive }); setOwnerMenuOpen(false); }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/10 transition-colors"
                        >
                          <Share2 className="h-4 w-4 shrink-0" /> Share my stall
                        </button>
                      )}
                      <div className="my-1 border-t border-amber-500/15" />
                      <button
                        type="button"
                        onClick={() => { setViewingAsVisitor(true); setOwnerMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/10 transition-colors"
                      >
                        <Eye className="h-4 w-4 shrink-0" /> View as visitor
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80 drop-shadow">
            {ownerIsLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-lg">
                <Radio className="h-3 w-3" /> LIVE
              </span>
            )}
            {stallName}
          </p>
        </div>

        <StallTodayPanel className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-l lg:border-amber-500/15" ownerId={ownerId} isOwner={effectiveIsOwner} />
      </div>

      <StallDrawer side="left" open={isNavDrawerOpen} onClose={() => setIsNavDrawerOpen(false)}>
        <StallSideNav onNavigate={onClose} className="flex flex-col flex-1 min-h-0" />
      </StallDrawer>

      <StallDrawer side="right" open={isTodayDrawerOpen} onClose={() => setIsTodayDrawerOpen(false)}>
        <StallTodayPanel className="flex flex-col flex-1 min-h-0" ownerId={ownerId} isOwner={effectiveIsOwner} />
      </StallDrawer>

      {activeHotspot && (
        <StallHotspotSheet
          ownerId={ownerId}
          ownerName={stallName}
          kind={activeHotspot.kind}
          label={activeLabel}
          text={activeHotspot.text ?? null}
          isOwner={effectiveIsOwner}
          onClose={() => { setOpenKind(null); setOpenLabel(null); }}
          scrollToItemId={initialScrollSeedId}
          viewerCutoff={viewerCutoff}
        />
      )}

      {showJoinSheet && (
        <StallJoinSheet stallName={stallName} onClose={() => setShowJoinSheet(false)} />
      )}

      {showChatSheet && (
        <StallChatSheet roomId={chatRoomId} onClose={() => setShowChatSheet(false)} />
      )}

      {scriptureRoom && (
        <LiveStageOverlay
          seedId={SCRIPTURE_STUDY_USER_ID}
          title="Scripture Study — Live"
          subtitle="you, you we love"
          jitsiRoom={scriptureRoom}
          isHost={scriptureStudyPresence?.user_id === user?.id}
          hostSessionId={scriptureHostSessionId}
          onClose={() => { void closeScriptureLive(); }}
        />
      )}

      {/* z-[500]: below every sheet/overlay this component itself opens
          (StallHotspotSheet/StallJoinSheet z-[10000]+, LiveStageOverlay
          z-[1000]) so those naturally cover these instead of the reverse --
          see the Props.bottomBar/topBanner doc comment above. */}
      {topBanner && <div className="fixed inset-x-0 top-0 z-[500]">{topBanner}</div>}
      {bottomBar && <div ref={bottomBarRef} className="fixed inset-x-0 bottom-0 z-[500]">{bottomBar}</div>}
    </div>
  );
}
