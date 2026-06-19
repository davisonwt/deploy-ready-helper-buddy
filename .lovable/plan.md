
# Part 3 — PayPal Integration

Mirrors the NOWPayments architecture from Part 2 so both providers plug into the same `bestowals` schema and `dispatchPayouts()` strategy chain. Buyers pay in fiat via PayPal; sowers receive payouts to their PayPal email via PayPal Payouts API.

## Prerequisites (user action)

User must add these secrets in Project Settings → Secrets before Step 3 onward:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID` (from the webhook subscription created in PayPal dashboard)
- `PAYPAL_ENV` = `sandbox` or `live` (defaults to `sandbox`)
- `PAYPAL_PAYOUTS_ENABLED` = `true` once Payouts API is approved on the account

I'll surface this checklist after Step 1.

## Steps

### Step 1 — `_shared/paypal/client.ts`
Tiny REST helper: OAuth2 token cache (in-memory per-isolate, 8min TTL), `paypalFetch(path, init)` that picks `api-m.sandbox.paypal.com` vs `api-m.paypal.com` from `PAYPAL_ENV`, and `verifyPaypalWebhookSig(headers, body)` using `/v1/notifications/verify-webhook-signature`.

### Step 2 — `create-paypal-order` (edge function, JWT-verified)
Mirror of `create-nowpayments-invoice`:
- Validate JWT, recompute pricing server-side (`base × qty`, `fee = base × 0.01`, `buyer_total = base + fee`).
- Resolve sower's `paypal_email` from `user_wallets` (fail loud if missing).
- Insert `bestowals` row with `provider='paypal'`, `payout_provider='paypal'`, `payout_destination=<sower paypal email>`, status `pending`.
- Call PayPal `/v2/checkout/orders` with `intent=CAPTURE`, `purchase_units[0].custom_id = bestowal_id`, `application_context.return_url/cancel_url` pointing at our app.
- Return `{ bestowal_id, order_id, approve_url }`.

### Step 3 — `paypal-webhook` (edge function, `verify_jwt=false`)
- Verify signature via `verifyPaypalWebhookSig` using `PAYPAL_WEBHOOK_ID`. Bad sig → 401.
- Idempotency via `processed_webhooks` (provider=`paypal`, webhook_id=`event.id`).
- Event mapping:
  - `CHECKOUT.ORDER.APPROVED` → `payment_status='processing'`
  - `PAYMENT.CAPTURE.COMPLETED` → `payment_status='completed'`, store `payment_reference=capture.id`, then call `dispatchPayouts(bestowalId)`.
  - `PAYMENT.CAPTURE.DENIED` / `VOIDED` / `DECLINED` → `payment_status='failed'` + `payout_error`.
  - Payouts events: `PAYMENT.PAYOUTSBATCH.SUCCESS` / `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` → `payout_status='sent'`, populate `payout_fee_amount` from `payout_item_fee`. `*.DENIED`/`*.FAILED`/`*.BLOCKED`/`*.RETURNED` → `payout_status='failed'` + `payout_error`.
- Look up bestowal via `purchase_units[0].custom_id` (orders) or `sender_item_id` (payouts).

### Step 4 — `paypal-payout` (edge function, service-role only)
- Service-role gate (header check, same pattern as `nowpayments-payout`).
- If `PAYPAL_PAYOUTS_ENABLED !== 'true'` → return `manual_required` with reason `payouts_not_enabled` (no funds move; manual.ts row written by dispatcher fallback).
- POST `/v1/payments/payouts` with single-item batch: `recipient_type=EMAIL`, `receiver=<bestowal.payout_destination>`, `amount={value, currency_code:'USD'}`, `sender_item_id=<bestowal_id>`, `note='Sow2Grow bestowal payout'`.
- Update bestowal: `payout_status='processing'`, `payout_reference=batch_header.payout_batch_id`. Final `sent` transition comes from webhook.
- Return `PayoutResult`-shaped JSON.

### Step 5 — Wire PayPal strategy + frontend
- Update `_shared/payouts/paypal.ts` (stub from Part 2) to call `paypal-payout` via service role, matching `NowPaymentsPayoutStrategy` shape.
- Update `_shared/payouts/index.ts` so `dispatchPayouts` picks `paypal` when `bestowal.payout_provider='paypal'`.
- Add `usePaypal.tsx` hook: `createOrder({ orchardId, qty })` → invokes `create-paypal-order`, returns `approve_url`, redirects buyer. Reuse `useBestowalStatus` from `useNowPayments` (it's provider-agnostic).
- Add dev test route `/dev/paypal-test` (admin/gosat-only, same gating as `/dev/nowpay-test`) for end-to-end manual verification.
- Update `supabase/config.toml`: `verify_jwt = true` for `create-paypal-order`; `verify_jwt = false` for `paypal-webhook` and `paypal-payout`.

## Out of scope (call out, don't build)
- PayPal subscriptions / billing plans (this is one-shot capture only).
- Refund flow (separate part).
- Currency conversion — bestowals stay USD; display conversion already handled by `src/lib/i18n/currency.ts`.
- Buyer-side PayPal JS SDK button — using redirect-to-approve_url for parity with NOWPayments hosted checkout. Can add JS SDK in a follow-up if you want inline checkout.

## Verification at each step
Same pattern as Part 2: deploy → curl with bad auth (expect 401/403) → run from dev test page once secrets are set → watch `bestowals` row transitions and edge function logs.

Reply **"go step 1"** to start.
