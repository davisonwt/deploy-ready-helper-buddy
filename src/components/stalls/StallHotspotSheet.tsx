import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import StoryPdfViewer from './StoryPdfViewer';
import SeedCard, { type SeedCardKind } from '@/components/seeds/SeedCard';
import type { TileKind } from '@/lib/stalls/stallTypes';

interface Props {
  ownerId: string;
  ownerName: string;
  kind: TileKind;
  isOwner?: boolean;
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
};

const PDF_RE = /\.pdf(\?|$)/i;

const KIND_LABEL: Partial<Record<TileKind, string>> = {
  books: 'Books',
  music: 'Music',
  lyrics: 'Lyrics',
  story: 'My Story',
  mugs: 'Mugs',
};

const EMPTY_TEXT: Partial<Record<TileKind, string>> = {
  books: 'No books on the shelf yet',
  music: 'No music playing yet',
  lyrics: 'No lyrics written yet',
  story: 'Story still being written',
  mugs: 'No mugs on the table yet',
};

/** Where "Add one" sends the owner, per kind -- the only real create flow each maps to. */
const ADD_ONE_PATH: Partial<Record<TileKind, string>> = {
  books: '/sow/book',
  music: '/sow/music',
  lyrics: '/sow/book', // lyrics are a category on the same book form (products.category = 'lyrics') -- no dedicated lyrics form exists
  mugs: '/sow/product', // mugs are a category on the general Shop product form (products.type = 'product', category = 'mugs')
};

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
 */
export default function StallHotspotSheet({ ownerId, ownerName, kind, isOwner, onClose, scrollToItemId, viewerCutoff }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  // undefined = still loading; null = loaded, nothing there; string = loaded, has content.
  const [bio, setBio] = useState<string | null | undefined>(undefined);
  const [storyPdfUrl, setStoryPdfUrl] = useState<string | null | undefined>(undefined);
  const [visible, setVisible] = useState(false);

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
      if (kind === 'story') {
        const { data: stallRow } = await supabase.from('stalls').select('story, story_pdf_path').eq('user_id', ownerId).maybeSingle();
        const row = stallRow as { story?: string | null; story_pdf_path?: string | null } | null;
        if (alive) setStoryPdfUrl(row?.story_pdf_path ?? null);

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
        const typeFilter = kind === 'music' ? ['music'] : kind === 'mugs' ? ['product'] : ['book', 'ebook'];
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
          <h2 className="font-serif text-xl text-amber-200 tracking-wide">{KIND_LABEL[kind] ?? kind}</h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-amber-100/60 hover:text-amber-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {kind === 'story' ? (
            bio === undefined || storyPdfUrl === undefined ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
            ) : storyPdfUrl ? (
              <StoryPdfViewer url={storyPdfUrl} />
            ) : bio ? (
              <div className="py-4">{renderStory(bio)}</div>
            ) : (
              <EmptyState text={EMPTY_TEXT.story!} isOwner={isOwner} addOnePath="/stall/build" addOneLabel="Write your story" />
            )
          ) : items === null ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
          ) : items.length === 0 ? (
            <EmptyState text={EMPTY_TEXT[kind] ?? 'Nothing here yet'} isOwner={isOwner} addOnePath={ADD_ONE_PATH[kind]} addOneLabel="Add one" />
          ) : (
            // Horizontal swipeable row of SeedCards (Flow v2 step 2) --
            // snap-x, ~80% width per card on phone, capped at 300px on
            // desktop so 4-5 sit in view (whole card incl. Bestow button)
            // without scrolling. Desktop also gets left/right arrows at the
            // row edges (scroll one card at a time) -- dots aren't needed,
            // the row is short enough to scan without a position indicator.
            <div className="relative">
              <div ref={rowRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-3 -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      isNew={!!viewerCutoff && new Date(item.createdAt).getTime() > new Date(viewerCutoff).getTime()}
                    />
                  </div>
                ))}
              </div>
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => scrollRow(-1)}
                    aria-label="Scroll left"
                    className="hidden lg:grid absolute left-1 top-1/2 -translate-y-1/2 z-10 h-9 w-9 place-items-center rounded-full bg-black/60 text-amber-100 backdrop-blur-md ring-1 ring-amber-500/25 hover:bg-black/80 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollRow(1)}
                    aria-label="Scroll right"
                    className="hidden lg:grid absolute right-1 top-1/2 -translate-y-1/2 z-10 h-9 w-9 place-items-center rounded-full bg-black/60 text-amber-100 backdrop-blur-md ring-1 ring-amber-500/25 hover:bg-black/80 transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
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

function EmptyState({ text, isOwner, addOnePath, addOneLabel }: { text: string; isOwner?: boolean; addOnePath?: string; addOneLabel: string }) {
  const navigate = useNavigate();
  return (
    <div className="py-12 text-center">
      <p className="text-amber-100/50 font-serif italic">{text}</p>
      {isOwner && addOnePath && (
        <button
          type="button"
          onClick={() => navigate(addOnePath)}
          className="mt-2 text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          {addOneLabel}
        </button>
      )}
    </div>
  );
}
