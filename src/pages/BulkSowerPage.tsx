import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ProductCard from '@/components/products/ProductCard';
import { Sprout, Users, Package, Star, Share2, PlayCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Sower = {
  id: string;
  slug: string | null;
  display_name: string | null;
  logo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  tagline: string | null;
  is_verified: boolean | null;
};

const PAGE_SIZE = 24;

export default function BulkSowerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sower, setSower] = useState<Sower | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState({ products: 0, sold: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sowers')
        .select('id, slug, display_name, avatar_url, banner_url, bio, tagline, verified, follower_count')
        .eq('slug', slug!)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSower(data as Sower);

      const { count } = await supabase
        .from('products').select('id', { count: 'exact', head: true })
        .eq('sower_id', data.id).neq('status', 'archived');

      const { data: bestowals } = await supabase
        .from('product_bestowals').select('id', { count: 'exact', head: true })
        .in('product_id',
          (await supabase.from('products').select('id').eq('sower_id', data.id)).data?.map((p: any) => p.id) ?? []
        ) as any;

      setStats({ products: count ?? 0, sold: bestowals?.length ?? 0 });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!sower) return;
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sower?.id]);

  const loadPage = async (p: number, reset = false) => {
    if (!sower) return;
    setLoadingMore(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('products')
      .select('*, sowers:sower_id (id, display_name, avatar_url, slug, user_id)')
      .eq('sower_id', sower.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .range(from, to);
    setLoadingMore(false);
    if (error) {
      toast({ title: 'Could not load products', description: error.message, variant: 'destructive' });
      return;
    }
    setHasMore((data ?? []).length === PAGE_SIZE);
    setProducts((prev) => reset ? (data ?? []) : [...prev, ...(data ?? [])]);
    setPage(p);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: sower?.display_name || 'Sower', url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); } catch {}
  };

  if (loading) {
    return <div className="container py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !sower) {
    return (
      <div className="container py-20 text-center space-y-4">
        <p className="text-muted-foreground">Sower not found.</p>
        <Button variant="outline" onClick={() => navigate('/products')}>Browse marketplace</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/30 via-primary/10 to-background">
        {sower.banner_url && (
          <img src={sower.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute top-3 left-3">
          <Button size="sm" variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </div>

      <div className="container max-w-6xl -mt-16 relative space-y-6 pb-12">
        {/* Identity */}
        <Card>
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-background">
              <AvatarImage src={sower.avatar_url ?? undefined} />
              <AvatarFallback>{sower.display_name?.[0] ?? 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{sower.display_name || 'Sower'}</h1>
                {sower.verified && <Badge variant="default" className="gap-1"><Star className="h-3 w-3" /> Verified</Badge>}
                <Badge variant="secondary">Bulk Sower</Badge>
              </div>
              {sower.tagline && <p className="text-sm text-muted-foreground mt-1">{sower.tagline}</p>}
              {sower.bio && <p className="text-sm mt-2 max-w-2xl">{sower.bio}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={`/bulk/sower/${sower.slug}/feed`}><PlayCircle className="h-4 w-4 mr-1" /> View seed feed</Link>
              </Button>
              <Button variant="outline" onClick={share}><Share2 className="h-4 w-4 mr-1" /> Share</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats.products}</div>
            <div className="text-xs text-muted-foreground">Products</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Sprout className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats.sold}</div>
            <div className="text-xs text-muted-foreground">Bestowed</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{sower.follower_count ?? 0}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </CardContent></Card>
        </div>

        {/* Product grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">All products</h2>
          {products.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">No products yet.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={() => loadPage(page + 1)} disabled={loadingMore}>
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
