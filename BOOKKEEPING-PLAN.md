# Sow2Grow bookkeeping: the revenue ledger and the gosat liability view

Design only, written 2026-09-06 against the live schema and code. Answers audit item P1-2 (`AUDIT-2026-09-05.md`) and gives orchard Phase B (`ORCHARD-MONEY-PLAN.md` section 4, step 3) the revenue ledger it needs. No code, migrations or deploys come with this document.

The problem in one sentence: S2G writes its 15% fee on every transaction, never adds it up, shows gross buyer volume as "Total Revenue", and shows raw wallet balances with no statement of how much of that money belongs to other people.

Vocabulary used throughout:

| Term | Meaning |
|---|---|
| Held for members | Earnings a sower or whisperer is owed and S2G still holds. A liability. |
| Held for orchards | Pocket money in `orchard_holdings` with status `held`. A liability, including the 15% inside it, until release. |
| S2G's own | The 15% fee on a sale whose money is no longer owed to anyone, plus platform-only income. Revenue. |
| Release | The moment money stops being someone else's and the fee becomes S2G's: a product sale completing, a gift landing, an orchard funding. |
| Rail | How the money physically sits: USDC on Solana, or a PayPal balance. |

---

## 1. Where the money is, today

### 1a. Wallets and rails

Read live on 2026-09-06 ~07:40 UTC. On-chain figures are mainnet unless marked.

| Place | Address / account | Holds today | What the DB says about it |
|---|---|---|---|
| Hot wallet (USDC) | `6zbpF3HQ…2BcxZ` | 5.62 USDC, 0.05 SOL mainnet. 27.99 USDC devnet. | Inbound: `solana_payment_intents` (2 paid mainnet basket intents, 4.62). Outbound: `payouts` rows (none on mainnet). Nothing says how much of the 5.62 is owed vs S2G's. |
| Squad vault (2-of-3) | `BjBY4uCC…FWLs` | No USDC account yet, 0.001 SOL. | `treasury_sweeps` (0 rows). Nothing has ever been swept. |
| Launch Orchard wallet | `13M2yVLW…ztct` | Empty, never funded. | Nothing. Phase A keeps orchard USDC in the hot wallet with `location = 'hot_wallet'`; the orchard wallets are unused. |
| Uplift Orchard wallet | `8Aj2bWN4…MVRD` | Empty, never funded. | Nothing. |
| Legacy "Main" / "Tithing" wallets | `organization_wallets` s2gholding / s2gbestow (`Hai8nC5r…daM` / `…daN`) | No USDC accounts. | Still referenced by `distribution_data` on every orchard bestowal and shown on the treasury page. Dead weight from the NOWPayments era. |
| PayPal balance | Business account, `PAYPAL_ENV` secret decides live or sandbox | Not readable from here; the treasury page fetches it. | Inbound: PayPal captures on `basket_orders`, `content_purchases`, `bestowals`. Outbound: `payouts` rows with rail paypal (none yet). |
| NOWPayments balance | Legacy | Treasury page fetches it. | No live rail writes to it any more. |

### 1b. The three buckets, from the database

`scripts/studio/bookkeeping-buckets.sql` (read-only) produces these lines. Run it in Studio whenever you want the current picture. Today's result:

| Line | Amount | Detail |
|---|---|---|
| A. Held for members, old pipeline (`owed_payout_balances()`) | 4.00 | 2 recipients: Louw 2.00, Amber 2.00 |
| A. Held for members, parked S2G Balance ledger (`balance_ledger`) | 13.95 | 3 members, 7 `earning_credit` rows from before the non-custodial switch |
| B. Held for orchards (`orchard_holdings` held, gross) | 10.00 | 1 holding, 1 orchard, devnet test pocket: sower 8.70 + S2G 1.30 |
| C. S2G's own, computed from source tables | 3.40 | `product_bestowals.s2g_fee` on 12 completed rows; every other fee source is empty |
| C. Fee written but still held for an orchard | 1.30 | inside line B, not S2G's until release |
| D. What A + B + C says should exist | 31.35 | versus 5.62 USDC on mainnet plus whatever PayPal holds |
| E. Paid out so far | 4.00 | 2 `payouts` rows, both devnet |
| F. Swept to the Squad | 0.00 | never |
| G. Solana inbound paid, mainnet / devnet | 4.62 / 16.94 | 2 / 4 intents |

Reading it honestly: almost every number is test money or pre-cutover history. Line D does not reconcile to the wallets today, and it cannot, because:

- The 10.00 orchard holding and the 4.00 of payouts are devnet USDC.
- The 13.95 parked ledger comes from 7 product sales that were credited to a balance under the old custodial model; whether the cash behind them ever reached a PayPal or NOWPayments account S2G still controls is not recorded anywhere.
- Two `product_bestowals` rows (`b3518c23`, `904058fc`, 2.00 each) are marked `paid` by devnet payouts on 2026-09-01. Real earnings were settled with test tokens and the database calls them paid.
- 4.62 of real mainnet USDC came in through basket orders; the hot wallet holds 5.62, so 1.00 is float S2G put there.

The lesson for the design is not the amounts. It is that nothing in the database records **which environment** money moved on (mainnet, devnet, PayPal live, PayPal sandbox) except `solana_payment_intents.cluster` and `payouts.solana_cluster`. A ledger that cannot tell test money from real money cannot reconcile.

### 1c. Every place a fee is written

| Source | Column(s) | Written by | When it becomes S2G's today |
|---|---|---|---|
| `product_bestowals` | `s2g_fee`, `sower_amount`, `whisperer_amount` | `finalize_basket_order()` (SQL) and `purchase-music-track` | Immediately on `completed`, in effect. Nothing records it. |
| `content_purchases` | `platform_fee_amount` | `create-content-purchase-order` → `_shared/paypal/capture.ts` | Same. Table is empty today. |
| `bestowals` (gifts) | derived: `base_amount − distribution_data.sower_amount` | `create-gift-bestowal-order`, `_shared/distribution.ts` | Same. No gift rows exist today. |
| `bestowals` (orchards) | same derivation, plus `orchard_holdings.s2g_amount` | `_shared/orchardHolding.ts`, `orchard_apply_holding()` | Never, until Phase B release. Correct. |
| `bookings` | `s2g_fee` | `create-booking-paypal-order` | On payment. Table is empty today. |
| Platform-only income (Wandering Hearts unlock) | spec section 9 says record as `s2g_fee` with `sower_amount = 0` | **No writer exists.** Phase 2 of Wandering Hearts is not built. | n/a |
| Processor fee, Solana | `bestowals.processor_fee_amount`, `basket_orders.processor_fee` (flat 0.01) | order functions via `computeBuyerFee` | Sits in the hot wallet. It is S2G's (it covers gas) but no figure anywhere adds it up. |
| Processor fee, PayPal | same columns | same | Goes to PayPal, never to S2G. |

---

## 2. The gap

### What spec section 9 asks for

1. Who is owed what, per recipient, with rail, threshold position and age of the oldest unpaid amount.
2. Which source rows make up each balance, read from `owed_payout_balances()`, never recomputed.
3. Held for people and held for orchards shown as two lines, never merged.
4. Total held as one prominent number: the full liability.
5. Held versus S2G's own: balance minus liabilities equals what is actually S2G's.
6. Aging flags on individual balances; orchards surfaced but not flagged.
7. Read-only. Money moves only through `payout-earnings`.

### What exists

| Spec point | Where | State |
|---|---|---|
| 1, 2 | `/admin/payouts` (`AdminPayoutsPage.tsx`) | Partly. Shows the recipients and amounts from the `payout-earnings` preview and the parked-ledger liability. No rail, no threshold position, no age, no source rows. |
| 3 | `/gosat/treasury` (`GosatTreasuryPage.tsx:96-102`) | Partly. "Reserved for sowers" and "Held for orchards" are separate stats since Phase A. |
| 4 | nowhere | "Reserved" and "Held for orchards" are never added into one liability figure. |
| 5 | `treasury-balances/index.ts` `platformNetUsd` | Wrong basis. Custody total is NOWPayments plus PayPal only; the hot wallet is not in it, so on the Solana rail the number is meaningless. The subtraction also ignores that the parked ledger and the owed pipeline overlap with nothing on the Solana side today. |
| 6 | nowhere | No aging anywhere. |
| S2G's own from a ledger | nowhere | No table sums fees. `treasury-balances` computes a remainder and calls it platform net. |

### What "Total Revenue" sums today

| Tile | File | Sums | Why it is wrong |
|---|---|---|---|
| Revenue Generated | `src/components/admin/BasicAnalytics.tsx:56-66` | `bestowals.amount` where `payment_status = 'completed'` | Buyer gross on the orchard/gift table only. Includes the sower's 85% and, for orchards, money that is held and may be refunded. Excludes every product sale. Today it reads 10.00, which is one devnet test pocket. |
| Total Revenue | `src/components/admin/EnhancedAnalyticsDashboard.jsx:117-123` | `bestowals.amount` + `product_bestowals.amount`, completed, in the date window | Gross volume across two tables. 85% of it is other people's money. Falls back to a hard-coded 125,000 on error (`:162`). |
| Total Revenue | `src/components/admin/PaymentMonitoring.tsx:41,72` | `organization_payments.amount` | A legacy table nothing writes to on the live rails. Reads 0. |
| Total Revenue | `src/components/admin/analytics/AnalyticsMetrics.tsx:77-80` | whatever `totalRevenue` prop it is handed | Display-only; inherits the caller's mistake. |

None of them touches `s2g_fee`. The only code that sums a fee is the per-sower Books sync (`_shared/postFinalize/books.ts`) and `sower_earnings_v`, both per member, neither platform-wide.

---

## 3. Revenue ledger design

One table, `revenue_ledger`, one row per fee event, append-only. It is the only place S2G's own income is ever read from. Nothing else may present a "revenue" figure.

### 3a. Table

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid | |
| `kind` | text, CHECK | `sale_fee`, `gift_fee`, `content_fee`, `booking_fee`, `orchard_fee`, `platform_income`, `processor_fee_income`, `refund_cost`, `payout_fee_cost`, `correction`, `opening_balance` |
| `direction` | text, CHECK | `income` or `cost`. Costs are stored as negative `amount`; the CHECK ties sign to direction. |
| `amount` | numeric(18,2) | USD equivalent. Positive income, negative cost. Never updated. |
| `currency` | text | `USD` or `USDC`. USDC is treated 1:1. |
| `rail` | text, CHECK | `solana`, `paypal`, `balance`, `nowpayments`, `none` |
| `environment` | text, CHECK | `live`, `devnet`, `sandbox`. Every reader filters `environment = 'live'` by default. This is what section 1b is missing. |
| `source_table` | text | `product_bestowals`, `bestowals`, `content_purchases`, `bookings`, `orchard_releases`, `orchard_refunds`, `payouts`, `manual` |
| `source_id` | uuid | The row the fee came from. |
| `release_ref` | text | The event that made it S2G's: PayPal capture id, Solana signature, orchard release id. |
| `recognised_at` | timestamptz | When the money became S2G's. For a sale that is the completion time; for an orchard it is the release time, not the pocket time. |
| `period` | date, generated | `date_trunc('month', recognised_at)`, indexed, for the monthly P&L. |
| `notes` | text | |
| `created_by` | uuid | null for system, a user id for manual entries. |
| `created_at` | timestamptz | |

Constraints:

- `UNIQUE (kind, source_table, source_id)` for every kind except `correction`. A finalize that runs twice cannot double-count a fee. `correction` rows carry their own unique `idempotency_key` instead.
- No UPDATE or DELETE grants to anyone, including `service_role` in practice: writes go through one SECURITY DEFINER function, `record_revenue(...)`, which inserts and returns the row, and returns the existing row on a duplicate key exactly like `credit_balance_ledger` does. A trigger raises on UPDATE and DELETE as belt and braces.
- RLS: SELECT for `is_admin_or_gosat`, nothing for anyone else. Members never see this table; their own fees already appear on their receipts and in Books.

### 3b. States and immutability

There are no states. A row is a fact about money that has already become S2G's. Anything that changes later is a new row:

| Event | Row written |
|---|---|
| Refund of a sale whose fee was recorded | `refund_cost`, negative, same `source_id`, `notes` naming the refund reference. The original row stays. |
| Fee recorded by mistake, or on test money | `correction`, negative, `notes` explaining, `created_by` the gosat. Reversing entry, never a delete. |
| PayPal payout item fee, the per-item cost S2G pays to send money | `payout_fee_cost`, negative, `source_table = 'payouts'`. |
| Orchard PayPal refund shortfall topped up from float (plan section 5) | `refund_cost`, negative, `source_table = 'orchard_refunds'`. |
| Solana flat processor fee received from a buyer | `processor_fee_income`, positive. Optional in phase 1; see open questions. |

Month-end totals are therefore a plain `sum(amount) GROUP BY period, kind` with `environment = 'live'`. Nothing has to be closed or locked, because nothing can be edited.

### 3c. Who writes, and when

The rule is "record at release", and release is already a concrete moment in every flow:

| Flow | Release moment | Writer | Row |
|---|---|---|---|
| Basket / product sale | `finalize_basket_order()` inserts the `product_bestowals` row as `completed` | The same SQL function, one `record_revenue` call per line, kind `sale_fee`, amount `s2g_fee` | Physical products are held in escrow for the sower, but the fee was paid by the buyer and is S2G's from completion; a refund later writes `refund_cost`. |
| Music track purchase | `purchase-music-track` | after its insert | `sale_fee` |
| Content purchase | `finalizeContentPurchase` in `_shared/paypal/capture.ts` | after marking completed | `content_fee`, amount `platform_fee_amount` |
| Gift bestowal (no orchard) | `finalizeBestowal` in `capture.ts` | after the credit-or-pending step | `gift_fee`, amount `base_amount − distribution_data.sower_amount` |
| Booking | `create-booking-paypal-order` capture path | on paid | `booking_fee` |
| **Orchard release (Phase B)** | `orchard_release(orchard_id)` flips holdings to `released` | The same SQL transaction | One `orchard_fee` row per orchard, amount `sum(s2g_amount)` of the released holdings, `source_table = 'orchard_releases'`, `release_ref` = release id. Exactly what plan section 4 step 3 specifies. |
| Orchard refund (Phase C) | `orchard_refund` worker | on refund | No income row was ever written for a held orchard, so nothing to reverse. A PayPal shortfall writes `refund_cost`. |
| Platform-only income (Hearts unlock, later) | its own order function | on paid | `platform_income`, full amount |
| PayPal payout sent | `payout-earnings` after a batch succeeds | per item | `payout_fee_cost` if the fee is known from PayPal's response; else skipped and reconciled monthly from the PayPal statement |

Every writer passes `environment` from what it already knows: `solana_payment_intents.cluster` for Solana, `PAYPAL_ENV` for PayPal, `'live'` for balance spends. The one gap is `product_bestowals`, which carries no cluster today. `finalize_basket_order()` gets it from the basket order's intent when the provider is solana, from `PAYPAL_ENV` otherwise. Phase 1 adds the column to `basket_orders` so the SQL function can read it without a network call.

The two Deno-side writers call `record_revenue` through `service.rpc(...)` after their own insert, inside the same try block, and log loudly on failure without failing the order: a missing revenue row is recoverable from the backfill query, a failed order is not. The SQL-side writers are in the same transaction as the sale and cannot diverge.

### 3d. Backfill and the opening balance

Pre-ledger fees are small and mostly test money. The backfill is one migration that inserts, idempotently by `(kind, source_table, source_id)`:

- One `sale_fee` row per completed `product_bestowals` row with `s2g_fee > 0`, `recognised_at = created_at`. Environment: `live` for PayPal/NOWPayments-era rows, `devnet` for the two rows marked paid by devnet payouts. The migration lists the row ids it classifies as test, so the classification is reviewable in the file.
- Nothing for `orchard_holdings`: they are held, not released.
- Nothing for the parked `balance_ledger`: that is a liability, not revenue.

Rather than guess at anything older or murkier, the migration also writes one `opening_balance` row dated 2026-09-01, the mainnet cutover, amount 0.00, `notes` stating that fees before the cutover are recorded per row above and that no other pre-ledger income exists. If the owner later finds NOWPayments-era income, it goes in as a single dated `opening_balance` correction with the statement it came from named in `notes`. Today's real answer is that S2G has recognised about 3.40 in fees, of which 0.60 came from sales settled with devnet tokens.

---

## 4. Liability view: can we cover what we owe

This replaces the top of `/gosat/treasury`. One edge function, `treasury-balances`, already gathers external balances; it grows to return this shape, and the page renders it. Read-only, gosat role, unchanged auth.

### 4a. What the page shows

**Top block, four numbers and a verdict**

| Line | Source | Note |
|---|---|---|
| Held for members | `owed_payout_balances()` total + `balance_ledger` total | Two sub-lines: owed through the pipeline, and parked S2G Balance. Never merged with the next line. |
| Held for orchards | `orchard_funding_status` / `orchard_holdings` held, gross | With the orchard count. The 15% inside it is shown as a sub-line "of which S2G's once released". |
| Total liability | the two above, added | The spec's one prominent number. |
| S2G's own, recognised | `revenue_ledger` where `environment = 'live'`, sum | With this month and all-time. |
| Cash on hand | hot wallet USDC + Squad USDC + Launch + Uplift + PayPal available | Each with its address and live balance in the block below. NOWPayments legacy shown only if non-zero. |
| Reconciliation | cash on hand − total liability − S2G's own | The verdict line. Zero means the books and the wallets agree. |

**Verdict wording**

- Difference within the expected gap (below): "Covered. Books and wallets agree within X (gas float and unrecorded processor fees)."
- Cash on hand below total liability: red. "Short by X. Held money is not fully backed." This is the one state a gosat must never be able to miss.
- Difference above the expected gap in either direction: amber. "Unexplained X. Run the reconciliation query."

**Expected gap, shown as its own line so it is never hidden inside the verdict**

| Component | Why it is expected | How it is shown |
|---|---|---|
| SOL gas float | SOL is not USDC and is not in any bucket | Listed per wallet, excluded from the USD figures |
| Solana processor fees received (0.01 per order) | Not in the ledger until `processor_fee_income` is written | Summed from `bestowals.processor_fee_amount` + `basket_orders.processor_fee` on Solana, mainnet, shown as "unrecorded, S2G's" |
| Float S2G placed in the hot wallet | The 1.00 in section 1b, and any later top-up | A `revenue_ledger` `opening_balance` note is not right for this, because it is not income; it is shown from `treasury_sweeps`-style records: phase 2 adds `treasury_movements` for manual top-ups and withdrawals, entered by a gosat with a signature. |
| Devnet / sandbox rows | Test money | Every query in this view filters `environment = 'live'` (ledger) or `cluster = 'mainnet-beta'` (intents, payouts, holdings via their bestowal's intent). The devnet test holding from 2026-09-06 disappears from the live view and appears in a "test environment" tab. |

**Per-recipient block** (spec points 1, 2, 6), from `owed_payout_balances()` joined to the recipient's payout settings:

| Column | Source |
|---|---|
| Recipient, type | `profiles_public` display name |
| Amount owed | `amount_usd` |
| Rail, destination masked | `profiles.payout_network` / `user_wallets`, same resolver `payout-earnings` uses (`resolveSowerPayout`) |
| Threshold position | above or below `PAYOUT_THRESHOLD_USD`; cooling-off active if `payout_details_updated_at` is within the window |
| Oldest unpaid row | min `created_at` across `covered_rows`, with an amber flag past 30 days and red past 60 |
| Source rows | expandable list of `covered_rows` with links to the sale |

**Orchards block**: one line per orchard with a held balance: title, sower, held / target, pockets, days since opened. Informational, no flag (spec: an unfunded orchard is not an anomaly).

**Wallets block**: the four wallets plus PayPal, each with address, USDC, SOL, and what the books expect to be there: hot wallet = held for members on the Solana rail + held for orchards with `location = hot_wallet` + unswept S2G fees; Squad = swept S2G fees; orchard wallets = holdings with `location = orchard_wallet`; PayPal = held for members on the PayPal rail + PayPal-rail orchard holdings + unswept PayPal fees. This per-wallet expectation is what makes a shortfall locatable, not just visible.

### 4b. The reconciliation query

`scripts/studio/bookkeeping-reconcile.sql` (phase 2 deliverable) prints the same lines as the page from SQL alone, with a column per wallet, so the owner can check the page against the database without trusting the page. Section 7 uses it as the acceptance test.

---

## 5. Fix to the misleading tiles

The word "revenue" is reserved for `revenue_ledger` sums. Volume tiles are renamed, not deleted, because gross volume is a useful growth number when labelled honestly.

| Component | Line | Today | Change |
|---|---|---|---|
| `src/components/admin/BasicAnalytics.tsx` | 56-66, 201-206, 357-359 | "Revenue Generated" = `bestowals.amount` completed | Rename tile to **"Bestowal volume (gross)"**; sum `product_bestowals.amount` + `bestowals.amount` completed, live only, orchard rows included but labelled "incl. X held for orchards". Add a second tile **"S2G revenue"** reading a new `revenue_summary` RPC (sum of `revenue_ledger`, live, all-time and this month). Line 359's "raised through bestowals" copy becomes "gross volume through bestowals". |
| `src/components/admin/EnhancedAnalyticsDashboard.jsx` | 117-123, 143, 304 | "Total Revenue" = gross across two tables, 125,000 fallback | Same rename to **"Gross volume"** on the MetricCard at 304; the revenue chart at 429-441 switches to the `revenue_summary` RPC's monthly series so "Revenue Over Time" is actually revenue. Delete the fabricated fallback block at 155-175; show an error state instead. Convert to `.tsx` while touched, per the ratchet rule. |
| `src/components/admin/PaymentMonitoring.tsx` | 21, 41, 72-77 | "Total Revenue" = `organization_payments.amount` | This table is dead on the live rails. Tile becomes **"Legacy payments (NOWPayments era)"** or the component is retired from the dashboard; recommendation: retire, since `solana_payment_intents` and PayPal captures are monitored elsewhere. Decide in phase 3. |
| `src/components/admin/analytics/AnalyticsMetrics.tsx` | 49-80 | prop `totalRevenue` labelled "Total Revenue" | Rename prop and label to `grossVolume` / "Gross volume"; add an optional `s2gRevenue` card. Callers updated with it. |
| `src/pages/GosatTreasuryPage.tsx` | 96-102, 230-235 | Custody total, Reserved, Held for orchards, Platform net (computed) | Replaced by section 4's block. "Platform net (computed)" is removed; S2G's own comes from the ledger, and the difference is shown as reconciliation, not as income. |
| `supabase/functions/treasury-balances/index.ts` | 199-247 | `platformNetUsd = custody − reserved − held` with custody excluding the hot wallet | Returns the section 4 shape: buckets, ledger sums, per-wallet expectations, gap components, verdict. Adds the hot wallet, Squad and both orchard wallets to the balances it fetches (today it only reads `organization_wallets`, which holds the two dead legacy addresses). |
| `src/pages/AdminPayoutsPage.tsx` | 119-183 | float, parked liability, next-run preview | Keeps its job (the next payout run). Gains a link to the treasury liability view rather than duplicating it. |
| `useMarketingStats.ts`, `lib/analytics/sow2grow.ts` | grep hits | "revenue" naming | Check in phase 3 that nothing member-facing says revenue when it means volume. |

---

## 6. Build order

Each phase ships alone, is verified by section 7, and can stop there. Migrations are applied by the owner or, as on 2026-09-05, server-side on the owner's go; queries for the owner live under `scripts/studio/`.

| Phase | Delivers | Migration | Code | Done when |
|---|---|---|---|---|
| **1. Revenue ledger** | The table, the writer, the backfill, one read RPC. No UI. | `revenue_ledger` table, CHECKs, unique key, no-update trigger, RLS; `record_revenue(...)`; `revenue_summary(_environment)` returning all-time, this month and a monthly series; `basket_orders.environment`; backfill of `product_bestowals` fees with the devnet rows named; `opening_balance` row. `finalize_basket_order()` redefined to call `record_revenue` per line. | `purchase-music-track`, `capture.ts` (`finalizeContentPurchase`, `finalizeBestowal` gift branch), `create-booking-paypal-order` capture, `payout-earnings` PayPal fee cost: each one `rpc('record_revenue', …)` call. `_shared/revenue.ts` helper that derives `environment`. | The proof query shows one ledger row per completed fee-bearing sale, the backfill total equals `sum(s2g_fee)` on live rows, a re-run inserts nothing, and a fresh devnet basket order writes a `devnet` row that `revenue_summary('live')` ignores. |
| **→ Orchard Phase B slots here.** | `orchard_release()` writes `orchard_fee` through `record_revenue`. | Per `ORCHARD-MONEY-PLAN.md` section 8 row B, with "`revenue_ledger` (or reuse)" now settled as reuse. | | Its own done-when, plus: the release's `orchard_fee` row equals `sum(s2g_amount)` of the released holdings. |
| **2. Liability view** | The gosat page and its function return section 4. Reconciliation query. Manual treasury movements. | `treasury_movements` (gosat-entered top-ups and withdrawals with signature); `liability_snapshot()` SECURITY DEFINER returning held-for-members split, held-for-orchards, ledger sums, per-rail expectations, all filtered to live; view `owed_recipient_detail_v` for the per-recipient block (age, rail, threshold). | `treasury-balances` fetches the four named wallets and PayPal, calls `liability_snapshot`, computes per-wallet expectation and the verdict; `GosatTreasuryPage.tsx` renders it; `scripts/studio/bookkeeping-reconcile.sql`. | The page's verdict line equals the reconciliation query's; with the devnet holding excluded the live gap is exactly float + processor fees; forcing a fake shortfall in a test fixture turns the verdict red. |
| **3. Honest tiles** | Section 5. | none | The five components in section 5; `PaymentMonitoring` retired or relabelled; `.jsx` → `.tsx` on the one file touched. | No admin screen shows the word "revenue" over a gross-volume number; the S2G revenue tile equals `revenue_summary('live').all_time`. |
| **4. Processor-fee income and month-end** | `processor_fee_income` rows for Solana orders; a monthly P&L export. | backfill of Solana processor fees from `solana_payment_intents` paid mainnet joined to their orders; `revenue_monthly_v`. | Order finalizers write the 0.01; a "Download month" CSV on the gosat page. | Month total for August and September matches a hand-sum of the source tables. |

### Phase 1 status (2026-09-06)

**Live.** Migration `supabase/migrations/20260906120000_revenue_ledger.sql` applied server-side (`npx supabase db query --linked -f`). Owner's decisions folded in: the Solana 0.01 processor fee waits for phase 4; the parked S2G Balance total (13.95) is one `opening_balance` row, recorded as a cost (a liability carried in, not income; `revenue_summary().operating_net` excludes it); the two sales settled with devnet tokens (`b3518c23`, `904058fc`) are tagged `devnet` and named in the migration; their reverts are a separate step, not done here; PayPal live/sandbox labelling and legacy-wallet retirement wait for phase 2; corrections are gosat-only with a mandatory note (`record_revenue_correction`).

| Piece | Where |
|---|---|
| Table, append-only trigger, RLS, grants | `revenue_ledger`; `record_revenue` service_role only; `revenue_summary` checks admin/gosat inside |
| Environment derivation | `payment_environment(provider, order_kind, order_id)` in SQL; `_shared/revenue.ts` `resolveOrderEnvironment` in Deno; rules twin `_shared/revenueRules.ts` |
| Writers | `finalize_basket_order(uuid, text)` and `finalize_content_purchase(uuid, text)` record in the same transaction; `_shared/paypal/capture.ts` records `gift_fee` (gift branch of `finalizeBestowal`) and `booking_fee` (`finalizeBooking`) |
| Backfill | 12 `sale_fee` rows = every completed `product_bestowals` row with a fee, total 3.40 = source total; 7 live (1.90), 5 devnet (1.50, three of them Solana devnet sales plus the two named); 1 `opening_balance` −13.95 |
| Proofs | migration proof; `scripts/studio/revenue-ledger-proof.sql`; `scripts/studio/revenue-ledger-tests.sql` 17/17 pass (rolled back); `src/test/revenue-ledger.test.ts` 19 pass |
| Deployed | the 11 functions that bundle `capture.ts` (see SESSION-STATE) |

Live-only figures at ship: `sale_fee` 1.90, `opening_balance` −13.95, net −12.05, operating net 1.90. This does **not** reconcile to on-chain yet, by design: reconciliation is phase 2, and today's wallets hold devnet test money and unrecorded float (section 1b). Phase B may now call `record_revenue('orchard_fee', …, 'orchard_releases', <release id>, …)`; the function already refuses that source until the table exists.

Phase 1 goes first because Phase B is blocked on it and because it is invisible to members, so it is safe to ship on a weekday. Phase 2 is the one the spec calls for and should follow immediately. Phases 3 and 4 can wait.

---

## 7. Tests

| Phase | Unit (Vitest) | Studio query | Playwright |
|---|---|---|---|
| 1 | `_shared/revenue.ts`: `environment` derivation from cluster and `PAYPAL_ENV`; amount sign by direction; a `record_revenue` payload builder with the unique key. SQL fixture in `scripts/studio/revenue-ledger-tests.sql` (BEGIN…ROLLBACK, like the Phase A guard tests): duplicate call returns the same row, UPDATE and DELETE raise, a correction nets to zero, `revenue_summary('live')` ignores a `devnet` row. | `scripts/studio/revenue-ledger-proof.sql`: backfill total vs `sum(s2g_fee)`, one row per source, environment split. | `tests/payments/revenue-ledger.spec.ts`: as A, complete a devnet basket order end-to-end is out of scope for CI; instead assert that a member (A) gets zero rows from `revenue_ledger` and that the `revenue_summary` RPC returns 42501 for A and B. |
| Phase B | plan section 7 | release proof adds the `orchard_fee` row | plan section 7 |
| 2 | `liability_snapshot` fixture test: known holdings, owed rows and ledger rows produce the expected buckets; per-wallet expectation math; verdict thresholds. | `bookkeeping-reconcile.sql` versus the page. | `tests/payments/gosat-liability.spec.ts`: as a **gosat account**, load `/gosat/treasury`, read the verdict line and the four numbers, compare with a direct RPC call to `liability_snapshot`; as A, assert 403 from `treasury-balances` and the page's access denial. |
| 3 | tile label tests in `src/test/` for the three components. | none | as gosat, no element containing "Total Revenue" exists on `/admin` or `/admin/analytics`; the S2G revenue tile text equals the RPC value. |
| 4 | monthly view math. | month hand-sum. | CSV download not testable in the sandbox; assert the row count in the response instead. |

**A gosat test account is needed.** Test accounts A and B are non-admin by design and must stay that way, since the profiles and orchard specs rely on it. Phase 2's Playwright needs a third account, C, with the `gosat` role only, no `admin` role, created by the owner and granted via a Studio query under `scripts/studio/`. Today the only gosat accounts are real people's. `.env.test` gains `TEST_C_EMAIL` / `TEST_C_PASSWORD` / `TEST_C_USER_ID`.

---

## 8. Open questions

1. **Processor fee as income.** Solana's flat 0.01 is S2G's and covers gas that S2G pays; recording it as `processor_fee_income` is clean but noisy (one row per order at one cent). Alternative: roll it up monthly. Recommendation: per row, phase 4, because the reconciliation needs it per wallet.
2. **The parked 13.95.** It is a liability in the books, but the feature is off and the cash trail is unrecorded. Either confirm the underlying PayPal/NOWPayments funds still exist and back it, or pay it out through the pipeline and empty the ledger. The view will show it as owed either way.
3. **The two devnet-paid earnings** (`b3518c23`, `904058fc`, 2.00 each). They are real sales marked paid with test tokens. Reverse to `pending` so they are paid for real, as was done for Amber's `02c6b716`, or write them off. This changes the held-for-members figure by 4.00.
4. **PayPal environment.** `PAYPAL_ENV` decides whether the PayPal balance the page fetches is real. The ledger records it per row; the page must say which one it is showing.
5. **Legacy wallets.** `organization_wallets` s2gholding / s2gbestow have no USDC accounts and no live writer, yet `distribution.ts` refuses to build an orchard distribution without them. Retire in phase 2 or keep as inert config; either way drop them from the treasury page.
6. **Who may write a `correction`.** Proposal: gosat role only, through a small form with a mandatory note, never from Studio by hand. Needs a yes.
