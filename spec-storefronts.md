# spec-storefronts.md — Shops in the mall

Status: decided 2026-08-29. Builds on spec-books.md (a business is a
`companies` row with its own set of books). Depends on books build-order
steps 1–2 being done (every product has `company_id`).

## 1. The idea

Sow2Grow is the mall; each business is a shop. A shop has its own door
(`/store/<slug>`), its own shelves (only its seeds), and its own till (its
own set of books). The walkways — Tribal Gardens, search, the Stores tab,
the Wandering Directory — are shared, and the tribe is paid to bring people
through the doors (referral 1%, whisperers, wheels).

A business becomes a shop by turning on **Storefront** in Profile → My
businesses. Individual sowers with a few seeds stay as they are today —
stallholders in the feed, no shop needed.

Vocabulary: "shop" and "storefront" in member-facing copy. Never "company".

First shop: the pharmacy (bulk upload commitment). Acceptance test: a
1,000-row stock file becomes a live storefront in one sitting.

## 2. Schema

`companies` — add: `is_store boolean not null default false`,
`store_tagline text`, `store_theme jsonb` (accent colour, banner url, logo
url — logo/banner columns already exist, reuse), `store_categories text[]`,
`collect_address text`, `offers_collect boolean default true`,
`offers_delivery boolean default false`, `location_lat/lng` nullable.
`slug` already exists and is unique.

`products` — add: `sku text`, `stock integer` (null = not tracked),
`category text` (already exists — reuse), `status` gains `draft` and
`archived` (check existing enum/values first). Unique index on
`(company_id, sku) where sku is not null`.

`bulk_upload_jobs` — already exists. Extend to: `company_id`, `mapping
jsonb` (saved column mapping), `row_count`, `created_count`,
`updated_count`, `archived_count`, `error_rows jsonb`, `status`
(`uploaded | mapped | previewing | planting | done | failed`).

`basket_orders` — already exists. Add `company_id`, `fulfilment`
(`collect | delivery`), `fulfilment_status`
(`new | ready | collected | out_for_delivery | delivered`), `wheel_booking_id`
nullable (FK to the Wheel booking when delivery is via a Wandering Wheel).

## 3. Bulk upload (the "Got a lot to add at once?" button)

Route `/sow/bulk`. Four screens, progress saved in `bulk_upload_jobs` so
they can leave and come back.

1. **Drop the file** — CSV or XLSX. Also a ZIP of images named by SKU
   (`ABC123.jpg`) or an `image_url` column. Files go to a private bucket
   under the company's folder.
2. **Map columns** — S2G fields on the left, their column headers on the
   right, auto-matched by name. Required: name, price. Optional: sku,
   category, stock, description, image, barcode. Mapping is saved
   on the company; next upload skips this screen unless headers changed.
3. **Review** — a grid of all rows as drafts: image thumb, name, price,
   category, stock, status pill (ready / missing image / missing price /
   duplicate SKU). Filter to problems. Inline edit. "Missing image" rows
   get a placeholder and can still plant. Counter at the top: "968 ready,
   32 need attention".
4. **Plant all** — one button. Progress bar with real numbers: "847 of
   1,000 planted". Runs server-side in batches of 50 via an edge function;
   the page polls the job. On done: confetti, "Your shop is live", the
   storefront link, and a Share button (same referral-embedded link
   pattern as Learn & Share).

Upsert rule: match on `(company_id, sku)`. Existing row → update price,
stock, name, category, description; keep id, cover, sales history. Row in
DB but not in the file → `archived` (not deleted, not visible). No SKU
column → every row is a create; warn on screen 2.

Pharmacy rule (decided with the pharmacy, Aug 2026): **no scheduled
medicines are listed — front-shop stock only.** No schedule column, no
"request from pharmacist" flow. `prescription_requests` stays as it is
today and is not part of this spec. If a row's category or name suggests a
scheduled item, do nothing special — that's the shop's responsibility.

## 4. The storefront

`/store/<slug>` — public route, no auth (same pattern as `/learn-share/:id`;
referral capture on `?ref=`).

- Header: logo, name, tagline, location, "Open now"-style collect/delivery
  badges, Follow, Chat, Share.
- Search box scoped to this shop. Category chips from `store_categories`.
  Sort: newest, price, name. Filters: in stock, on special.
- Grid of the shop's active products only, ProductCard with the shop badge
  hidden (it's implied). Infinite scroll; 1,000 items must not load at once.
- Shelves: "New this week", "On special" (products with `compare_at_price`
  if that exists, else skip for v1), "Top sellers".
- Basket button, sticky on mobile.

Shop owner view of the same page: a "Manage" bar — Bulk upload, Add one
seed, Edit shop, Orders (n new), Books. Nothing else changes; what they
see is what buyers see.

## 4a. Shop presets by Wandering kind

Every Wandering kind has a **preset theme** so a service provider gets a
finished-looking shop the moment they unlock a role, with zero design work.
Musicians and product shops can override; trades mostly won't.

`store_theme jsonb` (already on `companies`) holds `{ preset, accent,
banner_url, logo_url, tagline_style, chips[] }`. A new `src/lib/store/presets.ts`
defines one preset per kind:

| kind | accent | tagline (default) | chips |
|---|---|---|---|
| pillow | gold on deep green | Rest. Recharge. Belong Anywhere. | Private homes · Hotels · Farms & retreats · Holiday getaways |
| hand | teal | Skilled Hands. Trusted Service. | Plumbers · Electricians · Mechanics · Builders · & more |
| wheel | orange | Move What Matters. | Passenger rides · Deliveries · Plough land · Move materials · Any vehicle |
| field | green | From Our Fields to Our Tribe. | Fresh produce · Seasonal goods · Direct from farmers |
| hearth | red | Made with Love. Shared with You. | Handmade crafts · Homemade foods · Artisan products |
| forge | slate | (to write) | Custom made · Commissions · Repairs |
| heart | emerald | (to write) | Care · Companionship · Support |

Whisperer has no shop preset — it's a service hired by shops, not a place
to shop (see spec-wandering-doors.md).

Rules:
- On role unlock (spec-service-seeds §4) the business gets
  `store_theme.preset = <kind>` if it has no theme yet, and `is_store`
  stays off until they turn it on in Profile. A business with several
  roles keeps the first preset; they can change it in Edit shop.
- The storefront header (§4) renders from the preset: banner image (from a
  small set of stock banners per kind shipped in `/assets/wandering/`),
  accent colour on buttons and chips, tagline defaulting to the preset's
  unless `store_tagline` is set, chips from `store_categories` if set else
  the preset's.
- Overrides: Edit shop lets them pick a different preset, upload their own
  banner/logo, and change accent. Nothing else about the page changes.
- The sower's own photo, name and town always come from their profile /
  role row, never from the preset.
- Hands preset chips are trades only. No Dentists / Doctors until the
  licensed-professional question is answered by the lawyer.

Build: with step 2 (bulk upload) or earlier if the Hand form (service-seeds
step 3) lands first — a Hand's shop should look right on day one.

## 5. Basket and checkout

One basket per shop (mixed-shop baskets are out of scope for v1). Checkout
= one PayPal order via the existing basket path (`basket_orders`,
paypal-webhook primary, safety nets unchanged, 15% S2G on top). On
finalize: existing 3 chat messages + an order card in a chat thread
between buyer and shop with the line items, fulfilment choice and status.

Fulfilment is the shop's job. S2G shows stock, takes the order, pays out on
the normal schedule. The shop updates `fulfilment_status` from its Orders
tab; each change posts to the order thread. If `offers_delivery` and the
shop has no driver of its own, "Deliver with a Wandering Wheel" books a
Wheel per spec-service-seeds §7, paid by the buyer as a second line.

Stock decrements on finalize; a product at 0 shows "Out of stock" and
can't be added. Stock alert to the shop's chat when any tracked item drops
below 5.

## 6. The walkways

- **Tribal Gardens**: a shop appears as **one card** — logo, name, "1,000
  seeds", location, Visit — never as a thousand product cards. Individual
  products from shops still appear in **search results** with a small shop
  badge, so "paracetamol" finds the pharmacy.
- **Stores tab** in Tribal Gardens and a **Shops** section in the Wandering
  Directory, sorted by distance when the viewer has a location, else
  newest.
- Shop Follow: followers get a chat message when the shop posts a special
  (v1: manual "Post an update" from the Manage bar).

## 7. Joy

- Upload done → confetti, live link, Share. First sale → chat card "Your
  first sale at {shop}". Friday 08:00 SAST chat digest: sales this week, top
  seller, items low on stock, Books updated.
- Re-upload next week: "Updated 214 prices, added 12 new items, archived 3."
- Everything a shop needs is behind one Manage bar on its own page. No
  separate admin area.

## 8. Build order

1. Schema (§2) + `/store/<slug>` public page reading existing products
   (§4, owner Manage bar with just Edit shop + Books). Turn on Storefront
   for davison's business as the test shop.
2. Bulk upload screens 1–4 with CSV only, no images, create-only (§3).
   Acceptance: a 100-row test CSV.
3. Upsert by SKU, archive-on-missing, image ZIP / URL column.
4. Basket + checkout + order thread + fulfilment status (§5). Test as the
   next untested purchase kind: 2 `processed_webhooks` rows, no immediate
   payout.
5. Walkways: shop card in Tribal Gardens, Stores tab, Directory section,
   product search with shop badge (§6).
6. Delivery via Wandering Wheel (needs service-seeds §7 booking live),
   Follow + updates, Friday digest.

Step 1 can start as soon as books steps 1–2 are in. Steps 2–3 are the
pharmacy commitment; do them before service-seeds step 3.

## 9. Out of scope for v1

Mixed-shop baskets, refunds/cancellations (manual via admin), stock sync
with a POS API, variants (size/colour — one row per variant for now),
promotions engine, reviews, multi-currency, scheduled medicines of any
kind.
