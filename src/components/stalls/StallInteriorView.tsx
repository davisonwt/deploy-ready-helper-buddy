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
 * While mounted, sets AppContext.stallInteriorOpen so App.tsx hides the
 * global FloatingBasketButton/WalletBalanceChip/GroundskeeperWidget --
 * none of them have room to coexist with the fixed bottom tile strip
 * (Farm-Stalls batch 2, item 1).
 */
export default function StallInteriorView({ ownerId, interiorImageUrl, stallName, tiles, onClose, footerAction }: Props) {
  const navigate = useNavigate();
  const { setStallInteriorOpen } = useAppContext();
  const [openShelfTile, setOpenShelfTile] = useState<StallTile | null>(null);

  useEffect(() => {
    setStallInteriorOpen(true);
    return () => setStallInteriorOpen(false);
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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="relative flex-1 min-h-0">
        <img src={interiorImageUrl} alt={stallName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />

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

        {/* Bottom-left caption, not a top overlay -- keeps the top of the
            interior image clear (batch 2, item 1). */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <h2 className="text-white font-bold text-lg drop-shadow-lg">{stallName}</h2>
          {footerAction && (
            <Button type="button" onClick={footerAction.onClick} className="shrink-0 gap-1.5">
              {footerAction.label}
            </Button>
          )}
        </div>
      </div>

      <div className="shrink-0 bg-background/95 backdrop-blur border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 max-w-3xl mx-auto">
          {tiles.map((tile, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToTile(tile)}
              className="flex-1 rounded-xl border border-border bg-card hover:bg-accent transition-colors overflow-hidden text-left"
            >
              <div className="flex items-center gap-2 p-3">
                {tile.image_path ? (
                  <img src={tile.image_path} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{tile.label}</span>
              </div>
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
