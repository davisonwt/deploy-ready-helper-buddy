import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Radio, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import StallSideNav from '@/components/stalls/StallSideNav';
import StallTodayPanel from '@/components/stalls/StallTodayPanel';
import { STALL_CATEGORIES, STALL_TIER_LABEL, type StallCategory, type StallTier } from '@/lib/stalls/stallTypes';
import SeedCard from '@/components/seeds/SeedCard';
import { fetchTribeOrchards } from '@/api/sowerContent';

type Chip = 'for_you' | 'new' | StallCategory;

const CHIPS: { id: Chip; label: string }[] = [
  { id: 'for_you', label: 'For You' },
  { id: 'new', label: 'New' },
  ...STALL_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.id === 'whisperer' ? 'Whisperers' : c.id === 'orchard' ? 'Orchards' : c.label,
  })),
];

/** Singular form (STALL_CATEGORIES' own label, not CHIPS' pluralized filter label) for the per-card category badge. */
const CATEGORY_LABEL: Record<StallCategory, string> = Object.fromEntries(
  STALL_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<StallCategory, string>;

/**
 * S2G-run system stalls, pinned first in this feed in this exact order,
 * regardless of chip/sort (not during search, where they behave like any
 * other stall). Hardcoded: each is a singleton system stall, not
 * something that changes. Add more here as new S2G-run stalls launch --
 * the fetch/pin logic below is generic over this list.
 */
const PINNED_STALL_USER_IDS = [
  'e9758e23-fba4-4778-8e58-4fd8e5550a72', // Grove Station (scripts/studio/create-grove-station-stall.sql)
  '54ba45c3-382b-4cc2-9bb7-c1f895c3c119', // Wandering Hearts (scripts/studio/create-wandering-hearts-stall.sql)
];

interface StallCard {
  id: string;
  user_id: string;
  username: string | null;
  displayName: string | null;
  name: string;
  tagline: string | null;
  tier: StallTier;
  category: StallCategory;
  front_image_path: string;
}

/**
 * Real orchard campaigns (public.orchards), for the "Orchards" chip --
 * distinct from a stall whose own business `category` happens to be
 * "orchard" (STALL_CATEGORIES' 8th option, a real but separate concept).
 * Flow v2 step 6 folds /browse-orchards's orchard browsing in here; this
 * chip's label was already pluralized to "Orchards" in CHIPS below ahead
 * of this, so it's the natural home rather than a second competing chip.
 * Same fetchTribeOrchards() AdvancedSearchPage/BrowseOrchardsPage already
 * share -- main_image/grower_name are real denormalized columns on the
 * table itself, no extra profile join needed.
 */
interface OrchardCard {
  id: string;
  title: string;
  description: string | null;
  main_image: string | null;
  images: string[] | null;
  video_url: string | null;
  user_id: string;
  grower_name: string | null;
  pocket_price: number | null;
  pocket_bestow: number | null;
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
  // Flow v2 step 7: /browse-orchards and /search now redirect here with
  // `?chip=`/`?q=` -- read once on mount as the initial state, same as a
  // normal "restore where you left off" deep link (not kept in sync with
  // the URL afterward, so picking a different chip/search doesn't rewrite
  // it -- this page never wrote its own query string before).
  const [searchParams] = useSearchParams();

  const [chip, setChip] = useState<Chip>(() => {
    const requested = searchParams.get('chip');
    return CHIPS.some((c) => c.id === requested) ? (requested as Chip) : 'for_you';
  });
  // My Tribe's "My village" hotspot (src/pages/MyTribePage.tsx) opens
  // here with ?tribe=mine -- narrows to stalls of members the viewer
  // invited (profiles.referred_by) or follows (public.followers), chips
  // still apply on top. Read once like chip/q above; `tribeMine` set to
  // false clears it locally without touching the URL.
  const [tribeMine, setTribeMine] = useState(() => searchParams.get('tribe') === 'mine');
  const [tribeUserIds, setTribeUserIds] = useState<string[] | null>(null);
  const [cards, setCards] = useState<StallCard[] | null>(null);
  const [orchardCards, setOrchardCards] = useState<OrchardCard[] | null>(null);
  // "‹ pan ›" hint on the portrait-pannable front image -- one shared flag
  // for the whole feed (only one card is ever visible at a time, snap-y),
  // dismissed on first touch/drag or after a few seconds. Not persisted
  // across visits, same call as StallInteriorView's own pan hint.
  const [showPanHint, setShowPanHint] = useState(true);
  // Search: client-side only, on top of whatever the active chip already
  // fetched -- no extra round-trip, and "combined with the active
  // category chip" falls out for free since search only ever narrows
  // `cards`, never widens past what the chip query returned. Mobile-only
  // toggle: the 🔍 icon expands into this same input, replacing the chip
  // row while open (no room for both on a narrow screen); desktop always
  // shows the input, so this flag never gates it there (max-lg: below).
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(() => searchParams.has('q'));
  // "New seeds" (supabase/migrations/20260912140000_stall_visits.sql) --
  // stall_user_id -> {total, latest}, from the same RPC StallInteriorView
  // uses for its own hotspot dots. Fetched once per signed-in viewer, not
  // re-fetched per chip/search change -- it covers every stall with new
  // content regardless of which chip is active.
  const [newSeedInfo, setNewSeedInfo] = useState<Map<string, { total: number; latest: string }>>(new Map());
  const [pinnedCards, setPinnedCards] = useState<StallCard[]>([]);

  const liveOwnerIds = useMemo(() => new Set((liveSeeds ?? []).map((p) => p.user_id)), [liveSeeds]);

  useEffect(() => {
    if (!user) { setNewSeedInfo(new Map()); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc('stall_new_seed_counts' as any, { viewer: user.id });
      const map = new Map<string, { total: number; latest: string }>();
      for (const row of (data ?? []) as { stall_user_id: string; total_count: number; latest_created_at: string }[]) {
        map.set(row.stall_user_id, { total: row.total_count, latest: row.latest_created_at });
      }
      if (alive) setNewSeedInfo(map);
    })();
    return () => { alive = false; };
  }, [user]);

  // Pinned system stalls: fetched once, independent of the active chip,
  // so they can be prepended regardless of which category chip is
  // selected. Order follows PINNED_STALL_USER_IDS; any not found (not
  // yet created, or unpublished) is just skipped, not a gap.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: stallRows } = await supabase
        .from('stalls')
        .select('id, user_id, name, tagline, tier, category, front_image_path')
        .in('user_id', PINNED_STALL_USER_IDS)
        .eq('published', true);
      const rows = (stallRows ?? []) as Omit<StallCard, 'username' | 'displayName'>[];
      if (rows.length === 0) return;
      const { data: profileRows } = await supabase
        .from('public_profiles' as any)
        .select('user_id, username, display_name')
        .in('user_id', PINNED_STALL_USER_IDS);
      const profileByOwner = new Map<string, { username: string | null; display_name: string | null }>(
        ((profileRows ?? []) as { user_id: string; username: string | null; display_name: string | null }[]).map((p) => [
          p.user_id,
          { username: p.username, display_name: p.display_name },
        ]),
      );
      const byOwner = new Map(rows.map((r) => [r.user_id, r]));
      const ordered = PINNED_STALL_USER_IDS
        .map((id) => byOwner.get(id))
        .filter((r): r is Omit<StallCard, 'username' | 'displayName'> => !!r)
        .map((r) => ({
          ...r,
          username: profileByOwner.get(r.user_id)?.username ?? null,
          displayName: profileByOwner.get(r.user_id)?.display_name ?? null,
        }));
      if (alive) setPinnedCards(ordered);
    })();
    return () => { alive = false; };
  }, []);

  // "My village": union of who the viewer invited (referred_by) and who
  // they follow (public.followers) -- only computed when tribeMine is on.
  useEffect(() => {
    if (!tribeMine || !user) { setTribeUserIds(tribeMine ? [] : null); return; }
    let alive = true;
    (async () => {
      const [{ data: referredRows }, { data: followRows }] = await Promise.all([
        supabase.from('profiles').select('user_id').eq('referred_by', user.id),
        supabase.from('followers').select('following_id').eq('follower_id', user.id),
      ]);
      const ids = new Set<string>();
      for (const r of (referredRows ?? []) as { user_id: string }[]) ids.add(r.user_id);
      for (const r of (followRows ?? []) as { following_id: string }[]) ids.add(r.following_id);
      if (alive) setTribeUserIds(Array.from(ids));
    })();
    return () => { alive = false; };
  }, [tribeMine, user]);

  const filteredCards = useMemo(() => {
    if (!cards) return cards;
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.username ?? '').toLowerCase().includes(q) ||
      (c.displayName ?? '').toLowerCase().includes(q) ||
      (c.tagline ?? '').toLowerCase().includes(q),
    );
  }, [cards, search]);

  // Same client-side narrowing as filteredCards above -- no extra
  // round-trip, combines for free with the active chip (there's only one
  // chip that ever populates orchardCards).
  const filteredOrchards = useMemo(() => {
    if (!orchardCards) return orchardCards;
    const q = search.trim().toLowerCase();
    if (!q) return orchardCards;
    return orchardCards.filter((o) =>
      o.title.toLowerCase().includes(q) ||
      (o.description ?? '').toLowerCase().includes(q) ||
      (o.grower_name ?? '').toLowerCase().includes(q),
    );
  }, [orchardCards, search]);

  // "For You" only: stalls with new seeds first, newest seed first among
  // those -- everything else keeps the base query's own created_at-desc
  // order (a stable sort leaves ties as they were). Other chips are
  // unaffected -- "New"/a category chip already has its own meaning for
  // order.
  const orderedCards = useMemo(() => {
    if (!filteredCards || chip !== 'for_you') return filteredCards;
    return [...filteredCards].sort((a, b) => {
      const aInfo = newSeedInfo.get(a.user_id);
      const bInfo = newSeedInfo.get(b.user_id);
      const aHas = (aInfo?.total ?? 0) > 0;
      const bHas = (bInfo?.total ?? 0) > 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas && bHas) return new Date(bInfo!.latest).getTime() - new Date(aInfo!.latest).getTime();
      return 0;
    });
  }, [filteredCards, chip, newSeedInfo]);

  // Pinned system stalls first, in PINNED_STALL_USER_IDS order,
  // regardless of chip/sort -- not during search, where they're just
  // another stall (found or not, on their own merits). Deduped: if one
  // is already present (chip is 'for_you'/'new'/its own category, or it
  // happens to match the search), it isn't listed twice.
  const pinnedOrderedCards = useMemo(() => {
    if (!orderedCards) return orderedCards;
    if (search.trim() || tribeMine || pinnedCards.length === 0) return orderedCards;
    const pinnedIds = new Set(pinnedCards.map((c) => c.user_id));
    const rest = orderedCards.filter((c) => !pinnedIds.has(c.user_id));
    return [...pinnedCards, ...rest];
  }, [orderedCards, pinnedCards, search, tribeMine]);

  useEffect(() => {
    if (!showPanHint) return;
    const t = setTimeout(() => setShowPanHint(false), 2500);
    return () => clearTimeout(t);
  }, [showPanHint]);

  useEffect(() => {
    let alive = true;
    setCards(null);
    setOrchardCards(null);
    if (chip === 'orchard') {
      (async () => {
        const { data } = await fetchTribeOrchards({ sortBy: 'recent', limit: 60 });
        if (alive) setOrchardCards((data ?? []) as unknown as OrchardCard[]);
      })();
      return () => { alive = false; };
    }
    // tribeMine's own id list isn't ready yet -- wait rather than run an
    // unfiltered query first and flash the wrong stalls.
    if (tribeMine && tribeUserIds === null) return;
    if (tribeMine && tribeUserIds!.length === 0) { setCards([]); return; }
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
      if (tribeMine) {
        q = q.in('user_id', tribeUserIds!);
      }
      const { data: stallRows } = await q;
      const rows = (stallRows ?? []) as Omit<StallCard, 'username'>[];
      if (rows.length === 0) { if (alive) setCards([]); return; }

      const ownerIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profileRows } = await supabase
        .from('public_profiles' as any)
        .select('user_id, username, display_name')
        .in('user_id', ownerIds);
      const profileByOwner = new Map<string, { username: string | null; display_name: string | null }>(
        ((profileRows ?? []) as { user_id: string; username: string | null; display_name: string | null }[]).map((p) => [
          p.user_id,
          { username: p.username, display_name: p.display_name },
        ]),
      );

      if (alive) {
        setCards(rows.map((r) => ({
          ...r,
          username: profileByOwner.get(r.user_id)?.username ?? null,
          displayName: profileByOwner.get(r.user_id)?.display_name ?? null,
        })));
      }
    })();
    return () => { alive = false; };
  }, [chip, tribeMine, tribeUserIds]);

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
            StallInteriorView (StallSideNav / image / StallTodayPanel) --
            the front image fills whatever height remains under the chips/
            search/✕ row (in flow now, not overlaid -- see below), object-
            contain, same as the interior's own image. No stall interior is
            open here, so onNavigate is a no-op. */}
        <StallSideNav
          onNavigate={() => {}}
          className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-r lg:border-amber-500/15"
        />

        <div className="flex-1 min-h-0 min-w-0 flex flex-col lg:bg-[#140c06]">
          {/* My Tribe's "My village" hotspot arrives with ?tribe=mine --
              shown as a dismissible badge rather than silently narrowing
              the feed with no indication why, or trapping the visitor in
              a filtered view they can't back out of without reloading. */}
          {tribeMine && (
            <div className="shrink-0 flex items-center gap-2 px-4 pt-3 lg:bg-[#140c06]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-200">
                My village
                <button type="button" onClick={() => setTribeMine(false)} aria-label="Clear My village filter" className="hover:text-amber-50">
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
          {/* Chips + search + ✕: in flow ABOVE the image at every size now
              (was lg:absolute over the image -- wrapping to two rows there
              was covering the top of the stall sign, the actual photo
              content visitors need to see; trading a few px of image
              height for a chrome row that never hides anything is the
              right call here). min-w-0 on this row AND the middle column
              above it -- without both, the nested flex chain refuses to
              shrink the chip strip below its own min-content width (the
              classic flexbox overflow bug), which previously pushed the ✕
              button off the right edge on mobile; still needed now that
              the row is in-flow rather than absolute. */}
          <div className="shrink-0 min-w-0 flex items-center gap-2 px-4 py-3 lg:bg-[#140c06] lg:border-b lg:border-amber-500/15">
            {/* Chips -- hidden on mobile only while the search input is
                expanded (no room for both at that width); always shown on
                desktop regardless of the mobile-only toggle state. */}
            <div className={`flex-1 min-w-0 flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mobileSearchOpen ? 'max-lg:hidden' : ''}`}>
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

            {/* Search -- desktop: always an icon+input pill, left of ✕.
                Mobile: a bare 🔍 icon that expands into the same pill
                (replacing the chip row above while open) with its own
                collapse ✕, which also clears the query. */}
            <div className="lg:hidden shrink-0">
              {mobileSearchOpen ? (
                <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5">
                  <Search className="h-4 w-4 shrink-0 text-white/70" />
                  <input
                    type="search"
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={chip === 'orchard' ? "Search orchards…" : "Search stalls…"}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { setMobileSearchOpen(false); setSearch(''); }}
                    aria-label="Close search"
                    className="shrink-0 text-white/70 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  aria-label="Search stalls"
                  className="flex items-center justify-center rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="hidden lg:flex items-center gap-1.5 shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-amber-300" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={chip === 'orchard' ? "Search orchards…" : "Search stalls…"}
                className="w-36 bg-transparent text-sm text-amber-100 placeholder:text-amber-300/50 outline-none"
              />
            </div>

            {/* Hidden (not unmounted) on mobile while search is expanded --
                CSS-only so it's unconditionally back at lg: regardless of
                that mobile-only toggle's state. */}
            <button
              type="button"
              onClick={() => navigate('/cockpit')}
              aria-label="Close"
              title="Back to Cockpit"
              className={`shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-white hover:bg-black/70 lg:bg-amber-500/10 lg:text-amber-300 lg:border lg:border-amber-500/25 lg:hover:bg-amber-500/20 transition-colors ${mobileSearchOpen ? 'max-lg:hidden' : ''}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {chip === 'orchard' ? (
            orchardCards === null ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : orchardCards.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
                No orchards growing yet — check back soon.
              </div>
            ) : filteredOrchards && filteredOrchards.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
                No orchards match “{search.trim()}”.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory">
                {(filteredOrchards ?? []).map((o) => (
                  <article key={o.id} className="snap-start h-[calc(100dvh-8rem)] lg:h-full relative overflow-hidden">
                    <SeedCard
                      variant="feed"
                      id={o.id}
                      kind="orchard"
                      title={o.title}
                      subtitle={o.description}
                      cover={o.main_image ?? o.images?.[0] ?? null}
                      images={o.images ?? undefined}
                      videoUrl={o.video_url ?? undefined}
                      ownerId={o.user_id}
                      ownerName={o.grower_name}
                      price={o.pocket_bestow ?? o.pocket_price ?? 2}
                      openPath={`/orchard/${o.id}`}
                    />
                  </article>
                ))}
              </div>
            )
          ) : cards === null ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pinnedOrderedCards && pinnedOrderedCards.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
              {search.trim() ? (
                <>No stalls match "{search.trim()}".</>
              ) : tribeMine ? (
                <>No one in your village has a stall yet — invite someone or follow a member to grow it.</>
              ) : (
                <>No stalls here yet — check back soon, or{' '}
                  {user && <Link to="/stall/build" className="underline ml-1">build your own</Link>}
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory">
              {(pinnedOrderedCards ?? []).map((card) => (
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
                      size now (no room in a 40px bar). "New seeds" pill
                      (gold, hidden at 0) leads, then category badge (the
                      STALL_CATEGORIES label, singular -- not CHIPS' own
                      pluralized filter label) and tier -- all shrink-0 so
                      the name truncates first if space is tight. Floats
                      over the image instead of eating into its height,
                      same treatment at every breakpoint now. */}
                  <button
                    type="button"
                    onClick={() => openStall(card)}
                    className="absolute bottom-0 left-0 right-0 z-10 h-10 lg:h-12 px-4 flex items-center gap-2 text-left bg-gradient-to-t from-black/80 to-transparent lg:bg-[#140c06] lg:border-t lg:border-amber-500/15"
                  >
                    <h2 className="flex-1 min-w-0 font-bold text-sm truncate text-white lg:text-amber-50">{card.name}</h2>
                    {(newSeedInfo.get(card.user_id)?.total ?? 0) > 0 && (
                      <span className="shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5 bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950">
                        🌱 {newSeedInfo.get(card.user_id)!.total} new seed{newSeedInfo.get(card.user_id)!.total === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5 bg-white/15 text-white lg:bg-amber-500/10 lg:text-amber-300">
                      {CATEGORY_LABEL[card.category]}
                    </span>
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
