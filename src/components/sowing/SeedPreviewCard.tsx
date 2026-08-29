import ProductCard from '@/components/products/ProductCard';
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

/**
 * "Show the result while they type" — spec-sowing-forms.md. Renders the
 * exact same ProductCard a grower sees in a real feed, fed a draft product
 * built from the form's current values, with its cover image area masked
 * by SeedPuzzle (an overlay sized to ProductCard's own aspect-square image
 * div — see ProductCard.tsx — rather than a ProductCard prop, since
 * ProductCard has no way to swap that region from outside and is shared
 * across the whole app). Title, price and sower still come straight from
 * ProductCard, live, exactly as before. Non-interactive: there's no real
 * row behind it yet.
 */
export default function SeedPreviewCard({
  title, description, coverUrl, price, isFree, type, isAlbum, sowerName, sowerAvatarUrl,
  completedPieces, requiredPieces = 6, celebrate,
}: Props) {
  const { user } = useAuth();
  const total = !isFree && price && price > 0 ? priceBreakdown(price).total : 0;

  const draftProduct = {
    id: 'preview',
    title: title || 'Untitled seed',
    description,
    type,
    cover_image_url: coverUrl,
    price: total,
    license_type: isFree ? 'free' : 'bestowal',
    metadata: isAlbum ? { is_album: true } : undefined,
    play_count: 0,
    bestowal_count: 0,
    like_count: 0,
    is_featured: false,
    sowers: {
      user_id: user?.id ?? 'preview',
      display_name: sowerName ?? 'You',
      logo_url: sowerAvatarUrl ?? null,
      is_verified: false,
    },
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        How it will look
      </p>
      <div className="pointer-events-none select-none max-w-xs">
        <div className="relative">
          <ProductCard product={draftProduct} />
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
