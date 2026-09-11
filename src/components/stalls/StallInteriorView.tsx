import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import StallHotspotSheet from './StallHotspotSheet';
import StallSideNav from './StallSideNav';
import StallTodayPanel from './StallTodayPanel';
import type { StallHotspot } from '@/lib/stalls/stallTypes';

interface Props {
  /** Stall owner's user id -- the sheet pulls THEIR published items, never the viewer's. */
  ownerId: string;
  interiorImageUrl: string;
  stallName: string;
  hotspots: StallHotspot[];
  onClose: () => void;
  /** True for the owner previewing their own stall -- shows "Edit stall" top-right instead of nothing (batch 2b, task 4: otherwise identical to the visitor view). */
  isOwner?: boolean;
  onEdit?: () => void;
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

/** Tap-preview delay (mobile): how long a hotspot's caption shows before its sheet opens. */
const CAPTION_PREVIEW_MS = 800;

export default function StallInteriorView({ ownerId, interiorImageUrl, stallName, hotspots, onClose, isOwner, onEdit }: Props) {
  const { setStallInteriorOpen } = useAppContext();
  const [openKind, setOpenKind] = useState<StallHotspot['kind'] | null>(() => readKindFromHash() as StallHotspot['kind'] | null);
  // Mobile-only: the hotspot whose caption is being shown for CAPTION_PREVIEW_MS before its sheet opens.
  const [previewKind, setPreviewKind] = useState<StallHotspot['kind'] | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);

  useEffect(() => () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); }, []);

  // A hotspot with a caption gets a hover tooltip on a mouse-primary device
  // (CSS :hover handles that, see the `group` button below) and, on a
  // touch-primary device, a brief tap-preview of the same caption before
  // the sheet opens. `(hover: hover) and (pointer: fine)` is the standard
  // way to tell those apart -- a real mouse, not just viewport width.
  function handleHotspotTap(h: StallHotspot) {
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
  useEffect(() => {
    const base = window.location.pathname + window.location.search;
    const next = openKind ? `${base}#stall-kind=${openKind}` : base;
    window.history.replaceState(null, '', next);
  }, [openKind]);

  const activeHotspot = openKind ? hotspots.find((h) => h.kind === openKind) ?? null : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <div className="relative flex-1 min-h-0 flex">
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
            </button>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Button>

          {isOwner && (
            <button
              type="button"
              onClick={onEdit}
              className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/70 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit stall
            </button>
          )}

          <p className="absolute bottom-3 left-4 text-xs font-semibold uppercase tracking-wide text-white/80 drop-shadow">
            {stallName}
          </p>
        </div>

        <StallTodayPanel className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-l lg:border-amber-500/15" />
      </div>

      {activeHotspot && (
        <StallHotspotSheet
          ownerId={ownerId}
          ownerName={stallName}
          kind={activeHotspot.kind}
          isOwner={isOwner}
          onClose={() => setOpenKind(null)}
        />
      )}
    </div>
  );
}
