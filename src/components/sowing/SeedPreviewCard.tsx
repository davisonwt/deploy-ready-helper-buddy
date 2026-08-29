import ProductCard from '@/components/products/ProductCard';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  title: string;
  description: string;
  coverUrl: string | null;
  price: number | null;
  isFree: boolean;
  type: string;
  sowerName?: string;
  sowerAvatarUrl?: string;
}

/**
 * "Show the result while they type" — spec-sowing-forms.md. Renders the
 * exact same ProductCard a grower sees in a real feed, fed a draft product
 * built from the form's current values. Non-interactive: there's no real
 * row behind it yet.
 */
export default function SeedPreviewCard({ title, description, coverUrl, price, isFree, type, sowerName, sowerAvatarUrl }: Props) {
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
        <ProductCard product={draftProduct} />
      </div>
    </div>
  );
}
