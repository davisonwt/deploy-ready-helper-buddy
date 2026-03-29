import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TreePine, Package, Music, BookOpen, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { processOrchardsUrls } from '@/utils/urlUtils';
import { ImageCarousel } from '@/components/products/ImageCarousel';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';

export default function TribalGardensPage() {
  const [loading, setLoading] = useState(true);
  const [orchards, setOrchards] = useState<any[]>([]);
  const [seeds, setSeeds] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [orchardRes, seedRes, bookRes, libRes] = await Promise.all([
        supabase.from('orchards').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('*, sower:sowers!products_sower_id_fkey(display_name)').eq('status', 'active').order('created_at', { ascending: false }).limit(50),
        supabase.from('sower_books').select('*, sower:sowers!sower_books_sower_id_fkey(display_name)').eq('status', 'active').eq('is_public', true).order('created_at', { ascending: false }).limit(50),
        supabase.from('s2g_library_items').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(50),
      ]);

      setOrchards(processOrchardsUrls(orchardRes.data || []));
      setSeeds((seedRes.data || []) as any[]);
      setBooks((bookRes.data || []) as any[]);
      setLibraryItems((libRes.data || []) as any[]);
    } catch (err) {
      console.error('Error fetching tribal gardens:', err);
    } finally {
      setLoading(false);
    }
  };

  const musicSeeds = seeds.filter((s: any) => s.type === 'music');
  const nonMusicSeeds = seeds.filter((s: any) => s.type !== 'music');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-900">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-800 to-teal-950">
      {/* Header */}
      <div className="px-4 py-8 text-center border-b border-white/10 backdrop-blur-sm bg-white/5">
        <h1 className="text-3xl font-bold text-white mb-1">Tribal Gardens</h1>
        <p className="text-white/70 text-sm">All orchards & seeds sown by the tribe</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">
        {/* TRIBAL ORCHARDS */}
        <GardenSection
          icon={<TreePine className="w-5 h-5 text-white" />}
          title="Tribal Orchards"
          count={orchards.length}
          gradient="from-green-600 to-emerald-700"
        >
          {orchards.length === 0 ? (
            <EmptyLabel label="No tribal orchards yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orchards.map((o: any) => (
                <TribalOrchardCard key={o.id} orchard={o} />
              ))}
            </div>
          )}
        </GardenSection>

        {/* TRIBAL SEEDS */}
        <GardenSection
          icon={<Package className="w-5 h-5 text-white" />}
          title="Tribal Seeds"
          count={nonMusicSeeds.length}
          gradient="from-amber-600 to-orange-700"
        >
          {nonMusicSeeds.length === 0 ? (
            <EmptyLabel label="No tribal seeds yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nonMusicSeeds.map((s: any) => (
                <TribalSeedCard key={s.id} seed={s} />
              ))}
            </div>
          )}
        </GardenSection>

        {/* TRIBAL MUSIC */}
        <GardenSection
          icon={<Music className="w-5 h-5 text-white" />}
          title="Tribal Music"
          count={musicSeeds.length}
          gradient="from-purple-600 to-violet-700"
        >
          {musicSeeds.length === 0 ? (
            <EmptyLabel label="No tribal music yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {musicSeeds.map((s: any) => (
                <TribalSeedCard key={s.id} seed={s} />
              ))}
            </div>
          )}
        </GardenSection>

        {/* TRIBAL LIBRARY */}
        <GardenSection
          icon={<BookOpen className="w-5 h-5 text-white" />}
          title="Tribal Library"
          count={books.length + libraryItems.length}
          gradient="from-blue-600 to-indigo-700"
        >
          {books.length + libraryItems.length === 0 ? (
            <EmptyLabel label="No tribal library items yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b: any) => (
                <TribalBookCard key={b.id} book={b} />
              ))}
              {libraryItems.map((li: any) => (
                <TribalLibraryCard key={li.id} item={li} />
              ))}
            </div>
          )}
        </GardenSection>
      </div>
    </div>
  );
}

/* ──── Sub-components ──── */

function GardenSection({ icon, title, count, gradient, children }: {
  icon: React.ReactNode; title: string; count: number; gradient: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className={`flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-gradient-to-r ${gradient}`}>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">{icon}</div>
        <h2 className="text-lg font-bold text-white flex-1">{title}</h2>
        <Badge className="bg-white/20 text-white border-0">{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function EmptyLabel({ label }: { label: string }) {
  return (
    <Card className="bg-white/10 border-white/20">
      <CardContent className="p-8 text-center">
        <p className="text-white/60">{label}</p>
      </CardContent>
    </Card>
  );
}

function TribalOrchardCard({ orchard }: { orchard: any }) {
  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="relative h-36">
        <ImageCarousel images={orchard.images?.length > 0 ? orchard.images : []} title={orchard.title} type="orchard" />
        <Badge className="absolute top-2 left-2 bg-emerald-500/80 text-white border-0 text-[10px]">{orchard.category}</Badge>
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="text-sm font-bold text-white truncate">{orchard.title}</h3>
        <div className="flex justify-between">
          <Link to={`/orchards/${orchard.id}`}>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-white/80 hover:bg-white/10">
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TribalSeedCard({ seed }: { seed: any }) {
  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="h-32 relative">
        {seed.cover_image_url ? (
          <img src={seed.cover_image_url} alt={seed.title} className="w-full h-full object-cover" />
        ) : (
          <GradientPlaceholder title={seed.title} />
        )}
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="text-sm font-bold text-white truncate">{seed.title}</h3>
        <p className="text-[11px] text-white/60">
          {seed.sower?.display_name || 'Unknown'} • {seed.type} • {formatCurrency(seed.price || 0)}
        </p>
        <Link to={`/products/${seed.id}`}>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-white/80 hover:bg-white/10">
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function TribalBookCard({ book }: { book: any }) {
  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="h-32 relative">
        {book.cover_image_url ? (
          <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <GradientPlaceholder title={book.title} />
        )}
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="text-sm font-bold text-white truncate">{book.title}</h3>
        <p className="text-[11px] text-white/60">{book.sower?.display_name || 'Unknown'} • Book • {formatCurrency(book.bestowal_value || 0)}</p>
      </CardContent>
    </Card>
  );
}

function TribalLibraryCard({ item }: { item: any }) {
  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="h-32 relative">
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <GradientPlaceholder title={item.title} />
        )}
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
        <p className="text-[11px] text-white/60">{item.item_type || 'Library'}</p>
      </CardContent>
    </Card>
  );
}
