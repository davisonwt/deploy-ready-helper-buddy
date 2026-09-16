import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, ClipboardList, ImageIcon, DoorOpen, LayoutGrid, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import { shareStallLink } from '@/lib/referral';
import StallImageUpload, { type StallImageResult } from '@/components/stalls/StallImageUpload';
import StallPdfUpload, { type StallPdfResult } from '@/components/stalls/StallPdfUpload';
import HotspotEditor, { newHotspotId } from '@/components/stalls/HotspotEditor';
import MyProductsPage from '@/pages/MyProductsPage';
import MyS2GLibraryPage from '@/pages/MyS2GLibraryPage';
import ProfilePage from '@/pages/ProfilePage';
import SellerCredentialsPage from '@/pages/SellerCredentialsPage';
import SellerBusinessSettingsPage from '@/pages/SellerBusinessSettingsPage';

const BUILD_TABS = ['setup', 'products', 'library', 'profile', 'credentials', 'business'] as const;
type BuildTab = (typeof BUILD_TABS)[number];
import {
  STALL_CATEGORIES,
  TILE_KIND_DEFAULT_TARGET,
  MIN_HOTSPOTS,
  resolveStallHotspots,
  type StallCategory,
  type StallTile,
  type StallHotspot,
  type StallTemplate,
  type StallTemplatesByCategory,
} from '@/lib/stalls/stallTypes';

interface TileDraft {
  label: string;
  kind: StallTile['kind'];
  image: StallImageResult | null;
  customTarget: string;
}

function emptyTile(): TileDraft {
  return { label: '', kind: 'products', image: null, customTarget: '' };
}

function tileTarget(t: TileDraft): string {
  return t.kind === 'custom' ? t.customTarget.trim() : TILE_KIND_DEFAULT_TARGET[t.kind];
}

/** Live "how it'll actually look" preview for the shop-front step -- same
 * blurred-backdrop + object-contain + bottom name-bar treatment
 * StallsFeedPage's real feed cards use, not a plain thumbnail. */
function FrontCardPreview({ url, name }: { url: string; name: string }) {
  return (
    <div className="relative aspect-[4/3] w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-amber-500/25 bg-black shadow-lg">
      <img src={url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
      <div className="absolute inset-0 bg-black/20" />
      <img src={url} alt={name || 'Your stall'} className="absolute inset-0 w-full h-full object-contain" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
        <p className="truncate text-sm font-semibold text-amber-50">{name || 'Your stall'}</p>
      </div>
    </div>
  );
}

/** Live "where the painted buttons will land" preview for the interior
 * step -- same resolveStallHotspots() + useContainImageRect() positioning
 * StallInteriorView itself uses at render time, so what the sower sees
 * here is exactly what a visitor will see, template pick or fresh upload
 * alike. */
function InteriorHotspotPreview({ url, templates, hotspots: hotspotsOverride }: { url: string; templates: StallTemplatesByCategory | null; hotspots?: StallHotspot[] | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);
  const hotspots = resolveStallHotspots(url, hotspotsOverride, templates);

  return (
    <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-2xl border border-amber-500/25 bg-black shadow-lg">
      <img ref={imgRef} src={url} alt="Your stall interior" className="absolute inset-0 w-full h-full object-contain" />
      {rect && hotspots.map((h, i) => (
        <div
          key={h.id ?? `${h.kind}-${i}`}
          className="absolute rounded-lg border-2 border-amber-400/80 bg-amber-400/15 flex items-center justify-center"
          style={{
            left: rect.offsetX + (h.x / 100) * rect.width,
            top: rect.offsetY + (h.y / 100) * rect.height,
            width: (h.w / 100) * rect.width,
            height: (h.h / 100) * rect.height,
          }}
        >
          <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
            {h.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * "Build your stall" wizard (Farm-Stalls batch 1, item 3) --
 * category+name+tagline -> front image -> interior image -> 3-5 tiles ->
 * preview + publish. One stall per member (stalls.user_id UNIQUE) --
 * loads any existing row on mount so re-opening this page edits in place
 * rather than blocking on "you already have a stall".
 */
export default function StallBuildPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Flow v2 step 10: /my-products, /my-s2g-library, /profile, /seller/
  // credentials and /seller/business-settings redirect here with `?tab=`
  // so they land on the matching tab instead of always defaulting to Setup.
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<BuildTab>(() => {
    const requested = searchParams.get('tab');
    return (BUILD_TABS as readonly string[]).includes(requested ?? '') ? (requested as BuildTab) : 'setup';
  });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stallId, setStallId] = useState<string | null>(null);

  // Multi-category (2026-09-16): a stall can genuinely span more than one
  // category (books, music, faith teachings all together) -- stalls.categories
  // (text[]) is the source of truth now, stalls.category (single) is kept in
  // sync DB-side by a trigger for any reader this migration didn't touch.
  const [categories, setCategories] = useState<StallCategory[]>(['books_writing']);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [story, setStory] = useState('');
  const [storyPdf, setStoryPdf] = useState<StallPdfResult | null>(null);
  const [front, setFront] = useState<StallImageResult | null>(null);
  const [interior, setInterior] = useState<StallImageResult | null>(null);
  const [tiles, setTiles] = useState<TileDraft[]>([emptyTile(), emptyTile(), emptyTile()]);
  const [hotspots, setHotspots] = useState<StallHotspot[]>([]);
  // Which interior URL `hotspots` was last seeded from (template pre-mark
  // or a loaded stall row) -- lets the seeding effect below tell "this is
  // the same interior we already have boxes for" from "the sower just
  // changed the interior image, seed fresh" without re-seeding on every
  // unrelated re-render.
  const seededForUrl = useRef<string | null>(null);

  const [templates, setTemplates] = useState<StallTemplatesByCategory | null>(null);

  useEffect(() => {
    fetch('/stalls/templates/templates.json')
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => setTemplates(null));
  }, []);

  // Templates are keyed by a single category (templates.json's own shape) --
  // the first ticked category picks which template set the Front/Interior
  // steps offer, same as the old single-select behaviour for whichever
  // category used to be "the" one.
  const categoryTemplates: StallTemplate[] = templates?.[categories[0]] ?? [];

  // "template interiors ship with their boxes pre-marked": whenever the
  // interior image changes to a URL we haven't seeded boxes for yet, seed
  // from the matching template's own hotspots (if any) as an editable
  // starting point -- a fresh upload with no template match just starts
  // empty, prompting the sower to draw their own. Never overwrites boxes
  // already loaded from this stall's own saved row (seededForUrl is set
  // for the loaded interior_image_path on mount, above) or boxes the
  // sower has already started editing for THIS url.
  useEffect(() => {
    if (!interior?.url || !templates) return;
    if (seededForUrl.current === interior.url) return;
    const template = resolveStallHotspots(interior.url, null, templates);
    const isRealTemplateMatch = Object.values(templates).some((list) => list.some((t) => t.interior === interior.url && t.hotspots?.length));
    seededForUrl.current = interior.url;
    setHotspots(isRealTemplateMatch ? template.map((h) => ({ ...h, id: newHotspotId() })) : []);
  }, [interior?.url, templates]);

  // Keyed on user?.id, NOT the whole `user` object: useAuth's AuthProviderClass
  // hands out a brand-new `user` object reference on every onAuthStateChange
  // firing -- including a background TOKEN_REFRESHED (its own auto-refresh
  // ticker, or iOS Safari's visibility-change-triggered recheck when the tab
  // regains focus, e.g. returning from the native photo picker) -- even
  // though the signed-in member hasn't changed. Keying this effect on the
  // object itself re-ran it on every such event, re-fetching the stall row
  // and re-hydrating front/interior/etc. straight back to their last-SAVED
  // values -- silently reverting an in-progress edit (2026-09-13 bug report:
  // clearing the shop-front image, then the original reappearing). `id` is
  // a stable primitive for the same signed-in member for the whole session,
  // so this now only actually re-runs on a genuine sign-in/sign-out.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('stalls').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setStallId(data.id);
        const savedCategories = Array.isArray(data.categories) ? (data.categories as StallCategory[]) : [];
        setCategories(savedCategories.length > 0 ? savedCategories : [data.category]);
        setName(data.name ?? '');
        setTagline(data.tagline ?? '');
        setStory(data.story ?? '');
        if (data.story_pdf_path) {
          // Fixed upload path (StallPdfUpload always writes `${user.id}/story.pdf`) -- deterministic, no need to parse it back out of the URL.
          setStoryPdf({ url: data.story_pdf_path, storagePath: `${user.id}/story.pdf`, fileName: 'story.pdf' });
        }
        if (data.front_image_path) setFront({ url: data.front_image_path, storagePath: null });
        if (data.interior_image_path) setInterior({ url: data.interior_image_path, storagePath: null });
        const savedHotspots = Array.isArray(data.hotspots) ? (data.hotspots as StallHotspot[]) : [];
        if (savedHotspots.length > 0) {
          setHotspots(savedHotspots.map((h) => (h.id ? h : { ...h, id: newHotspotId() })));
          seededForUrl.current = data.interior_image_path ?? null;
        }
        const savedTiles = Array.isArray(data.tiles) ? data.tiles : [];
        if (savedTiles.length > 0) {
          setTiles(savedTiles.map((t: StallTile) => ({
            label: t.label ?? '',
            kind: t.kind ?? 'products',
            image: t.image_path ? { url: t.image_path, storagePath: null } : null,
            customTarget: t.kind === 'custom' ? (t.link_target ?? '') : '',
          })));
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const pathPrefix = user ? `${user.id}` : '';

  const validTiles = tiles.filter((t) => t.label.trim().length > 0 && tileTarget(t).length > 0);

  const canGoNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0 && categories.length > 0;
    if (step === 1) return !!front;
    if (step === 2) return !!interior;
    if (step === 3) return hotspots.length >= MIN_HOTSPOTS;
    return true;
  }, [step, name, categories.length, front, interior, hotspots.length]);

  const handlePublish = async () => {
    if (!user) return;
    if (!front || !interior) { toast.error('Add both a front and interior image first.'); return; }
    if (hotspots.length < MIN_HOTSPOTS) { toast.error(`Mark at least ${MIN_HOTSPOTS} shelves.`); return; }
    if (categories.length === 0) { toast.error('Pick at least one category.'); return; }

    // Captured before the upsert below sets stallId for good -- this is
    // the one moment "did a stall already exist when this page loaded"
    // is knowable, which is exactly "first time ever" (once set, every
    // future load of this page has a stallId, so the one-time toast
    // below can structurally never fire again for this account).
    const isFirstPublish = !stallId;

    setSubmitting(true);
    try {
      const tilesPayload: StallTile[] = validTiles.map((t) => ({
        label: t.label.trim(),
        kind: t.kind,
        image_path: t.image?.url ?? null,
        link_target: tileTarget(t),
      }));

      const { error } = await supabase.from('stalls').upsert(
        {
          user_id: user.id,
          categories,
          name: name.trim(),
          tagline: tagline.trim() || null,
          story: story.trim() || null,
          story_pdf_path: storyPdf?.url ?? null,
          front_image_path: front.url,
          interior_image_path: interior.url,
          tiles: tilesPayload,
          hotspots,
          published: true,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;

      if (isFirstPublish) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle();
        const username = (profile as { username?: string } | null)?.username;
        toast.success('your stall is open — share it', username ? {
          action: { label: 'Share my stall', onClick: () => { void shareStallLink(username, name.trim(), user.id); } },
          duration: 10_000,
        } : undefined);
      } else {
        toast.success('Your stall is open for business!');
      }
      navigate('/cockpit');
    } catch (err) {
      console.error('stall publish failed', err);
      toast.error(err instanceof Error ? err.message : 'Could not publish your stall. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const steps = [
    { title: 'Your stall', description: 'What kind of stall is this?', icon: <ClipboardList className="h-4 w-4" /> },
    { title: 'Shop front', description: 'The image visitors tap to walk in.', icon: <DoorOpen className="h-4 w-4" /> },
    { title: 'Interior', description: 'What they see once inside.', icon: <ImageIcon className="h-4 w-4" /> },
    { title: 'Mark your shelves', description: 'Tap each thing visitors can tap.', icon: <LayoutGrid className="h-4 w-4" /> },
    { title: 'Preview & publish', description: 'One last look before it goes live.', icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BuildTab)} className="max-w-4xl mx-auto px-4 py-6">
      {/* Flow v2 step 9: /stall/build absorbs the actual /my-products,
          /my-s2g-library and /profile CRUD UI (embedded wholesale below,
          not rebuilt) as sibling tabs alongside the existing 5-step
          wizard -- they're always-editable management panels, not
          sequential publish steps, so they sit outside WizardContainer's
          own step/Next/Back model rather than inside it. Orchards stay
          OUT of this (Owner Menu's own "My orchards" item, step 5).
          Step 10 adds Credentials/Business (seller settings) the same
          way and makes the whole thing `?tab=`-addressable for the
          redirects that now point here. */}
      <TabsList className="mb-4 flex-wrap h-auto">
        <TabsTrigger value="setup">Stall Setup</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="library">Library</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="credentials">Credentials</TabsTrigger>
        <TabsTrigger value="business">Business</TabsTrigger>
      </TabsList>

      <TabsContent value="setup" className="rounded-3xl border border-amber-500/20 bg-[#140c06] p-4 sm:p-6">
        <WizardContainer
          theme="stall"
          steps={steps}
          currentStep={step}
          onStepChange={setStep}
          title={stallId ? 'Edit your stall' : 'Build your stall'}
          description="A shop-front for your seeds, sower or whisperer — visitors tap in to browse."
          onCancel={() => navigate('/cockpit')}
          onSubmit={handlePublish}
          isSubmitting={submitting}
          canGoNext={canGoNext}
          submitLabel={stallId ? 'Save & publish' : 'Publish'}
        >
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block text-amber-100/80">Category</label>
            <p className="text-xs text-amber-100/50 mb-2">Tick as many as genuinely apply -- your stall shows up under each one.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STALL_CATEGORIES.map((c) => {
                const checked = categories.includes(c.id);
                return (
                  <Button
                    key={c.id}
                    type="button"
                    variant={checked ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={checked}
                    onClick={() => setCategories((prev) => (checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]))}
                    className={
                      checked
                        ? 'bg-amber-500 text-amber-950 border-amber-500 hover:bg-amber-400'
                        : 'border-amber-500/25 text-amber-100/70 hover:bg-amber-500/10'
                    }
                  >
                    {c.label}
                  </Button>
                );
              })}
            </div>
            {categories.length === 0 && (
              <p className="text-xs text-destructive mt-2">Pick at least one category.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-amber-100/80">Stall name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Davison — Lyricist and Writer" className="bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-amber-100/80">Tagline (optional)</label>
            <Textarea value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} rows={2} placeholder="Words that heal, songs that awaken." className="bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-amber-100/80">My Story (optional)</label>
            <p className="text-xs text-amber-100/50 mb-1.5">
              Shown under the MY STORY button inside your stall. Blank lines start a new paragraph.
              Type a line in ALL CAPS to make it a heading — everything renders exactly as typed, so write it the way you want it read.
            </p>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              maxLength={4000}
              rows={8}
              placeholder={"MY JOURNEY\n\nit started with a single song..."}
              className="bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30"
            />
            <p className="text-xs text-amber-100/50 mt-3 mb-1.5">
              Prefer a PDF instead? Upload one and it replaces the text above inside your stall.
            </p>
            <StallPdfUpload pathPrefix={pathPrefix} value={storyPdf} onChange={setStoryPdf} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <StallImageUpload
            pathPrefix={pathPrefix}
            mode="width"
            maxSize={1200}
            value={front}
            onChange={setFront}
            templates={categoryTemplates}
            templateField="front"
            label="Shop-front image"
            aspectClassName="aspect-square max-w-sm mx-auto"
          />
          {front && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-100/50">How it looks on a feed card</p>
              <FrontCardPreview url={front.url} name={name} />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <StallImageUpload
            pathPrefix={pathPrefix}
            mode="width"
            maxSize={1920}
            value={interior}
            onChange={setInterior}
            templates={categoryTemplates}
            templateField="interior"
            label="Interior image"
            aspectClassName="aspect-video"
          />
          {interior && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-100/50">Where the painted buttons will land</p>
              <InteriorHotspotPreview url={interior.url} templates={templates} hotspots={hotspots} />
            </div>
          )}
        </div>
      )}

      {step === 3 && interior && (
        <HotspotEditor imageUrl={interior.url} value={hotspots} onChange={setHotspots} />
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-serif text-lg font-semibold flex items-center gap-2 text-amber-100"><Store className="h-4 w-4" />{name}</h3>
            {tagline && <p className="text-sm text-amber-100/60 mt-1">{tagline}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-100/50">Front</p>
              {front && <FrontCardPreview url={front.url} name={name} />}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-100/50">Interior</p>
              {interior && <InteriorHotspotPreview url={interior.url} templates={templates} hotspots={hotspots} />}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2 text-amber-100/80">Tiles ({validTiles.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {validTiles.map((t, i) => (
                <div key={i} className="rounded-lg border border-amber-500/20 bg-black/30 p-2 text-center text-sm text-amber-100/80">{t.label}</div>
              ))}
            </div>
          </div>
        </div>
      )}
        </WizardContainer>
      </TabsContent>

      {/* [contain:layout] -- MyProductsPage/MyS2GLibraryPage/ProfilePage
          each render their own `fixed inset-0` decorative background
          layer, built for standalone-page use where that's harmless.
          Nested in a tab, an un-contained `fixed` element paints over the
          WHOLE viewport (including the TabsList above it), blocking
          clicks on every other tab. CSS containment makes this element
          the containing block for fixed/absolute descendants instead of
          the viewport -- confirmed via a real click-interception repro,
          not assumed. */}
      <TabsContent value="products" className="relative [contain:layout]">
        <MyProductsPage />
      </TabsContent>
      <TabsContent value="library" className="relative [contain:layout]">
        <MyS2GLibraryPage />
      </TabsContent>
      <TabsContent value="profile" className="relative [contain:layout]">
        <ProfilePage />
      </TabsContent>
      <TabsContent value="credentials" className="relative [contain:layout]">
        <SellerCredentialsPage />
      </TabsContent>
      <TabsContent value="business" className="relative [contain:layout]">
        <SellerBusinessSettingsPage />
      </TabsContent>
    </Tabs>
  );
}
