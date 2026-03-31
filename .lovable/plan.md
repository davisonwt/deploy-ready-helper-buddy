

# Providers Feature — Complete Build Plan

This is a large feature touching database, backend, feed integration, and multiple new pages. It will be built in **6 phases** to keep each step testable and avoid breaking existing functionality.

---

## Phase 1: Database Schema

New tables and enum additions via SQL migrations:

**1. Add `provider` to `app_role` enum**
```sql
ALTER TYPE public.app_role ADD VALUE 'provider';
```

**2. Create `providers` table**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, unique, not null)
- `subtype` (text: 'farmer' | 'homesteader' | 'manufacturer')
- `business_name` (text, not null)
- `bio` (text)
- `address_line` (text), `city` (text), `country` (text)
- `latitude` (numeric), `longitude` (numeric)
- `phone` (text), `email` (text)
- `payout_details` (jsonb) — wallet/bank info
- `logo_url` (text), `photos` (text[])
- `status` (text, default 'pending') — pending / approved / rejected
- `approved_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz, defaults)
- RLS: owners can read/insert their own row; admins/gosats can read all and update status

**3. Create `provider_products` table**
- `id` (uuid, PK)
- `provider_id` (uuid, FK → providers)
- `title` (text), `description` (text)
- `price` (numeric), `stock` (integer)
- `category` (text)
- `photos` (text[])
- `status` (text, default 'active')
- `created_at`, `updated_at`
- RLS: provider owner can CRUD; all authenticated can read active products

**4. Create `provider_orders` table**
- `id` (uuid, PK)
- `provider_id` (uuid, FK → providers)
- `product_id` (uuid, FK → provider_products)
- `buyer_id` (uuid, FK → auth.users)
- `quantity` (integer), `unit_price` (numeric), `total_amount` (numeric)
- `courier_fee` (numeric, default 0)
- `platform_commission` (numeric)
- `status` (text: 'pending' → 'confirmed' → 'picked_up' → 'delivered' → 'completed')
- `delivery_type` (text: 'local' | 'international')
- `delivery_address` (text), `delivery_city` (text), `delivery_country` (text)
- `created_at`, `updated_at`
- RLS: buyer can read own orders; provider can read orders for their products; admins can read all

**5. Create storage bucket** `provider-assets` (public) for logos and product photos.

---

## Phase 2: Provider Registration Form

**New page: `RegisterProviderPage.tsx`** (route: `/register-provider`)

Multi-step form:
1. **Step 1** — Subtype selection (Farmer / Homesteader / Manufacturer) with visual cards
2. **Step 2** — Business name, bio, phone, email
3. **Step 3** — Address with city/country fields (latitude/longitude via manual input or a simple geocoding lookup)
4. **Step 4** — Logo upload + farm/product photos (upload to `provider-assets` bucket)
5. **Step 5** — Payout details (wallet address or bank reference)
6. **Submit** — Inserts into `providers` table with status='pending', grants `provider` role after admin approval

Uses the same clean card styling as existing registration forms. Mobile-first layout.

---

## Phase 3: Admin Approval Flow

**Extend existing Admin Dashboard** (`AdminDashboardPage.jsx`) with a new "Provider Applications" tab, similar to the existing `ServiceProviderApplicationsDashboard`:
- List all pending/approved/rejected providers
- Show business name, subtype, bio, location, logo
- Approve / Reject buttons
- On approval: insert `provider` role into `user_roles` and set `providers.status = 'approved'`

---

## Phase 4: Provider Social Feed Card

**New card component: `ProviderFeedCard.tsx`** in `src/components/feed/cards/`

Follows the **clean vertical-stack architecture** (no absolute positioning, no z-index, no overlapping layers — per the established Memry card rules):
1. Provider logo/photo (full-width, aspect-ratio maintained)
2. Business name + subtype badge (Farmer 🌾 / Homesteader 🏡 / Manufacturer 🏭)
3. Short bio
4. Location (city + country)
5. Three action buttons in normal document flow:
   - **"Order Direct"** (primary, links to provider catalog)
   - **"View Products"** (secondary, same destination)
   - **"Message Provider"** (opens chat)

**Feed integration in `InlineMemryFeed.tsx` / `HomeFeed.tsx`:**
- Query approved providers and interleave `ProviderFeedCard` into the feed
- Cards appear automatically once status = 'approved'

---

## Phase 5: Provider Dashboard & Product Catalog

**New page: `ProviderDashboardPage.tsx`** (route: `/provider-dashboard`)
- Only accessible to users with `provider` role
- Tabs: **Products** | **Orders** | **Earnings**
- **Products tab**: List own products, Add/Edit product form (title, description, price, stock, category, photos)
- **Orders tab**: List incoming orders with status management (Confirm → Picked Up → Delivered → Completed)
- **Earnings tab**: Summary of total sales, platform commission (15% split: 10% tithe + 5% admin), pending payouts

**Public Provider Catalog page: `ProviderCatalogPage.tsx`** (route: `/provider/:providerId`)
- Shows provider info header (logo, name, bio, location)
- Grid of active products with photos, price, "Bestow" / "Order" button
- Product detail modal with quantity selector
- Delivery logic: compare buyer country vs provider country
  - Same country → local delivery, check community Drivers list
  - Different continent → add estimated courier surcharge to total

---

## Phase 6: Order & Delivery Flow + Bookkeeping

**Order placement:**
- Buyer selects product → chooses quantity → system calculates total (price × qty + courier fee if international)
- Creates record in `provider_orders`
- Platform commission auto-calculated (15%)

**Order status management:**
- Provider confirms order from their dashboard
- Status progression: Pending → Confirmed → Picked Up → Delivered → Completed
- Notifications via existing `send-notification` edge function

**Bookkeeping:**
- All orders tracked in `provider_orders` with commission and courier fee columns
- Provider earnings visible in their dashboard
- Admin can view all provider transactions in the existing admin payments area

**Whisperer integration:**
- Whisperers can share/promote Provider cards using existing sharing mechanics
- Provider products appear as sharable content in the Whisperer flow

---

## Technical Notes

- All new UI uses existing design system (rounded cards, blue-teal theme, cherry/leaf accents)
- All buttons are large and mobile-friendly (h-12+ touch targets)
- Provider cards follow the strict no-overlay, no-z-index rule established for Memry cards
- Storage uploads use the existing Supabase storage pattern
- The `app_role` enum gets a new `provider` value; the `RoleChecker` component already supports dynamic role arrays
- Estimated implementation: 6 phases, each independently testable

