

# Event Tracking Data Pipeline

## What We're Building
A real `analytics_events` table and `user_consent` table in Supabase, then wiring up the existing SDK (`src/lib/analytics/sow2grow.ts`) to actually persist events to the database instead of logging to console. This becomes the data foundation for all future AI agents.

## Current State
- The SDK class `Sow2GrowAnalytics` already exists with full event tracking methods (product views, bestowals, follows, messages, video, etc.)
- It queues events and flushes every 5 seconds
- But the flush target (`src/api/analytics/events.ts`) is **stubbed** — it just logs to console
- `useMarketingStats` returns mock data because there's no events table
- No `analytics_events` or `user_consent` tables exist in the database

## Implementation Steps

### Step 1 — Create database tables (migration)

**`analytics_events` table:**
- `id` (uuid, PK)
- `user_id` (uuid, nullable — anonymous events allowed)
- `session_id` (text)
- `event` (text, indexed) — e.g. `product_view`, `bestowal_complete`, `session_start`
- `properties` (jsonb) — flexible payload for event-specific data (productId, revenue, roomId, etc.)
- `timestamp` (timestamptz)
- `device_model`, `os_version`, `screen_width`, `screen_height` (text/int)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (text, nullable)
- `attribution_channel` (text)
- `ip_country`, `ip_city` (text, nullable)
- `created_at` (timestamptz, default now())

**`user_consent` table:**
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, unique)
- `analytics` (boolean, default false)
- `marketing_attribution` (boolean, default false)
- `precise_location` (boolean, default false)
- `updated_at` (timestamptz)

**RLS policies:**
- `analytics_events`: Users can INSERT their own events. Only admins can SELECT all. Users can SELECT their own.
- `user_consent`: Users can read/write their own consent record.

**Indexes:**
- `analytics_events(event)` — for filtering by event type
- `analytics_events(user_id, timestamp)` — for per-user time queries
- `analytics_events(created_at)` — for time-range dashboards

### Step 2 — Create an edge function for event ingestion

**`supabase/functions/ingest-analytics/index.ts`**
- Accepts POST with JSON array of events
- Validates JWT (authenticated users) or allows anonymous with session_id
- Batch-inserts events into `analytics_events` using service role
- Extracts IP country/city from request headers (Supabase provides `x-forwarded-for`)
- Returns `{ success, inserted }` count

### Step 3 — Wire up the SDK to the edge function

**`src/lib/analytics/sow2grow.ts`** — Update `flush()` method:
- Replace the import of `@/api/analytics/events` with a direct call to `supabase.functions.invoke('ingest-analytics', { body: { events } })`
- Remove the stubbed `src/api/analytics/events.ts` file (no longer needed)

**`src/lib/analytics/sow2grow.ts`** — Update consent:
- On `setConsent()`, also save to `user_consent` table via Supabase client
- On `loadConsent()`, try loading from DB first (if logged in), fall back to localStorage

### Step 4 — Update useMarketingStats to use real data

**`src/hooks/useMarketingStats.ts`**:
- Replace mock data with actual queries against `analytics_events`
- Funnel: count events by type (`product_view` → `bestowal_start` → `bestowal_complete`)
- Attribution: group by `utm_source`
- Recent events: select latest 10 events
- Hourly revenue: aggregate `bestowal_complete` events by hour

### Step 5 — Add tracking calls at key touchpoints

Instrument these existing components (most already have the SDK imported but some don't call it):
- `ProductCard.tsx` — `trackProductView` on render, `trackProductTap` on click
- `BestowalCheckout.tsx` — `trackBestowalStart` on checkout initiation
- `PaymentSuccessPage.tsx` — `trackBestowalComplete` on success
- `UploadForm.tsx` — `track('product_listed')` on successful upload

## Files Changed
| File | Action |
|------|--------|
| New migration SQL | Create `analytics_events` + `user_consent` tables + RLS + indexes |
| `supabase/functions/ingest-analytics/index.ts` | New edge function for batch event ingestion |
| `src/lib/analytics/sow2grow.ts` | Wire flush to edge function, persist consent to DB |
| `src/api/analytics/events.ts` | Delete (replaced by edge function) |
| `src/hooks/useMarketingStats.ts` | Query real `analytics_events` table |
| `src/components/products/ProductCard.tsx` | Add tracking calls |
| `src/components/products/BestowalCheckout.tsx` | Add tracking calls |
| `src/pages/PaymentSuccessPage.tsx` | Add tracking calls |
| `src/components/products/UploadForm.tsx` | Add tracking calls |

