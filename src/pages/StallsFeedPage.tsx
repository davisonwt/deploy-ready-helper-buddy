import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { STALL_CATEGORIES, STALL_TIER_LABEL, type StallCategory, type StallTier } from '@/lib/stalls/stallTypes';

type Chip = 'for_you' | 'new' | StallCategory;

const CHIPS: { id: Chip; label: string }[] = [
  { id: 'for_you', label: 'For You' },
  { id: 'new', label: 'New' },
  ...STALL_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.id === 'whisperer' ? 'Whisperers' : c.id === 'orchard' ? 'Orchards' : c.label,
  })),
];

interface StallCard {
  id: string;
  user_id: string;
  username: string | null;
  name: string;
  tagline: string | null;
  tier: StallTier;
  category: StallCategory;
  front_image_path: string;
}

/**
 * Default "Stalls" feed (Farm-Stalls batch 2, item 4): category chips over
 * full-width, vertically snap-scrolling shop-front cards. Gated the same
 * way /orchard-alive already is (signed-in members) -- unlike
 * StallVisitPage, this page resolves usernames via public_profiles
 * (authenticated-only grant), which is fine here since the page itself
 * requires a session.
 */
export default function StallsFeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { liveSeeds } = useTribalLiveOrchard();

  const [chip, setChip] = useState<Chip>('for_you');
  const [cards, setCards] = useState<StallCard[] | null>(null);

  const liveOwnerIds = useMemo(() => new Set((liveSeeds ?? []).map((p) => p.user_id)), [liveSeeds]);

  useEffect(() => {
    let alive = true;
    setCards(null);
    (async () => {
      let q = supabase
        .from('stalls')
        .select('id, user_id, name, tagline, tier, category, front_image_path')
        .eq('published', true)
        .not('front_image_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (chip !== 'for_you' && chip !== 'new') {
        q = q.eq('category', chip);
      }
      const { data: stallRows } = await q;
      const rows = (stallRows ?? []) as Omit<StallCard, 'username'>[];
      if (rows.length === 0) { if (alive) setCards([]); return; }

      const ownerIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profileRows } = await supabase
        .from('public_profiles' as any)
        .select('user_id, username')
        .in('user_id', ownerIds);
      const usernameByOwner = new Map<string, string | null>(
        ((profileRows ?? []) as { user_id: string; username: string | null }[]).map((p) => [p.user_id, p.username]),
      );

      if (alive) {
        setCards(rows.map((r) => ({ ...r, username: usernameByOwner.get(r.user_id) ?? null })));
      }
    })();
    return () => { alive = false; };
  }, [chip]);

  const openStall = (card: StallCard) => {
    if (card.username) navigate(`/stall/${card.username}#open`);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              chip === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {cards === null ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : cards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
          No stalls here yet — check back soon, or{' '}
          {user && <Link to="/stall/build" className="underline ml-1">build your own</Link>}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory">
          {cards.map((card) => (
            <article key={card.id} className="snap-start h-[calc(100dvh-8rem)] relative flex flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => openStall(card)}
                className="relative w-full flex-1 min-h-0"
                aria-label={`Open ${card.name}'s stall`}
              >
                {/* Blurred cover copy fills the frame behind the real image --
                    the real image itself is object-contain so it's never
                    cropped or stretched, whatever its own aspect ratio (same
                    treatment as MyStallCard / the Cockpit hero). Name/tagline
                    live in their own strip below (not overlaid) so they can
                    never cover any part of the image, whatever its aspect
                    ratio letterboxes to. */}
                <img
                  src={card.front_image_path}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70"
                />
                <div className="absolute inset-0 bg-black/20" />
                <img
                  src={card.front_image_path}
                  alt={card.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {liveOwnerIds.has(card.user_id) && (
                  <span className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                    <Radio className="h-3 w-3" /> LIVE
                  </span>
                )}
                <span className="absolute top-4 right-4 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                  {STALL_TIER_LABEL[card.tier]}
                </span>
              </button>

              <button type="button" onClick={() => openStall(card)} className="shrink-0 w-full p-5 text-left bg-background border-t">
                <h2 className="font-bold text-2xl">{card.name}</h2>
                {card.tagline && <p className="text-muted-foreground mt-1">{card.tagline}</p>}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
