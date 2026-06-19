
# Part 1 — Schema + Sower Onboarding (status: already applied)

Heads-up before re-approving: this exact Part 1 was approved and migrated earlier in the project (migration `20260619133253_…sql`). The columns and `user_wallets` constraint are already live. Re-running would be a no-op (all statements use `IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS`), but there's nothing new to do for Part 1.

Below is the same Part 1 plan, unchanged, for your reference / re-confirmation. If you want to actually do new work, jump to Part 2 (NOWPayments edge functions + `distribution.ts` refactor) — say "plan Part 2".

---

## 1) `bestowals` schema additions (already applied)

```sql
ALTER TABLE public.bestowals
  ADD COLUMN IF NOT EXISTS provider               text,           -- 'nowpayments'|'paypal'|'binance'
  ADD COLUMN IF NOT EXISTS provider_order_id      text,
  ADD COLUMN IF NOT EXISTS base_amount            numeric(12,2),  -- seed_price × qty (15% S2G fee = base × 0.15)
  ADD COLUMN IF NOT EXISTS processor_fee_amount   numeric(12,2),
  ADD COLUMN IF NOT EXISTS processor_fee_currency text,
  ADD COLUMN IF NOT EXISTS buyer_total_amount     numeric(12,2),  -- base + processor_fee (what buyer pays)
  ADD COLUMN IF NOT EXISTS payout_provider        text,           -- snapshot of sower's choice at sale time
  ADD COLUMN IF NOT EXISTS payout_destination     text,           -- wallet address OR paypal email
  ADD COLUMN IF NOT EXISTS payout_currency        text,
  ADD COLUMN IF NOT EXISTS payout_status          text DEFAULT 'pending', -- pending|processing|sent|failed|manual_required
  ADD COLUMN IF NOT EXISTS payout_reference       text,
  ADD COLUMN IF NOT EXISTS payout_fee_amount      numeric(12,2),  -- borne by sower
  ADD COLUMN IF NOT EXISTS payout_attempted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS payout_completed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS payout_error           text;

CREATE INDEX IF NOT EXISTS bestowals_provider_idx        ON public.bestowals (provider);
CREATE INDEX IF NOT EXISTS bestowals_provider_order_idx  ON public.bestowals (provider, provider_order_id);
CREATE INDEX IF NOT EXISTS bestowals_payout_status_idx   ON public.bestowals (payout_status) WHERE payout_status <> 'sent';
```

**Notes**
- All nullable on purpose — legacy Binance rows pre-date these columns.
- Existing `amount` column kept as legacy total; new writes mirror `buyer_total_amount` into it.
- New `payout_status`/`payout_completed_at` are intentionally distinct from existing `release_status`/`released_at` (S2G's internal lifecycle vs. actual outbound transfer).
- No RLS changes — existing policies on `bestowals` cover the new columns.
- `provider`/`payout_provider` kept as `text` (not enum) for cheap rail addition later.

## 2) Sower onboarding — extend `user_wallets`, no new table (already applied)

```sql
ALTER TABLE public.user_wallets
  DROP CONSTRAINT IF EXISTS user_wallets_wallet_type_check;
ALTER TABLE public.user_wallets
  ADD CONSTRAINT user_wallets_wallet_type_check
  CHECK (wallet_type IN ('phantom','metamask','binance_pay','nowpayments_crypto','paypal_email', ...));
ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS payout_currency      text,
  ADD COLUMN IF NOT EXISTS network              text,
  ADD COLUMN IF NOT EXISTS verified_at          timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method  text;
CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_one_primary_per_type
  ON public.user_wallets (user_id, wallet_type) WHERE is_primary;
```

**UI surface (new pages/components)**
- `src/pages/PayoutSettingsPage.tsx` at `/settings/payouts` with two tabs: **Crypto (NOWPayments)** and **PayPal**.
- `src/components/payouts/AddNowPaymentsWallet.tsx` — currency + network dropdown, address field, format-only validation in v1, "I confirm this address is mine" checkbox.
- `src/components/payouts/AddPaypalEmail.tsx` — email field + 6-digit OTP via existing email function (OTP delivery wiring is a separate sub-task, flagged for Part 3).
- Route in `AppRoutes.tsx`, lazy entry in `lazyPages.ts`, discoverability link in existing `WalletSettingsPage.tsx` / `UserWalletSettingsPage.tsx`.

**Publish gate**
- In `UploadForm.tsx` and `CreateOrchardPage.jsx`: if sower has zero verified payout wallets, show a non-dismissable banner above the form linking to `/settings/payouts`. Drafts still saveable; only **Publish** is gated.

## Not in this part
- NOWPayments edge functions → Part 2
- PayPal edge functions + account-side setup → Part 3
- `_shared/distribution.ts` provider-strategy refactor → Part 2
- Checkout fee-transparency UI → Part 4
- Sequencing & manual-verify checklist → Part 5
- Retiring `BinancePayButton` / `product_bestowals` → Part 6
