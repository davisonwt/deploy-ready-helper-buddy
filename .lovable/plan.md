
# Part 2 — NOWPayments integration + `distribution.ts` provider-strategy refactor

Scope: get NOWPayments live as the primary inbound rail AND as a payout rail to the sower's crypto wallet (already collected via `PayoutSettingsPage`). No PayPal in this part (that's Part 3). No checkout-UI fee breakdown (that's Part 4). No removal of Binance code (kept side-by-side; switched via feature flag in Part 6).

## Secrets

Confirm in Project Settings → Secrets before build:
- `NOWPAYMENTS_API_KEY` *(already present per user)*
- `NOWPAYMENTS_IPN_SECRET` *(verify; needed for inbound webhook signature)*
- `NOWPAYMENTS_PAYOUT_JWT` *(user must generate after enabling 2FA in NOWPayments dashboard — only needed for outbound payouts step)*

If any missing, I'll stop and ask before continuing the affected sub-step.

## New edge functions

### a. `supabase/functions/nowpayments-list-currencies/index.ts`
Already referenced by `src/components/payouts/AddNowPaymentsWallet.tsx` (comment line 19) but not yet implemented. Standalone, low-risk, build first.
- Public (JWT optional). CORS via `npm:@supabase/supabase-js@2/cors`.
- `GET https://api.nowpayments.io/v1/merchant/coins` with `x-api-key`.
- Returns `{ currencies: [{ code, network, name, min_amount }] }`. Cache 5 min in memory.

### b. `supabase/functions/create-nowpayments-invoice/index.ts`
- JWT-validated (Bearer → `auth.getUser`). 400 if no user.
- Input zod schema:
  ```ts
  { seedId?: string, orderId?: string, productId?: string, qty: number, payCurrency: string, redirectBaseUrl?: string }
  ```
- Server recompute (never trust client):
  - Fetch unit price from `seeds`/`products`/`orchards` depending on which id was supplied.
  - `base_amount = unit_price × qty` (USD reference, 2dp).
  - `processor_fee_amount = base_amount × NOWPAYMENTS_FEE_PCT` where `NOWPAYMENTS_FEE_PCT` defaults to `0.01` and is overridable via env (or `payment_config` row `nowpayments_fee_pct` if present). Buyer pays processor fee; we cap at 2dp ceil.
  - `buyer_total_amount = base_amount + processor_fee_amount`.
- Lookup sower's primary payout wallet from `user_wallets` where `wallet_type IN ('nowpayments_crypto','paypal_email') AND is_active AND is_primary`. For NOWPayments inbound we only require the sower has SOME payout method; we snapshot whichever is primary into the new `payout_*` columns. If none → 409 `{ code: 'no_payout_method' }`.
- Insert `bestowals` row (provider-agnostic columns from Part 1) with:
  - `provider='nowpayments'`, `provider_order_id=null` (filled after API call),
  - `base_amount`, `processor_fee_amount`, `processor_fee_currency='USD'`, `buyer_total_amount`,
  - `payout_provider`, `payout_destination`, `payout_currency` (snapshot from `user_wallets`),
  - `payout_status='pending'`, `payment_status='awaiting_payment'`,
  - mirror `buyer_total_amount` into legacy `amount`, `currency='USD'`,
  - `distribution_data = buildDistributionData(...)` for the manual queue fallback path.
- POST `https://api.nowpayments.io/v1/invoice`:
  ```json
  { "price_amount": buyer_total_amount,
    "price_currency": "usd",
    "pay_currency": payCurrency,
    "order_id": "<bestowal.id>",
    "order_description": "Sow2Grow bestowal",
    "ipn_callback_url": "<SUPABASE_URL>/functions/v1/nowpayments-webhook",
    "success_url": "<redirectBaseUrl>/bestowals/<bestowal.id>?status=success",
    "cancel_url":  "<redirectBaseUrl>/bestowals/<bestowal.id>?status=cancelled" }
  ```
- Update `bestowals.provider_order_id = invoice.id`. Return `{ bestowalId, invoiceUrl: invoice.invoice_url, expiresAt }`.

### c. `supabase/functions/nowpayments-webhook/index.ts`
- **No JWT** — add `[functions.nowpayments-webhook] verify_jwt = false` to `supabase/config.toml`.
- Verifies `x-nowpayments-sig` = `HMAC-SHA512(NOWPAYMENTS_IPN_SECRET, JSON.stringify(sortedKeys(body)))` — recursive key-sort per NOWPayments spec. Reject 401 on mismatch.
- Idempotency via `processed_webhooks` table (already exists, used by Binance/Cryptomus): key `nowpayments:<payment_id>:<payment_status>`.
- Two event families:
  - **Payment IPN** (has `payment_status`): map to internal status:
    - `waiting`/`confirming` → noop (or `payment_status='processing'`).
    - `finished`/`partially_paid` → mark `bestowals.payment_status='completed'`, then call `distributeBestowal(bestowal)` (see refactor below).
    - `failed`/`expired`/`refunded` → `payment_status='failed'`, `payout_status='failed'`, store `payout_error`.
  - **Payout IPN** (has `withdrawal_id`/`batch_withdrawal_id`): match by `payout_reference`, update `payout_status`, `payout_completed_at`, `payout_fee_amount` from response.

### d. `supabase/functions/nowpayments-payout/index.ts` (internal — invoked from `distribution.ts`)
- Service-role only; rejects external calls (checks `apikey` header matches service role OR is invoked via `supabase.functions.invoke` from another function — simpler: just `verify_jwt = false` and gate by a shared `INTERNAL_FUNCTION_SECRET` header).
- Requires `NOWPAYMENTS_PAYOUT_JWT`. If missing → returns `{ status: 'manual_required', reason: 'payout_jwt_missing' }`; caller (`distribution.ts`) writes that to `bestowals.payout_status` and queues a `sower_payouts` row for manual handling.
- `POST https://api.nowpayments.io/v1/payout` with bearer JWT and body:
  ```json
  { "withdrawals": [
      { "address": "<sower payout_destination>",
        "currency": "<sower payout_currency>",
        "amount": <sower share>,
        "ipn_callback_url": "<...nowpayments-webhook>" }
  ]}
  ```
- Returns `{ batchId, withdrawalId }` → caller stores as `payout_reference`.
- Note: NOWPayments payout currency must match a currency they support for that network and meet min-payout; we'll surface min-payout error as `payout_status='manual_required'` with reason.

## `_shared/distribution.ts` refactor

The current file is single-rail (BinancePayClient). Refactor in place to a strategy pattern; KEEP the existing exported signatures so call sites (`create-binance-pay-order`, `cryptomus-webhook`, `distribute-bestowal`) don't break.

### Changes

1. **New module** `_shared/payouts/types.ts`:
   ```ts
   export type PayoutProvider = 'nowpayments' | 'paypal' | 'binance' | 'manual';
   export interface PayoutLeg { userId: string; destination: string; currency: string; amount: number; role: 'sower'|'tithing'|'grower'; }
   export interface PayoutResult { status: 'sent'|'processing'|'failed'|'manual_required'; reference?: string; feeAmount?: number; error?: string; raw?: unknown; }
   export interface PayoutStrategy { dispatch(leg: PayoutLeg, ctx: { bestowalId: string; supabase: SupabaseClient }): Promise<PayoutResult>; }
   ```
2. **Strategy modules** (new):
   - `_shared/payouts/nowpayments.ts` — calls the new `nowpayments-payout` function via `supabase.functions.invoke` (cleaner than re-implementing JWT mgmt here).
   - `_shared/payouts/binance.ts` — wraps the existing `BinancePayClient.createTransfer` (extracted from current `executeTransfer`).
   - `_shared/payouts/manual.ts` — inserts a `sower_payouts` row with `status='manual_required'`, returns `{ status:'manual_required' }`.
   - PayPal strategy stub file exists but throws `not_implemented` (filled in Part 3).
3. **`distribution.ts`** changes:
   - Add `resolvePayoutProvider(bestowal): PayoutProvider` — reads `bestowal.payout_provider`; falls back to `'binance'` for legacy rows that have no `payout_provider` (preserves existing behavior).
   - `executeDistribution` becomes the dispatcher: builds the three legs (tithing, sower, optional grower) and calls the strategy per leg. Tithing leg always goes to S2G's own internal wallet (still Binance for now — kept as `'binance'` strategy until Part 6 decides S2G's own treasury rail; flagged as a known TODO, not silently changed).
   - Update `bestowals` writes after dispatch: set `payout_status`, `payout_reference`, `payout_fee_amount`, `payout_attempted_at`, `payout_completed_at` (mirroring per-strategy result). Existing `payment_status='distributed'` write preserved.
   - Old `BinancePayClient` parameter in `executeDistribution(supabase, binanceClient, ...)` becomes **optional** — when omitted the dispatcher instantiates strategies lazily. All existing call sites still pass `binanceClient`; we just stop requiring it. No call-site edits in this step.

### Files touched in distribution refactor (file-level)
- `supabase/functions/_shared/distribution.ts` — edit (add resolver + dispatcher; keep buildDistributionData unchanged).
- `supabase/functions/_shared/payouts/types.ts` — new.
- `supabase/functions/_shared/payouts/nowpayments.ts` — new.
- `supabase/functions/_shared/payouts/binance.ts` — new (just moves existing `executeTransfer` body, no behavior change).
- `supabase/functions/_shared/payouts/manual.ts` — new.
- `supabase/functions/_shared/payouts/paypal.ts` — new stub (Part 3).
- **No edits** to `distribute-bestowal/index.ts`, `cryptomus-webhook/index.ts`, `create-binance-pay-order/index.ts`, `create-cryptomus-payment/index.ts` — backwards-compatible signatures.

## Client wiring

Minimum needed to actually trigger the new inbound rail in dev:
- `src/hooks/useNowPayments.tsx` — `createInvoice(payload)` calls the edge function; `subscribeStatus(bestowalId)` uses Realtime on `bestowals` row.
- `src/components/payment/NowPaymentsButton.tsx` — opens `invoiceUrl` in new tab, shows pending/confirming/finished via Realtime.

Where these get rendered (`BestowalCheckout.tsx`, `QuickBestowModal.tsx`, ProviderSelector) is **deferred to Part 4** so this part stays purely backend + hook. I'll add a temporary `src/pages/NowPaymentsTestPage.tsx` at `/dev/nowpay-test` (gated to admins via existing `is_admin_or_gosat`) so you can manually create an invoice and watch the full IPN→distribution flow without touching production checkout UI.

## What you'll need to verify manually (I can't make live calls)

1. After deploy of `nowpayments-list-currencies`: open `AddNowPaymentsWallet` and confirm the dropdown populates.
2. After `create-nowpayments-invoice`: use the dev test page to create a $1 invoice in USDC-TRC20 (or whatever pay_currency you pick), confirm:
   - A `bestowals` row exists with `provider='nowpayments'`, correct `base_amount`/`processor_fee_amount`/`buyer_total_amount`.
   - `provider_order_id` is populated.
   - `invoiceUrl` opens NOWPayments hosted checkout.
3. Pay the invoice (or use NOWPayments sandbox "simulate payment" if your account has it). Then share the IPN payload + `x-nowpayments-sig` header from the function logs so I can confirm signature verification logic against a real event.
4. For payouts: generate `NOWPAYMENTS_PAYOUT_JWT` (after enabling 2FA in NOWPayments dashboard) and run one $1 payout to your own wallet via the dev test page. Confirm `payout_status` transitions `pending → processing → sent` and `payout_reference` is filled.

## Build order within Part 2

I'll checkpoint between each:
1. `nowpayments-list-currencies` (unblocks already-shipped onboarding UI). ← verify before continuing.
2. `_shared/payouts/*` strategy scaffolding + non-breaking `distribution.ts` edit (Binance behavior unchanged). ← verify existing Binance flow still works.
3. `create-nowpayments-invoice` + dev test page + `useNowPayments` hook. ← you test inbound.
4. `nowpayments-webhook` (inbound). ← you test end-to-end inbound + auto-distribution into manual-queue mode (until step 5 lands).
5. `nowpayments-payout` + wire NOWPayments strategy. ← you test outbound.

## Explicitly NOT in Part 2
- Removing/hiding Binance UI (Part 6).
- PayPal anything (Part 3).
- Checkout fee-breakdown UI / `ProviderSelector` (Part 4).
- Retiring `product_bestowals` (Part 6).
- Refund flows.

Approve and I'll start with step 1 (`nowpayments-list-currencies`) only, then stop for your verification.
