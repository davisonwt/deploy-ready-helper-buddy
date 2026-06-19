## Plan — Part 1 of N: Schema + Sower Payout Onboarding

Plan only. No files changed. This is the foundation; later parts (NOWPayments edge functions, PayPal edge functions, fee-transparency UI, build sequencing) build on it. Assumes the previously-approved prerequisite — adding `product_id` to `bestowals`, dropping NOT NULL on `orchard_id`, archiving `product_bestowals` — runs first.

---

### 1) SCHEMA — columns to add to `bestowals`

Current columns (recap, unchanged here): `id, orchard_id, bestower_id, amount, currency, pockets_count, pocket_numbers, payment_method, payment_status, payment_reference, message, created_at, updated_at, bestower_profile_id, tx_signature, blockchain_network, distribution_mode, hold_reason, distribution_data (jsonb), distributed_at, release_status, released_at`.

What's missing for multi-provider + transparent fees + payout tracking:
- no notion of which provider was used on the buyer side
- no separation between **base amount** (what S2G's 15% is calculated on) and what the **buyer actually paid**
- no record of the processor fee
- no record of the sower's chosen payout rail / destination
- no payout lifecycle fields (today everything Binance-specific is stuffed into `distribution_data` jsonb)

Proposed migration (one ALTER, runs after the prerequisite):

```sql
ALTER TABLE public.bestowals
  -- inbound provider + correlation
  ADD COLUMN provider text,                          -- 'nowpayments' | 'paypal' | 'binance' (legacy)
  ADD COLUMN provider_order_id text,                 -- NOWPayments payment_id / PayPal order id

  -- transparent pricing (server-computed, never trusted from client)
  ADD COLUMN base_amount numeric(12,2),              -- seed_price × qty; s2gFee = base × 0.15
  ADD COLUMN processor_fee_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN processor_fee_currency text,
  ADD COLUMN buyer_total_amount numeric(12,2),       -- base + processor_fee; what buyer is charged

  -- sower payout (snapshot at order time for auditability)
  ADD COLUMN payout_provider text,                   -- 'nowpayments' | 'paypal' | 'binance'
  ADD COLUMN payout_destination text,                -- wallet address OR paypal email
  ADD COLUMN payout_currency text,                   -- 'USDT-TRC20', 'USDC-ERC20', 'USD', ...
  ADD COLUMN payout_status text DEFAULT 'pending',   -- pending|processing|sent|failed|manual_required
  ADD COLUMN payout_reference text,                  -- NOWPayments payout id / PayPal batch id
  ADD COLUMN payout_fee_amount numeric(12,2),        -- borne by sower; informational
  ADD COLUMN payout_attempted_at timestamptz,
  ADD COLUMN payout_completed_at timestamptz,
  ADD COLUMN payout_error text;

CREATE INDEX bestowals_provider_idx       ON public.bestowals (provider);
CREATE INDEX bestowals_provider_order_idx ON public.bestowals (provider, provider_order_id);
CREATE INDEX bestowals_payout_status_idx  ON public.bestowals (payout_status) WHERE payout_status <> 'sent';
```

Notes:
- Legacy `amount` column kept untouched. New writes set `base_amount`, `processor_fee_amount`, `buyer_total_amount` explicitly and mirror `buyer_total_amount` into `amount` so existing read sites (admin dashboards, chat stats) keep working with zero changes.
- All new columns nullable on purpose: legacy Binance rows pre-date them. A `NOT NULL` / CHECK constraint can be added later once every write path populates them.
- No RLS changes — existing policies (bestower / orchard owner / product sower) cover the new shape.
- `release_status` / `released_at` (existing) describe S2G's internal "I've released the hold" lifecycle; new `payout_status` / `payout_completed_at` describe the **actual outbound transfer to the sower**. They are intentionally distinct so one can be true without the other.
- No data UPDATE in this migration. Schema only.
- Provider values are kept as `text` (not an enum) so adding/removing rails later is a code change, not a migration.

How it differs from current schema, summarised: today `bestowals` knows only "how much, paid how, what status", with everything else Binance-specific in jsonb. After this migration `bestowals` knows the provider on both sides of the transaction, the base-vs-buyer-paid split, and the payout lifecycle as first-class columns.

---

### 2) SOWER ONBOARDING — adding NOWPayments wallet and/or PayPal email

**Storage decision: extend `user_wallets`. No new table.** Reasons:
- RLS on `user_wallets` already exists and is correct (per-user).
- The existing wallet resolver in `_shared/distribution.ts` already reads `user_wallets`; adding rails there is a one-line code change.
- A new table would force a parallel resolver and parallel admin tooling.
- Cost is one CHECK-constraint replacement plus three optional columns.

Proposed `user_wallets` migration (separate from §1):

```sql
-- replace the existing wallet_type CHECK
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_wallet_type_check;
ALTER TABLE public.user_wallets
  ADD CONSTRAINT user_wallets_wallet_type_check
  CHECK (wallet_type IN (
    'binance_pay', 'binance', 'binance_pay_id',   -- existing legacy values
    'nowpayments_crypto', 'paypal_email'          -- new
  ));

ALTER TABLE public.user_wallets
  ADD COLUMN payout_currency text,                  -- 'USDT-TRC20', 'USDC-ERC20', 'BTC', 'USD', ...
  ADD COLUMN network text,                          -- 'TRC20'|'ERC20'|'BEP20'|'SOL'|null (PayPal=null)
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN verification_method text;              -- 'email_otp' | 'address_validation' | 'none'

-- one primary per (user_id, wallet_type)
CREATE UNIQUE INDEX user_wallets_one_primary_per_type
  ON public.user_wallets (user_id, wallet_type)
  WHERE is_primary = true;
```

(Read confirms `user_wallets` has the columns `id, user_id, wallet_type, wallet_address, is_primary, is_active, created_at, updated_at, ...`; this migration only adds to it.)

UI placement (file-level, all **new** files — no edits to existing files in this part; checkout-side changes belong to Part 5):

- **`src/pages/PayoutSettingsPage.tsx`** — new route `/settings/payouts`. Two tabs: "Crypto (NOWPayments)" and "PayPal". Lists existing payout wallets with status badges (Verified / Unverified / Primary). Add / Remove / Set-Primary actions.
- **`src/components/payouts/AddNowPaymentsWallet.tsx`** — currency+network dropdown sourced from a thin proxy edge function (`nowpayments-list-currencies`, defined in Part 2), address field with format validation against NOWPayments' address-validation endpoint, "I confirm this address is mine" checkbox. Verification = format/network check only in v1 (no on-chain micro-deposit; flagged in UI as "format-only check, send a small test bestowal to yourself to confirm").
- **`src/components/payouts/AddPaypalEmail.tsx`** — email field + 6-digit OTP sent via the existing transactional email function (`send-resend-email` or `send_brevo_email`, whichever the project standardises on). `verification_method = 'email_otp'`.
- **Route registration** — add `/settings/payouts` to `src/routes/AppRoutes.tsx` plus a lazy entry in `src/routes/lazyPages.ts`.
- **Discoverability** — surface a link to `/settings/payouts` inside the existing `src/pages/WalletSettingsPage.tsx` and `src/pages/UserWalletSettingsPage.tsx` (link only, not a rewrite of those pages).

Lightweight onboarding gate (no hard block):
- In `src/components/products/UploadForm.tsx` and `src/pages/CreateOrchardPage.jsx`: if the sower has zero verified payout wallets, show a non-dismissable banner above the form — "Add a payout method before publishing" with a button linking to `/settings/payouts`. Drafts still saveable; only the publish action is gated. The actual edits to these two files belong to Part 5 but the intent is recorded here.

---

### Not in scope for Part 1

- NOWPayments edge functions and `_shared/distribution.ts` refactor → **Part 2**
- PayPal edge functions and account-side prerequisites → **Part 3**
- Checkout fee-transparency UI (`BestowalCheckout.tsx`, `QuickBestowModal.tsx`, `UploadForm.tsx`/`EditForm.tsx` pricing preview, `PaymentSuccessPage.tsx`) → **Part 4**
- Build/test sequencing and manual-verification checklist → **Part 5**
- Retiring `BinancePayButton` / `CryptomusPayButton` from default checkout → **Part 6**

Ready for Part 2 when you approve Part 1.
