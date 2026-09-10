import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSowerContent } from '@/api/sowerContent';
import {
  buildSeedCard, buildOrchardCard, buildMusicCard, buildBookCard,
} from '@/components/garden/seedCardBuilders';
import type { StallTile, TileKind } from '@/lib/stalls/stallTypes';

interface Props {
  ownerId: string;
  ownerName: string;
  tile: StallTile;
  onClose: () => void;
}

interface ShelfCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  openPath: string;
}

const SHELF_THEME: Record<TileKind, { label: string; bg: string; cardShape: string }> = {
  books: { label: 'Wooden shelf', bg: 'bg-gradient-to-b from-amber-900/90 via-amber-800/80 to-amber-950', cardShape: 'aspect-[2/3] rounded-t-md rounded-b-sm' },
  music: { label: 'Record crate', bg: 'bg-gradient-to-b from-stone-900/90 via-stone-800/80 to-stone-950', cardShape: 'aspect-square rounded-lg' },
  lyrics: { label: 'Notebook stack', bg: 'bg-gradient-to-b from-orange-100/10 via-orange-950/40 to-stone-950', cardShape: 'aspect-[3/4] rounded-md' },
  story: { label: 'Framed page', bg: 'bg-gradient-to-b from-slate-800/90 to-slate-950', cardShape: 'aspect-[4/3] rounded-lg' },
  products: { label: 'Market table', bg: 'bg-gradient-to-b from-emerald-950/90 via-emerald-900/70 to-stone-950', cardShape: 'aspect-square rounded-lg' },
  services: { label: 'Booking board', bg: 'bg-gradient-to-b from-sky-950/90 via-sky-900/70 to-stone-950', cardShape: 'aspect-[3/2] rounded-md' },
  orchard: { label: 'Progress tree', bg: 'bg-gradient-to-b from-green-950/90 via-green-900/70 to-stone-950', cardShape: 'aspect-square rounded-full' },
  custom: { label: '', bg: '', cardShape: '' },
};

/**
 * Full-screen "shelf" opened by tapping a stall tile -- styled per kind,
 * pulling the STALL OWNER's published items of that kind (never the
 * viewer's own). Each card taps through to that item's existing detail/
 * purchase flow. Farm-Stalls batch 2, item 2.
 *
 * Data sources, reusing the app's own canonical content layer rather than
 * fresh queries:
 *   - books/music/orchard: useSowerContent(ownerId)'s matching bucket
 *   - products/services: useSowerContent's `seeds` bucket, split on
 *     seedRow.kind === 'hand' (the one live "service" product kind today --
 *     see seedCardBuilders.js's KIND_CARD_META) vs everything else
 *   - story: profiles.bio for ownerId, rendered as a single framed card
 *   - lyrics: no backing table exists yet anywhere in this app -- always
 *     the empty state, not a fake/wrong query
 */
export default function StallShelfView({ ownerId, ownerName, tile, onClose }: Props) {
  const navigate = useNavigate();
  const content = useSowerContent(ownerId);
  const [bio, setBio] = useState<string | null>(null);
  const [bioLoading, setBioLoading] = useState(tile.kind === 'story');

  useEffect(() => {
    if (tile.kind !== 'story') return;
    let alive = true;
    supabase.from('profiles').select('bio').eq('user_id', ownerId).maybeSingle()
      .then(({ data }) => { if (alive) { setBio((data as { bio?: string } | null)?.bio ?? null); setBioLoading(false); } });
    return () => { alive = false; };
  }, [tile.kind, ownerId]);

  const theme = SHELF_THEME[tile.kind];

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  let cards: ShelfCard[] = [];
  if (tile.kind === 'books') {
    cards = content.books.map((b) => { const c = buildBookCard(b); return { id: c.id, title: c.title, subtitle: c.subtitle, image: c.image, openPath: c.openPath }; });
  } else if (tile.kind === 'music') {
    cards = content.music.map((m) => { const c = buildMusicCard(m); return { id: c.id, title: c.title, subtitle: c.subtitle, image: c.image, openPath: c.openPath }; });
  } else if (tile.kind === 'orchard') {
    cards = content.orchards.map((o) => { const c = buildOrchardCard(o); return { id: c.id, title: c.title, subtitle: c.subtitle, image: c.image, openPath: c.openPath }; });
  } else if (tile.kind === 'products') {
    cards = content.seeds.filter((s) => s.kind !== 'hand')
      .map((s) => { const c = buildSeedCard(s); return { id: c.id, title: c.title, subtitle: c.subtitle, image: c.image, openPath: c.openPath }; });
  } else if (tile.kind === 'services') {
    cards = content.seeds.filter((s) => s.kind === 'hand')
      .map((s) => { const c = buildSeedCard(s); return { id: c.id, title: c.title, subtitle: c.subtitle, image: c.image, openPath: c.openPath }; });
  }

  const loading = tile.kind === 'story' ? bioLoading : content.loading;
  const isEmpty = tile.kind === 'lyrics' || (tile.kind !== 'story' && !loading && cards.length === 0);

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col ${theme.bg}`}>
      <div className="shrink-0 flex items-center justify-between p-4">
        <div>
          <h2 className="text-white font-bold text-lg">{tile.label}</h2>
          <p className="text-white/60 text-xs">{theme.label} — {ownerName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full" aria-label="Close">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
        ) : tile.kind === 'story' ? (
          <div className="max-w-md mx-auto mt-4 rounded-xl border-4 border-white/20 bg-black/40 p-6">
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
              {bio || 'This member hasn’t written their story yet.'}
            </p>
          </div>
        ) : isEmpty ? (
          <p className="text-center text-white/60 py-16">Nothing on this shelf yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => goTo(card.openPath)}
                className="text-left group"
              >
                <div className={`${theme.cardShape} overflow-hidden bg-black/30 shadow-lg group-hover:scale-[1.03] transition-transform`}>
                  <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
                </div>
                <p className="mt-1.5 text-sm font-medium text-white truncate">{card.title}</p>
                <p className="text-xs text-white/60 truncate">{card.subtitle}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
