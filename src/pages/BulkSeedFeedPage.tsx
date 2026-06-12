import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Share2, ShoppingCart, Megaphone, ChevronLeft, ChevronRight,
  Loader2, ImageIcon, Sprout,
} from 'lucide-react';

const PAGE_SIZE = 12;

type FeedTab = 'all' | 'new' | 'commission' | 'trending';

export default function BulkSeedFeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToBasket } = useProductBasket();
  const { user } = useAuth();

  const [sower, setSower] = useState<{ id: string; display_name: string | null; slug: string | null } | null>(null);
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
        .from('sowers').select('id, display_name, slug').eq('slug', slug!).maybeSingle();
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
    let q = supabase
      .from('products')
      .select('*, sowers:sower_id (id, display_name, slug, logo_url, user_id)')
      .eq('sower_id', sower.id)
      .neq('status', 'archived');

    if (tab === 'new') q = q.order('created_at', { ascending: false });
    else if (tab === 'commission') q = q.order('whisperer_commission_percent', { ascending: false, nullsFirst: false });
    else if (tab === 'trending') q = q.order('bestowal_count', { ascending: false, nullsFirst: false });
    else q = q.order('created_at', { ascending: false });

    const { data, error } = await q.range(from, to);
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

  const share = async (p: any) => {
    const url = `${window.location.origin}/bulk/products/${p.slug ?? p.id}`;
    if (navigator.share) { try { await navigator.share({ title: p.title, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); } catch {}
  };

  const becomeWhisperer = async (p: any) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Sign in to start marketing this product.' });
      navigate('/login');
      return;
    }
    toast({ title: 'Marketing link coming soon', description: 'Whisperer dashboard arrives in Phase 4.' });
  };

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
          <FeedCard key={p.id} product={p} onShare={share} onMarket={becomeWhisperer} onAdd={handleAddToBasket} />
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

function FeedCard({ product, onShare, onMarket, onAdd }: {
  product: any;
  onShare: (p: any) => void;
  onMarket: (p: any) => void;
  onAdd: (p: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState(0);

  const images: string[] = (product.image_urls && product.image_urls.length)
    ? product.image_urls
    : (product.cover_image_url ? [product.cover_image_url] : []);

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSel);
    return () => { embla.off('select', onSel); };
  }, [embla]);

  return (
    <article className="snap-start min-h-[100vh] flex items-center justify-center px-2 py-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Carousel */}
        <div className="relative bg-muted aspect-square">
          {images.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          ) : (
            <>
              <div className="overflow-hidden h-full" ref={emblaRef}>
                <div className="flex h-full">
                  {images.map((url, i) => (
                    <div key={i} className="flex-[0_0_100%] h-full">
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={() => embla?.scrollPrev()} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 rounded-full p-1.5 hover:bg-background">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => embla?.scrollNext()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 rounded-full p-1.5 hover:bg-background">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === selected ? 'bg-primary' : 'bg-background/60'}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {product.whisperer_commission_percent != null && (
            <Badge className="absolute top-2 right-2 gap-1">
              <Megaphone className="h-3 w-3" /> {product.whisperer_commission_percent}% commission
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <Link to={`/bulk/products/${product.slug ?? product.id}`} className="block">
            <h3 className="font-semibold text-lg leading-tight hover:underline">{product.title}</h3>
          </Link>
          {product.description && (
            <div>
              <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}>
                {product.description}
              </p>
              {product.description.length > 140 && (
                <button onClick={() => setExpanded((v) => !v)} className="text-xs text-primary mt-1">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">${Number(product.price ?? 0).toFixed(2)}</div>
            <Link to={`/bulk/sower/${product.sowers?.slug ?? ''}`} className="text-xs text-muted-foreground hover:text-foreground">
              by {product.sowers?.display_name ?? 'Sower'}
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => onAdd(product)}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => onShare(product)}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onMarket(product)}>
              <Megaphone className="h-4 w-4 mr-1" /> Market
            </Button>
          </div>
        </div>
      </Card>
    </article>
  );
}
