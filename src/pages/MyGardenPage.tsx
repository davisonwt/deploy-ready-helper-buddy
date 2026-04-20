import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TreePine, Package, Music, BookOpen, Plus, Eye, Edit, Share2, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatters';
import { ImageCarousel } from '@/components/products/ImageCarousel';
import { processOrchardsUrls } from '@/utils/urlUtils';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';

export default function MyGardenPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orchards, setOrchards] = useState<any[]>([]);
  const [seeds, setSeeds] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Get sower id
      const { data: sowerData } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      const sowerId = sowerData?.id;

      const [orchardRes, seedRes, bookRes, libRes] = await Promise.all([
        supabase.from('orchards').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        sowerId
          ? supabase.from('products').select('*').eq('sower_id', sowerId).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        sowerId
          ? supabase.from('sower_books').select('*').eq('sower_id', sowerId).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from('s2g_library_items').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      ]);

      setOrchards(processOrchardsUrls(orchardRes.data || []));
      // Separate music from other seeds
      setSeeds((seedRes.data || []) as any[]);
      setBooks((bookRes.data || []) as any[]);
      setLibraryItems((libRes.data || []) as any[]);
    } catch (err) {
      console.error('Error fetching garden data:', err);
    } finally {
      setLoading(false);
    }
  };

  const musicSeeds = seeds.filter((s: any) => s.type === 'music');
  const nonMusicSeeds = seeds.filter((s: any) => s.type !== 'music');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-900">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950">
      {/* Header */}
      <div className="px-4 py-8 text-center border-b border-white/10 backdrop-blur-sm bg-white/5">
        <h1 className="text-3xl font-bold text-white mb-1">My Garden</h1>
        <p className="text-white/70 text-sm">Everything you've sown — orchards, seeds, music & library</p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/create-orchard">
            <Button size="sm" className="bg-white/20 border border-white/30 text-white hover:bg-white/30">
              <Plus className="w-4 h-4 mr-1" /> New Orchard
            </Button>
          </Link>
          <Link to="/products/upload">
            <Button size="sm" className="bg-white/20 border border-white/30 text-white hover:bg-white/30">
              <Plus className="w-4 h-4 mr-1" /> New Seed
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">
        {/* MY ORCHARDS */}
        <GardenSection
          icon={<TreePine className="w-5 h-5 text-white" />}
          title="My Orchards"
          count={orchards.length}
          gradient="from-green-600 to-emerald-700"
        >
          {orchards.length === 0 ? (
            <EmptyState label="No orchards yet" linkTo="/create-orchard" linkLabel="Sow Your First Orchard" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orchards.map((o: any) => (
                <OrchardCard key={o.id} orchard={o} onRefresh={fetchAll} />
              ))}
            </div>
          )}
        </GardenSection>

        {/* MY SEEDS (non-music products) */}
        <GardenSection
          icon={<Package className="w-5 h-5 text-white" />}
          title="My Seeds"
          count={nonMusicSeeds.length}
          gradient="from-amber-600 to-orange-700"
        >
          {nonMusicSeeds.length === 0 ? (
            <EmptyState label="No seeds yet" linkTo="/products/upload" linkLabel="Sow a Seed" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nonMusicSeeds.map((s: any) => (
                <SeedCard key={s.id} seed={s} onRefresh={fetchAll} />
              ))}
            </div>
          )}
        </GardenSection>

        {/* MY MUSIC */}
        <GardenSection
          icon={<Music className="w-5 h-5 text-white" />}
          title="My Music Library"
          count={musicSeeds.length}
          gradient="from-purple-600 to-violet-700"
        >
          {musicSeeds.length === 0 ? (
            <EmptyState label="No music yet" linkTo="/products/upload" linkLabel="Upload Music" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {musicSeeds.map((s: any) => (
                <SeedCard key={s.id} seed={s} onRefresh={fetchAll} />
              ))}
            </div>
          )}
        </GardenSection>

        {/* MY LIBRARY (books + library items) */}
        <GardenSection
          icon={<BookOpen className="w-5 h-5 text-white" />}
          title="My Library"
          count={books.length + libraryItems.length}
          gradient="from-blue-600 to-indigo-700"
        >
          {books.length + libraryItems.length === 0 ? (
            <EmptyState label="No library items yet" linkTo="/products/upload" linkLabel="Add to Library" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b: any) => (
                <BookCard key={b.id} book={b} />
              ))}
              {libraryItems.map((li: any) => (
                <LibraryItemCard key={li.id} item={li} />
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

function EmptyState({ label, linkTo, linkLabel }: { label: string; linkTo: string; linkLabel: string }) {
  return (
    <Card className="bg-white/10 border-white/20">
      <CardContent className="p-8 text-center">
        <p className="text-white/60 mb-3">{label}</p>
        <Link to={linkTo}>
          <Button size="sm" className="bg-white/20 text-white border border-white/30 hover:bg-white/30">
            <Plus className="w-4 h-4 mr-1" /> {linkLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function OrchardCard({ orchard, onRefresh }: { orchard: any; onRefresh: () => void }) {
  const handleToggleStatus = async () => {
    const newStatus = orchard.status === 'paused' ? 'active' : 'paused';
    const { error } = await supabase.from('orchards').update({ status: newStatus }).eq('id', orchard.id);
    if (error) toast.error(error.message);
    else { toast.success(`Orchard ${newStatus}`); onRefresh(); }
  };

  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="relative h-36">
        <ImageCarousel images={orchard.images?.length > 0 ? orchard.images : []} title={orchard.title} type="orchard" />
        <Badge className={`absolute top-2 right-2 ${orchard.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} text-white border-0 text-[10px]`}>
          {orchard.status}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-2">
        <h3 className="text-sm font-bold text-white truncate">{orchard.title}</h3>
        <p className="text-[11px] text-white/60 truncate">{orchard.category}</p>
        <div className="flex gap-1.5 flex-wrap">
          <Link to={`/orchards/${orchard.id}`}><Button size="sm" variant="ghost" className="h-7 text-[11px] text-white/80 hover:bg-white/10"><Eye className="w-3 h-3 mr-1" />View</Button></Link>
          <Link to={`/edit-orchard/${orchard.id}`}><Button size="sm" variant="ghost" className="h-7 text-[11px] text-white/80 hover:bg-white/10"><Edit className="w-3 h-3 mr-1" />Edit</Button></Link>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-white/80 hover:bg-white/10" onClick={handleToggleStatus}>
            {orchard.status === 'paused' ? <PlayCircle className="w-3 h-3 mr-1" /> : <PauseCircle className="w-3 h-3 mr-1" />}
            {orchard.status === 'paused' ? 'Relaunch' : 'Pause'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SeedCard({ seed, onRefresh }: { seed: any; onRefresh: () => void }) {
  // Prefer the freshly generated AI cover (image_urls[0]) over the legacy cover_image_url,
  // matching the social feed behavior so music singles show their unique covers here too.
  const coverSrc = (Array.isArray(seed.image_urls) && seed.image_urls[0]) || seed.cover_image_url;
  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="h-32 relative">
        {coverSrc ? (
          <img src={coverSrc} alt={seed.title} className="w-full h-full object-cover" />
        ) : (
          <GradientPlaceholder title={seed.title} />
        )}
        <Badge className={`absolute top-2 right-2 ${seed.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} text-white border-0 text-[10px]`}>
          {seed.status}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="text-sm font-bold text-white truncate">{seed.title}</h3>
        <p className="text-[11px] text-white/60">{seed.type} • {formatCurrency(seed.price || 0)}</p>
        <div className="flex gap-1.5">
          <Link to={`/products/${seed.id}`}><Button size="sm" variant="ghost" className="h-7 text-[11px] text-white/80 hover:bg-white/10"><Eye className="w-3 h-3 mr-1" />View</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

function BookCard({ book }: { book: any }) {
  const coverSrc = (Array.isArray(book.image_urls) && book.image_urls[0]) || book.cover_image_url;
  return (
    <Card className="bg-white/10 border-white/20 overflow-hidden">
      <div className="h-32 relative">
        {coverSrc ? (
          <img src={coverSrc} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <GradientPlaceholder title={book.title} />
        )}
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="text-sm font-bold text-white truncate">{book.title}</h3>
        <p className="text-[11px] text-white/60">Book • {formatCurrency(book.bestowal_value || 0)}</p>
      </CardContent>
    </Card>
  );
}

function LibraryItemCard({ item }: { item: any }) {
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
