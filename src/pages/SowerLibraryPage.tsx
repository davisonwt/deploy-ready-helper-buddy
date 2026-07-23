import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Home, Loader2, Package, BookOpen, Users, ShoppingBasket,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';

const PRIVATE_COVER_BUCKETS = new Set(['premium-room', 'music-tracks', 'dj-music']);

const extractCoverObject = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    const key = decodeURIComponent(match[2].split('?')[0]);
    if (!PRIVATE_COVER_BUCKETS.has(bucket)) return null;
    return { bucket, key };
  } catch {
    return null;
  }
};

function SignedImg({ src, alt }: { src: string; alt: string }) {
  const [resolved, setResolved] = useState<string | null>(() =>
    extractCoverObject(src) ? null : src
  );
  useEffect(() => {
    let alive = true;
    const obj = extractCoverObject(src);
    if (!obj) { setResolved(src); return () => { alive = false; }; }
    setResolved(null);
    supabase.storage.from(obj.bucket).createSignedUrl(obj.key, 60 * 60 * 6)
      .then(({ data }) => { if (alive && data?.signedUrl) setResolved(data.signedUrl); });
    return () => { alive = false; };
  }, [src]);
  if (!resolved) return <div className="w-full h-full bg-muted animate-pulse" />;
  return <img src={resolved} alt={alt} className="w-full h-full object-cover" />;
}

function CoverGallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;
  const safeIdx = ((idx % images.length) + images.length) % images.length;
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => i - 1); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => i + 1); };
  return (
    <div className="relative w-full h-full group">
      <SignedImg src={images[safeIdx]} alt={title} />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={prev}
            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 hover:bg-background text-foreground flex items-center justify-center shadow border border-border/50 opacity-90"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={next}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 hover:bg-background text-foreground flex items-center justify-center shadow border border-border/50 opacity-90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === safeIdx ? 'bg-primary' : 'bg-background/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { useProductBasket } from '@/contexts/ProductBasketContext';

type Mode = 'products' | 'books';

type Row = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  cover_image_url: string | null;
  images: string[];
  sower_id: string;
  sower_user_id: string | null;
  sower_name: string;
  category: string | null;
  created_at: string;
};

type SowerOption = { userId: string; name: string; count: number };

const displayProfileName = (p: any) =>
  p?.display_name ||
  `${p?.first_name || ''} ${p?.last_name || ''}`.trim() ||
  p?.username ||
  null;

const MODE_META: Record<Mode, {
  routeSegment: string;
  title: string;
  suffix: string;
  Icon: any;
  emptyLabel: string;
  description: string;
  typeFilter: (t: string | null) => boolean;
}> = {
  products: {
    routeSegment: 'products',
    title: 'S2G Product Library',
    suffix: 'Product Library',
    Icon: Package,
    emptyLabel: 'No products from this sower yet.',
    description: 'Preview products, then bestow to add them to your basket.',
    typeFilter: (t) => !['music', 'ebook', 'book'].includes((t || '').toLowerCase()),
  },
  books: {
    routeSegment: 'books',
    title: 'S2G Book Library',
    suffix: 'Book Library',
    Icon: BookOpen,
    emptyLabel: 'No books from this sower yet.',
    description: 'Browse and bestow on books from this sower.',
    typeFilter: (t) => ['ebook', 'book'].includes((t || '').toLowerCase()),
  },
};

export default function SowerLibraryPage() {
  const navigate = useNavigate();
  const params = useParams<{ mode?: string }>();
  const [searchParams] = useSearchParams();
  const rawMode = (params.mode || 'products').toLowerCase();
  const mode: Mode = rawMode === 'books' ? 'books' : 'products';
  const meta = MODE_META[mode];

  const highlightedId = searchParams.get('productId') || searchParams.get('id') || undefined;
  const sowerFromUrl = searchParams.get('sowerUserId') || null;
  const sowerNameFromUrl = searchParams.get('sowerName') || null;

  const [selectedSowerUserId, setSelectedSowerUserId] = useState<string | null>(sowerFromUrl);

  useEffect(() => { setSelectedSowerUserId(sowerFromUrl); }, [sowerFromUrl]);

  const { addToBasket } = useProductBasket();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['sower-library', mode],
    queryFn: async (): Promise<Row[]> => {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, title, description, type, price, cover_image_url, image_urls, sower_id, category, created_at')
        .or('status.is.null,status.neq.archived')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const filtered = (products || []).filter((p: any) => meta.typeFilter(p.type));
      const sowerIds = [...new Set(filtered.map((p: any) => p.sower_id).filter(Boolean))];

      const { data: sowerRows } = sowerIds.length
        ? await supabase.from('sowers').select('id, user_id, display_name').in('id', sowerIds)
        : { data: [] };
      const sowerMap = new Map((sowerRows || []).map((s: any) => [s.id, s]));
      const userIds = [...new Set((sowerRows || []).map((s: any) => s.user_id).filter(Boolean))];
      const { data: profs } = userIds.length
        ? await supabase.from('profiles').select('id, username, display_name, first_name, last_name').in('id', userIds)
        : { data: [] };
      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));

      return filtered.map((p: any): Row => {
        const s: any = sowerMap.get(p.sower_id);
        const prof = s?.user_id ? profMap.get(s.user_id) : null;
        return {
          id: p.id,
          title: p.title || 'Untitled',
          description: p.description || null,
          price: p.price ?? null,
          cover_image_url: p.cover_image_url || (Array.isArray(p.image_urls) ? p.image_urls[0] : null) || null,
          images: Array.isArray(p.image_urls) ? p.image_urls : [],
          sower_id: p.sower_id,
          sower_user_id: s?.user_id || null,
          sower_name: s?.display_name || displayProfileName(prof) || 'Sower',
          category: p.category || p.type || null,
          created_at: p.created_at,
        };
      });
    },
  });

  const sowerOptions = useMemo<SowerOption[]>(() => {
    const map = new Map<string, SowerOption>();
    rows.forEach((r) => {
      if (!r.sower_user_id) return;
      const cur = map.get(r.sower_user_id);
      if (cur) cur.count += 1;
      else map.set(r.sower_user_id, { userId: r.sower_user_id, name: r.sower_name, count: 1 });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const displayedRows = useMemo(() => {
    if (!selectedSowerUserId) return rows;
    return rows.filter((r) => r.sower_user_id === selectedSowerUserId);
  }, [rows, selectedSowerUserId]);

  const selectedSowerName = useMemo(() => {
    if (!selectedSowerUserId) return null;
    const found = sowerOptions.find((s) => s.userId === selectedSowerUserId);
    return sowerNameFromUrl || found?.name || null;
  }, [selectedSowerUserId, sowerNameFromUrl, sowerOptions]);

  const heroTitle = selectedSowerUserId && selectedSowerName
    ? `${selectedSowerName}'s ${meta.suffix}`
    : `All Sowers ${meta.suffix}`;

  const goAll = () => {
    setSelectedSowerUserId(null);
    navigate(`/sower-library/${meta.routeSegment}`);
  };
  const goToSower = (s: SowerOption) => {
    setSelectedSowerUserId(s.userId);
    navigate(`/sower-library/${meta.routeSegment}?sowerUserId=${encodeURIComponent(s.userId)}&sowerName=${encodeURIComponent(s.name)}`);
  };

  const handleBestow = (r: Row) => {
    addToBasket({
      id: r.id,
      title: r.title,
      price: Number(r.price || 0),
      cover_image_url: r.cover_image_url || undefined,
      sower_id: r.sower_id,
      bestowal_count: 0,
      sowers: { display_name: r.sower_name },
    } as any);
    toast.success(`Added "${r.title}" to your basket`);
  };

  const Icon = meta.Icon;

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900" />
      <div className="fixed inset-0 z-0 bg-background/10" />

      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 bg-card/20 border-border/40 text-foreground hover:bg-card/30">
            <ArrowLeft className="h-4 w-4" /> Return
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2 bg-card/20 border-border/40 text-foreground hover:bg-card/30">
            <Home className="h-4 w-4" /> Home
          </Button>
          <Button variant="outline" onClick={goAll} className="gap-2 bg-card/20 border-border/40 text-foreground hover:bg-card/30">
            <Users className="h-4 w-4" /> All Sowers {mode === 'books' ? 'Books' : 'Products'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card/20 border-border/40 text-foreground hover:bg-card/30">
                <Icon className="h-4 w-4" /> Sowers <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Choose a sower library</DropdownMenuLabel>
              <DropdownMenuItem onClick={goAll}>All Sowers {mode === 'books' ? 'Books' : 'Products'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <ScrollArea className="h-72">
                {sowerOptions.length === 0 ? (
                  <DropdownMenuItem disabled>No sowers yet</DropdownMenuItem>
                ) : sowerOptions.map((s) => (
                  <DropdownMenuItem key={s.userId} onClick={() => goToSower(s)} className="flex items-center justify-between gap-3">
                    <span className="truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.count}</span>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={() => navigate('/basket')} className="gap-2 bg-card/20 border-border/40 text-foreground hover:bg-card/30 ml-auto">
            <ShoppingBasket className="h-4 w-4" /> Basket
          </Button>
        </div>

        <div className="relative overflow-hidden border border-border/30 backdrop-blur-md bg-card/15 rounded-2xl">
          <div className="px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <div className="p-4 rounded-2xl bg-card/20 border border-border/40">
                  <Icon className="w-10 h-10 text-foreground" />
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground">{heroTitle}</h1>
              </div>
              <p className="text-foreground/90 text-base md:text-lg bg-card/15 rounded-lg p-3 border border-border/30">
                {meta.description}
              </p>
            </motion.div>
          </div>
        </div>

        <Card className="backdrop-blur-md bg-card/20 border-border/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Icon className="h-5 w-5" />
              {selectedSowerUserId && selectedSowerName ? `${selectedSowerName}'s ${mode}` : `All sowers ${mode}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-foreground" />
              </div>
            ) : displayedRows.length === 0 ? (
              <p className="py-8 text-center text-foreground/70">{meta.emptyLabel}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedRows.map((r) => {
                  const isHighlighted = highlightedId === r.id;
                  return (
                    <div
                      key={r.id}
                      id={`sower-item-${r.id}`}
                      className={`rounded-xl border p-3 space-y-3 bg-card/40 backdrop-blur-sm transition ${isHighlighted ? 'border-primary ring-2 ring-primary/60' : 'border-border/40'}`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                        {(() => {
                          const gallery = Array.from(new Set([
                            ...(r.cover_image_url ? [r.cover_image_url] : []),
                            ...(r.images || []),
                          ].filter(Boolean)));
                          return gallery.length > 0 ? (
                            <CoverGallery images={gallery} title={r.title} />
                          ) : (
                            <GradientPlaceholder type={'product' as any} title={r.title} className="w-full h-full" />
                          );
                        })()}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground line-clamp-2">{r.title}</h3>
                        <p className="text-xs text-foreground/70">by {r.sower_name}</p>
                        {r.category && <p className="text-xs text-foreground/60 capitalize">{r.category}</p>}
                        {r.description && <p className="text-xs text-foreground/70 line-clamp-2">{r.description}</p>}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-semibold text-foreground">${Number(r.price || 0).toFixed(2)}</span>
                        <Button size="sm" onClick={() => handleBestow(r)}>Bestow</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
