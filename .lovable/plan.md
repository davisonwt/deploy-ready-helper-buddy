# Plan — Task 1 (BestowalCheckout backend rebuild) + Task 2 (Navbar links)

## Background / why `complete-product-bestowal` is disabled

The function file itself states the reason in its top comment (verified):

> "This endpoint previously recorded 'completed' bestowals with no payment proof, allowing anyone to fake bestowals for any amount. Real bestowals must go through verified webhook flows. Re-enable only after this function is rebuilt to require a webhook-confirmed payment_transaction_id."

It was a client-trusted "I paid, please mark completed" RPC. We are NOT re-enabling it — we are replacing it with a `create-order-then-webhook-confirms` pattern that mirrors what `create-nowpayments-invoice` / `create-paypal-order` / `nowpayments-webhook` / `paypal-webhook` already do for single-seed bestowals and for top-ups.

Three payment cases the webhooks must handle after this work:
1. `topup:<id>` → already implemented (credit `sower_balances`).
2. Single bestowal → already implemented (`bestowals.id` is the `order_id` / PayPal `custom_id`).
3. **NEW: basket bestowal** → one buyer payment → multiple bestowal rows.

---

## TASK 1 — Multi-item basket checkout, payment-first

### Data model (one new migration)

`basket_orders` — one row per basket payment attempt:
- `id uuid pk`
- `user_id uuid` (buyer)
- `provider text check in ('nowpayments','paypal')`
- `provider_order_id text` (NOWPayments `order_id` we send = `basket:<uuid>`, or PayPal order id)
- `provider_invoice_id text null`, `approve_url text null`
- `pay_currency text null` (e.g. `usdcsol`)
- `subtotal numeric`, `processor_fee numeric`, `buyer_total numeric`, `currency text default 'USD'`
- `status text default 'pending'` (`pending|processing|completed|failed|expired`)
- `items jsonb` — snapshot: `[{ product_id, sower_id, title, unit_price, qty, line_total }]` (price snapshotted server-side at create time so a price change between checkout & webhook can't be exploited)
- `created_at`, `updated_at`, `completed_at`

`basket_order_bestowals` (optional convenience link):
- `basket_order_id uuid fk`, `bestowal_id uuid fk`, primary key on the pair.

Bestowal rows are NOT pre-created. They are inserted by the webhook on confirmed payment, then linked back via `basket_order_bestowals`. This is the key security property: no bestowal exists before processor confirmation.

Grants/RLS:
- `basket_orders`: `SELECT` to `authenticated` filtered by `user_id = auth.uid()`, no client insert/update (only edge fns via `service_role`). Gosat can read all.
- `basket_order_bestowals`: select-only to the buyer via join.

RPC: `finalize_basket_order(_basket_order_id uuid)` — security definer. Idempotent. Reads the snapshotted `items`, inserts one `bestowals` row per item with `payment_status='completed'`, `provider`, `provider_payment_id`, fee allocation copied from existing `buildDistributionData` flow, and inserts `basket_order_bestowals` rows. Marks basket_order completed. Returns array of created bestowal ids.

### Edge functions

**NEW `create-basket-bestowal-order/index.ts`** (replaces `complete-product-bestowal` semantically):
- Auth required (JWT, validate via anon client like the other create-* fns).
- Body: `{ items: [{ productId, qty }], provider: 'nowpayments'|'paypal', payCurrency?, redirectBaseUrl? }`.
- Server reloads each product from DB, recomputes `unit_price` and `line_total` (never trust client price). Builds `items` snapshot. Computes subtotal, processor fee via shared fee table, buyer_total.
- Inserts `basket_orders` row (status `pending`).
- Provider branch:
  - `nowpayments`: POST `/v1/invoice` with `order_id = basket:<basket_order.id>`, `price_amount = buyer_total`, `pay_currency`. Persist `provider_invoice_id`, `invoice_url`.
  - `paypal`: POST `/v2/checkout/orders` with `custom_id = basket:<basket_order.id>`, `value = buyer_total`. Persist `provider_order_id`, `approve_url`.
- Returns `{ basketOrderId, invoiceUrl|approveUrl, breakdown }`.

**REWRITE `complete-product-bestowal/index.ts`** → keep file path so nothing 404s, but make it a thin 410 with a clear redirect message pointing to `create-basket-bestowal-order`. Or delete file + remove from `supabase/config.toml` if listed. (Recommendation: delete to avoid dead code; flag here so you can veto.)

**EDIT `supabase/functions/nowpayments-webhook/index.ts`**
- In `handlePaymentEvent`, add a third branch BEFORE the existing bestowal-id branch:
  ```
  if (orderId.startsWith('basket:')) { handleBasketEvent(...) ; return; }
  ```
- `handleBasketEvent` updates `basket_orders.status`, and on success calls `supabase.rpc('finalize_basket_order', { _basket_order_id })`. Idempotent: RPC no-ops if already completed.
- On failure/expiry update status only.

**EDIT `supabase/functions/paypal-webhook/index.ts`**
- Same three-way branch on `customId` (`topup:` / `basket:` / else bestowal). Mirror the NOWPayments behaviour.
- Both `CAPTURE.COMPLETED` and `CHECKOUT.ORDER.APPROVED` paths must handle the `basket:` prefix consistently with how they currently handle bestowals.

### Frontend

**EDIT `src/components/products/BestowalCheckout.tsx`**
- Remove the per-item loop calling `complete-product-bestowal`.
- New `handleBestow` calls `supabase.functions.invoke('create-basket-bestowal-order', { body: { items: basketItems.map(i => ({ productId: i.id, qty: i.quantity ?? 1 })), provider, payCurrency: provider === 'nowpayments' ? 'usdcsol' : undefined } })`.
- Branch on response:
  - NOWPayments → `window.open(invoiceUrl, '_blank')`, clear basket optimistically only after invoice open (success toast says "Complete payment in the new tab — your bestowals will appear once confirmed").
  - PayPal → `window.location.href = approveUrl` (full redirect; do NOT clear basket here, basket is local-storage; let `PaymentSuccessPage` / webhook completion clear it via a post-return effect, or clear on `beforeunload`).
- Keep `ProviderPicker` + fee preview UI exactly as is.
- Remove the inline XP-award call; that should fire from the webhook-finalize RPC (note in plan, not changed in this file).
- Confetti / floatingScore move to `PaymentSuccessPage` (or a polled check of `basket_orders.status`). For this task: just remove the premature celebration; flag the success-page polling as a follow-up.

**Optional (recommended)**: a tiny `src/hooks/useBasketOrder.ts` mirroring `useNowPayments` shape so future call-sites reuse it.

### Files touched — TASK 1 summary

- NEW migration: `basket_orders` table + grants + RLS + `basket_order_bestowals` + `finalize_basket_order` RPC.
- NEW `supabase/functions/create-basket-bestowal-order/index.ts`.
- EDIT `supabase/functions/nowpayments-webhook/index.ts` (add `basket:` branch).
- EDIT `supabase/functions/paypal-webhook/index.ts` (add `basket:` branch in both event types).
- EDIT `src/components/products/BestowalCheckout.tsx` (replace submit path).
- DELETE (or 410-stub) `supabase/functions/complete-product-bestowal/index.ts` — **awaiting your call**.
- NEW `src/hooks/useBasketOrder.ts` (optional).

### Explicit non-changes (scope-lock)

- `QuickBestowModal.tsx` untouched — it's the single-seed path and already secure.
- `MyWalletPage` top-up flow untouched.
- `distribute-bestowal` / payout dispatch untouched — finalize RPC reuses existing distribution code path.
- No price recompute logic added to client.

---

## TASK 2 — Navbar links

Single file: `src/components/Layout.jsx`.

1. **Add a `isGosat` boolean** alongside the existing `isAdminOrGosat`:
   - In the role-load `useEffect` (around line 78), also `setIsGosat(roles.includes('gosat'))` from a new `useState`.
   - Add `shouldShowGosatOnly = useMemo(() => isGosat && !rolesLoading, ...)` next to `shouldShowAdminButton`.

2. **"My Wallet" link** — add to `groupedNavigation` "Let It Rain" group (it's the money-related cluster) OR as a new entry in the existing dropdown that contains wallet items. Concretely, insert into the `"Let It Rain"` items array around line 180:
   ```
   { name: "My Wallet", href: "/wallet", icon: Wallet }
   ```
   `Wallet` icon is already imported (used by gosat's "Organization Wallets" entry).

3. **"Treasury" link** — gosat-only. Add inside the existing `"gosat's"` group (around line 196-200) but conditional on `shouldShowGosatOnly` instead of the group's outer `shouldShowAdminButton`:
   - Simplest: split into two spreads:
     ```
     ...(shouldShowAdminButton ? [{
       name: "gosat's", icon: Settings,
       items: [
         ...existing items,
         ...(shouldShowGosatOnly ? [{ name: "Treasury", href: "/admin/treasury", icon: Wallet }] : [])
       ]
     }] : [])
     ```
   - This keeps Treasury hidden from `admin`-only users and visible only to true `gosat`.

4. No route changes (`/wallet` and `/admin/treasury` already registered in `AppRoutes.tsx`).

### Files touched — TASK 2 summary

- EDIT `src/components/Layout.jsx` only (add `isGosat` state, add 2 nav entries).

---

## Build order

1. Migration (`basket_orders` + RPC).
2. Edge function `create-basket-bestowal-order`.
3. Webhook edits (NOWPayments + PayPal `basket:` branches).
4. Frontend `BestowalCheckout.tsx` swap.
5. Delete/stub `complete-product-bestowal` (after step 4 is verified).
6. Layout.jsx nav links (independent — can land anytime; suggest last so they ship together).

## Flags requesting your call

- **Delete vs 410-stub** `complete-product-bestowal`? Recommend delete.
- **Where the success celebration lives** post-redirect — propose follow-up task to make `PaymentSuccessPage` poll `basket_orders.status` and fire confetti there.
- **XP award** moves into `finalize_basket_order` RPC (one award per basket, 100 XP × items).
- **Quantity** — `basket_items` row has `quantity`; current BestowalCheckout ignores it. New flow respects it. Confirm that's desired.
