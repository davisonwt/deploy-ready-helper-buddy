import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StallTile } from '@/lib/stalls/stallTypes';

interface Props {
  interiorImageUrl: string;
  stallName: string;
  tiles: StallTile[];
  onClose: () => void;
}

/**
 * Full-screen "you're inside the stall" view -- interior image behind a
 * fixed bottom strip of tile buttons (2x2 on phones, one row on desktop).
 * Tapping a tile navigates the owner to that tile's target (its own
 * products/music/orchard/etc, per Farm-Stalls batch 1, item 4 -- no public
 * visitor storefront yet, this is the owner's own preview/management view).
 */
export default function StallInteriorView({ interiorImageUrl, stallName, tiles, onClose }: Props) {
  const navigate = useNavigate();

  const goToTile = (tile: StallTile) => {
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4">
          <h2 className="text-white font-bold text-lg drop-shadow">{stallName}</h2>
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
    </div>
  );
}
