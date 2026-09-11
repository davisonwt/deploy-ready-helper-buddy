import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchProductsBySowerPaginated } from '@/api/products';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import SeedCard, { type SeedCardKind } from '@/components/seeds/SeedCard';
import {
  ArrowLeft, ShoppingCart, Loader2, Sprout,
} from 'lucide-react';

const PAGE_SIZE = 12;

const KIND_FROM_PRODUCT_TYPE: Record<string, SeedCardKind> = {
  music: 'music',
  book: 'book',
  ebook: 'book',
  video: 'video',
};

type FeedTab = 'all' | 'new' | 'commission' | 'trending';

export default function BulkSeedFeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToBasket } = useProductBasket();

  const [sower, setSower] = useState<{ id: string; user_id: string; display_name: string | null; slug: string | null } | null>(null);
  const [tab, setTab] = useState<FeedTab>('all');
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Resolve sower
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('sowers').select('id, user_id, display_name, slug').eq('slug', slug!).maybeSingle();
      setSower(data ?? null);
    })();
  }, [slug]);

  // Reset & load when sower or tab changes
  useEffect(() => {
    if (!sower) return;
    setItems([]); setPage(0); setHasMore(true);
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sower?.id, tab]);

  const loadPage = async (p: number, reset = false) => {
    if (!sower) return;
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const orderBy =
      tab === 'commission'
        ? { column: 'whisperer_commission_percent', ascending: false, nullsFirst: false }
        : tab === 'trending'
        ? { column: 'bestowal_count', ascending: false, nullsFirst: false }
        : { column: 'created_at', ascending: false };

    const { data, error } = await fetchProductsBySowerPaginated(sower.id, {
      from,
      to,
      orderBy,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not load feed', description: error.message, variant: 'destructive' });
      return;
    }
    setHasMore((data ?? []).length === PAGE_SIZE);
    setItems((prev) => reset ? (data ?? []) : [...prev, ...(data ?? [])]);
    setPage(p);
  };

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadPage(page + 1);
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loading]);

  const handleAddToBasket = async (p: any) => {
    try {
      await addToBasket({ ...p, quantity: 1 });
      toast({ title: 'Added to basket' });
    } catch (e) {
      toast({ title: 'Could not add', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b">
        <div className="container max-w-3xl flex items-center justify-between py-2 gap-2">
          <Button size="sm" variant="ghost" onClick={() => sower ? navigate(`/bulk/sower/${sower.slug}`) : navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {sower?.display_name || 'Back'}
          </Button>
          <div className="flex gap-1 text-xs">
            {(['all', 'new', 'commission', 'trending'] as FeedTab[]).map((t) => (
              <Button key={t} size="sm" variant={tab === t ? 'default' : 'ghost'} className="h-7 px-2"
                onClick={() => setTab(t)}>
                {t === 'all' ? 'All' : t === 'new' ? 'New' : t === 'commission' ? 'Top %' : 'Trending'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Vertical snap feed */}
      <div className="flex-1 overflow-y-auto snap-y snap-mandatory" style={{ scrollSnapType: 'y mandatory' }}>
        {items.length === 0 && !loading && (
          <div className="container max-w-md py-20 text-center">
            <Sprout className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No seeds in this feed yet.</p>
          </div>
        )}

        {items.map((p) => (
          <FeedCard key={p.id} product={p} sower={sower} onAdd={handleAddToBasket} />
        ))}

        <div ref={sentinelRef} className="h-10" />
        {loading && (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">You've reached the end.</div>
        )}
      </div>
    </div>
  );
}

/**
 * SeedCard carries cover/title/sower/sample-play/Bestow/Message/Voice/
 * Video/Heart/Share/Report/Whisper now -- "Add to basket" stays a
 * page-specific action layered alongside it, since bulk buying at listed
 * price (not a Bestow-style gift) is this wholesale rail's own distinct
 * transaction model, not part of SeedCard's decided action set.
 */
function FeedCard({ product, sower, onAdd }: {
  product: any;
  sower: { id: string; user_id: string; display_name: string | null; slug: string | null } | null;
  onAdd: (p: any) => void;
}) {
  const cover = product.cover_image_url ?? (product.image_urls && product.image_urls[0]) ?? null;

  return (
    <article className="snap-start min-h-[100vh] flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-md space-y-3">
        <SeedCard
          id={product.id}
          kind={KIND_FROM_PRODUCT_TYPE[product.type] ?? 'seed'}
          title={product.title}
          subtitle={product.description}
          cover={cover}
          ownerId={sower?.user_id ?? product.sowers?.user_id}
          ownerName={sower?.display_name ?? product.sowers?.display_name}
          price={product.price}
          openPath={`/bulk/products/${product.slug ?? product.id}`}
          previewUrl={product.type === 'music' ? product.preview_url ?? null : undefined}
          productId={product.type === 'music' ? product.id : undefined}
          pdfUrl={(product.type === 'book' || product.type === 'ebook') && /\.pdf(\?|$)/i.test(product.file_url ?? '') ? product.file_url : undefined}
          hideSowerLine
        />
        <Button className="w-full" onClick={() => onAdd(product)}>
          <ShoppingCart className="h-4 w-4 mr-1.5" /> Add to basket
        </Button>
      </div>
    </article>
  );
}
