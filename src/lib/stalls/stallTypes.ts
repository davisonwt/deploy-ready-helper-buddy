// Shared Farm-Stalls constants -- kept in one place so the /stall/build
// wizard and the Cockpit owner view never drift on what a valid category/
// tile kind is (mirrors stalls_category_check / stalls_tier_check in
// supabase/migrations/20260910220000_farm_stalls.sql).

export type StallCategory =
  | 'music'
  | 'books_writing'
  | 'art_craft'
  | 'faith_teaching'
  | 'trades_services'
  | 'food_home'
  | 'whisperer'
  | 'orchard';

export const STALL_CATEGORIES: { id: StallCategory; label: string }[] = [
  { id: 'music', label: 'Music' },
  { id: 'books_writing', label: 'Books & Writing' },
  { id: 'art_craft', label: 'Art & Craft' },
  { id: 'faith_teaching', label: 'Faith & Teaching' },
  { id: 'trades_services', label: 'Trades & Services' },
  { id: 'food_home', label: 'Food & Home' },
  { id: 'whisperer', label: 'Whisperer' },
  { id: 'orchard', label: 'Orchard' },
];

export type StallTier =
  | 'farm_stall'
  | 'country_store'
  | 'market_hall'
  | 'trading_house'
  | 'the_works'
  | 'wayside_table';

export const STALL_TIER_LABEL: Record<StallTier, string> = {
  farm_stall: 'Farm Stall',
  country_store: 'Country Store',
  market_hall: 'Market Hall',
  trading_house: 'Trading House',
  the_works: 'The Works',
  wayside_table: 'Wayside Table',
};

export type TileKind =
  | 'books' | 'music' | 'lyrics' | 'story' | 'mugs' | 'products' | 'services' | 'orchard' | 'custom'
  // Companions Village phase 1 (places only): 'nav' never opens a sheet --
  // StallInteriorView.handleHotspotTap reads its own `href` off the tapped
  // hotspot and navigates immediately, so many 'nav' hotspots can coexist
  // on one stall with no collision. The other four DO open a sheet
  // (StallHotspotSheet) showing their own `text` verbatim instead of a
  // product query -- each appears at most once per stall row, so
  // StallInteriorView's existing `hotspots.find(h => h.kind === openKind)`
  // still resolves the right one.
  | 'nav' | 'companion_info' | 'passes' | 'activate' | 'reviews'
  // Scripture Study gathering room (minimum version): 'go_live' and
  // 'share' never open a sheet either -- StallInteriorView intercepts
  // both directly (go_live: admin/gosat-only, starts/joins the gathering;
  // share: calls the existing shareStallLink, same as the header's own
  // Share button). 'raise_hand'/'queue' open LiveStageOverlay directly
  // when the gathering is live, or a static "not live" sheet (via `text`,
  // same STATIC_TEXT_KINDS mechanism as companion_info etc.) when it
  // isn't. 'gift' is a static placeholder sheet for now -- a real
  // Bestow-shaped tip needs a backing orchards row (company_id/profile_id/
  // seed_value all NOT NULL there), which is a money-routing decision left
  // to Davison, not guessed here.
  | 'go_live' | 'share' | 'raise_hand' | 'queue' | 'gift';

export const TILE_KINDS: { id: TileKind; label: string }[] = [
  { id: 'books', label: 'Books & Research' },
  { id: 'music', label: 'Music & Videos' },
  { id: 'lyrics', label: 'Lyrics' },
  { id: 'story', label: 'My Story' },
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'orchard', label: 'My Orchard' },
  { id: 'custom', label: 'Custom link' },
];

/**
 * Default in-app route for every kind except 'custom' (the wizard collects
 * a member-supplied in-app URL for that one). These are the closest
 * existing "manage my X" surfaces in the app today -- 'books'/'products'/
 * 'services' all land on /my-products since a book, a physical product,
 * and a bookable service are all authored as `products` rows there; there
 * is no dedicated per-type listing page yet. Revisit once a public
 * storefront view (batch 2) needs a real per-tile browse target.
 */
export const TILE_KIND_DEFAULT_TARGET: Record<Exclude<TileKind, 'custom' | 'nav' | 'companion_info' | 'passes' | 'activate' | 'reviews' | 'go_live' | 'share' | 'raise_hand' | 'queue' | 'gift'>, string> = {
  books: '/my-products',
  music: '/music-library',
  lyrics: '/music-library',
  story: '/profile',
  mugs: '/my-products',
  products: '/my-products',
  services: '/my-products',
  orchard: '/my-orchards',
};

export interface StallTile {
  label: string;
  kind: TileKind;
  image_path?: string | null;
  link_target: string;
}

/**
 * A tap region painted into a template's interior image (batch 2b). All of
 * x/y/w/h are percentages of the IMAGE's own natural width/height, not the
 * viewport -- StallInterior converts these to the rendered (object-contain,
 * possibly letterboxed) image box's own coordinates at render time.
 */
export interface StallHotspot {
  /**
   * Stable per-box identifier (batch: object hotspots). Optional so
   * hand-authored template JSON never has to carry one -- anything reading
   * hotspots for React keys / tap-preview tracking falls back to its array
   * index when absent. Never used for "the" hotspot of a kind anymore --
   * stalls.hotspots may hold many entries sharing the same `kind` (many
   * objects in the room can all open the same Books/Music/... sheet).
   */
  id?: string;
  kind: TileKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional short line shown alongside the label on hover (desktop) or a brief tap-preview (mobile, ~1.5s) before the sheet opens. */
  caption?: string;
  /** kind:'nav' only -- in-app path StallInteriorView navigates to immediately on tap, no sheet. */
  href?: string;
  /** kind:'companion_info'|'passes'|'activate'|'reviews' only -- static body text StallHotspotSheet shows verbatim instead of a product query. */
  text?: string;
}

export interface StallTemplate {
  id: string;
  label: string;
  front: string;
  interior: string;
  hotspots?: StallHotspot[];
}

/**
 * Four evenly-spaced bottom hotspots, used when a stall's interior is a
 * member's own upload (no template, so no painted buttons/known layout) or
 * a template with no `hotspots` entry of its own. Per-stall overrides live
 * in stalls.hotspots (20260911000000_stall_hotspots.sql) once a member
 * repositions them for their own uploaded image.
 */
export const DEFAULT_HOTSPOTS: StallHotspot[] = [
  // Deliberately NOT renamed with the display labels: this template is WRITTEN
  // into stalls.hotspots, so changing it changes a stored value for every new
  // stall -- and the hotspot button's aria-label is that stored string, which
  // twelve live specs locate by. Display labels live in TILE_KINDS/KIND_LABEL.
  { kind: 'books', label: 'Books', x: 2, y: 70, w: 22, h: 25 },
  { kind: 'music', label: 'Music', x: 26, y: 70, w: 22, h: 25 },
  { kind: 'lyrics', label: 'Lyrics', x: 50, y: 70, w: 22, h: 25 },
  { kind: 'story', label: 'My Story', x: 74, y: 70, w: 22, h: 25 },
];

export type StallTemplatesByCategory = Record<StallCategory, StallTemplate[]>;

/**
 * Which hotspots a stall's interior actually uses, in priority order:
 * 1. stalls.hotspots -- an explicit per-stall override, once one exists.
 * 2. The template's own `hotspots`, matched by the stall's stored
 *    interior_image_path against every template's `interior` path across
 *    every category (a stall's category and its interior template's
 *    listed category don't have to be the same lookup key here -- the
 *    image URL is the only reliable link back to "which template").
 * 3. DEFAULT_HOTSPOTS -- a member's own uploaded interior, or a template
 *    that hasn't been given hotspots of its own yet.
 */
export function resolveStallHotspots(
  interiorImagePath: string | null | undefined,
  stallHotspots: StallHotspot[] | null | undefined,
  templates: StallTemplatesByCategory | null | undefined,
): StallHotspot[] {
  if (stallHotspots && stallHotspots.length > 0) return stallHotspots;

  if (interiorImagePath && templates) {
    for (const list of Object.values(templates)) {
      const match = list.find((t) => t.interior === interiorImagePath);
      if (match?.hotspots && match.hotspots.length > 0) return match.hotspots;
    }
  }

  return DEFAULT_HOTSPOTS;
}

export const MIN_TILES = 3;
export const MAX_TILES = 5;

/** Wizard step "Mark your shelves" -- fewest object hotspots a stall can publish with. No ceiling. */
export const MIN_HOTSPOTS = 3;
