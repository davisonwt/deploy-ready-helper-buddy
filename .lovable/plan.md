
# NOWPayments + PayPal Migration — Full Plan

Part 1 (schema + sower onboarding) is already approved. This plan covers Parts 2–6 end-to-end and references Part 1 only where downstream code depends on the new columns.

Recap of Part 1 columns now available on `bestowals`:
`provider`, `provider_order_id`, `base_amount`, `processor_fee_amount`, `processor_fee_currency`, `buyer_total_amount`, `payout_provider`, `payout_destination`, `payout_currency`, `payout_status`, `payout_reference`, `payout_fee_amount`, `payout_attempted_at`, `payout_completed_at`, `payout_error`.

`user_wallets` extended with `nowpayments_crypto` and `paypal_email` wallet types.

---

## Part 2 — NOWPayments integration (primary processor)

### Secrets required (already present per user)
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET` (verify; if missing, user must add)

### New edge functions

**`supabase/functions/create-nowpayments-invoice/index.ts`**
- Input: `{ seedId | orderItems[], qty, payCurrency, buyerNote? }`
- Auth required (JWT validated in code).
- Server-side price recompute (never trust client):
  - `base_amount = seed_price × qty` (USDC reference)
  - `s2g_fee = base_amount × 0.15`
  - Quote processor fee via `GET /v1/estimate?amount=<base>&currency_from=usd&currency_to=<payCurrency>` then `min-amount` check.
  - `processor_fee_amount` = NOWPayments' published % (store config in `payment_config` table, default 1.0%) applied to `base_amount`, rounded up to 2dp.
  - `buyer_total_amount = base_amount + processor_fee_amount`.
- Create row in `bestowals` with `provider='nowpayments'`, `payout_status='pending'`, snapshot of sower's selected `payout_destination` + `payout_provider` + `payout_currency` (looked up from `user_wallets` for the seed's owner; if none → 400 "Sower has no payout method").
- Call `POST https://api.nowpayments.io/v1/invoice` with `price_amount=buyer_total_amount`, `price_currency='usd'`, `pay_currency=payCurrency`, `order_id=<bestowal.id>`, `ipn_callback_url=<webhook URL>`, `success_url`, `cancel_url`.
- Store `provider_order_id = invoice.id`.
- Return `{ bestowalId, invoiceUrl, payAddress?, expiresAt }`.

**`supabase/functions/nowpayments-webhook/index.ts`**
- Public (no JWT). `verify_jwt = false` in `supabase/config.toml`.
- Verifies `x-nowpayments-sig` HMAC-SHA512 of sorted JSON body with `NOWPAYMENTS_IPN_SECRET`.
- Idempotency via existing `processed_webhooks` table (key = `nowpayments:<payment_id>:<payment_status>`).
- Maps statuses: `waiting`→noop, `confirming`/`sending`→`bestowals.release_status='processing'`, `finished`/`partially_paid`→trigger distribution, `failed`/`expired`/`refunded`→`release_status='failed'`.
- On success: invoke `_shared/distribution.ts → distributeBestowal(bestowalId)`.

**`supabase/functions/nowpayments-payout/index.ts`** (service-role only, called from `distribution.ts`)
- Wraps NOWPayments Mass Payouts: `POST /v1/payout` with batched withdrawals to the sower's `payout_destination`/`payout_currency`.
- Requires 2FA-enabled NOWPayments account + payout JWT (`NOWPAYMENTS_PAYOUT_JWT` secret — user must add after enabling 2FA in their NOWPayments dashboard; flagged in Part 6 manual checklist).
- Writes `payout_reference`, `payout_attempted_at`, `payout_status='processing'`. Polling/finalization handled by webhook OR a follow-up `nowpayments-payout-status` cron (Part 6 decision: webhook preferred — NOWPayments supports payout IPN to the same endpoint).

### `_shared/distribution.ts` changes

Current file (353 lines) is Binance/Cryptomus-specific. Refactor to be provider-agnostic:

1. Add `payoutProvider: 'nowpayments' | 'paypal' | 'binance' | 'manual'` resolution from the `bestowals` row (not from caller).
2. Extract per-provider payout dispatch into a strategy map:
   ```
   strategies = {
     nowpayments: dispatchNowpaymentsPayout,
     paypal:      dispatchPaypalPayout,
     binance:     dispatchBinancePayout,   // legacy, kept for in-flight rows
     manual:      enqueueManualPayout,
   }
   ```
3. Split amounts using the new columns:
   - Sower amount = `base_amount × 0.85`
   - S2G amount = `base_amount × 0.15`
   - `processor_fee_amount` is informational only (already collected from buyer; not split).
   - `payout_fee_amount` is whatever the chosen rail charges — deducted from sower's net by the rail, recorded post-hoc from the payout response.
4. Update writes to `payout_status` (`processing` → `sent` | `failed` | `manual_required`).
5. Unknown / missing payout method → `manual_required` and a row in existing `ManualDistributionQueue` source (`sower_payouts` table).

### Client wiring
- `src/hooks/useNowPayments.tsx` (new) — mirrors `useBinancePay.tsx`, exposes `createInvoice(payload)` and `pollStatus(bestowalId)` (Realtime subscribe to `bestowals` row).
- `src/components/payment/NowPaymentsButton.tsx` (new) — opens invoice URL in new tab + Realtime status.
- `BestowalCheckout.tsx`, `QuickBestowModal.tsx`: add NOWPayments as **default** option in provider selector; Binance demoted to "Legacy" and hidden behind a feature flag (`VITE_ENABLE_BINANCE_PAY`).

---

## Part 3 — PayPal integration (alternative processor)

### Account-side setup the user must do themselves
PayPal Payouts API is gated. Document in onboarding banner + README:
1. Create PayPal Business account (not personal).
2. developer.paypal.com → Apps & Credentials → create REST app with **Payouts** feature enabled (requires PayPal approval; can take 1–3 business days; some regions/business types are denied — surface this risk in UI).
3. Save Client ID + Secret for both Sandbox and Live.
4. Configure webhook listener in PayPal dashboard pointing to the new webhook URL (provided post-deploy).
5. For Mass Payouts above $20K/month, complete PayPal's KYB upgrade.

### Secrets required
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENV` (`sandbox` | `live`)

### New edge functions

**`supabase/functions/_shared/paypal.ts`** — OAuth2 token cache, signed request helper, base URL switch.

**`supabase/functions/create-paypal-order/index.ts`**
- Same server-side price recompute as NOWPayments.
- PayPal fee model: store regional fee rates in `payment_config` (defaults: US 3.49%+$0.49, intl 4.99%+fixed). `processor_fee_amount` rounded to 2dp.
- `buyer_total_amount = base_amount + processor_fee_amount`.
- `POST /v2/checkout/orders` with `intent=CAPTURE`, `purchase_units[].amount.value=buyer_total_amount`, `custom_id=<bestowal.id>`.
- Insert `bestowals` row with `provider='paypal'`, `provider_order_id=order.id`.
- Returns `{ bestowalId, approveUrl }`.

**`supabase/functions/capture-paypal-order/index.ts`**
- Called by SDK on buyer approval (frontend redirect/callback).
- `POST /v2/checkout/orders/{id}/capture`, verifies amount matches `buyer_total_amount`.
- On success → invoke `distribution.ts`.

**`supabase/functions/paypal-webhook/index.ts`**
- `verify_jwt = false`.
- Verifies signature via `POST /v1/notifications/verify-webhook-signature` using `PAYPAL_WEBHOOK_ID`.
- Idempotency via `processed_webhooks` (key = `paypal:<event.id>`).
- Handles `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED/REFUNDED`.

**`supabase/functions/paypal-payout/index.ts`** (service-role, called from `distribution.ts`)
- `POST /v1/payments/payouts` single batch item to sower's `payout_destination` (their PayPal email).
- Sets `payout_reference = payout_batch_id`, `payout_status='processing'`.
- Payout completion confirmed via webhook event `PAYMENT.PAYOUTS-ITEM.SUCCEEDED/FAILED` — handled by `paypal-webhook` which updates `bestowals.payout_status` and `payout_fee_amount` from `payout_item_fee`.

### Client wiring
- `src/hooks/usePayPal.tsx` (new) — loads PayPal JS SDK (`https://www.paypal.com/sdk/js?client-id=...&intent=capture`), exposes `<PayPalButton/>` render.
- `src/components/payment/PayPalButton.tsx` (new).
- Added to `BestowalCheckout.tsx` + `QuickBestowModal.tsx` as second option.

---

## Part 4 — Fee transparency in checkout UI

A single source of truth: new util `src/lib/payments/feeQuote.ts` exporting `quoteFees({ baseUsd, provider, region })` returning `{ baseAmount, s2gFee, processorFee, processorPct, buyerTotal, label }`. Used by both checkout AND `UploadForm.tsx` pricing preview so sellers see what buyers will see.

UI components to update (presentation only):
- **`src/components/products/BestowalCheckout.tsx`** — replace single-line total with a 4-row breakdown:
  ```
  Seed price:           $X.XX
  Sow2Grow fee (15%):   $X.XX   (info: "supports the platform")
  Network/processor:    $X.XX   (info: "{provider} fee — paid to processor")
  ─────────────────────
  You pay:              $X.XX
  ```
- **`src/components/bestow/QuickBestowModal.tsx`** — same breakdown, compact.
- **`src/components/products/UploadForm.tsx`** — pricing preview shows what buyer sees for both providers side-by-side ("Buyer pays via NOWPayments: $X / via PayPal: $Y").
- **Provider selector component (new): `src/components/payment/ProviderSelector.tsx`** — radio cards showing each rail's fee % + estimated total + ETA + caveat ("Crypto" / "Card or PayPal balance").
- Tooltip copy lives in `src/lib/payments/copy.ts` for i18n later.

No business-logic computation in components — all routed through `feeQuote.ts` which mirrors edge-function math.

---

## Part 5 — Sequencing & build order

Build in this order; each step is independently verifiable before the next depends on it.

1. **Part 1 (done):** schema + `user_wallets` + `PayoutSettingsPage`. Verify: a test user can save a NOWPayments crypto address and a PayPal email, both appear in `user_wallets`, publish gate banner shows when neither exists.
2. **`feeQuote.ts` + UI breakdown (Part 4 frontend-only)** — pure functions + display, no backend dep. Verify: snapshot tests + visual check across the three forms.
3. **`distribute-bestowal` strategy refactor** — keep Binance strategy live, add `manual` fallback. Verify: existing Binance flow regression-tests pass; legacy `product_bestowals` reads still resolve until retirement migration runs.
4. **NOWPayments invoice creation** (`create-nowpayments-invoice`) — *manual verify needed*: I cannot make a live NOWPayments call. You confirm the invoice URL opens, `bestowals` row is created with correct columns, `provider_order_id` populated.
5. **NOWPayments webhook** (`nowpayments-webhook`) — *manual verify needed*: trigger a sandbox payment, share the resulting webhook payload + signature header so I can confirm signature verification logic; or use NOWPayments' "Test IPN" button.
6. **NOWPayments payout** (`nowpayments-payout`) — *manual verify needed*: requires `NOWPAYMENTS_PAYOUT_JWT` secret (you generate after enabling 2FA in NOWPayments dashboard). First end-to-end test should be a $1 payout to your own wallet.
7. **PayPal order + capture** — *manual verify needed*: sandbox buyer account from developer.paypal.com; you click through the approve UI in sandbox.
8. **PayPal webhook** — *manual verify needed*: register sandbox webhook URL in PayPal dashboard, share `PAYPAL_WEBHOOK_ID`. Confirm signature verification on a real sandbox event.
9. **PayPal payout** — *manual verify needed*: requires Payouts feature approval on your live REST app (may be denied — fallback is `manual_required` queue). Sandbox payout to a sandbox business email is the test.
10. **Default-flip to NOWPayments** — hide Binance behind `VITE_ENABLE_BINANCE_PAY=false`; keep `binance-pay-webhook` and Binance strategy in `distribution.ts` deployed for in-flight orders (do NOT delete for at least 30 days).
11. **Retire `product_bestowals`** — separate migration: copy any non-mirrored rows into `bestowals`, drop the table, remove `complete-product-bestowal/`. Only after step 10 has been stable ≥1 week.

### What I'll need from you (manual)
- Confirm `NOWPAYMENTS_API_KEY` + `NOWPAYMENTS_IPN_SECRET` exist; add `NOWPAYMENTS_PAYOUT_JWT`.
- Add PayPal secrets after creating the REST app.
- Paste back: one live-fired NOWPayments IPN payload + signature header, one PayPal webhook event id, sandbox buyer credentials for a test bestowal.
- Approve fee % defaults stored in `payment_config` (proposal: NOWPayments 1.0%, PayPal US 3.49% + $0.49, PayPal intl 4.99% + fixed).

### Out of scope (explicitly deferred)
- Refund flows for either provider.
- Currency conversion display beyond existing `src/lib/i18n/currency.ts`.
- Removing `BinancePayButton`/`CryptomusPayButton` source files.
- Tribal Hearts / Ambassador-specific pricing rules.

---

Ready for your approval to begin step 2 (frontend `feeQuote.ts` + breakdown UI) — that's safe, pure-frontend, and unblocks visual review while you provision PayPal credentials in parallel.
