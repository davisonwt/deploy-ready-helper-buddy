# Payments UX Rollout — 5 Features, Sequenced

## Table reality check (do this assumption first)

From the live schema:

- **`user_wallets`** — payout destination. Has `wallet_type` (provider: `nowpayments` | `paypal`), `wallet_address` (USDC-SOL address or PayPal email), `payout_currency` (e.g. `usdcsol`), `network`, `is_primary`, `verified_at`. **This is where "where do I send your money" lives.**
- **`sower_balances`** — accrual ledger per user: `available_balance`, `pending_balance`, `total_earned`, `total_withdrawn`, `currency`. **This is the real "on-platform balance from sales".**
- **`wallet_balances`** — only `wallet_address` + `usdc_balance` + `last_updated`. It's a *cache of an external on-chain balance for a given address*, not an internal ledger. Per `docs/WALLET_BALANCE_SOLUTION.md` it was repurposed as a cache and is currently stuck at 0 for users.
- **`organization_wallets`** — Sow2Grow's own custody wallets (api_key/api_secret/merchant_id columns), one row per provider.
- **`bestowals`** already carries `payout_provider`, `payout_destination`, `payout_currency`, `payout_status`, `payout_fee_amount` — so the per-bestowal payout path is fully wired; what's missing is the *user-side setup* and *buyer-side choice*.

**Recommendation:** treat `sower_balances` as the canonical on-platform balance. Leave `wallet_balances` alone (or quietly deprecate later). Top-ups should credit `sower_balances` (new row type / transaction kind), not `wallet_balances`.

## Recommended build order

1. **B — Onboarding payout setup** (foundation; everything else assumes a `user_wallets` row exists)
2. **C — Existing-user nudge** (same UI as B, just surfaced retroactively — cheap once B exists)
3. **A — Checkout provider selector** (depends on buyer also having a `user_wallets`-style preference? no — buyer just picks per-purchase, but the fee-math helper built here is reused by B's "what this costs you" copy)
4. **D — User wallet dashboard** (needs B done so wallets exist; needs A's invoice flow for top-ups)
5. **E — Gosat platform treasury view** (independent, but lowest urgency since we already proved the API works; build last)

A↔B share a `getProviderFee(provider, amount)` helper — build it in step B, reuse in A.

---

## A. Checkout provider selector

**Files**
- `src/lib/payments/providerFees.ts` *(new)* — single source of truth: `PROVIDERS = [{id:'nowpayments', label, feePct:[0.4,1.0], note:'USDC-SOL'}, {id:'paypal', label, feePct:[5.7,8.0]}]`, plus `quoteFee(provider, amount) → {min, max, displayString}`.
- `src/components/products/BestowalCheckout.tsx` *(edit)* — add a `<ProviderPicker>` above the "Complete Bestowal" button; show fee preview line ("NOWPayments fee ≈ $0.04–$0.10, you pay $10.10"); pass chosen `provider` into `complete-product-bestowal` invoke body.
- `src/components/bestow/QuickBestowModal.tsx` *(edit)* — same picker + fee line; currently hard-routes through `useBinancePay`, swap to branching: `nowpayments` → `useNowPayments.createInvoice`, `paypal` → `useCryptoPay`/`usePaypal` `create-paypal-order`.
- `src/components/payments/ProviderPicker.tsx` *(new, shared)* — radio cards (logo, fee range, "you pay" total), controlled component.
- `supabase/functions/complete-product-bestowal/index.ts` *(edit)* — accept `provider` in body, persist to `bestowals.provider` + `processor_fee_amount` (already columns).
- `supabase/functions/create-nowpayments-invoice/index.ts` & `create-paypal-order/index.ts` *(verify, minor edit)* — make sure they accept and echo `processor_fee_amount` so the row written matches what the buyer saw.

**Out of scope for A:** changing distribution logic, changing payout side.

---

## B. Onboarding payout setup

**Files**
- `src/pages/PayoutSettingsPage.tsx` *(already exists — edit/rewrite)* — becomes the canonical setup screen with two-step wizard:
  1. Pick provider (reuse `ProviderPicker` from A, but framed as "how YOU get paid" with the per-tx cost-to-you copy).
  2. If NOWPayments → force `payout_currency='usdcsol'`, `network='sol'`, ask for Solana USDC wallet address; show a hard-coded explainer "USDC on Solana is the only currently funded payout rail." If PayPal → ask for PayPal email.
  - Writes/updates `user_wallets` row (`is_primary=true`, `verified_at=null` until a later verification pass).
- `src/components/onboarding/PayoutSetupStep.tsx` *(new)* — thin wrapper of the wizard for the signup flow.
- `src/pages/OnboardingSecurityPage.tsx` *(edit)* — add PayoutSetupStep as the step right after security questions (or before, your call); mark complete via a new `profiles.payout_setup_complete boolean default false` column.
- `supabase/migrations/*` *(new)* — add `profiles.payout_setup_complete`; backfill `false`; trigger on `user_wallets` insert to set it `true`.
- `src/hooks/useAuth.jsx` *(edit, minimal)* — after signup, route new user to `/onboarding/payout` if `payout_setup_complete=false`.
- `src/lib/payments/providerFees.ts` — reused from A (or built here first if B ships first; see order note above — build the helper here).

**Copy rule:** the per-transaction cost must say "**You pay this**, not Sow2Grow" verbatim, with the two ranges.

---

## C. Existing-user nudge

**Files**
- `src/components/PayoutSetupBanner.tsx` *(new)* — mirrors `NotificationBanner.tsx` pattern: fixed bottom-right `Card`, dismiss persisted in `localStorage` (`payout-setup-banner-dismissed`), only renders when `user && profiles.payout_setup_complete === false && !dismissed`. CTA → `/payout-settings`.
- `src/App.tsx` *(edit)* — mount `<PayoutSetupBanner />` next to `<NotificationBanner />`.
- `src/hooks/useAuth.jsx` *(edit)* — expose `payoutSetupComplete` from profile.
- **Email nudge (optional, recommend yes):**
  - `supabase/functions/_shared/transactional-email-templates/payout-setup-reminder.tsx` *(new)*
  - One-shot script `supabase/functions/send-payout-setup-reminders/index.ts` *(new, admin-invoked)* — selects profiles where `payout_setup_complete=false AND created_at < now()` and enqueues one email each via `send-transactional-email`. Run once manually from gosat, not on a cron.
- Migration to add a `profiles.payout_reminder_sent_at` timestamp so a second run doesn't double-email.

**No DB writes from the banner** — just a link.

---

## D. User wallet dashboard

**Decision:** `sower_balances` is the on-platform balance; `wallet_balances` is a confusing legacy cache and should NOT be surfaced to users. `user_wallets` is the payout destination.

**Files**
- `src/pages/MyWalletPage.tsx` *(new)* at route `/wallet` — sections:
  1. **On-platform balance** — pulls `sower_balances` (available / pending / total_earned / total_withdrawn).
  2. **Payout destination** — read-only summary of primary `user_wallets` row + "Change" link to `/payout-settings`.
  3. **Top up** — amount input + `ProviderPicker` + fee preview → calls a new edge function that creates an invoice tagged `kind='topup'`.
  4. **Recent activity** — bestowals received (incoming) + topups + payouts in one timeline.
- `src/routes/lazyPages.ts` + `src/routes/AppRoutes.tsx` *(edit)* — add `/wallet`.
- Sidebar / dashboard nav *(edit, wherever the user menu lives — probably `src/components/Navbar*.tsx`)* — add "My Wallet" entry.
- `supabase/functions/create-wallet-topup/index.ts` *(new)* — wraps `create-nowpayments-invoice` / `create-paypal-order`, stamps a `topups` row.
- Migration: `topups` table (`id, user_id, provider, provider_order_id, amount, fee_amount, currency, status, created_at, completed_at`) with GRANTs + RLS (`auth.uid() = user_id`).
- Webhook handlers *(edit `nowpayments-webhook`, `paypal-webhook`)* — when payment is for a topup, increment `sower_balances.available_balance` atomically (RPC `credit_sower_balance(user_id, amount)`).
- New RPC `credit_sower_balance` *(migration)* — security definer, idempotent on `provider_order_id`.

**Existing `WalletSettingsPage.tsx` / `UserWalletSettingsPage.tsx`:** keep as the *destination* editor (or fold into `PayoutSettingsPage` from B). `/wallet` is the new *balance + topup* page. Worth flagging the naming collision now and consolidating: rename existing to `/payout-settings` cleanly.

---

## E. Gosat-only platform treasury view

**Files**
- `src/pages/GosatTreasuryPage.tsx` *(new)* at route `/admin/treasury`, gated by `useUserRoles` → `gosat` only (mirror `AdminPayoutConfirmationsPage`'s `ProtectedRoute` setup).
- `src/routes/AppRoutes.tsx` + `lazyPages.ts` *(edit)* — register route.
- `supabase/functions/treasury-balances/index.ts` *(new)* — gosat-only edge function (verifies caller's role via service-role lookup on `user_roles`); calls:
  - NOWPayments: `POST /v1/auth` → `GET /v1/balance` (already proven working). Returns `{currency, available, pending}` array.
  - PayPal: `GET /v1/reporting/balances` with OAuth client_credentials.
- The page displays both, plus a sum in USD (via existing `src/lib/i18n/currency.ts`).

**Main vs admin/fee split — schema audit result:**
- No current column tags "fee" vs "main" inside NOWPayments custody. Bestowals carry `processor_fee_amount` (paid by buyer to processor — never hits us) and the platform's revenue share would be implicit in `bestowals.distribution_data`. **There is no separate fee sub-account today.**
- **Proposal:** rather than fabricating a split that doesn't exist, the page shows:
  - **Custody total** (raw from provider APIs)
  - **Reserved for sowers** = `SUM(sower_balances.available_balance + pending_balance)`
  - **Platform net** = custody total − reserved for sowers
  - Flag a banner: "Sow2Grow does not currently hold a separate fee wallet. Platform net is computed, not held in a distinct account. To enforce a hard split, create a second NOWPayments sub-account and route the platform's % there at distribution time."
- No schema change in E; the "create a fee sub-account" is a follow-up the user can green-light separately.

---

## Cross-cutting

- **One shared helper** `src/lib/payments/providerFees.ts` powers A, B, D — single edit point if fee ranges change.
- **One shared component** `src/components/payments/ProviderPicker.tsx` used by A (buyer side) and B/D (payee side) with a `mode: 'buyer' | 'payee'` prop swapping the copy.
- **Migrations needed total:** (1) `profiles.payout_setup_complete` + `payout_reminder_sent_at`, (2) `topups` table, (3) `credit_sower_balance` RPC, (4) trigger on `user_wallets` insert. All small, all in step B / D.
- **No code is written until you approve this plan.**
