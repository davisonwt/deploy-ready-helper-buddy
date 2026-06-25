## Goal

Replace the 7 disabled payment flows with **two** generic create-order + webhook-completion pipelines on NOWPayments and PayPal, mirroring what already works for orchard bestowals and basket orders.

---

## What already exists (reuse, don't recreate)

- `bestowals` table — has the full provider snapshot columns (`provider`, `base_amount`, `processor_fee_amount`, `buyer_total_amount`, `payout_provider`, `payout_destination`, `payout_status`, `payout_reference`, `distribution_data`, `provider_order_id`). Already the proven shape.
- `basket_orders` — finalized via `finalize_basket_order` RPC from the webhook (proves the "discriminator-by-prefix" routing pattern).
- Edge functions:
  - `create-nowpayments-invoice` / `create-paypal-order` — order creation pattern with sower-payout resolution + distribution snapshot.
  - `nowpayments-webhook` / `paypal-webhook` — already route by `order_id` prefix (`topup:`, `basket:`, bare uuid for orchard bestowals) and call `dispatchPayouts()`.
  - `_shared/distribution.ts` / `_shared/resolveSowerPayout.ts` — provider-agnostic payout splitter and wallet resolver. Both shapes will call these unchanged.
- `useNowPayments`, `usePaypal` hooks — already do the redirect handshake.

The 7 disabled flows all converge on the same two questions: (a) what does the buyer/bestower pay and to whom, (b) what happens on `payment_status=finished`. Everything else is shared.

---

## Shape 1 — Fixed-price content purchase

5 call sites, 5 different "what gets delivered":

| # | Entry point file | Content type | Delivery on success |
|---|---|---|---|
| 1 | `src/pages/S2GCommunityLibraryPage.tsx` | `library_item` | insert `s2g_library_item_access(user_id, library_item_id)` |
| 2 | `src/components/live/media/PurchaseModal.tsx` (mounted in `MediaDock.tsx`) | `live_session_media` | insert `live_session_media_purchases(user_id, media_id)` |
| 3 | `src/pages/S2GCommunityMusicPage.tsx` (via `useMusicPurchase.jsx`) | `music_track` | insert `music_purchases(user_id, track_id)` + send chat-delivered receipt |
| 4 | `src/components/premium/PremiumItemPurchaseModal.tsx` | `premium_item` | insert `premium_item_purchases(user_id, item_id)` |
| 5 | `src/components/premium/RoomAccessModal.tsx` (used by `PremiumRoomViewPage.tsx`) | `premium_room` | insert `premium_room_access(user_id, room_id, expires_at)` |

### 1. DB schema — extend, don't replace

Do **not** invent a unified `content_purchases` table. The 5 access tables already exist, are already referenced by RLS policies (e.g. `premium_room_access`, `live_session_media_purchases`, `s2g_library_item_access`) and have type-specific shapes (rentals have `expires_at`, music has track-specific fields, etc.). A unifying table would force a parallel write on every grant.

Instead add **one new ledger table** that all Shape-1 flows write at order creation, and that the webhook reads to know which access row to grant:

- `content_purchases` (new) — the payment-side row, one per buyer attempt. Columns:
  - `id`, `buyer_id`, `seller_id`
  - `content_type` enum: `library_item | live_session_media | music_track | premium_item | premium_room`
  - `content_id uuid` (polymorphic; not FK-enforced — validated in the create-order function)
  - Provider snapshot: same columns as `bestowals` (`provider`, `provider_order_id`, `base_amount`, `processor_fee_amount`, `buyer_total_amount`, `currency`, `payout_provider`, `payout_destination`, `payout_currency`, `payout_status`, `payout_reference`, `payout_error`, `distribution_data jsonb`)
  - Lifecycle: `payment_status` (`pending|processing|completed|failed|refunded|expired`), `created_at`, `paid_at`, `delivered_at`
  - Metadata: `quantity int default 1`, `pricing_snapshot jsonb` (room rental days, media duration, etc.)
- RLS: buyer sees own rows, seller sees rows where `seller_id = auth.uid()`, service_role full. Inserts service_role only (always inserted by edge function). GRANTs per the public-schema rule.
- The existing `s2g_library_item_access` / `live_session_media_purchases` / `music_purchases` / `premium_item_purchases` / `premium_room_access` rows become **derived** rows written by the webhook after `content_purchases` flips to `completed`. They keep being the source of truth for "does the user have access" — so RLS on the actual content keeps working unchanged.

### 2. Edge functions — one generic create + one generic completion router

Two new functions (mirroring the orchard pair):

- `create-content-purchase-order` — single function, branch on `content_type`:
  - For each `content_type`, a small in-file resolver looks up the content row, returns `{ seller_id, base_amount, currency, title, pricing_snapshot }`. Resolvers are 5 small switch arms, ~15 lines each. Anything not found → 404.
  - From there it's identical to `create-nowpayments-invoice`: compute processor fee, resolve seller payout wallet via `resolveSowerPayout`, call `buildDistributionData` (the 15% S2G split already applies to seller revenue), insert `content_purchases` row, create NOWPayments invoice OR PayPal order with `order_id = "content:<content_purchases.id>"`, return checkout URL.
  - Provider choice is a `provider: 'nowpayments' | 'paypal'` field on the request body — same edge function returns either invoice URL or PayPal approval URL. Keeps the call-site code one branch.
- `complete-content-purchase` — invoked by the webhook router (see below). One function, branches on `content_type` to write the type-specific access row inside a single transaction with the `content_purchases` row flip. Branches:
  1. `library_item` → insert `s2g_library_item_access`
  2. `live_session_media` → insert `live_session_media_purchases`
  3. `music_track` → insert `music_purchases` + enqueue a chat-delivered receipt (existing chat insert pattern)
  4. `premium_item` → insert `premium_item_purchases`
  5. `premium_room` → insert `premium_room_access` with `expires_at = now() + pricing_snapshot.rental_days * interval '1 day'`
  
  Yes, delivery differences force per-type completion logic — but it lives in **one** branched function, not 5 functions. That's the "type-specific completion within a shared pipeline" you asked about.

Webhook changes (small):
- `nowpayments-webhook` and `paypal-webhook` get a new `order_id` prefix branch: `content:<uuid>` → call `complete-content-purchase` (or inline it — leaning inline for consistency with how `finalize_basket_order` is called as an RPC; the RPC route is even cleaner, see Technical notes).

### 3. Frontend wiring — minimal per call site

All 5 call sites converge on **one new hook**: `useContentPurchase({ contentType, contentId, provider })`. Inside, it calls `create-content-purchase-order`, gets back a checkout URL, and redirects (same pattern as `useNowPayments`).

Per call-site changes:

- `S2GCommunityLibraryPage.tsx` — replace the existing disabled toast in the "Get for $X" handler with `useContentPurchase({ contentType: 'library_item', contentId: item.id })`.
- `PurchaseModal.tsx` (live media) — same replacement; remove the disabled banner.
- `S2GCommunityMusicPage.tsx` + `useMusicPurchase.jsx` — `useMusicPurchase` becomes a thin wrapper around `useContentPurchase` with `contentType: 'music_track'`.
- `PremiumItemPurchaseModal.tsx` — strip the "temporarily disabled" body, render a NOWPayments/PayPal picker, call the hook.
- `RoomAccessModal.tsx` — same; rental-days selection lives in `pricing_snapshot` passed by the call site.

No call site touches the access tables anymore — that's webhook-only.

---

## Shape 2 — Free-will gift

2 call sites:

| # | Entry point | Recipient resolution |
|---|---|---|
| 6 | `useLiveBestowal` / `useRadioBestowal` (used by `BestowalDialog.tsx`, radio bestow buttons) | `sowerId` from session host |
| 7 | `BestowalCoin.tsx` (chat tipping) | recipient is the other chat participant |

### 1. DB schema — reuse `bestowals`

`bestowals` already has every column we need. Add only:

- `bestowals.context_kind text` — nullable: `'orchard' | 'live_session' | 'radio_session' | 'chat_tip'`. `orchard` is the existing default behavior (kept as `NULL` for back-compat, or backfilled).
- `bestowals.context_id uuid` — nullable; session id / chat room id / orchard id depending on `context_kind`.
- Existing `orchard_id` stays NOT NULL for now? Check — likely needs to be made nullable for `live_session`/`chat_tip` rows. **Confirm before migration** (this is a constraint change on an existing table).

That's it. `distribution_data`, `payout_provider`, `payout_destination`, `dispatchPayouts` all keep working because gifts use the same recipient-wallet → S2G-fee split.

### 2. Edge functions — one new pair, but skinny

- `create-gift-bestowal-order` — accepts `{ recipientId, amount, contextKind, contextId, provider, message? }`. Resolves recipient's payout wallet (`resolveSowerPayout`), builds a distribution snapshot with no orchard (sower leg = recipient, no grower split), inserts `bestowals` row with `orchard_id=null`, `context_kind`, `context_id`. Creates NOWPayments invoice or PayPal order with `order_id = "gift:<bestowals.id>"`.
- Webhook routing — `nowpayments-webhook` / `paypal-webhook` get one more prefix branch: `gift:<uuid>` → resolve to `bestowals` row, flip `payment_status='completed'`, call `dispatchPayouts` (already provider-aware). No new completion function needed because there's nothing to deliver — gifts grant no access.

Special case for chat tips: after `dispatchPayouts` succeeds, insert a system message in the chat room (`chat_messages` insert, same pattern used elsewhere) so the recipient sees "X bestowed $Y". This is a 10-line addition in the webhook's gift branch.

### 3. Frontend wiring

- `useLiveBestowal` — currently returns the "disabled" toast. Replace its body with a call to `create-gift-bestowal-order` with `contextKind='live_session'`. `BestowalDialog.tsx` stays unchanged.
- `useRadioBestowal` — same change with `contextKind='radio_session'`.
- `BestowalCoin.tsx` — replace its current disabled handler with the same hook (`contextKind='chat_tip'`, `contextId=room_id`, `recipientId=other_participant_id`).

Both hooks can share **one** underlying primitive `useGiftBestowal({ recipientId, contextKind, contextId })`. The two named hooks stay as thin facades to avoid touching every call site.

---

## Sequencing

Build order, and which to verify end-to-end before wiring siblings:

1. **Shape 2 first.** It needs zero new tables (just two new nullable columns on `bestowals`) and the webhook router already does almost everything. The smallest possible diff that proves the "discriminator prefix + dispatchPayouts" pattern still works for non-orchard recipients.
2. **Within Shape 2: wire `BestowalCoin.tsx` (chat tip) first.** Reasons:
   - It's the most constrained recipient resolution (the other chat participant — no host/session lookup needed).
   - It exercises the post-completion side-effect (system chat message) which is the only novel piece.
   - It's the easiest to manually verify: open a 1-on-1, send a $1 tip, sandbox-pay, watch the chat row appear and the recipient's `bestowals` row flip to `completed`.
   - Once green, `useLiveBestowal` and `useRadioBestowal` are literally swapping `contextKind`.
3. **Then Shape 1.** New table + new generic create + branched completion. Larger surface but proven webhook plumbing.
4. **Within Shape 1: wire `S2GCommunityLibraryPage.tsx` (library_item) first.** Reasons:
   - Simplest delivery (single insert into `s2g_library_item_access`, no expiry, no chat side-effect).
   - The library access row is already a working grant gate — easy to verify "did the buyer get access" via the existing `MyS2GLibraryPage`.
   - Forces the `content_purchases` table and webhook routing to be right before adding the 4 branched delivery cases.
   - Once green, the other 4 are each ~one resolver + one completion branch.

---

## Technical notes (non-user-facing)

- **RPC vs inline completion**: prefer an RPC `finalize_content_purchase(_purchase_id uuid)` called from the webhook, mirroring `finalize_basket_order`. Keeps the webhook function lean and the access-grant logic atomic with the `payment_status` flip (single transaction). Same approach for the gift webhook branch: `finalize_gift_bestowal(_bestowal_id uuid)`.
- **Idempotency**: `processed_webhooks` already keys on `provider + payment_id + payment_status`. No change. The `finalize_*` RPCs must be idempotent (use `on conflict do nothing` on access-row inserts).
- **Refunds**: out of scope for this rebuild — neither shape currently emits refunds. If a `refunded`/`failed` IPN arrives after access was granted, the webhook flips `payment_status` but does **not** auto-revoke access. Note this as a follow-up so we don't silently rebuild the bug.
- **Provider fee**: keep the existing pattern of `processor_fee` added on top of `base_amount` so the seller/recipient always nets the full listed price. No change in fee math vs orchards/baskets.
- **Migration safety on `bestowals`**: making `orchard_id` nullable affects existing RLS policies — audit `bestowals` policies before the migration and update any that assume `orchard_id IS NOT NULL`.
- **Hook test pages already exist**: `NowPaymentsTestPage.tsx` and `PaypalTestPage.tsx` can be reused (or extended) to smoke-test both new endpoints without going through the real UI.

## Out of scope (flag, don't fix)

- Refund/revocation flow.
- Buyer-side currency picker UX (use the existing `nowpayments-list-currencies` function).
- Replacing the legacy `purchase-music-track` and `purchase-media` functions — leave them in place until the new pipeline is verified, then delete in a follow-up.
