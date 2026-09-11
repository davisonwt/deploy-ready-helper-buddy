import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import StallHotspotSheet from './StallHotspotSheet';
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
 */
/** Reads #stall-kind=<kind> off the current URL -- lets a fresh mount (e.g. after browser Back from an item-detail page) restore which sheet was open. */
function readKindFromHash(): string | null {
  const m = /(?:^|#)stall-kind=([a-z]+)/.exec(window.location.hash);
  return m ? m[1] : null;
}

export default function StallInteriorView({ ownerId, interiorImageUrl, stallName, hotspots, onClose, isOwner, onEdit }: Props) {
  const { setStallInteriorOpen } = useAppContext();
  const [openKind, setOpenKind] = useState<StallHotspot['kind'] | null>(() => readKindFromHash() as StallHotspot['kind'] | null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);

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
            onClick={() => setOpenKind(h.kind)}
            className="absolute outline-none"
            style={{
              left: rect.offsetX + (h.x / 100) * rect.width,
              top: rect.offsetY + (h.y / 100) * rect.height,
              width: (h.w / 100) * rect.width,
              height: (h.h / 100) * rect.height,
            }}
          />
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
