import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { AppContextProvider, useAppContext } from "../contexts/AppContext";
import { VoiceCommands } from "../components/voice/VoiceCommands";
import { useContainImageRect } from "@/hooks/useContainImageRect";
import StallJoinSheet from "@/components/stalls/StallJoinSheet";

// Index.tsx is imported eagerly (src/routes/AppRoutes.tsx's page barrel,
// not behind React.lazy itself, unlike most other routes) -- a static
// SeedCard import here would pull its whole dependency graph into the
// main bundle for every single page load, not just this one. It's
// normally its own ~510kB chunk (confirmed via a build before this
// change); lazy() here keeps it that way.
const SeedCard = lazy(() => import("@/components/seeds/SeedCard"));

const STALLS_BASE = "https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls";
const DAVISON = { id: "04754d57-d41d-4ea7-93df-542047a6785b", username: "davison.taljaard" };
const AMBER = { id: "c34c0eba-0010-480b-8326-7063cd7221ae", username: "amberswheeles" };
const ED = { id: "110b5a23-ce07-45c8-a432-086550aa78b5", username: "primitivevsns" };
const CLAYROSES = { id: "b0e9cd73-56a1-48ef-b0f1-3b68ee09d8b1", username: "infoclayroses" };
// Last-resort fallback only -- used when BOTH the ClayRoses "The
// Journey" lookup and the Davison-newest-cover fallback query fail
// (network/RLS error, not just "row not found", which its own query
// already falls through past). Davison's own real music product, not a
// mock -- see the runtime query effect below for why this is the
// fallback of last resort rather than the default.
const DAVISON_SEED = {
  id: "9af96ac8-9029-43db-8a5b-78ba1369915c",
  title: "the true fast",
  subtitle: "lyricist: davison",
  cover: "/__l5e/assets-v1/79a8b712-6713-4560-bafb-8ed3278973d7/7fe0fb45-316d-46dd-b83c-e135c1162498.png",
  price: 2,
  ownerId: DAVISON.id,
  ownerName: "Davison",
  openPath: `/stall/${DAVISON.username}`,
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

interface GardenCard {
  user_id: string;
  username: string | null;
  name: string;
  front_image_path: string;
}

const LANDING_HERO_FRONT = `${STALLS_BASE}/landing/hero-front.webp`;
const LANDING_HERO_INTERIOR = `${STALLS_BASE}/landing/hero-interior.webp`;
const LANDING_GARDENS_BG = `${STALLS_BASE}/landing/gardens.webp`;

// Measured directly off the real hero-interior photo's 4 blank plaques
// (column/row brightness profiling -- max chord width at each plaque's
// own vertical center, not assumed) -- x/y/w/h are percentages of the
// image's own natural size, same convention stalls.hotspots uses, so
// they're correct regardless of the image's final rendered size/
// letterboxing. Left to right per the task's own labels.
const DEMO_HOTSPOTS: { label: string; x: number; y: number; w: number; h: number }[] = [
  { label: "BOOKS", x: 22.4, y: 78.4, w: 11.6, h: 16.7 },
  { label: "MUSIC", x: 36.9, y: 78.4, w: 11.6, h: 16.7 },
  { label: "CRAFTS", x: 51.5, y: 78.4, w: 11.6, h: 16.7 },
  { label: "SERVICES", x: 65.9, y: 78.4, w: 11.6, h: 16.7 },
];

/**
 * The hero's "tap to step inside" destination -- a fictional flagship
 * stall (no real owner/products behind it, unlike every other stall this
 * page links to), so every one of its 4 hotspots does the same thing:
 * open the join sheet. Deliberately NOT StallInteriorView -- that
 * component expects a real ownerId and resolves each hotspot's kind to a
 * real StallHotspotSheet query, neither of which apply here. Same dual-
 * tree structure (portrait pannable with plain %-positioned hotspots,
 * landscape/desktop object-contain with useContainImageRect-positioned
 * ones) as StallInteriorView for the same reason it's needed there.
 */
function DemoInteriorView({ onClose, onHotspotTap }: { onClose: () => void; onHotspotTap: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);
  const mobileImgRef = useRef<HTMLImageElement>(null);
  const panScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = panScrollRef.current;
    const img = mobileImgRef.current;
    if (!scrollEl) return;
    const center = () => { scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2; };
    if (img && !img.complete) {
      img.addEventListener("load", center, { once: true });
      return () => img.removeEventListener("load", center);
    }
    center();
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const hotspotButtonClass =
    "absolute outline-none flex items-center justify-center rounded-full border border-amber-300/50 bg-black/10 hover:bg-amber-500/20 transition-colors";

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden max-lg:portrait:overflow-y-auto">
      {/* Portrait mobile */}
      <div className="hidden max-lg:portrait:flex flex-col w-full">
        <div className="sticky top-0 z-20 h-[48px] flex items-center justify-between gap-2 px-4 bg-[#0d0805]/95 backdrop-blur-sm border-b border-amber-500/15">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-white/70">sow2grow flagship</span>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 flex items-center justify-center rounded-full p-2 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative w-full h-[calc(100dvh-48px)]">
          <div
            ref={panScrollRef}
            className="relative w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="relative h-full w-max mx-auto snap-center">
              <img ref={mobileImgRef} src={LANDING_HERO_INTERIOR} alt="sow2grow flagship interior" className="block h-full w-auto max-w-none" />
              {DEMO_HOTSPOTS.map((h) => (
                <button
                  key={h.label}
                  type="button"
                  aria-label={h.label}
                  onClick={onHotspotTap}
                  className={hotspotButtonClass}
                  style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%`, minWidth: 44, minHeight: 44 }}
                >
                  <span className="text-[10px] font-bold tracking-wide text-amber-100 drop-shadow">{h.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Landscape phone/tablet + desktop */}
      <div className="relative flex-1 min-h-0 max-lg:portrait:hidden flex">
        <div ref={containerRef} className="relative flex-1 min-h-0">
          <img ref={imgRef} src={LANDING_HERO_INTERIOR} alt="sow2grow flagship interior" className="absolute inset-0 w-full h-full object-contain" />
          {rect && DEMO_HOTSPOTS.map((h) => (
            <button
              key={h.label}
              type="button"
              aria-label={h.label}
              onClick={onHotspotTap}
              className={hotspotButtonClass}
              style={{
                left: rect.offsetX + (h.x / 100) * rect.width,
                top: rect.offsetY + (h.y / 100) * rect.height,
                width: (h.w / 100) * rect.width,
                height: (h.h / 100) * rect.height,
              }}
            >
              <span className="text-xs font-bold tracking-wide text-amber-100 drop-shadow">{h.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="absolute bottom-3 left-4 text-xs font-semibold uppercase tracking-wide text-white/80 drop-shadow">
            sow2grow flagship
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A stall front image, pannable-sideways on portrait phones (same
 * height=container/width=auto/overflow-x-auto technique StallsFeedPage's
 * cards and StallInteriorView's own pannable interior use -- a wide
 * landscape photo squeezed into a portrait box via object-contain is the
 * exact "sign unreadable" problem that batch already fixed elsewhere;
 * reused here rather than reinvented). Landscape phones/tablets and
 * desktop stay plain object-contain, never cropped.
 */
function StallImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  // Every caller wraps this in its own position:relative box and passes
  // `className="absolute inset-0"` to fill it -- no hardcoded "relative"
  // default here. Tailwind's own utilities.css orders position classes
  // static/fixed/absolute/relative/sticky, so a combined "relative
  // absolute inset-0" string would have relative win the cascade
  // regardless of attribute order, collapsing this wrapper to its
  // (empty) intrinsic height instead of actually filling the parent --
  // caught via Playwright screenshot (two of three "three steps" cards
  // rendered as blank black boxes), not assumed from the markup looking right.
  return (
    <div className={className}>
      <div
        data-pan-scroll
        className="hidden max-lg:portrait:block relative w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="relative h-full w-max mx-auto snap-center">
          <img
            src={src}
            alt={alt}
            onLoad={(e) => {
              const scrollEl = e.currentTarget.closest("[data-pan-scroll]") as HTMLDivElement | null;
              if (scrollEl) scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2;
            }}
            className="block h-full w-auto max-w-none"
          />
        </div>
      </div>
      <img src={src} alt={alt} className="max-lg:portrait:hidden absolute inset-0 w-full h-full object-contain" />
    </div>
  );
}

/** "paint your front" / "paint your inside" -- a real stall photo, a one-line caption, tapping it opens the real guest-mode StallInteriorView (StallVisitPage already handles this, no ProtectedRoute -- see the invite-link batch). */
function StepCard({ image, title, line, href }: { image: string; title: string; line: string; href: string }) {
  return (
    <Link to={href} className="block rounded-2xl border border-amber-500/20 bg-black/30 p-4 hover:border-amber-500/40 transition-colors">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
        <StallImage src={image} alt={title} className="absolute inset-0" />
      </div>
      <h3 className="mt-3 font-serif text-lg font-semibold text-amber-100">{title}</h3>
      <p className="mt-1 text-xs text-amber-100/60">{line}</p>
    </Link>
  );
}

function IndexContent() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [showVoiceCommands, setShowVoiceCommands] = useState(false);
  const { voiceCommandsEnabled, setVoiceCommandsEnabled } = useAppContext();
  const [gardenCards, setGardenCards] = useState<GardenCard[] | null>(null);
  const [showDemoInterior, setShowDemoInterior] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [featuredSeed, setFeaturedSeed] = useState<FeaturedSeed | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/cockpit", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  // "sow your seeds": ClayRoses' "The Journey" (products.sower_id ->
  // sowers.id -> sowers.user_id = CLAYROSES.id, title exact match) --
  // queried at runtime, not hardcoded, so it stays correct as the real
  // row changes (title/cover/price) without a code edit. Falls back to
  // Davison's own music product with the newest updated_at (his most
  // recently touched cover) if "The Journey" isn't found, and to the
  // fully hardcoded DAVISON_SEED only if BOTH queries themselves fail
  // (network/RLS error -- sowers/products are both anon-readable, same
  // as StallHotspotSheet's own guest-facing lookups, so this page works
  // signed out).
  useEffect(() => {
    let alive = true;
    const applyDavisonFallback = () => {
      if (!alive) return;
      const { id, title, subtitle, cover, price, ownerId, ownerName, openPath } = DAVISON_SEED;
      setFeaturedSeed({ id, title, subtitle, cover, price, ownerId, ownerName, openPath });
    };

    (async () => {
      try {
        const { data: clayRosesSower } = await supabase
          .from("sowers")
          .select("id")
          .eq("user_id", CLAYROSES.id)
          .maybeSingle();
        if (clayRosesSower?.id) {
          const { data: journeyRows } = await supabase
            .from("products")
            .select("id, title, cover_image_url, price")
            .eq("sower_id", clayRosesSower.id)
            .eq("title", "The Journey")
            .limit(1);
          const journey = (journeyRows ?? [])[0] as { id: string; title: string; cover_image_url: string | null; price: number | null } | undefined;
          if (journey) {
            if (alive) setFeaturedSeed({
              id: journey.id,
              title: journey.title,
              subtitle: "ClayRoses",
              cover: journey.cover_image_url,
              price: Number(journey.price || 0),
              ownerId: CLAYROSES.id,
              ownerName: "ClayRoses",
              openPath: `/stall/${CLAYROSES.username}#stall-kind=music`,
            });
            return;
          }
        }

        // "The Journey" not found -- fall back to Davison's own music,
        // newest cover (updated_at) first.
        const { data: davisonSower } = await supabase
          .from("sowers")
          .select("id")
          .eq("user_id", DAVISON.id)
          .maybeSingle();
        if (davisonSower?.id) {
          const { data: davisonRows } = await supabase
            .from("products")
            .select("id, title, cover_image_url, price")
            .eq("sower_id", davisonSower.id)
            .eq("type", "music")
            .order("updated_at", { ascending: false })
            .limit(1);
          const track = (davisonRows ?? [])[0] as { id: string; title: string; cover_image_url: string | null; price: number | null } | undefined;
          if (track) {
            if (alive) setFeaturedSeed({
              id: track.id,
              title: track.title,
              subtitle: "lyricist: davison",
              cover: track.cover_image_url,
              price: Number(track.price || 0),
              ownerId: DAVISON.id,
              ownerName: "Davison",
              openPath: `/stall/${DAVISON.username}`,
            });
            return;
          }
        }

        applyDavisonFallback();
      } catch {
        applyDavisonFallback();
      }
    })();
    return () => { alive = false; };
  }, []);

  // "walk the gardens": same card list StallsFeedPage's own "For You"
  // query uses (published, has a front image, newest first), just
  // capped to 6 and with no chip/search UI -- a guest tapping any card
  // lands on the real /stall/:username (front + interior, read-only,
  // any painted button prompts the join sheet).
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: stallRows } = await supabase
        .from("stalls")
        .select("user_id, name, front_image_path")
        .eq("published", true)
        .not("front_image_path", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);
      const rows = (stallRows ?? []) as Omit<GardenCard, "username">[];
      if (rows.length === 0) { if (alive) setGardenCards([]); return; }

      // profiles_public (NOT public_profiles -- that view is granted to
      // `authenticated` only, confirmed live; this page is the one place
      // in the app a signed-OUT visitor needs a batch username lookup,
      // same anon-safe view StallVisitPage/api/stall.ts's single-row
      // lookups already rely on).
      const ownerIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profileRows } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username")
        .in("user_id", ownerIds);
      const usernameByOwner = new Map<string, string | null>(
        ((profileRows ?? []) as { user_id: string; username: string | null }[]).map((p) => [p.user_id, p.username]),
      );
      if (alive) setGardenCards(rows.map((r) => ({ ...r, username: usernameByOwner.get(r.user_id) ?? null })));
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#140c06]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500" />
      </div>
    );
  }
  if (isAuthenticated) return null; // being redirected to /cockpit

  return (
    <div className="min-h-screen bg-[#140c06] text-amber-50">
      {/* 1. Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-amber-500/15 bg-[#140c06]/95 backdrop-blur-sm px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/s2g-logo.webp"
            alt="sow2grow"
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
          />
          <span className="font-serif text-lg sm:text-xl font-semibold text-amber-50">sow2grow</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/login" className="text-sm text-amber-100/80 hover:text-amber-100 transition-colors">login</Link>
          <Link
            to="/signup"
            className="rounded-full bg-amber-500 px-3.5 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            open my stall
          </Link>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="px-4 py-10 sm:px-8 sm:py-16 text-center">
        <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-amber-50">
          your own shop. your own style.
        </h1>
        <p className="mt-3 text-sm sm:text-lg text-amber-100/70 max-w-xl mx-auto">
          your books, music, crafts and services — behind your own doors.
        </p>

        {/* Same "the stall is the frame" 3-panel composition as the Stalls
            feed, decorative here (no real nav content -- this is a public,
            logged-out page, and StallSideNav/StallTodayPanel are both
            signed-in-only surfaces) purely for the visual frame. The
            flagship front/interior are their own dedicated landing photos
            (stalls bucket, landing/hero-front.webp + landing/hero-
            interior.webp) -- not a real member's stall, so tapping it
            opens DemoInteriorView (below) rather than navigating to a
            /stall/:username that doesn't exist. */}
        <button type="button" onClick={() => setShowDemoInterior(true)} className="mt-8 flex justify-center w-full">
          <div className="hidden lg:block w-[140px] shrink-0 rounded-l-2xl border border-r-0 border-amber-500/15 bg-black/30" />
          <div className="relative w-full max-w-4xl aspect-[4/3] sm:aspect-[16/9] overflow-hidden border border-amber-500/20 bg-black">
            <StallImage src={LANDING_HERO_FRONT} alt="sow2grow flagship stall" className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent pb-3 pt-10 sm:pb-4">
              <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs sm:text-sm font-medium text-amber-100">
                tap to step inside
              </span>
            </div>
          </div>
          <div className="hidden lg:block w-[140px] shrink-0 rounded-r-2xl border border-l-0 border-amber-500/15 bg-black/30" />
        </button>

        <Link
          to="/signup"
          className="mt-6 inline-block rounded-full bg-amber-500 px-8 py-3 text-base font-semibold text-amber-950 hover:bg-amber-400 transition-colors"
        >
          open my stall
        </Link>
      </section>

      {/* 3. three steps */}
      <section className="px-4 py-10 sm:px-8 sm:py-16">
        <h2 className="text-center font-serif text-2xl sm:text-3xl font-semibold text-amber-50">three steps</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          <StepCard
            image={`${STALLS_BASE}/${AMBER.id}/front.webp`}
            title="paint your front"
            line="pick a photo, give it a sign."
            href={`/stall/${AMBER.username}`}
          />
          <StepCard
            image={`${STALLS_BASE}/${ED.id}/interior.webp`}
            title="paint your inside"
            line="a room for your books, music and more."
            href={`/stall/${ED.username}`}
          />
          <div className="rounded-2xl border border-amber-500/20 bg-black/30 p-4">
            <h3 className="font-serif text-lg font-semibold text-amber-100">sow your seeds</h3>
            <p className="mt-1 mb-3 text-xs text-amber-100/60">list what you're offering — a book, a song, a service.</p>
            {/* forceViewerIsOwner: this is a demo card, not a real
                interaction -- SeedCard already renders the rail greyed
                (not hidden) for the "owner viewing their own card" case,
                exactly the look a pure illustration wants here. */}
            {featuredSeed ? (
              <Suspense fallback={<div className="aspect-square rounded-xl bg-black/40 animate-pulse" />}>
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
              <div className="aspect-square rounded-xl bg-black/40 animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {/* 4. walk the gardens -- full-bleed market-street photo behind the
          real stall-front row, dark scrim so the cards/text stay
          readable over whatever's busy in the background photo. */}
      <section className="relative px-4 py-10 sm:px-8 sm:py-16 overflow-hidden">
        <img src={LANDING_GARDENS_BG} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative">
          <h2 className="text-center font-serif text-2xl sm:text-3xl font-semibold text-amber-50">walk the gardens</h2>
          <p className="mt-2 text-center text-sm text-amber-100/60">real stalls, sown by real members.</p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {(gardenCards ?? []).filter((c) => c.username).map((c) => (
              <Link
                key={c.user_id}
                to={`/stall/${c.username}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-amber-500/25 bg-black"
              >
                <img src={c.front_image_path} alt={c.name} className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="truncate text-xs font-medium text-amber-50">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. you keep your price */}
      <section className="px-4 py-10 sm:px-8 sm:py-16 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-amber-50">you keep your price</h2>
        <div className="mt-6 max-w-xl mx-auto space-y-3 text-sm sm:text-base text-amber-100/80">
          <p>buyers pay your price; sow2grow adds 15% on top, never takes from it</p>
          <p>paid out to paypal, usdc or card/eft</p>
          <p>chat, calls, live rooms and radio built in — no email needed</p>
        </div>
      </section>

      {/* 6. Final band */}
      <section className="px-4 py-10 sm:px-8 sm:py-16 text-center border-t border-amber-500/15">
        <Link
          to="/signup"
          className="inline-block rounded-full bg-amber-500 px-8 py-3 text-base font-semibold text-amber-950 hover:bg-amber-400 transition-colors"
        >
          open my stall
        </Link>
        <p className="mt-4 text-sm text-amber-100/60">
          already a member?{" "}
          <Link to="/login" className="underline hover:text-amber-100">login</Link>
        </p>
      </section>

      <footer className="px-4 py-6 text-center text-xs text-amber-100/40 border-t border-amber-500/10">
        364yhvh community farm
      </footer>

      <VoiceCommands
        isEnabled={voiceCommandsEnabled}
        onToggle={() => setVoiceCommandsEnabled(!voiceCommandsEnabled)}
        isOpen={showVoiceCommands}
        onOpenChange={setShowVoiceCommands}
      />

      {showDemoInterior && (
        <DemoInteriorView
          onClose={() => setShowDemoInterior(false)}
          onHotspotTap={() => setShowJoinSheet(true)}
        />
      )}
      {/* Renders on top of DemoInteriorView (z-[10000]/[10001] vs its
          z-[9999]) rather than closing it -- same "sheet floats over the
          still-open interior" behaviour StallInteriorView itself uses. */}
      {showJoinSheet && (
        <StallJoinSheet stallName="the sow2grow flagship" onClose={() => setShowJoinSheet(false)} />
      )}
    </div>
  );
}

const Index = () => (
  <AppContextProvider>
    <IndexContent />
  </AppContextProvider>
);

export default Index;
