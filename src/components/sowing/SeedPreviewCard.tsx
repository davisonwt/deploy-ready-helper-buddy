import SeedCard, { type SeedCardKind } from '@/components/seeds/SeedCard';
import SeedPuzzle from '@/components/sowing/SeedPuzzle';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  title: string;
  description: string;
  coverUrl: string | null;
  price: number | null;
  isFree: boolean;
  type: string;
  isAlbum?: boolean;
  sowerName?: string;
  sowerAvatarUrl?: string;
  /** How many of the required fields are done — drives the cover puzzle and the caption below the card. */
  completedPieces: number;
  requiredPieces?: number;
  /** Plays a one-off "complete" shimmer over the assembled cover. */
  celebrate?: boolean;
}

const KIND_FROM_PRODUCT_TYPE: Record<string, SeedCardKind> = {
  music: 'music',
  book: 'book',
  ebook: 'book',
  video: 'video',
};

/**
 * "Show the result while they type" — spec-sowing-forms.md. Renders the
 * exact same SeedCard a grower sees in a real feed, fed the form's current
 * values, with its cover image area masked by SeedPuzzle (an overlay sized
 * to SeedCard's own aspect-square cover div — see SeedCard.tsx — rather
 * than a SeedCard prop, since SeedCard has no way to swap that region from
 * outside and is shared across the whole app). Title, price and sower
 * still come straight from SeedCard, live, exactly as before.
 * Non-interactive (pointer-events-none): there's no real row behind it yet,
 * so a real id of 'preview' is harmless -- every SeedCard action query
 * against it just resolves to nothing, and none of them are clickable here
 * anyway.
 */
export default function SeedPreviewCard({
  title, description, coverUrl, price, isFree, type, sowerName, sowerAvatarUrl,
  completedPieces, requiredPieces = 6, celebrate,
}: Props) {
  const { user } = useAuth();
  const total = !isFree && price && price > 0 ? priceBreakdown(price).total : 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        How it will look
      </p>
      <div className="pointer-events-none select-none max-w-xs">
        <div className="relative">
          <SeedCard
            id="preview"
            kind={KIND_FROM_PRODUCT_TYPE[type] ?? 'seed'}
            title={title || 'Untitled seed'}
            subtitle={description}
            cover={coverUrl}
            ownerId={user?.id ?? 'preview'}
            ownerName={sowerName ?? 'You'}
            ownerAvatar={sowerAvatarUrl}
            price={total}
            openPath="#"
          />
          <div className="absolute top-0 inset-x-0 aspect-square rounded-t-2xl overflow-hidden">
            <SeedPuzzle coverUrl={coverUrl} pieces={requiredPieces} completedPieces={completedPieces} celebrate={celebrate} />
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-2">
        {completedPieces} of {requiredPieces} planted
      </p>
    </div>
  );
}
