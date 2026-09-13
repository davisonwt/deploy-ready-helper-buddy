import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import StallSideNav from './StallSideNav';
import StallTodayPanel from './StallTodayPanel';
import { StallDrawer } from './StallInteriorView';

// Lazy for the same reason Index.tsx's own SeedCard import is lazy -- keep
// its ~510kB chunk out of the main bundle for every page load.
const SeedCard = lazy(() => import('@/components/seeds/SeedCard'));

const STALLS_BASE = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls';
const EMPTY_PLOT_IMG = `${STALLS_BASE}/landing/empty-plot.webp`;
// Same illustrative real stalls/seed Index.tsx (the logged-out landing
// page) already uses for its own "three steps" cards -- not mock data.
const AMBER = { id: 'c34c0eba-0010-480b-8326-7063cd7221ae', username: 'amberswheeles' };
const ED = { id: '110b5a23-ce07-45c8-a432-086550aa78b5', username: 'primitivevsns' };
// 2026-09-13: this exact URL was showing Ed's OLD portrait interior --
// the object at this path has since been replaced, but browsers/CDN had
// the stale bytes cached against the bare URL. Cache-busting query param
// forces a fresh fetch without touching the (already-correct) path.
const ED_INTERIOR_IMG = `${STALLS_BASE}/${ED.id}/interior.webp?v=20260913`;
const CLAYROSES_USER_ID = 'b0e9cd73-56a1-48ef-b0f1-3b68ee09d8b1';
const DAVISON_SEED = {
  id: '9af96ac8-9029-43db-8a5b-78ba1369915c',
  title: 'the true fast',
  subtitle: 'lyricist: davison',
  cover: '/__l5e/assets-v1/79a8b712-6713-4560-bafb-8ed3278973d7/7fe0fb45-316d-46dd-b83c-e135c1162498.png',
  price: 2,
  ownerId: '04754d57-d41d-4ea7-93df-542047a6785b',
  ownerName: 'Davison',
  openPath: '/stall/davison.taljaard',
};

interface FeaturedSeed {
  id: string;
  title: string;
  subtitle: string;
  cover: string | null;
  price: number;
  ownerId: string;
  ownerName: string;
  openPath: string;
}

/** "sow your seeds" step card's illustration -- ClayRoses' real "The
 * Journey" product if it's still there, Davison's own hardcoded music
 * seed otherwise. Same two-tier fallback Index.tsx uses, simplified (one
 * query, not three) since this is a smaller illustrative need than the
 * public landing page's own hero. */
function useFeaturedSeed(): FeaturedSeed | null {
  const [seed, setSeed] = useState<FeaturedSeed | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: sower } = await supabase.from('sowers').select('id').eq('user_id', CLAYROSES_USER_ID).maybeSingle();
        if (sower?.id) {
          const { data: rows } = await supabase
            .from('products')
            .select('id, title, cover_image_url, price')
            .eq('sower_id', sower.id)
            .eq('title', 'The Journey')
            .limit(1);
          const journey = (rows ?? [])[0] as { id: string; title: string; cover_image_url: string | null; price: number | null } | undefined;
          if (journey && alive) {
            setSeed({
              id: journey.id, title: journey.title, subtitle: 'ClayRoses',
              cover: journey.cover_image_url, price: Number(journey.price || 0),
              ownerId: CLAYROSES_USER_ID, ownerName: 'ClayRoses',
              openPath: '/stall/infoclayroses#stall-kind=music',
            });
            return;
          }
        }
      } catch { /* fall through to the hardcoded fallback below */ }
      if (alive) setSeed(DAVISON_SEED);
    })();
    return () => { alive = false; };
  }, []);
  return seed;
}

function StepCard({ image, title, line, children }: { image?: string; title: string; line: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-black/40 p-4">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
        {children ?? (image && <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />)}
      </div>
      <h3 className="mt-3 font-serif text-base font-semibold text-amber-100">{title}</h3>
      <p className="mt-1 text-xs text-amber-100/60">{line}</p>
    </div>
  );
}

/**
 * First-run /cockpit page for a member with no stall yet (Flow v2 first-run
 * batch, 2026-09-13) -- replaces the old plain "Build your stall" dashed
 * card with a full-bleed "Your plot" page in the same gold-on-dark-wood
 * frame StallInteriorView uses (StallSideNav / StallTodayPanel reused
 * directly, not reimplemented), so a brand-new member's very first screen
 * already looks like the app they're about to build into, not a bare
 * placeholder.
 */
export default function EmptyPlotView() {
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isTodayDrawerOpen, setIsTodayDrawerOpen] = useState(false);
  const panScrollRef = useRef<HTMLDivElement>(null);
  const featuredSeed = useFeaturedSeed();

  useEffect(() => {
    const scrollEl = panScrollRef.current;
    if (!scrollEl) return;
    scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2;
  }, []);

  const stepCards = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
      <StepCard image={`${STALLS_BASE}/${AMBER.id}/front.webp`} title="paint your front" line="pick a photo, give it a sign." />
      <StepCard image={ED_INTERIOR_IMG} title="paint your inside" line="a room for your books, music and more." />
      <StepCard title="sow your seeds" line="list what you're offering — a book, a song, a service.">
        {featuredSeed ? (
          <Suspense fallback={<div className="absolute inset-0 bg-black/40 animate-pulse" />}>
            <SeedCard
              id={featuredSeed.id}
              kind="music"
              title={featuredSeed.title}
              subtitle={featuredSeed.subtitle}
              cover={featuredSeed.cover}
              ownerId={featuredSeed.ownerId}
              ownerName={featuredSeed.ownerName}
              price={featuredSeed.price}
              openPath={featuredSeed.openPath}
              forceViewerIsOwner
              hideSowerLine
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0 bg-black/40 animate-pulse" />
        )}
      </StepCard>
    </div>
  );

  const StartBuildingButton = () => (
    <Link
      to="/stall/build"
      className="inline-block rounded-full bg-amber-500 px-8 py-3 text-base font-semibold text-amber-950 hover:bg-amber-400 transition-colors"
    >
      start building
    </Link>
  );

  // The hero *is* the first screen: just the headline, sub line and button,
  // overlaid bottom-left over the full-height plot image on a soft dark
  // gradient -- nothing else competes for that first look.
  const heroOverlay = (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d0805] via-[#0d0805]/75 to-transparent px-5 pb-8 pt-24 sm:px-10 sm:pb-12">
      <div className="pointer-events-auto max-w-xl space-y-3">
        <h1 className="font-serif text-2xl sm:text-4xl font-bold text-amber-50 drop-shadow">your plot is ready</h1>
        <p className="text-sm sm:text-base text-amber-100/70">three steps and your shop is open</p>
        <StartBuildingButton />
      </div>
    </div>
  );

  // Below the fold, on the same dark-wood tone the rest of this frame
  // uses (#0d0805) -- the three step cards plus a second way to start,
  // reached by scrolling down from the hero.
  const belowFold = (
    <div className="bg-[#0d0805] px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {stepCards}
        <StartBuildingButton />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0d0805] flex flex-col overflow-hidden max-lg:portrait:overflow-y-auto">
      {/* Mobile portrait: pannable hero strip (same technique
          StallInteriorView's own portrait pan uses) up top, scrollable
          content stacked below it -- same composition StallInteriorView
          uses for its pan-image + StallTodayPanel(stacked). */}
      <div className="hidden max-lg:portrait:flex flex-col w-full">
        <div className="sticky top-0 z-20 h-[48px] flex items-center justify-between gap-2 px-4 bg-[#0d0805]/95 backdrop-blur-sm border-b border-amber-500/15">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            aria-label="Open menu"
            className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
          <img src="/s2g-logo.webp" alt="sow2grow" className="h-6 w-6 object-contain" />
          <button
            type="button"
            onClick={() => setIsTodayDrawerOpen(true)}
            aria-label="Open Today, Omer & Growth"
            className="shrink-0 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        {/* Hero: the whole first screen (viewport height minus the 48px
            sticky header above) -- pannable full-height image, headline/
            sub/button overlaid at the bottom. Step cards live below the
            fold, reached by scrolling down past this. */}
        <div className="relative w-full h-[calc(100dvh-48px)] shrink-0">
          <div
            ref={panScrollRef}
            className="relative w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="relative h-full w-max mx-auto snap-center">
              <img src={EMPTY_PLOT_IMG} alt="" className="block h-full w-auto max-w-none" />
            </div>
          </div>
          {heroOverlay}
        </div>

        {belowFold}
      </div>

      {/* Landscape phone/tablet + desktop: StallInteriorView's own
          3-column "the stall is the frame" composition, reused as-is. */}
      <div className="relative flex-1 min-h-0 max-lg:portrait:hidden flex">
        <StallSideNav
          onNavigate={() => {}}
          className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-r lg:border-amber-500/15"
        />

        <div className="relative flex-1 min-h-0 overflow-y-auto">
          {/* Hero: the whole first screen (100% of this column's own
              height, which is already the full viewport in this frame) --
              image object-contain, headline/sub/button overlaid at the
              bottom-left. Step cards are in belowFold, reached by
              scrolling down. */}
          <div className="relative h-full w-full bg-black">
            <img src={EMPTY_PLOT_IMG} alt="" className="absolute inset-0 w-full h-full object-contain" />
            {heroOverlay}
          </div>

          {belowFold}
        </div>

        {/* Nav/Today toggles -- siblings of the scrolling column above
            (not inside it), so they stay put on screen as the hero and
            step cards scroll past underneath. */}
        <button
          type="button"
          onClick={() => setIsTodayDrawerOpen(true)}
          aria-label="Open Today, Omer & Growth"
          className="lg:hidden absolute top-4 right-4 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsNavDrawerOpen(true)}
          aria-label="Open menu"
          className="lg:hidden absolute top-4 left-4 flex items-center justify-center rounded-full bg-black/50 p-2 text-amber-300 hover:bg-black/70 transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>

        <StallTodayPanel className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-l lg:border-amber-500/15" />
      </div>

      <StallDrawer side="left" open={isNavDrawerOpen} onClose={() => setIsNavDrawerOpen(false)}>
        <StallSideNav onNavigate={() => setIsNavDrawerOpen(false)} className="flex flex-col flex-1 min-h-0" />
      </StallDrawer>
      <StallDrawer side="right" open={isTodayDrawerOpen} onClose={() => setIsTodayDrawerOpen(false)}>
        <StallTodayPanel className="flex flex-col flex-1 min-h-0" />
      </StallDrawer>
    </div>
  );
}
