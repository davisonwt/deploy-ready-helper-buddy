# Bulk Product Uploader — Build Plan

A staged build that extends existing S2G systems (products, sowers, whisperers, directory) rather than duplicating them. All new public routes live under `/bulk/*` so nothing in your current routing, wandering-badges system, or SowerProfile breaks.

---

## Phase 0 — Schema & Storage (one migration, one bucket)

Additive only. No drops, no renames. All existing pages keep working.

### `products` (add columns)
- `slug text unique` — generated from name + short hash
- `commission_pct numeric(5,2)` — whisperer commission %
- `commission_fixed numeric(12,2)` — fixed-amount alt
- `stock_qty integer`
- `sku text`
- `bulk_upload_id uuid` — links row back to its upload job
- `status text default 'draft'` — `draft | live | archived`
- (existing `metadata jsonb` already holds extra fields)

### `sowers` (add columns)
- `slug text unique`
- `banner_url text`
- `bio text`
- `tagline text`

### New `product_images`
```
id uuid pk, product_id uuid fk products, url text, sort_order int, is_primary bool, created_at
```
Up to 5 rows per product. RLS: public read; sower writes only their own.

### New `bulk_upload_jobs`
```
id uuid pk, sower_id uuid fk sowers, user_id uuid,
file_name text, file_type text, file_size_bytes int,
status text ('uploaded'|'parsing'|'parsed'|'published'|'failed'),
total_rows int, valid_rows int, error_rows int,
parsed_rows jsonb,            -- staging area before publish
parse_error text,
published_count int default 0,
created_at, updated_at
```
RLS: sower owns their job.

### Reuse (no new table)
- `product_whisperer_assignments` (already 13 cols) — used for whisperer "My Assigned Products"
- `whisperers`, `whisperer_clicks`, `whisperer_conversions`, `whisperer_earnings` — already wired
- `seeds` table — left alone; "Seed Feed" reads directly from `products`

### Storage
- New bucket `product-images` (public read, sower write). Path: `{sower_id}/{product_id}/{n}.{ext}`.

### Backfill
- One-time UPDATE: generate `slug` for existing sowers and products that don't have one.

---

## Phase 1 — Bulk Upload Wizard (the wow moment)

Route: `/dashboard/sower/upload` (new, under existing dashboard).

Entry point: add a single "Bulk Upload Products — 10+ Products? Upload in bulk" button on the existing `DashboardPage`. No other dashboard changes.

### Edge function `bulk-parse-products`
Server-side parser. Accepts an uploaded file via signed URL, returns normalized rows + per-row validation.

Format support:
- **CSV** — `papaparse` via npm
- **XLSX** — `xlsx` via npm (SheetJS)
- **TXT** — line/tab/comma sniff
- **PDF** — `unpdf` (Deno-friendly) — text-layout best-effort, flagged as "lower accuracy" in the UI when used
- **DOCX** — unzip + read `word/document.xml`, extract tables/paragraphs

Flexible column mapping (case/space/synonym tolerant):
`name|product|title`, `description|desc`, `price|amount|cost`,
`commission|commission_pct|whisperer_%`, `category`, `sku|code`,
`stock|qty|quantity`.

Returns `{ rows: [{raw, normalized, issues: []}], summary }`. Writes to `bulk_upload_jobs.parsed_rows` so the wizard can reload state.

### Wizard UI (5 steps, framer-motion transitions)
1. **Drop zone** — drag/drop, animated seed→sprout loader during parse
2. **Review table** — editable grid (uses `@tanstack/react-table` already in deps), inline edit, sticky header, status badges (✅/⚠️/❌), bulk actions, "Fix all issues" jump, live row counter
3. **Images per row** — side panel with 5 slots, drag-reorder (already have `@dnd-kit` patterns or use HTML5 DnD), "copy images to similar products" helper, progress "180/248"
4. **Review & confirm** — totals, commission summary, live preview panel of the sower brand page, "Save as draft" / "Schedule" / "Plant your products"
5. **Success** — bloom animation, links to brand page / feed / share

All S2G microcopy ("Planting your products…", "Your seeds are live!"). All shadcn + existing tokens. No new color classes.

---

## Phase 2 — Sower Brand Page + Seed Social Feed (second wow moment)

### `/bulk/sower/:slug` — brand page
- Hero: banner, logo, name, verified, tagline, stats row (Products / Whisperers / Sold / Rating)
- Actions: Follow, View Seed Feed, Become a Whisperer (modal), Share
- Product grid using **existing `ProductCard`** (your memory rule — do not deviate)
- Filter/sort bar, infinite scroll (`useInfiniteQuery`), skeletons, empty state

### `/bulk/sower/:slug/feed` — seed social feed
- Full-screen vertical scroll-snap (CSS `scroll-snap-type: y mandatory`)
- Each card: 5-image carousel (embla, already in deps), name, expandable desc, price, commission badge, Add to Cart, Share-to-Live, Whisperer "Market this product" (generates trackable link via existing `whisperer_referral_links`)
- Lazy image loading, side dot progress
- Top tabs: All / New Arrivals / Best Commission / Trending
- Virtualized via `react-window`-style windowing already in `OptimizedList` for 1000+ rows

---

## Phase 3 — Product Detail Page

### `/bulk/products/:slug`
- Image gallery with thumbnail strip (up to 5)
- Name, full description, price, commission callout for whisperers
- Sower strip linking to `/bulk/sower/:slug`
- Share buttons, Add to Cart / Enquire (reuses existing `ProductBasketContext`)
- Related products from same sower (horizontal `ProductCard` scroll)
- Breadcrumb
- SEO: `<title>`, meta description, OG image = primary product image, JSON-LD `Product` schema

---

## Phase 4 — Discovery

### `/bulk/directory` (new, parallel to existing `/products` & `WanderingDirectoryPage` — does not touch them)
- Sower-centric directory (existing is product-centric)
- Search, filter (category, product-count range, commission range, location, rating, "has active live" toggle)
- Sower cards with logo, name, product count, top-3 thumbs, rating, commission range, "Bulk Sower" badge, View Page / View Feed
- Sort: Most Products / Top Rated / Newest / Highest Commission / Most Active

### Global product search
- Extends existing `AdvancedSearchPage` with bulk-product filters (price, commission, sower). No new page.

### Whisperer dashboard panel
- New section on existing whisperer dashboard: "Sowers to Market", "My Assigned Products", "Shareable Product Links", "Commission Tracker". Reads from existing `whisperer_*` tables + new bulk-flagged products.

---

## Phase 5 — Sower Dashboard additions

On existing `DashboardPage` (additive, no removals):
- "My Products" tab — table of products, status pills, row actions (Edit / Duplicate / Archive / Delete)
- Bulk edit mode (price, commission)
- Per-product analytics (Views / Clicks / Shares / Sales / Commission paid) — read from existing `seed_analytics_daily` + `whisperer_*` tables
- Upload history (lists `bulk_upload_jobs`)
- Quick links to brand page + seed feed

---

## Routes summary (all new, no overrides)

```
/dashboard/sower/upload         Bulk upload wizard
/bulk/sower/:slug               Sower brand page
/bulk/sower/:slug/feed          Seed social feed
/bulk/products/:slug            Product detail
/bulk/directory                 Sower directory
```

Existing `/products`, `/products/:id`, `/sower/...`, `SowerProfile`, `WanderingDirectoryPage`, `MyProductsPage` are **untouched**.

---

## Out of scope (confirmed)
Payments, live-session hosting, in-app sower↔whisperer chat, multi-currency conversion logic.

---

## Build order I will actually ship in (one phase = one approval cycle)

1. **Phase 0** — migration + storage bucket (needs your DB approval)
2. **Phase 1** — `bulk-parse-products` edge function + wizard UI
3. **Phase 2** — brand page + seed feed
4. **Phase 3** — product detail
5. **Phase 4** — directory + whisperer panel + search extension
6. **Phase 5** — dashboard additions

After each phase ships I'll stop and wait for you to test before moving on. This keeps each piece high-quality and reversible.

---

## Risks I'm flagging now
- **PDF/DOCX parsing accuracy** is inherently variable on arbitrary layouts. The wizard will surface every row as "⚠️ Needs review" by default for these two formats so nothing publishes silently wrong.
- **`slug` uniqueness** on backfill — collisions resolved with a 6-char hash suffix.
- **Storage bucket public read** may be blocked by your workspace policy; if so, I'll fall back to signed URLs.
- I will not touch `seeds`, `orchards`, `wandering_hearts`, or tribal-hearts code in any phase.

Reply "approved" to start Phase 0, or tell me what to change.
