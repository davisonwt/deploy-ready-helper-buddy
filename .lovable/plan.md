## Printable Scriptural Wall Calendar + Year Planner — Plan

### 1. Scriptural calendar data (source of truth)

The system is fully code-driven — there's **no DB table** of months/feasts. All data already lives in:

- `src/utils/customCalendar.ts` — date math, epoch (Tequvah / Vernal Equinox 20 Mar 2025 = Year 6028 M1 D1), 12-month structure `[30,30,31,30,30,31,30,30,31,30,30,31]` = 364 days, `isLongYear()` for days-out-of-time, sunrise-aware `getCreatorDate()`, `getCreatorDateSync()`, `formatCustomDate()`, `getDayOfWeek()`.
- `src/utils/sacredCalendar.ts` — `FEAST_DAYS` map (New Year, Unleavened Bread, Shavuot, Yom Teruah, Yom Kippur, Sukkot, New Month Feasts, etc.), `INTERCALARY_DAYS`, Sabbath rule (every 7th day), `getDayInfo()`, `getAllDays()`.
- `src/utils/dashboardCalendar.ts` + `src/hooks/useSacredNow.ts` — what the Dashboard banners read.
- `supabase/functions/remnants-wheel-calendar/index.ts` — server mirror of the same logic.

**Gap to close (no new schema):** add a pure helper `src/utils/calendarYearBuild.ts` exporting `buildScripturalYear(year)` that returns, for every scriptural day in a year, the inverse-mapped Gregorian date + `getDayInfo()` output. The Gregorian inverse is just `CREATOR_EPOCH + (cumulative days from year 6028 M1 D1)` — already trivial from existing primitives. Month names: today only "Month 1..12" exists. Add a small `MONTH_LABELS` constant in the same helper (initially just `"Month 1" … "Month 12"`; user can rename later) so PDF/UI share one source.

The `sacred_day_scriptures` table exists and can optionally enrich each day with a verse — read-only join, no schema change required for v1.

### 2. Location → season mapping

User location is **already captured**:

- `profiles.latitude`, `profiles.longitude`, `profiles.location_verified` (migration `20251201000000_add_location_columns.sql`).
- `src/hooks/useUserLocation.ts` resolves it (profile → text country → browser geolocation → default Johannesburg).

So no prompt is needed for existing users; only a one-time "Confirm your location" step if `location_verified=false`.

**Region key (cache key, coarse on purpose):**
```
region_key = `${hemisphere}:${climate_band}`
hemisphere = lat >= 0 ? 'N' : 'S'
climate_band:
  |lat| < 23.5  → 'tropical'
  23.5–35       → 'subtropical'
  35–55         → 'temperate'
  55–66.5       → 'boreal'
  >= 66.5       → 'polar'
```
Five bands × 2 hemispheres = max 10 climates × 12 scriptural months = **120 cached images worst-case** for the whole platform.

**Scriptural month → real local season:** Scriptural M1 begins at Vernal Equinox (≈ 20 Mar). For the N hemisphere that's start of spring, for the S hemisphere that's start of autumn. A static lookup table `scripturalMonthToSeason(month, hemisphere)` returns `'spring' | 'summer' | 'autumn' | 'winter'` (M1–M3 spring N / autumn S, M4–M6 summer N / winter S, etc.). Tropical/polar bands override the four-season label with `'wet' | 'dry'` and `'polar-day' | 'polar-night'` respectively to drive better art.

Lives in `src/utils/calendarSeason.ts` — pure functions, no DB.

### 3. Image generation + caching

New table `public.seasonal_calendar_art`:

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `region_key` | text | e.g. `S:subtropical` |
| `scriptural_month` | int (1–12) | |
| `season_label` | text | denormalized for prompt traceability |
| `image_url` | text | public URL in storage |
| `storage_path` | text | |
| `prompt` | text | |
| `model` | text | `black-forest-labs/flux-1.1-pro` (matches existing) |
| `created_at` / `updated_at` | timestamptz | |

`UNIQUE(region_key, scriptural_month)` — that's the cache key. Public SELECT (images are non-sensitive). INSERT/UPDATE restricted to `service_role` (edge function only). Required GRANTs included.

Storage: reuse existing **`ai-generations`** bucket (already public per the earlier Option 1 decision) under path `calendar-art/<region_key>/<month>.webp`.

**Edge function `get-or-generate-calendar-art`** (new, under `supabase/functions/get-or-generate-calendar-art/`):
- Input: `{ region_key, scriptural_month }` (validated with Zod).
- 1. `SELECT` cache row; if hit, return `image_url`.
- 2. Else build prompt: `"Photorealistic <season_label> landscape, <hemisphere> hemisphere <climate_band>, scriptural month <n>, soft natural light, no text, no people, calendar wall-art composition, vertical 3:4."`
- 3. Reuse the **exact same Replicate pipeline** used by `supabase/functions/generate-thumbnail/index.ts` (FLUX model, `REPLICATE_API_TOKEN`, `pollOnce`, upload to storage). Extract the shared 40 lines into `supabase/functions/_shared/fluxImage.ts` so we don't fork the pipeline.
- 4. Insert row, return URL.

Idempotency: rely on the UNIQUE constraint + `ON CONFLICT DO NOTHING` so two concurrent users in the same region don't double-generate.

Pre-warming: on first request, function generates only the requested month synchronously and fires-and-forgets the other 11 for that region in the background, so subsequent month requests by the same user are instant. No per-user storage, no regeneration per user — exactly the cache-by-region requirement.

### 4. PDF generation approach

**Decision: client-side, `@react-pdf/renderer`.**

Reasons:
- Already-rendered Supabase image URLs work directly in `<Image src=…>` without re-uploading binary to an edge function.
- Avoids large PDF buffers transiting an edge function; keeps function quota free.
- React component model lets us reuse `getDayInfo()` / `FEAST_DAYS` directly — no logic duplication.
- The other PDF-shaped exports in this codebase (`download-album`) are zip flows, not PDF, so there's no existing server PDF stack to extend.

New deps: `@react-pdf/renderer` (single dep, ~250kb, lazy-loaded only on the calendar page so it doesn't hit the main bundle).

Files:
- `src/lib/calendarPdf/MonthPage.tsx` — one A4-portrait page per scriptural month: hero image (top 55%), month label + year, weekday header (Day 1…Sabbath), day grid honoring 30/30/31 layout with feast names + sabbath shading + `*` for intercalary, footer line "Gregorian: <start>–<end>".
- `src/lib/calendarPdf/YearPlannerPage.tsx` — single landscape A3 (or A4 fold-out) page, 12 mini-columns, each a vertical strip of days color-coded for feasts/sabbaths. Optional 2nd page: feast-day list with Gregorian dates.
- `src/lib/calendarPdf/WallCalendarDocument.tsx` — composes 12 `MonthPage` + `YearPlannerPage` into one `Document`.
- `src/lib/calendarPdf/buildCalendar.ts` — orchestrator: takes `year` + `region_key`, calls `buildScripturalYear(year)`, fetches all 12 cached images via the edge function in parallel, renders to blob with `pdf().toBlob()`, triggers download.

QA gate: after generation, before delivering, render the doc to a Blob, convert first + last + a feast page to images and inspect — exactly the visual-inspection loop in our skill/pdf guidance, but client-side via the on-screen preview from `@react-pdf/renderer`'s `<PDFViewer>` shown in the UI before download.

### 5. UI entry point

**New page** `src/pages/PrintCalendarPage.tsx` at route `/calendar/print` (registered in `src/routes/AppRoutes.tsx` + `src/routes/lazyPages.ts` to lazy-load `@react-pdf/renderer`).

Entry points:
- Dashboard tile "Print My Calendar" next to the existing Sacred Day banner (one card in `src/pages/DashboardPage.jsx`).
- Link from `src/pages/Sow2GrowCalendarPage.tsx` header.

Flow (deliberately 3 clicks):
1. Page loads → reads `useUserLocation()`. If `verified=false` or coords missing, show a single inline card: "We'll use **<resolved place>** for seasonal artwork — Confirm / Change". `Change` opens the existing location editor pattern from `useUserLocation.updateLocation`.
2. User picks year (default = current scriptural year) and output (`Wall calendar` / `Year planner` / `Both`). Show live `<PDFViewer>` of month 1 as a preview while the other 11 cache-prime in the background.
3. **Download PDF** button — calls `buildCalendar()`, saves `Scriptural-Calendar-Year-<n>-<region_key>.pdf`.

No payment, no per-user storage, no email — just a browser download.

### Technical summary (one-glance)

```text
data:       src/utils/customCalendar.ts  (exists)
            src/utils/sacredCalendar.ts  (exists)
            src/utils/calendarYearBuild.ts  (new, pure)
            src/utils/calendarSeason.ts  (new, pure)

location:   profiles.latitude/longitude  (exists)
            src/hooks/useUserLocation.ts (exists)

cache:      public.seasonal_calendar_art  (new table, UNIQUE region_key+month)
            ai-generations bucket / calendar-art/<region>/<month>.webp  (existing bucket)

generate:   supabase/functions/_shared/fluxImage.ts  (extracted from generate-thumbnail)
            supabase/functions/get-or-generate-calendar-art/index.ts  (new)

pdf:        @react-pdf/renderer  (new dep, lazy)
            src/lib/calendarPdf/{MonthPage,YearPlannerPage,WallCalendarDocument,buildCalendar}.tsx

ui:         src/pages/PrintCalendarPage.tsx  (new, lazy)
            route /calendar/print  + dashboard tile
```

### Open questions before build

1. **Month names** — keep `"Month 1…12"` for v1, or do you have proper scriptural names you want baked in now?
2. **Year selector** — only current scriptural year, or also next year (useful for planners printed in advance)?
3. **Paper size** — A4 wall calendar OK, or do you want US Letter as the default?
