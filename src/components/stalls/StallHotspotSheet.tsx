import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import StoryPdfViewer from './StoryPdfViewer';
import StoryEditSheet from './StoryEditSheet';
import SeedCard, { type SeedCardKind } from '@/components/seeds/SeedCard';
import { deleteRow } from '@/components/garden/seedCardBuilders';
import { toast } from 'sonner';
import { TILE_KINDS, type TileKind } from '@/lib/stalls/stallTypes';
import ShareSeedDialog from '@/components/share/ShareSeedDialog';
import { BOTTOM_CHROME_PADDING_STYLE } from '@/lib/layout/bottomChrome';

interface Props {
  ownerId: string;
  ownerName: string;
  kind: TileKind;
  /** The hotspot's own painted label (e.g. "Our Recipes", "Bee Facts") -- shown in the header/empty-state instead of the generic kind label, which is a fallback for when a hotspot has no label of its own. */
  label?: string;
  isOwner?: boolean;
  /** kind:'companion_info'|'passes'|'activate'|'reviews' only -- static body text, shown verbatim in place of the usual product query. */
  text?: string | null;
  onClose: () => void;
  /** Scrolls this item into view once its card mounts -- arriving back from a SeedCard Message action via the URL's one-time &seed=<id> (see StallInteriorView.tsx's readSeedIdFromHash). */
  scrollToItemId?: string | null;
  /**
   * "New seeds" (supabase/migrations/20260912140000_stall_visits.sql) --
   * the viewer's own last_seen_at for THIS stall, as of before the
   * current visit's own upsert ran (StallInteriorView reads it first,
   * then upserts -- passing it down here rather than re-querying avoids
   * a race where this sheet would otherwise see the just-upserted
   * now(), making every item look "not new"). Undefined/null (owner
   * viewing their own stall, or the visitor row genuinely doesn't exist
   * yet and StallInteriorView hasn't resolved a 14-day fallback) means
   * no item is marked new.
   */
  viewerCutoff?: string | null;
}

/** Which table an Item came from -- drives SeedCard's isProductRow (Heart/Whisperer are FK'd to products/orchards only) and whether a book has a real PDF to preview. */
type ItemSource = 'products' | 'sower_books' | 'dj_music_tracks';

interface Item {
  id: string;
  title: string;
  blurb: string;
  /** Full, untruncated description -- for SeedCard's inline detail overlay (tapBehavior='inline'). `blurb` above stays truncated for the card body. */
  description: string;
  cover: string | null;
  /** Multi-image gallery (products.image_urls) -- products-sourced items only. */
  imageUrls: string[] | null;
  price: number;
  source: ItemSource;
  fileUrl: string | null;
  previewUrl: string | null;
  /** Drives both the newest-first sort and each SeedCard's "New" badge (viewerCutoff comparison happens at render time, not here). */
  createdAt: string;
}

const SHEET_KIND_TO_SEED_KIND: Partial<Record<TileKind, SeedCardKind>> = {
  books: 'book',
  lyrics: 'book',
  music: 'music',
  mugs: 'seed',
  products: 'seed',
  services: 'seed',
};

const PDF_RE = /\.pdf(\?|$)/i;

/**
 * Where an item's real editor lives, or null when there isn't one.
 *
 * Returning null is the point: the services shelf is products with
 * type='service', and EditForm (/products/edit/:id) refuses those outright --
 * "This is a service listing. Manage it from My Listings" (EditForm.tsx:58).
 * Pointing Edit there would be offering an action that cannot be honoured,
 * so it is withheld and the menu simply does not show Edit on that shelf.
 */
function editPathForSource(source: ItemSource, id: string, kind: TileKind): string | null {
  if (kind === 'services') return null;
  if (source === 'products') return `/products/edit/${id}`;
  if (source === 'sower_books') return `/my-s2g-library?edit=${id}`;
  if (source === 'dj_music_tracks') return `/music-library?edit=${id}`;
  return null;
}

const KIND_LABEL: Partial<Record<TileKind, string>> = {
  books: 'Books & Research',
  music: 'Music & Videos',
  lyrics: 'Lyrics',
  story: 'My Story',
  mugs: 'Mugs',
  products: 'Products',
  services: 'Services',
};

const EMPTY_TEXT: Partial<Record<TileKind, string>> = {
  books: 'No books on the shelf yet',
  music: 'No music playing yet',
  lyrics: 'No lyrics written yet',
  story: 'Story still being written',
  mugs: 'No mugs on the table yet',
  products: 'No products on the shelf yet',
  services: 'No services listed yet',
};

/**
 * Where "Add one" sends the owner.
 *
 * This is a DEFAULTED lookup, not a fixed list, and that is the whole point:
 * sowers name their own shelves, so a shelf kind this file has never heard of
 * must still get a working "+" with no code change. The fallback mirrors the
 * item query above -- anything without its own branch is fetched with
 * `type in ('book','ebook')`, so a book is genuinely what that shelf lists and
 * the book form is genuinely where a new one comes from.
 *
 * Keep this in step with the typeFilter in the load effect. If a kind ever
 * gets its own query branch, give it a line here too.
 */
const ADD_ONE_PATH_BY_KIND: Partial<Record<TileKind, string>> = {
  music: '/sow/music',
  mugs: '/sow/product', // a category on the general Shop product form (products.category = 'mugs')
  products: '/sow/product', // general Shop product form (products.type = 'product')
  services: '/sow/hand', // the only form that writes products.type = 'service'
  books: '/sow/book',
  lyrics: '/sow/book', // a category on the same book form (products.category = 'lyrics')
};

/** The book form backs every shelf that has no query branch of its own. */
const ADD_ONE_FALLBACK = '/sow/book';

function addOnePathFor(kind: TileKind): string | null {
  if (STATIC_TEXT_KINDS.has(kind) || kind === 'story') return null;
  return ADD_ONE_PATH_BY_KIND[kind] ?? ADD_ONE_FALLBACK;
}

/**
 * Whether the bulk wizard can actually put seeds on THIS shelf.
 *
 * It writes products.type = 'product', so it only ever populates a shelf whose
 * query asks for that type. Offering it on a books or custom shelf would send
 * a member off to import a hundred rows that then do not appear where they
 * expected -- the same broken promise as pointing them at a form that rejects
 * them, so it is withheld instead. See editPathForSource's comment above for
 * the same rule applied to Edit.
 */
function bulkUploadAppliesTo(kind: TileKind): boolean {
  return kind === 'products' || kind === 'mugs';
}

/**
 * Bottom sheet opened by tapping a painted-interior hotspot -- styled to
 * feel like still being inside the stall (dark wood-tone panel, gold
 * hairline + serif title, cover-first cards), not a default app dialog.
 * Slides up/down in 200ms, 85vh, drag handle. Lists the
 * STALL OWNER's own published items of that kind (never the viewer's).
 *
 * Data sources (batch 2c correctness fixes over batch 2b's version):
 *   - books: products (type IN ('book','ebook'), category <> 'lyrics')
 *     UNION sower_books -- resolved via BOTH sowers.id and company_id
 *     (a stall owner can have either or both; MyProductsPage.tsx's own
 *     OR-across-both-links pattern, which batch 2b's version missed).
 *   - lyrics: products (type IN ('book','ebook'), category = 'lyrics') --
 *     lyrics are a category on the same book product type, not a
 *     separate products.type (that column has a CHECK constraint; adding
 *     a new type would need a migration, category needs none).
 *   - music: products (type = 'music') UNION dj_music_tracks (via
 *     radio_djs), deduped by normalized title -- a products row always
 *     wins a title that exists in both (see scripts/studio/
 *     music-duplicates.sql for the read-only audit this was checked
 *     against: 4 of one owner's 32 music products shared a title with
 *     one of their 25 dj_music_tracks rows).
 *   - story: stalls.story_pdf_path, if set, wins over stalls.story, which
 *     wins over profiles.bio (a story written for the stall vs. the
 *     general profile bio) -- no price/Bestow (not a purchasable item).
 *     A PDF renders in-app via StoryPdfViewer.tsx (pdf.js, page-by-page
 *     <canvas>, lazy as pages scroll into view) -- not an <iframe>, which
 *     the app's CSP frame-src blocks for the Supabase storage domain the
 *     PDF actually lives on. Same component on every platform. Text
 *     renders through renderStory(): blank-line-separated paragraphs, any
 *     line that is entirely upper-case becomes a gold serif heading. The
 *     text is lowercase by design in real use -- renderStory never
 *     changes case, only chooses paragraph vs. heading per line.
 *   - mugs: products (type = 'product', category = 'mugs'). `type` has a
 *     CHECK constraint with no 'merch' value (confirmed live against
 *     products_type_check) so, like lyrics, this is a category filter on
 *     an existing type rather than a new type needing a migration. Strict
 *     category = 'mugs' -- an owner's existing product under a different
 *     category (e.g. 'kitchenware') won't show here until recategorized
 *     via the Mugs quick-pick on /sow/product (see the Farm-Stalls batch
 *     2d audit for a real example of this).
 *   - products: products (type = 'product'), unfiltered by category --
 *     the general "everything for sale" bucket. Deliberately NOT excluding
 *     category = 'mugs': a stall with both a 'products' and a 'mugs'
 *     hotspot painted will show mugs under both (mugs is a narrower,
 *     opt-in view onto the same type, not a different one), which matches
 *     what a visitor tapping "Products" actually expects -- everything.
 *   - services: products (type = 'service') -- the only sow form that
 *     ever writes this type is /sow/hand (SowHandPage.tsx). Added
 *     2026-09-13 (scripts/studio/set-karoo-honey-hotspots.sql) alongside
 *     'products' above -- both TileKind values already existed (used by
 *     stall TILES, a different UI element with its own default-target
 *     routing) but had no hotspot-sheet data source until now; a hotspot
 *     painted with either kind before this fell through to the generic
 *     else branch below and silently showed books/ebooks instead.
 */
/** Companions Village phase 1: kinds whose sheet shows `text` verbatim instead of a product query. */
const STATIC_TEXT_KINDS = new Set<TileKind>(['companion_info', 'passes', 'activate', 'reviews', 'raise_hand', 'queue', 'gift']);

export default function StallHotspotSheet({ ownerId, ownerName, kind, label, text, isOwner, onClose, scrollToItemId, viewerCutoff }: Props) {
  // The sower's own name wins. Falling through to the raw `kind` would show a
  // visitor a database value -- "custom", "orchard" -- on any shelf whose owner
  // never named it, so the last resort is a human word instead.
  const displayLabel =
    label?.trim()
    || KIND_LABEL[kind]
    || TILE_KINDS.find((k) => k.id === kind)?.label
    || 'Shelf';
  // Owner "+": where a single new seed comes from, and whether the bulk
  // wizard can actually land seeds on this shelf. Both withheld rather than
  // offered-and-broken -- see addOnePathFor / bulkUploadAppliesTo.
  const addOne = addOnePathFor(kind);
  const showBulk = bulkUploadAppliesTo(kind);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  /** The seed whose Share dialog is open, if any. Owner and visitor alike. */
  const [shareItem, setShareItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  // undefined = still loading; null = loaded, nothing there; string = loaded, has content.
  const [bio, setBio] = useState<string | null | undefined>(undefined);
  const [storyPdfUrl, setStoryPdfUrl] = useState<string | null | undefined>(undefined);
  const [storyPhotoUrl, setStoryPhotoUrl] = useState<string | null | undefined>(undefined);
  const [editingStory, setEditingStory] = useState(false);
  const [visible, setVisible] = useState(false);
  const sheetNavigate = useNavigate();

  // Owner actions. Only ever wired when `isOwner` -- StallInteriorView passes
  // effectiveIsOwner, so a stall owner who is "viewing as visitor" gets the
  // visitor menu, and a real visitor never receives these handlers at all.
  const editPathFor = (item: Item) => editPathForSource(item.source, item.id, kind);

  const removeItem = async (item: Item) => {
    if (!isOwner) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      // deleteRow throws when zero rows are removed -- a delete that matches
      // nothing is not an error in PostgREST and would otherwise report
      // success while the seed stayed on the shelf.
      await deleteRow(supabase, item.source, item.id);
      setItems((prev) => (prev ? prev.filter((x) => x.id !== item.id) : prev));
      toast.success(`"${item.title}" deleted`);
    } catch (e) {
      toast.error(`Could not delete: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (STATIC_TEXT_KINDS.has(kind)) { setItems([]); return; }
      if (kind === 'story') {
        const { data: stallRow } = await supabase.from('stalls').select('story, story_pdf_path, story_photo_path').eq('user_id', ownerId).maybeSingle();
        const row = stallRow as { story?: string | null; story_pdf_path?: string | null; story_photo_path?: string | null } | null;
        if (alive) setStoryPdfUrl(row?.story_pdf_path ?? null);
        if (alive) setStoryPhotoUrl(row?.story_photo_path ?? null);

        const story = row?.story;
        if (story && story.trim()) {
          if (alive) setBio(story);
          return;
        }
        const { data } = await supabase.from('profiles').select('bio').eq('user_id', ownerId).maybeSingle();
        if (alive) setBio((data as { bio?: string } | null)?.bio ?? null);
        return;
      }

      const [{ data: sowerRow }, { data: companyRow }] = await Promise.all([
        supabase.from('sowers').select('id').eq('user_id', ownerId).maybeSingle(),
        supabase.from('companies').select('id').eq('owner_user_id', ownerId).maybeSingle(),
      ]);
      const sowerId = (sowerRow as { id?: string } | null)?.id;
      const companyId = (companyRow as { id?: string } | null)?.id;

      // Deduped by normalized title (lowercased, whitespace collapsed) --
      // a products row always wins a tie, so it's inserted into the map
      // first and every later source just skips a title already present.
      // See scripts/studio/music-duplicates.sql for the read-only audit
      // this dedupe rule was verified against.
      const byNormTitle = new Map<string, Item>();
      const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

      if (sowerId || companyId) {
        const typeFilter =
          kind === 'music' ? ['music'] :
          kind === 'mugs' || kind === 'products' ? ['product'] :
          kind === 'services' ? ['service'] :
          ['book', 'ebook'];
        let q = supabase.from('products').select('id, title, description, cover_image_url, image_urls, price, category, file_url, preview_url, created_at').in('type', typeFilter);
        const orParts: string[] = [];
        if (sowerId) orParts.push(`sower_id.eq.${sowerId}`);
        if (companyId) orParts.push(`company_id.eq.${companyId}`);
        q = q.or(orParts.join(','));
        const { data } = await q.order('created_at', { ascending: false }).limit(100);
        for (const p of (data ?? []) as { id: string; title: string; description: string | null; cover_image_url: string | null; image_urls: string[] | null; price: number | null; category: string | null; file_url: string | null; preview_url: string | null; created_at: string }[]) {
          const isLyrics = (p.category ?? '').toLowerCase() === 'lyrics';
          const isMugs = (p.category ?? '').toLowerCase() === 'mugs';
          if (kind === 'lyrics' && !isLyrics) continue;
          if (kind === 'books' && isLyrics) continue;
          if (kind === 'mugs' && !isMugs) continue;
          byNormTitle.set(normalize(p.title), {
            id: p.id,
            title: p.title,
            blurb: (p.description ?? '').slice(0, 90),
            description: p.description ?? '',
            cover: p.cover_image_url,
            imageUrls: p.image_urls,
            price: Number(p.price || 0),
            source: 'products',
            fileUrl: p.file_url,
            previewUrl: p.preview_url,
            createdAt: p.created_at,
          });
        }
      }

      // sower_books -- a separate, older books table (keyed directly by
      // user_id, no sower_id indirection) that src/api/sowerContent.ts
      // already unions into "books" elsewhere in the app. No PDF/file
      // column exists here (confirmed live) -- "Read a page" never applies
      // to a sower_books-sourced item.
      if (kind === 'books') {
        const { data } = await supabase
          .from('sower_books')
          .select('id, title, description, cover_image_url, bestowal_value, created_at')
          .eq('user_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(100);
        for (const b of (data ?? []) as { id: string; title: string; description: string | null; cover_image_url: string | null; bestowal_value: number | null; created_at: string }[]) {
          const key = normalize(b.title);
          if (byNormTitle.has(key)) continue; // a products row already claimed this title
          byNormTitle.set(key, {
            id: b.id,
            title: b.title,
            blurb: (b.description ?? '').slice(0, 90),
            description: b.description ?? '',
            cover: b.cover_image_url,
            imageUrls: null,
            price: Number(b.bestowal_value || 0),
            source: 'sower_books',
            fileUrl: null,
            previewUrl: null,
            createdAt: b.created_at,
          });
        }
      }

      // dj_music_tracks -- radio uploads, not itself a `products` row.
      // Real overlap exists here for at least one owner (4 of 32 products
      // vs 25 dj tracks shared a title as of this check) -- a products row
      // always wins the same title; only a dj-only track gets added.
      if (kind === 'music') {
        const { data: djRow } = await supabase.from('radio_djs').select('id').eq('user_id', ownerId).maybeSingle();
        const djId = (djRow as { id?: string } | null)?.id;
        if (djId) {
          const { data } = await supabase
            .from('dj_music_tracks')
            .select('id, track_title, cover_image_url, preview_url, created_at')
            .eq('dj_id', djId)
            .order('created_at', { ascending: false })
            .limit(200);
          for (const t of (data ?? []) as { id: string; track_title: string; cover_image_url: string | null; preview_url: string | null; created_at: string }[]) {
            const key = normalize(t.track_title);
            if (byNormTitle.has(key)) continue; // a products row already claimed this title
            byNormTitle.set(key, {
              id: t.id,
              title: t.track_title,
              blurb: '',
              description: '',
              cover: t.cover_image_url,
              imageUrls: null,
              price: 0,
              source: 'dj_music_tracks',
              fileUrl: null,
              // No client-side cap available on this path (that's
              // MusicLibraryTable's own bespoke toggleDjPreview) -- only
              // ever offer a sample when the row has a real short preview
              // clip of its own, never the full file_url uncapped.
              previewUrl: t.preview_url,
              createdAt: t.created_at,
            });
          }
        }
      }

      // Newest first across ALL sources combined -- each source above is
      // already ordered within itself, but the Map is populated source-by-
      // source (products, then sower_books, then dj_music_tracks), so the
      // merged insertion order is only piecewise-sorted until this final
      // global sort.
      const merged = [...byNormTitle.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (alive) setItems(merged);
    })();
    return () => { alive = false; };
  }, [kind, ownerId]);

  // A tap on a sheet card never navigates anymore (tapBehavior="inline"
  // below) -- this is only ever used as the Share target, so it just
  // points back at this same stall page rather than a per-item page that
  // doesn't exist (no dedicated per-book/per-track detail page exists
  // app-wide yet).
  const itemOpenPath = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Desktop row-scroll arrows -- scroll by one card's width (+ gap) at a
  // time rather than a fixed pixel amount, since the card width itself
  // varies with the sheet's viewport width (capped at 300px).
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollRow = (dir: 1 | -1) => {
    const row = rowRef.current;
    const card = row?.firstElementChild as HTMLElement | null;
    if (!row || !card) return;
    const delta = card.offsetWidth + 12; // 12px = gap-3
    row.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

  // Bug, live 2026-09-20: the right arrow (absolute right-1 over the
  // WHOLE row) sat on top of the rightmost card's own "..." rail (also
  // right-1, on the card's cover image), making it untappable -- a real
  // member reported it. Fixed positionally, not with a pointer-events
  // hack: lg:px-14 below reserves a real gutter (the arrow footprint is
  // 4-40px inset; 56px of padding is comfortable clearance) that a card
  // can never occupy at ANY scroll position, snap-center included --
  // padding on a scrolling element extends its own scrollWidth, so the
  // last/first card can still fully center itself clear of the arrow
  // rather than being forced flush against the edge underneath it.
  // Same fix removes the arrows' own overlap risk entirely regardless of
  // vertical position, so top-1/2 needed no change.
  //
  // Also tracks real scroll position (not just `items.length > 1`) so
  // each arrow hides at its own end, and hides both when the row doesn't
  // actually overflow at all (e.g. few items on a very wide screen).
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollState = () => {
    const row = rowRef.current;
    if (!row) return;
    setCanScrollLeft(row.scrollLeft > 4);
    setCanScrollRight(row.scrollLeft < row.scrollWidth - row.clientWidth - 4);
  };
  useEffect(() => {
    updateScrollState();
    const row = rowRef.current;
    if (!row) return;
    row.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      row.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [items?.length]);

  // Arriving back from a SeedCard Message action (scrollToItemId set) --
  // once the real item this sheet's asking about has actually loaded,
  // scroll it into view instead of leaving the visitor to hunt for it
  // among however many other items this kind has.
  useEffect(() => {
    if (!scrollToItemId || !items || items.length === 0) return;
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>(`[data-seed-id="${scrollToItemId}"]`);
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [scrollToItemId, items]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[10000] bg-black/60 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[10001] h-[85vh] flex flex-col rounded-t-2xl
          bg-[#180f08]/95 backdrop-blur-md border-t border-x border-amber-500/25 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
          transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-amber-100/25" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-5 pb-3 border-b border-amber-500/15">
          <h2 className="font-serif text-xl text-amber-200 tracking-wide">{displayLabel}</h2>
          <div className="flex items-center gap-1">
            {/* Add to this shelf, owner only.
                Being the OWNER of a listing shelf is the whole condition --
                not the shelf's kind. Sowers name their own shelves, so keying
                this off a fixed list of known kinds meant a member's own
                category silently had no way in. Every listing shelf gets it,
                including kinds that do not exist yet. A visitor never renders
                it, on any shelf. */}
            {/* My Story's own Edit -- owner only (effectiveIsOwner, same as
                every other owner-only affordance in this sheet), opens
                StoryEditSheet in place rather than navigate()'ing to
                /stall/build and leaving the interior. */}
            {isOwner && kind === 'story' && (
              <button
                type="button"
                onClick={() => setEditingStory(true)}
                aria-label="Edit my story"
                title="Edit my story"
                className="flex h-8 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                Edit
              </button>
            )}
            {isOwner && addOne && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => (showBulk ? setAddMenuOpen((o) => !o) : sheetNavigate(addOne))}
                  aria-label={`Add to ${displayLabel}`}
                  aria-haspopup={showBulk ? 'menu' : undefined}
                  aria-expanded={showBulk ? addMenuOpen : undefined}
                  title={`Add to ${displayLabel}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {showBulk && addMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-lg border border-amber-500/25 bg-[#1d130a] shadow-xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setAddMenuOpen(false); sheetNavigate(addOne); }}
                      className="block w-full px-3 py-2.5 text-left text-sm text-amber-100/90 hover:bg-amber-500/10"
                    >
                      Add one
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setAddMenuOpen(false); sheetNavigate('/dashboard/sower/upload'); }}
                      className="block w-full border-t border-amber-500/15 px-3 py-2.5 text-left text-sm text-amber-100/90 hover:bg-amber-500/10"
                    >
                      Bulk upload
                    </button>
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={handleClose} aria-label="Close shelf" className="text-amber-100/60 hover:text-amber-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* This sheet is `fixed inset-x-0 bottom-0` at its own z-[10001] --
            the floating radio pill (GlobalRadioPlayer.tsx) renders above it
            at z-[10010], so its own safe-area-only bottom padding wasn't
            enough to keep the last row clear once the pill (or any other
            registered chrome) is present. Adds to the safe-area inset
            rather than replacing it -- both are real, independent
            reservations. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5"
          style={{ paddingBottom: `calc(max(1.25rem, env(safe-area-inset-bottom)) + ${BOTTOM_CHROME_PADDING_STYLE.paddingBottom})` }}
        >
          {STATIC_TEXT_KINDS.has(kind) ? (
            <div className="py-6 font-serif text-amber-100/85 leading-relaxed whitespace-pre-line">
              {text || 'Coming soon.'}
            </div>
          ) : kind === 'story' ? (
            bio === undefined || storyPdfUrl === undefined || storyPhotoUrl === undefined ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
            ) : (
              <div className="py-4">
                {/* The story is about a person -- shown above the text/PDF/
                    empty-state regardless of which of those renders, and
                    just as absent as today when there is no photo. */}
                {storyPhotoUrl && (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={storyPhotoUrl}
                      alt=""
                      className="h-28 w-28 rounded-full border-2 border-amber-500/25 object-cover shadow-lg"
                    />
                  </div>
                )}
                {storyPdfUrl ? (
                  <StoryPdfViewer url={storyPdfUrl} />
                ) : bio ? (
                  renderStory(bio)
                ) : (
                  <EmptyState text={EMPTY_TEXT.story!} isOwner={isOwner} onAddOne={() => setEditingStory(true)} addOneLabel="Write your story" />
                )}
              </div>
            )
          ) : items === null ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
          ) : items.length === 0 ? (
            <EmptyState text={`Nothing in ${displayLabel} yet`} isOwner={isOwner} addOnePath={addOne ?? undefined} addOneLabel={`Add to ${displayLabel}`} />
          ) : (
            // Horizontal swipeable row of SeedCards (Flow v2 step 2) --
            // snap-x, ~80% width per card on phone, capped at 300px on
            // desktop so 4-5 sit in view (whole card incl. Bestow button)
            // without scrolling. Desktop also gets left/right arrows at the
            // row edges (scroll one card at a time) -- dots aren't needed,
            // the row is short enough to scan without a position indicator.
            <div className="relative">
              <div ref={rowRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-3 -mx-5 px-5 lg:px-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((item) => (
                  <div key={item.id} data-seed-id={item.id} className="shrink-0 snap-center w-[80%] lg:w-[calc(20%-0.6rem)] lg:max-w-[300px]">
                    <SeedCard
                      id={item.id}
                      kind={SHEET_KIND_TO_SEED_KIND[kind] ?? 'seed'}
                      title={item.title}
                      subtitle={item.blurb}
                      fullDescription={item.description}
                      cover={item.cover}
                      images={item.imageUrls}
                      ownerId={ownerId}
                      ownerName={ownerName}
                      price={item.price}
                      openPath={itemOpenPath}
                      isProductRow={item.source === 'products'}
                      previewUrl={kind === 'music' || kind === 'books' || kind === 'lyrics' ? item.previewUrl : undefined}
                      productId={kind === 'music' && item.source === 'products' ? item.id : undefined}
                      pdfUrl={item.source === 'products' && item.fileUrl && PDF_RE.test(item.fileUrl) ? item.fileUrl : undefined}
                      hideSowerLine
                      tapBehavior="inline"
                      forceViewerIsOwner={isOwner ? undefined : false}
                      mine={!!isOwner}
                      // Share on a shelf opens the real share dialog -- send
                      // it to a tribe member, a room, the feed, or copy the
                      // link. Without this override SeedCard falls back to
                      // navigator.share/clipboard, which on desktop ends at a
                      // toast and never reaches a person.
                      onShareOverride={() => setShareItem(item)}
                      onEdit={editPathFor(item) ? () => sheetNavigate(editPathFor(item)!) : undefined}
                      onDelete={() => removeItem(item)}
                      isNew={!!viewerCutoff && new Date(item.createdAt).getTime() > new Date(viewerCutoff).getTime()}
                    />
                  </div>
                ))}
              </div>
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollRow(-1)}
                  aria-label="Scroll left"
                  className="hidden lg:grid absolute left-1 top-1/2 -translate-y-1/2 z-10 h-9 w-9 place-items-center rounded-full bg-black/60 text-amber-100 backdrop-blur-md ring-1 ring-amber-500/25 hover:bg-black/80 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollRow(1)}
                  aria-label="Scroll right"
                  className="hidden lg:grid absolute right-1 top-1/2 -translate-y-1/2 z-10 h-9 w-9 place-items-center rounded-full bg-black/60 text-amber-100 backdrop-blur-md ring-1 ring-amber-500/25 hover:bg-black/80 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Rendered OUTSIDE the sheet's own stacking context so it is never
          clipped by the 85vh panel or covered by it -- the failure a share
          dialog shipped with on 2026-09-18. */}
      {shareItem && (
        <ShareSeedDialog
          open
          onOpenChange={(o) => { if (!o) setShareItem(null); }}
          seedId={shareItem.id}
          title={shareItem.title}
          subtitle={shareItem.blurb || null}
          image={shareItem.cover}
          openPath={itemOpenPath}
          feedKind={kind === 'music' ? 'music' : 'photo'}
        />
      )}
      {editingStory && (
        <StoryEditSheet
          ownerId={ownerId}
          onClose={() => setEditingStory(false)}
          onSaved={(newStory, newPdfUrl, newPhotoUrl) => {
            setBio(newStory);
            setStoryPdfUrl(newPdfUrl);
            setStoryPhotoUrl(newPhotoUrl);
            setEditingStory(false);
          }}
        />
      )}
    </>
  );
}

/**
 * Renders MY STORY text (stalls.story or profiles.bio) as paragraphs
 * (blank-line separated, internal single line breaks kept via
 * whitespace-pre-wrap) with any line that is ENTIRELY UPPER CASE promoted
 * to a gold serif heading. Never changes the case of anything -- the text
 * is lowercase by design in real use; a line only becomes a heading
 * because the owner already typed it in caps.
 */
function renderStory(text: string) {
  const isAllCaps = (line: string) => /[A-Za-z]/.test(line) && line === line.toUpperCase() && line !== line.toLowerCase();

  const blocks: JSX.Element[] = [];
  let paragraph: string[] = [];
  const flushParagraph = (key: string) => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={key} className="whitespace-pre-wrap leading-relaxed text-[15px] text-amber-50/90 font-serif mb-4 last:mb-0">
        {paragraph.join('\n')}
      </p>,
    );
    paragraph = [];
  };

  text.split('\n').forEach((rawLine, i) => {
    const trimmed = rawLine.trim();
    if (isAllCaps(trimmed)) {
      flushParagraph(`p-${i}`);
      blocks.push(
        <h3 key={`h-${i}`} className="font-serif text-lg text-amber-300 tracking-wide mt-6 mb-2 first:mt-0">
          {trimmed}
        </h3>,
      );
    } else if (trimmed === '') {
      flushParagraph(`p-${i}`);
    } else {
      paragraph.push(rawLine);
    }
  });
  flushParagraph('p-last');

  return blocks;
}

function EmptyState({ text, isOwner, addOnePath, onAddOne, addOneLabel }: { text: string; isOwner?: boolean; addOnePath?: string; /** Opens something in place instead of navigating -- My Story's own StoryEditSheet. Takes priority over addOnePath when both are given. */ onAddOne?: () => void; addOneLabel: string }) {
  const navigate = useNavigate();
  const action = onAddOne ?? (addOnePath ? () => navigate(addOnePath) : undefined);
  return (
    <div className="py-12 text-center">
      <p className="text-amber-100/50 font-serif italic">{text}</p>
      {isOwner && action && (
        <button
          type="button"
          onClick={action}
          className="mt-2 text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          {addOneLabel}
        </button>
      )}
    </div>
  );
}
