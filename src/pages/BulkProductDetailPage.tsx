import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchProductBySlugOrId, fetchRelatedProductsBySower } from '@/api/products';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import ProductCard from '@/components/products/ProductCard';
import {
  ArrowLeft, Share2, ShoppingCart, Megaphone, Loader2, ImageIcon,
  Package, Tag, ChevronRight,
} from 'lucide-react';

export default function BulkProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToBasket } = useProductBasket();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setNotFound(false); setActiveImg(0);
      // Try slug first, then id fallback
      const { data, error } = await fetchProductBySlugOrId(slug ?? '');
      if (cancelled) return;
      const row = data?.[0];
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      setProduct(row);

      const { data: rel } = await fetchRelatedProductsBySower(row.sower_id, row.id, 8);
      if (!cancelled) setRelated(rel ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // SEO: title + meta + JSON-LD
  useEffect(() => {
    if (!product) return;
    const prevTitle = document.title;
    document.title = `${product.title} · ${product.sowers?.display_name ?? 'Sow2Grow'}`;
    const desc = (product.description ?? '').toString().slice(0, 155);
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const primaryImg = product.image_urls?.[0] ?? product.cover_image_url ?? '';
    setMeta('description', desc);
    setMeta('og:title', product.title, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:type', 'product', 'property');
    if (primaryImg) setMeta('og:image', primaryImg, 'property');

    const ld = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.title,
      description: desc,
      image: product.image_urls?.length ? product.image_urls : (primaryImg ? [primaryImg] : []),
      sku: product.sku ?? undefined,
      brand: { '@type': 'Brand', name: product.sowers?.display_name ?? 'Sow2Grow' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: Number(product.price ?? 0).toFixed(2),
        availability: (product.stock_qty ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
    };
    const scriptId = 'bulk-product-jsonld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.id = scriptId; document.head.appendChild(script); }
    script.textContent = JSON.stringify(ld);

    return () => {
      document.title = prevTitle;
      document.getElementById(scriptId)?.remove();
    };
  }, [product]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: product?.title, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); } catch {}
  };

  const handleAdd = () => {
    try {
      addToBasket({ ...product, quantity: 1 } as any);
      toast({ title: 'Added to basket', description: product.title });
    } catch (e) {
      toast({ title: 'Could not add', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="container py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !product) {
    return (
      <div className="container py-20 text-center space-y-3">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" onClick={() => navigate('/products')}>Browse marketplace</Button>
      </div>
    );
  }

  const images: string[] = (product.image_urls?.length ? product.image_urls : (product.cover_image_url ? [product.cover_image_url] : []));
  const commissionPct = product.whisperer_commission_percent;
  const commissionFixed = product.commission_fixed;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-4">
        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <nav className="text-muted-foreground flex items-center gap-1 truncate">
            <Link to="/products" className="hover:text-foreground">Products</Link>
            <ChevronRight className="h-3 w-3" />
            {product.sowers?.slug ? (
              <Link to={`/bulk/sower/${product.sowers.slug}`} className="hover:text-foreground truncate">
                {product.sowers?.display_name ?? 'Sower'}
              </Link>
            ) : <span className="truncate">{product.sowers?.display_name ?? 'Sower'}</span>}
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate">{product.title}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
              {images.length === 0
                ? <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="h-12 w-12" /></div>
                : <img src={images[activeImg]} alt={product.title} className="w-full h-full object-cover" />}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition ${i === activeImg ? 'border-primary' : 'border-transparent hover:border-muted-foreground/40'}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {product.category && <Badge variant="secondary"><Tag className="h-3 w-3 mr-1" /> {product.category}</Badge>}
                {(product.stock_qty ?? 0) === 0 && product.stock_qty !== null && (
                  <Badge variant="outline" className="border-destructive text-destructive">Out of stock</Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.title}</h1>
              {product.sku && <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${Number(product.price ?? 0).toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">USD</span>
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
            )}

            {/* Sower strip */}
            {product.sowers && (
              <Link
                to={product.sowers.slug ? `/bulk/sower/${product.sowers.slug}` : '#'}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={product.sowers.logo_url ?? undefined} />
                  <AvatarFallback>{product.sowers.display_name?.[0] ?? 'S'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{product.sowers.display_name ?? 'Sower'}</div>
                  <div className="text-xs text-muted-foreground">View brand page</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}

            {/* Commission callout */}
            {(commissionPct != null || commissionFixed != null) && (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="p-3 flex items-start gap-3">
                  <Megaphone className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Whisperers: earn {commissionPct != null ? `${commissionPct}%` : `$${Number(commissionFixed).toFixed(2)}`} per sale</div>
                    <div className="text-xs text-muted-foreground">Share this product and get paid when it sells.</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button size="lg" onClick={handleAdd} disabled={(product.stock_qty ?? 1) === 0}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Add to basket
              </Button>
              <Button size="lg" variant="outline" onClick={share}>
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
            </div>

            {(product.stock_qty != null) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" /> {product.stock_qty} in stock
              </p>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">More from {product.sowers?.display_name ?? 'this sower'}</h2>
              {product.sowers?.slug && (
                <Link to={`/bulk/sower/${product.sowers.slug}`} className="text-sm text-primary hover:underline">
                  View all
                </Link>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {related.map((p) => (
                <div key={p.id} className="w-60 shrink-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
