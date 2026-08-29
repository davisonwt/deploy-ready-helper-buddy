import { Puzzle } from 'lucide-react';

interface Props {
  coverUrl: string | null;
  /** Total pieces in the grid — always rendered as a 3x2 jigsaw. */
  pieces?: number;
  /** How many pieces (in fixed order) are revealed. */
  completedPieces: number;
  /** Plays a one-off "complete" shimmer over the assembled cover. */
  celebrate?: boolean;
}

/**
 * The cover as a 3x2 jigsaw, one piece per required field (fixed order:
 * file, cover, title, price, genre, description). Reveal order is fixed
 * regardless of which field the sower actually fills in last — the count
 * is all this component is given, and all it needs: pieces snap in left
 * to right, top to bottom, as `completedPieces` climbs.
 *
 * Pure CSS: each piece is a background-image slice of the same cover
 * image (background-size 300%/200%, offset per cell) — no canvas.
 */
export default function SeedPuzzle({ coverUrl, pieces = 6, completedPieces, celebrate }: Props) {
  const cells = Array.from({ length: pieces });

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
      <style>{`
        @keyframes seed-puzzle-shimmer {
          0% { transform: translateX(-130%) skewX(-15deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateX(130%) skewX(-15deg); opacity: 0; }
        }
      `}</style>

      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[3px]">
        {cells.map((_, i) => {
          const revealed = !!coverUrl && i < completedPieces;
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <div
              key={`${i}-${revealed}`}
              className={
                coverUrl
                  ? revealed
                    ? 'relative motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[250ms]'
                    : 'relative bg-muted/70'
                  : 'relative border-2 border-dashed border-border/60 rounded-sm'
              }
            >
              {revealed && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${coverUrl})`,
                    backgroundSize: '300% 200%',
                    backgroundPosition: `${col * 50}% ${row * 100}%`,
                  }}
                />
              )}
              {coverUrl && !revealed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Puzzle className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!coverUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3">
          <span className="text-xs text-center text-muted-foreground">Your cover goes here</span>
        </div>
      )}

      {celebrate && coverUrl && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none motion-safe:[animation:seed-puzzle-shimmer_900ms_ease-out]"
          style={{
            background: 'linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.65) 50%, transparent 60%)',
          }}
        />
      )}
    </div>
  );
}
