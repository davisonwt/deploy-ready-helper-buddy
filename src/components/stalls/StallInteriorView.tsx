import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Pencil, Menu, CalendarDays, Eye, LogOut, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import { shareStallLink } from '@/lib/referral';
import StallHotspotSheet from './StallHotspotSheet';
import StallSideNav from './StallSideNav';
import StallTodayPanel from './StallTodayPanel';
import StallJoinSheet from './StallJoinSheet';
import OwnerMenuItems from '@/components/owner/OwnerMenuItems';
import type { StallHotspot, TileKind } from '@/lib/stalls/stallTypes';

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

/** Tap-preview delay (mobile): how long a hotspot's caption shows before its sheet opens. */
const CAPTION_PREVIEW_MS = 800;

/**
 * Below 1024px, StallSideNav / StallTodayPanel live in one of these
 * instead of a permanent column (batch 2e, task 2) -- same slide +
 * backdrop pattern as StallHotspotSheet (mount immediately, animate in on
 * the next frame, animate out then unmount on close).
 */
function StallDrawer({ side, open, onClose, children }: { side: 'left' | 'right'; open: boolean; onClose: () => void; children: ReactNode }) {
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

export default function StallInteriorView({ ownerId, username, interiorImageUrl, stallName, hotspots, onClose, isOwner }: Props) {
  const { setStallInteriorOpen } = useAppContext();
  const { user } = useAuth();
  const [openKind, setOpenKind] = useState<StallHotspot['kind'] | null>(() => readKindFromHash() as StallHotspot['kind'] | null);
  // One-time: which card (if any) to scroll into view when the sheet
  // above opens on mount, arriving from a SeedCard Message action.
  const [initialScrollSeedId] = useState<string | null>(() => readSeedIdFromHash());
  // Mobile-only: the hotspot whose caption is being shown for CAPTION_PREVIEW_MS before its sheet opens.
  const [previewKind, setPreviewKind] = useState<StallHotspot['kind'] | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);

  // Mobile-portrait-only (<1024px, portrait -- see the layout split in the
  // render below): the pannable interior's own image ref, for the
  // scroll-to-center effect below. No rect measurement needed here (unlike
  // the desktop/landscape image above) -- this image is `h-full w-auto`,
  // so its wrapper (mobileContainerRef, `w-max`) is exactly the image's own
  // rendered box with no letterboxing, and hotspots are positioned with
  // plain x/y/w/h percentages straight off that wrapper (see the render
  // below) rather than through useContainImageRect's offset math.
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const mobileImgRef = useRef<HTMLImageElement>(null);
  const panScrollRef = useRef<HTMLDivElement>(null);
  // "‹ pan ›" hint -- shown until the visitor's first touch/drag on the
  // pannable interior, or a few seconds pass, whichever comes first (not
  // persisted across visits -- see the render below for why that's fine
  // for now).
  const [showPanHint, setShowPanHint] = useState(true);

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

  // Starts the horizontal pan centered on the image rather than its left edge.
  useEffect(() => {
    const scrollEl = panScrollRef.current;
    const img = mobileImgRef.current;
    if (!scrollEl) return;
    const center = () => { scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2; };
    if (img && !img.complete) {
      img.addEventListener('load', center, { once: true });
      return () => img.removeEventListener('load', center);
    }
    center();
  }, [interiorImageUrl]);

  useEffect(() => {
    if (!showPanHint) return;
    const t = setTimeout(() => setShowPanHint(false), 2500);
    return () => clearTimeout(t);
  }, [showPanHint]);

  useEffect(() => () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); }, []);

  // A hotspot with a caption gets a hover tooltip on a mouse-primary device
  // (CSS :hover handles that, see the `group` button below) and, on a
  // touch-primary device, a brief tap-preview of the same caption before
  // the sheet opens. `(hover: hover) and (pointer: fine)` is the standard
  // way to tell those apart -- a real mouse, not just viewport width.
  function handleHotspotTap(h: StallHotspot) {
    if (!user) {
      setShowJoinSheet(true);
      return;
    }
    // "New seeds" gold dot disappears the moment this kind's sheet opens
    // -- a one-way dismissal, not a re-fetch (see dismissedKinds above).
    setDismissedKinds((prev) => (prev.has(h.kind) ? prev : new Set(prev).add(h.kind)));
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (h.caption && !isFinePointer) {
      setPreviewKind(h.kind);
      previewTimerRef.current = setTimeout(() => {
        setPreviewKind(null);
        setOpenKind(h.kind);
      }, CAPTION_PREVIEW_MS);
      return;
    }
    setOpenKind(h.kind);
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

  const activeHotspot = openKind ? hotspots.find((h) => h.kind === openKind) ?? null : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden max-lg:portrait:overflow-y-auto">
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
                          onClick={() => { shareStallLink(username, stallName, user?.id); setOwnerMenuOpen(false); }}
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
          {/* Share (everyone, not owner-only -- "come see my shop" is meant
              to spread from any viewer, burning THEIR own referral code if
              signed in). "Share my stall" above is the owner-menu's own
              entry point to the exact same action. */}
          {username && (
            <button
              type="button"
              onClick={() => shareStallLink(username, stallName, user?.id)}
              aria-label="Share this stall"
              title="Share this stall"
              className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 text-white hover:bg-white/20 rounded-full"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="relative w-full h-[calc(100dvh-48px)]">
          <div
            ref={panScrollRef}
            className="relative w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onPointerDown={() => setShowPanHint(false)}
          >
            <div ref={mobileContainerRef} className="relative h-full w-max mx-auto snap-center">
              <img
                ref={mobileImgRef}
                src={interiorImageUrl}
                alt={stallName}
                className={`block h-full w-auto max-w-none transition-[filter] duration-200 ${activeHotspot ? 'brightness-[0.55]' : 'brightness-100'}`}
              />
              {hotspots.map((h) => (
                <button
                  key={h.kind}
                  type="button"
                  aria-label={h.label}
                  onClick={() => handleHotspotTap(h)}
                  className="absolute outline-none"
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: `${h.w}%`,
                    height: `${h.h}%`,
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  {h.caption && previewKind === h.kind && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-max max-w-[180px] -translate-x-1/2 rounded-md bg-black/85 px-2 py-1 text-[11px] leading-tight text-white shadow-lg">
                      {h.caption}
                    </span>
                  )}
                  <NewSeedDot kind={h.kind} />
                </button>
              ))}
            </div>
          </div>

          {showPanHint && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                ‹ pan ›
              </span>
            </div>
          )}
        </div>

        <StallTodayPanel stacked className="px-4 py-4" />
      </div>

      <div className="relative flex-1 min-h-0 max-lg:portrait:hidden flex">
        <StallSideNav
          onNavigate={onClose}
          className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-r lg:border-amber-500/15"
        />

        <div ref={containerRef} className="relative flex-1 min-h-0">
          <img
            ref={imgRef}
            src={interiorImageUrl}
            alt={stallName}
            className={`absolute inset-0 w-full h-full object-contain transition-[filter] duration-200 ${activeHotspot ? 'brightness-[0.55]' : 'brightness-100'}`}
          />

          {rect && hotspots.map((h) => (
            <button
              key={h.kind}
              type="button"
              aria-label={h.label}
              onClick={() => handleHotspotTap(h)}
              className="absolute outline-none group"
              style={{
                left: rect.offsetX + (h.x / 100) * rect.width,
                top: rect.offsetY + (h.y / 100) * rect.height,
                width: (h.w / 100) * rect.width,
                height: (h.h / 100) * rect.height,
              }}
            >
              {h.caption && (
                <span
                  className={`pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-max max-w-[180px] -translate-x-1/2 rounded-md bg-black/85 px-2 py-1 text-[11px] leading-tight text-white shadow-lg transition-opacity duration-150 ${
                    previewKind === h.kind ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {h.caption}
                </span>
              )}
              <NewSeedDot kind={h.kind} />
            </button>
          ))}

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTodayDrawerOpen(true)}
              aria-label="Open Today, Omer & Growth"
              className="lg:hidden flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            {username && (
              <button
                type="button"
                onClick={() => shareStallLink(username, stallName, user?.id)}
                aria-label="Share this stall"
                title="Share this stall"
                className="flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </Button>
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
                          onClick={() => { shareStallLink(username, stallName, user?.id); setOwnerMenuOpen(false); }}
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

          <p className="absolute bottom-3 left-4 text-xs font-semibold uppercase tracking-wide text-white/80 drop-shadow">
            {stallName}
          </p>
        </div>

        <StallTodayPanel className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-l lg:border-amber-500/15" />
      </div>

      <StallDrawer side="left" open={isNavDrawerOpen} onClose={() => setIsNavDrawerOpen(false)}>
        <StallSideNav onNavigate={onClose} className="flex flex-col flex-1 min-h-0" />
      </StallDrawer>

      <StallDrawer side="right" open={isTodayDrawerOpen} onClose={() => setIsTodayDrawerOpen(false)}>
        <StallTodayPanel className="flex flex-col flex-1 min-h-0" />
      </StallDrawer>

      {activeHotspot && (
        <StallHotspotSheet
          ownerId={ownerId}
          ownerName={stallName}
          kind={activeHotspot.kind}
          label={activeHotspot.label}
          isOwner={effectiveIsOwner}
          onClose={() => setOpenKind(null)}
          scrollToItemId={initialScrollSeedId}
          viewerCutoff={viewerCutoff}
        />
      )}

      {showJoinSheet && (
        <StallJoinSheet stallName={stallName} onClose={() => setShowJoinSheet(false)} />
      )}
    </div>
  );
}
