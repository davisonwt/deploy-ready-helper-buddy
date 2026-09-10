import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import StallShelfView from './StallShelfView';
import type { StallTile } from '@/lib/stalls/stallTypes';

interface Props {
  /** Stall owner's user id -- shelves pull THEIR published items, never the viewer's. */
  ownerId: string;
  interiorImageUrl: string;
  stallName: string;
  tiles: StallTile[];
  onClose: () => void;
  /**
   * Visitor route (batch 2, item 3): a Bestow button for a visitor, or an
   * Edit button for the owner previewing their own public stall. Omitted
   * entirely on the Cockpit owner view (MyStallCard) -- editing there
   * happens from the front card outside the interior, same as batch 1.
   */
  footerAction?: { label: string; onClick: () => void };
}

/**
 * Full-screen "you're inside the stall" view -- interior image behind a
 * fixed bottom strip of tile buttons (2x2 on phones, one row on desktop).
 * Tapping a tile opens that tile's shelf (StallShelfView) except 'custom'
 * tiles, which navigate straight to their own link_target.
 *
 * Owns the full viewport while mounted: sets AppContext.stallInteriorOpen
 * (App.tsx's GlobalChrome hides FloatingBasketButton/WalletBalanceChip/
 * GroundskeeperWidget, and DashboardPage.jsx hides its own fixed
 * Plant-Seed/Go-Live/Chat bar, on the same flag) and locks body scroll;
 * z-[9999] (above both of those, which sit at z-100) guarantees this wins
 * the stacking order regardless of DOM position too, not just visibility
 * (Farm-Stalls batch 2, item 1 follow-up).
 */
export default function StallInteriorView({ ownerId, interiorImageUrl, stallName, tiles, onClose, footerAction }: Props) {
  const navigate = useNavigate();
  const { setStallInteriorOpen } = useAppContext();
  const [openShelfTile, setOpenShelfTile] = useState<StallTile | null>(null);

  useEffect(() => {
    setStallInteriorOpen(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      setStallInteriorOpen(false);
      document.body.style.overflow = prevOverflow;
    };
  }, [setStallInteriorOpen]);

  const goToTile = (tile: StallTile) => {
    if (tile.kind !== 'custom') {
      setOpenShelfTile(tile);
      return;
    }
    onClose();
    if (tile.link_target.startsWith('/')) {
      navigate(tile.link_target);
    } else if (tile.link_target) {
      window.location.href = tile.link_target;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <div className="relative flex-1 min-h-0">
        <img src={interiorImageUrl} alt={stallName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

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

        {footerAction && (
          <div className="absolute bottom-4 right-4">
            <Button type="button" onClick={footerAction.onClick} className="shrink-0 gap-1.5">
              {footerAction.label}
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-background/95 backdrop-blur border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Stall name as a small label at the strip's own top edge --
            previously overlaid the bottom of the interior image, where it
            visually collided with the tiles right below it. */}
        <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
          {stallName}
        </p>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 px-3 max-w-3xl mx-auto">
          {tiles.map((tile, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToTile(tile)}
              className="relative flex-1 h-20 rounded-xl border border-border overflow-hidden text-left group"
            >
              {tile.image_path ? (
                <>
                  <img src={tile.image_path} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-2 text-xs font-semibold text-white truncate drop-shadow">
                    {tile.label}
                  </span>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-card group-hover:bg-accent transition-colors p-2">
                  <span className="text-xs font-semibold text-center truncate">{tile.label}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {openShelfTile && (
        <StallShelfView
          ownerId={ownerId}
          ownerName={stallName}
          tile={openShelfTile}
          onClose={() => setOpenShelfTile(null)}
        />
      )}
    </div>
  );
}
