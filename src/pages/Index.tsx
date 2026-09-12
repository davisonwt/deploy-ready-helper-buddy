import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { AppContextProvider, useAppContext } from "../contexts/AppContext";
import { VoiceCommands } from "../components/voice/VoiceCommands";

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
// Davison's own real music product (products.sower_id -> sowers.id ->
// sowers.user_id = DAVISON.id) -- a real row, not a mock, per the task's
// own "a real SeedCard from Davison's music" ask.
const DAVISON_SEED = {
  id: "9af96ac8-9029-43db-8a5b-78ba1369915c",
  title: "the true fast",
  subtitle: "lyricist: davison",
  cover: "/__l5e/assets-v1/79a8b712-6713-4560-bafb-8ed3278973d7/7fe0fb45-316d-46dd-b83c-e135c1162498.png",
  price: 2,
};

interface GardenCard {
  user_id: string;
  username: string | null;
  name: string;
  front_image_path: string;
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

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/cockpit", { replace: true });
  }, [isAuthenticated, loading, navigate]);

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
            src="/lovable-uploads/a41a2c64-7483-43dc-90af-67a83994d6aa.png"
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
            signed-in-only surfaces) purely for the visual frame. */}
        <Link to={`/stall/${DAVISON.username}`} className="mt-8 flex justify-center">
          <div className="hidden lg:block w-[140px] shrink-0 rounded-l-2xl border border-r-0 border-amber-500/15 bg-black/30" />
          <div className="relative w-full max-w-4xl aspect-[4/3] sm:aspect-[16/9] overflow-hidden border border-amber-500/20 bg-black">
            <StallImage src={`${STALLS_BASE}/${DAVISON.id}/front.webp`} alt="Davison's stall" className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent pb-3 pt-10 sm:pb-4">
              <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs sm:text-sm font-medium text-amber-100">
                tap to step inside
              </span>
            </div>
          </div>
          <div className="hidden lg:block w-[140px] shrink-0 rounded-r-2xl border border-l-0 border-amber-500/15 bg-black/30" />
        </Link>

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
            <Suspense fallback={<div className="aspect-square rounded-xl bg-black/40 animate-pulse" />}>
              <SeedCard
                id={DAVISON_SEED.id}
                kind="music"
                title={DAVISON_SEED.title}
                subtitle={DAVISON_SEED.subtitle}
                cover={DAVISON_SEED.cover}
                ownerId={DAVISON.id}
                ownerName="Davison"
                price={DAVISON_SEED.price}
                openPath={`/stall/${DAVISON.username}`}
                forceViewerIsOwner
                hideSowerLine
              />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 4. walk the gardens */}
      <section className="px-4 py-10 sm:px-8 sm:py-16 bg-black/20">
        <h2 className="text-center font-serif text-2xl sm:text-3xl font-semibold text-amber-50">walk the gardens</h2>
        <p className="mt-2 text-center text-sm text-amber-100/60">real stalls, sown by real members.</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {(gardenCards ?? []).filter((c) => c.username).map((c) => (
            <Link
              key={c.user_id}
              to={`/stall/${c.username}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-amber-500/15 bg-black"
            >
              <img src={c.front_image_path} alt={c.name} className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="truncate text-xs font-medium text-amber-50">{c.name}</p>
              </div>
            </Link>
          ))}
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
    </div>
  );
}

const Index = () => (
  <AppContextProvider>
    <IndexContent />
  </AppContextProvider>
);

export default Index;
