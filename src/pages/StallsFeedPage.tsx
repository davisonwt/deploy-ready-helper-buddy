import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Radio, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import StallSideNav from '@/components/stalls/StallSideNav';
import StallTodayPanel from '@/components/stalls/StallTodayPanel';
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
  // "‹ pan ›" hint on the portrait-pannable front image -- one shared flag
  // for the whole feed (only one card is ever visible at a time, snap-y),
  // dismissed on first touch/drag or after a few seconds. Not persisted
  // across visits, same call as StallInteriorView's own pan hint.
  const [showPanHint, setShowPanHint] = useState(true);

  const liveOwnerIds = useMemo(() => new Set((liveSeeds ?? []).map((p) => p.user_id)), [liveSeeds]);

  useEffect(() => {
    if (!showPanHint) return;
    const t = setTimeout(() => setShowPanHint(false), 2500);
    return () => clearTimeout(t);
  }, [showPanHint]);

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
    // { from } lets StallVisitPage's close button come straight back
    // here instead of guessing (or, before this, blindly history.back()-ing
    // into whatever the visitor did inside the stall in the meantime).
    if (card.username) navigate(`/stall/${card.username}#open`, { state: { from: '/stalls-feed' } });
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-[100dvh]">
      <div className="flex-1 min-h-0 flex">
        {/* Desktop: same 3-column "the stall is the frame" layout as
            StallInteriorView (StallSideNav / image / StallTodayPanel) so the
            front image gets exactly the same middle-column box the interior
            image renders in, at the same max height -- instead of losing
            most of its height to the old full-width p-5 name/tagline strip.
            No stall interior is open here, so onNavigate is a no-op. Mobile
            is untouched below: single-column snap-scroll, image full width,
            bar underneath. */}
        <StallSideNav
          onNavigate={() => {}}
          className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-r lg:border-amber-500/15"
        />

        <div className="flex-1 min-h-0 min-w-0 flex flex-col lg:relative lg:bg-[#140c06]">
          {/* Chips: in-flow, horizontal-scroll on mobile (unchanged). On
              desktop they still float over the top of the image (so the
              image below keeps the full column height -- same
              zero-extra-chrome frame as the interior) but wrap onto a
              second line instead of overflowing off the right edge, and
              are restyled gold-on-dark-wood -- solid enough pills to stay
              readable over any photo, and belonging to the same "the stall
              is the frame" language as StallSideNav/StallTodayPanel,
              instead of a heavy black scrim. The ✕ (same close affordance
              StallInteriorView's header has, here going straight to
              /cockpit since there's no "interior" to close first) is a
              shrink-0 sibling of the chip strip rather than an absolutely-
              positioned corner overlay -- the chip strip can grow to two
              lines now, and a fixed top-right overlay would sit on top of
              wrapped chips at that point; living in the same row instead
              keeps it clear at every width, mobile included (StallSideNav's
              own new "My Stall / Cockpit" entry is the desktop/drawer path
              back; this is the same destination for whoever's looking at
              the top-right corner instead). min-w-0 on this row AND the
              middle column above it -- without both, the nested flex
              chain refuses to shrink the chip strip below its own
              min-content width (the classic flexbox overflow bug), which
              on mobile pushed the ✕ button off the right edge of the
              viewport entirely; caught via Playwright measurement. */}
          <div className="shrink-0 min-w-0 flex items-center gap-2 px-4 py-3 lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:z-10 lg:bg-[#140c06]/70 lg:backdrop-blur-sm lg:border-b lg:border-amber-500/15">
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChip(c.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                    chip === c.id
                      ? 'bg-primary text-primary-foreground lg:bg-amber-500 lg:text-amber-950'
                      : 'bg-muted text-muted-foreground hover:bg-accent lg:bg-amber-500/10 lg:text-amber-200 lg:border lg:border-amber-500/25 lg:hover:bg-amber-500/20'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/cockpit')}
              aria-label="Close"
              title="Back to Cockpit"
              className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-white hover:bg-black/70 lg:bg-amber-500/10 lg:text-amber-300 lg:border lg:border-amber-500/25 lg:hover:bg-amber-500/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
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
                <article key={card.id} className="snap-start h-[calc(100dvh-8rem)] lg:h-full relative overflow-hidden">
                  {/* Portrait phones (<lg, portrait): pannable sideways --
                      image height = container height, width auto, instead
                      of object-contain shrinking a 1216-wide front image
                      down to ~270px tall (unreadable). Opens scrolled to
                      the image's horizontal centre; momentum scroll.
                      Nothing cropped -- pan to see the edges. Landscape
                      phones/tablets and desktop keep the object-contain
                      tree below, unchanged. */}
                  <div className="absolute inset-0 hidden max-lg:portrait:block">
                    <div
                      data-pan-scroll
                      className="relative w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                      onPointerDown={() => setShowPanHint(false)}
                    >
                      <button
                        type="button"
                        onClick={() => openStall(card)}
                        className="relative block h-full w-max mx-auto"
                        aria-label={`Open ${card.name}'s stall`}
                      >
                        <img
                          src={card.front_image_path}
                          alt={card.name}
                          loading="lazy"
                          decoding="async"
                          onLoad={(e) => {
                            const scrollEl = e.currentTarget.closest('[data-pan-scroll]') as HTMLDivElement | null;
                            if (scrollEl) scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2;
                          }}
                          className="block h-full w-auto max-w-none"
                        />
                      </button>
                    </div>
                    {liveOwnerIds.has(card.user_id) && (
                      <span className="pointer-events-none absolute top-4 left-4 flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                        <Radio className="h-3 w-3" /> LIVE
                      </span>
                    )}
                    {showPanHint && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
                        <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                          ‹ pan ›
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Landscape phones/tablets + desktop: unchanged object-contain. */}
                  <button
                    type="button"
                    onClick={() => openStall(card)}
                    className="absolute inset-0 max-lg:portrait:hidden"
                    aria-label={`Open ${card.name}'s stall`}
                  >
                    {/* Blurred cover copy fills the frame behind the real image --
                        the real image itself is object-contain so it's never
                        cropped or stretched, whatever its own aspect ratio (same
                        treatment as MyStallCard / the Cockpit hero / StallInteriorView). */}
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
                  </button>

                  {/* Name bar: 40px overlay on mobile (portrait + landscape/
                      tablet), 48px on desktop -- tagline dropped at every
                      size now (no room in a 40px bar), tier chip stays.
                      Floats over the image instead of eating into its
                      height, same treatment at every breakpoint now. */}
                  <button
                    type="button"
                    onClick={() => openStall(card)}
                    className="absolute bottom-0 left-0 right-0 z-10 h-10 lg:h-12 px-4 flex items-center justify-between gap-3 text-left bg-gradient-to-t from-black/80 to-transparent lg:bg-[#140c06] lg:border-t lg:border-amber-500/15"
                  >
                    <h2 className="font-bold text-sm truncate text-white lg:text-amber-50">{card.name}</h2>
                    <span className="shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5 bg-white/15 text-white lg:bg-amber-500/10 lg:text-amber-300">
                      {STALL_TIER_LABEL[card.tier]}
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <StallTodayPanel className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-l lg:border-amber-500/15" />
      </div>
    </div>
  );
}
