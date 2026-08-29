import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Settings2, BookOpen, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { fetchStoreBySlug, fetchStoreProducts } from '@/api/products';
import ProductCard from '@/components/products/ProductCard';

const PAGE_SIZE = 24;

interface Store {
  id: string;
  name: string;
  slug: string;
  store_tagline: string | null;
  store_categories: string[] | null;
  logo_url: string | null;
  banner_url: string | null;
  owner_user_id: string;
}

/**
 * `/store/:slug` — a shop's public storefront, spec-storefronts.md §4.
 * Public, no auth (same pattern as /learn-share/:videoId) — ?ref= referral
 * capture already happens app-wide via useReferralCapture() in App.tsx,
 * nothing extra needed here for that.
 */
export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    let alive = true;
    if (!slug) return;
    setLoadingStore(true);
    setNotFound(false);
    (async () => {
      const { data } = await fetchStoreBySlug(slug);
      if (!alive) return;
      if (!data) { setNotFound(true); setLoadingStore(false); return; }
      setStore(data as any);
      setLoadingStore(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  // Debounce the search box before it hits the query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!store) return;
    let alive = true;
    setLoadingProducts(true);
    setPage(0);
    (async () => {
      const { data, error } = await fetchStoreProducts({
        companyId: store.id,
        from: 0,
        to: PAGE_SIZE - 1,
        search: search || undefined,
        category: activeCategory !== 'all' ? activeCategory : undefined,
      });
      if (!alive) return;
      setLoadingProducts(false);
      if (error) { console.error('Failed to load store products:', error); return; }
      setProducts(data ?? []);
      setHasMore((data ?? []).length === PAGE_SIZE);
    })();
    return () => { alive = false; };
  }, [store, search, activeCategory]);

  const loadMore = async () => {
    if (!store) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const { data, error } = await fetchStoreProducts({
      companyId: store.id,
      from,
      to: from + PAGE_SIZE - 1,
      search: search || undefined,
      category: activeCategory !== 'all' ? activeCategory : undefined,
    });
    setLoadingMore(false);
    if (error) { console.error('Failed to load more store products:', error); return; }
    setProducts((prev) => [...prev, ...(data ?? [])]);
    setHasMore((data ?? []).length === PAGE_SIZE);
    setPage(nextPage);
  };

  if (loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <StoreIcon className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">This shop isn't open — the link may be wrong, or the shop hasn't turned on its storefront yet.</p>
        <Link to="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Home</Button></Link>
      </div>
    );
  }

  const isOwner = !!user && store.owner_user_id === user.id;
  const categories = store.store_categories ?? [];

  return (
    <div className="min-h-screen">
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border bg-muted/40 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">Manage</span>
            <Link to="/profile">
              <Button variant="outline" size="sm"><Settings2 className="w-3.5 h-3.5 mr-1.5" /> Edit shop</Button>
            </Link>
            <Link to="/books">
              <Button variant="outline" size="sm"><BookOpen className="w-3.5 h-3.5 mr-1.5" /> Books</Button>
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <StoreIcon className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{store.name}</h1>
            {store.store_tagline && <p className="text-sm text-muted-foreground truncate">{store.store_tagline}</p>}
          </div>
        </div>

        {/* Search + category chips, scoped to this shop */}
        <div className="space-y-3 mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search ${store.name}...`}
              className="pl-9"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeCategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/60'}`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeCategory === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/60'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {loadingProducts ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {search || activeCategory !== 'all' ? 'Nothing matches here yet.' : 'This shop has nothing on the shelves yet.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} hideSowerInfo />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
