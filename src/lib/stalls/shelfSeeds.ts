import { supabase } from '@/integrations/supabase/client';
import type { TileKind } from '@/lib/stalls/stallTypes';

/** Which table a shelf seed came from -- drives SeedCard's isProductRow, the edit path, and whether a book has a real PDF to preview. */
export type ItemSource = 'products' | 'sower_books' | 'dj_music_tracks';

export interface ShelfSeed {
  id: string;
  title: string;
  blurb: string;
  /** Full, untruncated description -- for SeedCard's inline detail overlay (tapBehavior='inline'). `blurb` stays truncated for the card body. */
  description: string;
  cover: string | null;
  /** Multi-image gallery (products.image_urls) -- products-sourced items only. */
  imageUrls: string[] | null;
  price: number;
  source: ItemSource;
  fileUrl: string | null;
  previewUrl: string | null;
  /** Drives both the newest-first sort and each SeedCard's "New" badge. */
  createdAt: string;
}

/** Kinds whose sheet shows `text` verbatim instead of a seed query. */
export const STATIC_TEXT_KINDS = new Set<TileKind>(['companion_info', 'passes', 'activate', 'reviews', 'raise_hand', 'queue', 'gift']);

/**
 * Every seed on one shelf KIND of one owner's stall, newest first.
 *
 * Lifted out of StallHotspotSheet unchanged so the owner's per-hotspot
 * picker (HotspotEditor) offers exactly the ids the visitor's sheet will
 * later filter on. That is a correctness requirement, not tidiness: the
 * dedupe below decides WHICH id survives when two sources share a title,
 * so a picker running its own query could hand back a sower_books id that
 * the sheet drops in favour of the products row -- and the assignment
 * would silently show nothing.
 */
export async function loadShelfSeeds(ownerId: string, kind: TileKind): Promise<ShelfSeed[]> {
  if (STATIC_TEXT_KINDS.has(kind) || kind === 'story') return [];

  const [{ data: sowerRow }, { data: companyRow }] = await Promise.all([
    supabase.from('sowers').select('id').eq('user_id', ownerId).maybeSingle(),
    supabase.from('companies').select('id').eq('owner_user_id', ownerId).maybeSingle(),
  ]);
  const sowerId = (sowerRow as { id?: string } | null)?.id;
  const companyId = (companyRow as { id?: string } | null)?.id;

  // Deduped by normalized title (lowercased, whitespace collapsed) -- a
  // products row always wins a tie, so it's inserted into the map first and
  // every later source just skips a title already present. See
  // scripts/studio/music-duplicates.sql for the read-only audit this dedupe
  // rule was verified against.
  const byNormTitle = new Map<string, ShelfSeed>();
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

  // sower_books -- a separate, older books table (keyed directly by user_id,
  // no sower_id indirection). No PDF/file column exists here.
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
          // No client-side cap available on this path -- only ever offer a
          // sample when the row has a real short preview clip of its own.
          previewUrl: t.preview_url,
          createdAt: t.created_at,
        });
      }
    }
  }

  // Newest first across ALL sources combined -- each source is ordered within
  // itself, but the Map is populated source-by-source, so the merged
  // insertion order is only piecewise-sorted until this final global sort.
  return [...byNormTitle.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Which of a shelf kind's seeds ONE box opens (per-hotspot seed subsets).
 *
 * The contract, in order:
 *
 * 1. An UNASSIGNED box shows every seed of its kind -- exactly what every
 *    box did before this existed. No stall changes until an owner curates.
 * 2. An ASSIGNED box shows only its own seeds. Two boxes of the same kind
 *    can therefore hold different finds, which is the whole point; they may
 *    also overlap, since a seed may be assigned to as many boxes as the
 *    owner likes.
 * 3. A STALE ref -- a seed that has since been deleted -- is simply not
 *    there. It is never an error, and a box whose assignments have ALL gone
 *    stale falls back to rule 1 rather than presenting an empty shelf the
 *    owner never emptied.
 * 4. A seed assigned NOWHERE stays discoverable. While any box of its kind
 *    is still unassigned it already shows there, so nothing is done. Only
 *    when EVERY box of that kind is curated would it fall off the stall
 *    entirely -- and then it joins the FIRST curated box of that kind, in
 *    hotspot order. That rule is arbitrary in the same way "first" always
 *    is, but it is deterministic, it puts the seed in exactly one place
 *    rather than scattering it, and the editor says plainly where it went
 *    instead of leaving the owner to find out. A sower's seed never
 *    silently becomes unreachable in her own stall.
 *
 * Pure and total: unknown hotspot id, missing ids, empty arrays and
 * same-kind duplicates all resolve to a defined answer. Same-kind
 * duplicates are never deduped or warned about (CLAUDE.md).
 */
export function resolveShelfSubset<T extends { id: string }>(
  seeds: T[],
  hotspots: { id?: string; kind: TileKind; seed_ids?: string[] }[],
  kind: TileKind,
  hotspotId: string | null | undefined,
): T[] {
  const live = new Set(seeds.map((s) => s.id));
  const curatedIds = (h: { seed_ids?: string[] }) => (h.seed_ids ?? []).filter((id) => live.has(id));

  const active = hotspotId ? hotspots.find((h) => h.id === hotspotId) : undefined;
  const mine = active ? curatedIds(active) : [];
  if (mine.length === 0) return seeds; // rules 1 and 3

  const sameKind = hotspots.filter((h) => h.kind === kind);
  const everyBoxCurated = sameKind.every((h) => curatedIds(h).length > 0);

  let adopted: string[] = [];
  if (everyBoxCurated) {
    const firstCurated = sameKind.find((h) => curatedIds(h).length > 0);
    if (firstCurated && firstCurated.id === hotspotId) {
      const claimed = new Set(sameKind.flatMap(curatedIds));
      adopted = seeds.map((s) => s.id).filter((id) => !claimed.has(id)); // rule 4
    }
  }

  const show = new Set([...mine, ...adopted]);
  return seeds.filter((s) => show.has(s.id)); // keeps the newest-first order
}

/**
 * Rule 4, from the owner's side: which seeds of a kind sit on no box at
 * all, and which box will therefore show them.
 *
 * Shares resolveShelfSubset's definitions on purpose -- an editor notice
 * that drifted from the rule the visitor's sheet actually applies would be
 * worse than no notice, because the owner would trust it.
 *
 * `host` is null while any box of the kind is still unassigned: that box
 * already shows everything, so nothing is unplaced and there is nothing to
 * tell the owner about.
 */
export function describeUnplacedSeeds<T extends { id: string }>(
  seeds: T[],
  hotspots: { id?: string; kind: TileKind; label?: string; seed_ids?: string[] }[],
  kind: TileKind,
): { unplaced: T[]; host: { id?: string; label?: string } | null } {
  const live = new Set(seeds.map((s) => s.id));
  const curatedIds = (h: { seed_ids?: string[] }) => (h.seed_ids ?? []).filter((id) => live.has(id));

  const sameKind = hotspots.filter((h) => h.kind === kind);
  if (sameKind.length === 0) return { unplaced: [], host: null };

  const claimed = new Set(sameKind.flatMap(curatedIds));
  const unplaced = seeds.filter((s) => !claimed.has(s.id));
  if (unplaced.length === 0) return { unplaced: [], host: null };

  const everyBoxCurated = sameKind.every((h) => curatedIds(h).length > 0);
  if (!everyBoxCurated) return { unplaced, host: null };

  return { unplaced, host: sameKind.find((h) => curatedIds(h).length > 0) ?? null };
}
