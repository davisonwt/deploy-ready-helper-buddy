# Orchard money: hold, release, cancel and refund — build plan

Design only (2026-09-05, P0-5 part A). Nothing here is built yet. Rules
decided by the owner on 2026-09-05 are taken as fixed and are not re-argued:
all-or-nothing with no deadline, nothing releases before full funding
(S2G's 15% included), two orchard types (Launch, Uplift), no whisperers,
gosat-only cancel with 100% refund on the original rail and S2G absorbing
fees, Launch bestowal pockets collect a delivery address at bestow time,
and funds are held on a ledger while physically staying in the hot wallet
or PayPal balance, with a later optional sweep to the dedicated orchard
wallets.

---

## 1. Current state: what happens today when someone bestows into an orchard

Plain English first. A member picks a number of pockets, pays the pocket
price times that number plus the processor fee, and the money lands in the
hot wallet (USDC) or the PayPal account. A row is written to the legacy
`bestowals` table. On payment confirmation the row is marked completed and
the sower's share is **immediately credited to the parked S2G Balance
ledger**, which is the opposite of holding it. The orchard's pocket counter
is never updated, so no orchard can ever reach "funded", and the only
"completion" effect that exists (creating a chat room) can never fire.
S2G's 15% is not recorded anywhere as a fee column; it lives inside a JSON
snapshot. The daily treasury sweep moves any USDC above the hot-wallet
ceiling to the Squad vault regardless of whose money it is.

### 1a. The write path, both rails

| Step | Where | What is written | Notes |
|---|---|---|---|
| Price | `supabase/functions/create-orchard-bestowal-order/index.ts:100-113` | `baseAmount = pocket_price × pocketsCount`; processor fee via `computeBuyerFee`; `buyerTotal` | `pocket_price` is fee-inclusive by design (`CreateOrchardPage.jsx:535-552` stores `buyerTotal(base)`). No second gross-up. |
| Split snapshot | `supabase/functions/_shared/distribution.ts:75-140` | `distribution_data` JSON: `sower_amount = base/1.15`, `tithing_admin_amount = base − sower_amount`, `fee_model: 'fee_inclusive'`, holding and tithing wallet addresses from `organization_wallets` | The 15% exists only inside this JSON. |
| Row | `create-orchard-bestowal-order/index.ts:127-153` | `bestowals`: `amount = buyerTotal`, `base_amount`, `processor_fee_amount`, `pockets_count`, `payment_status = 'pending'`, `payout_status = 'pending'`, `payout_provider/destination` resolved from the sower's payout config at bestow time | `pocket_numbers` exists but is not set. No pocket type, no delivery address. |
| USDC rail | `create-orchard-bestowal-order/index.ts:208-226` → `_shared/solanaPayIn.ts` | `solana_payment_intents` row (`order_kind = 'orchard'`, `order_id = bestowals.id`, `reference_pubkey`, `hot_wallet_address`, later `signature`, `received_amount_usdc`, `paid_at`) | The payer's wallet address is **not stored**; only the tx signature. |
| PayPal rail | `create-orchard-bestowal-order/index.ts:228-` | PayPal order created; `bestowals.provider_order_id = <PayPal order id>` | Capture id arrives at finalize as `payment_reference`. |
| Finalize (both rails) | `_shared/paypal/capture.ts:135-138` → `finalizeBestowal` (`:167-201`) | `payment_status = 'completed'`, `payment_reference = <capture id or signature>`; then RPC `credit_earning_for_gift_bestowal` | Called by `paypal-webhook`, `capture-paypal-order`, `check-solana-payment` and `sweep-solana-payments`. |
| Credit | `supabase/migrations/20260903100000_balance_ledger_content_gift_earnings.sql:115-150` | `credit_balance_ledger(sower, sower_amount, 'earning_credit')` and `bestowals.payout_status = 'credited_to_balance'` | **Not gated** by `app_settings.s2g_balance_enabled`. The product-sale equivalent was gated on 2026-09-03 (`20260903150000`); this one was not. |
| Payout | `20260831090000_unified-payouts.sql:74-90` (`owed_payout_balances`) | Reads `bestowals` only where `payout_status = 'pending'` | A credited row is therefore invisible to the weekly run: the sower is never paid by it, and the money sits in a ledger for a feature that is parked. |
| Receipt and books | `_shared/postFinalize/messaging.ts`, `_shared/postFinalize/books.ts:69` | Chat receipt; books income row for the sower from the snapshot | Best-effort. |
| Pocket counter | `20251001104556_b435c4b4….sql:83-85` (`update_orchard_filled_pockets`) | Meant to add `pockets_count` to `orchards.filled_pockets` on INSERT of a completed row | **No `CREATE TRIGGER` for it exists in any migration**, and it only fires on INSERT while rows are inserted as `pending`. `filled_pockets` is never maintained by code. |
| Completion | `20251001104708_….sql` (`auto_generate_premium_room`, trigger `trigger_auto_generate_premium_room` AFTER UPDATE ON orchards) | When `filled_pockets ≥ total_pockets`, inserts a premium chat room and a notification | The only completion effect. Nothing about money. Cannot fire because the counter never moves. |
| Progress shown | `src/pages/OrchardPage.jsx:95-100, 267-279` | `filled_pockets / total_pockets` and `filled_pockets × pocket_price` | Shows whatever `filled_pockets` was last set to by hand. |
| Treasury sweep | `supabase/functions/sweep-hot-wallet/index.ts` (daily 03:00 UTC) | Moves hot-wallet USDC above `HOT_WALLET_CEILING_USD` (default $500) to the Squad vault | Blind to orchard money: bestowers' pocket money above the ceiling is swept into S2G's vault. |

Also present but unused: `orchard_payouts` (`orchard_id, user_id, recipient_pubkey`), referenced nowhere in the app. `escrow_events` (`bestowal_id, event, from_status, to_status, amount, actor_id, actor_role, notes`) is the physical-goods hold audit trail keyed on `product_bestowals`; its shape is the template for the orchard holdings log below. The `orchard_type` enum today is `standard | full_value`; Launch and Uplift are not modelled. Whisperer columns exist on `orchards` (`has_whisperer`, `whisperer_share_pct`, …) and must be ignored by the new flow.

### 1b. Live orchards holding pocket money: query for the owner

Run in Studio and download the CSV. It lists every orchard with completed pocket bestowals, how much of that money is sitting in the parked ledger instead of the payout queue, and which rail it came in on.

```sql
SELECT json_build_object(
  'orchards_with_money', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.received_total DESC), '[]'::json) FROM (
      SELECT o.id, o.title, o.status, o.orchard_type, o.user_id AS sower_user_id,
             o.pocket_price, o.total_pockets, o.intended_pockets, o.filled_pockets,
             count(b.id)                                   AS completed_bestowals,
             sum(b.pockets_count)                          AS pockets_paid,
             round(sum(b.base_amount)::numeric, 2)         AS received_gross,
             round(sum(b.buyer_total_amount)::numeric, 2)  AS received_total,
             round(sum((b.distribution_data->>'sower_amount')::numeric), 2)         AS sower_share,
             round(sum((b.distribution_data->>'tithing_admin_amount')::numeric), 2) AS s2g_share,
             count(*) FILTER (WHERE b.payout_status = 'credited_to_balance')       AS rows_in_parked_ledger,
             count(*) FILTER (WHERE b.payout_status = 'pending')                   AS rows_in_payout_queue,
             count(*) FILTER (WHERE b.payout_status = 'paid')                      AS rows_paid,
             json_agg(DISTINCT b.provider)                 AS rails
      FROM public.orchards o
      JOIN public.bestowals b ON b.orchard_id = o.id
      WHERE b.payment_status IN ('completed', 'distributed')
      GROUP BY o.id
    ) t
  ),
  'pending_unpaid_rows', (
    SELECT count(*) FROM public.bestowals WHERE orchard_id IS NOT NULL AND payment_status = 'pending'
  ),
  'ledger_credits_from_orchards', (
    SELECT json_build_object('rows', count(*), 'total', round(COALESCE(sum(amount), 0)::numeric, 2))
    FROM public.balance_ledger WHERE reference_table = 'bestowals' AND kind = 'earning_credit'
  )
);
```

Expected shape: a handful of orchards, most money in `rows_in_parked_ledger`, `filled_pockets` not matching `pockets_paid`.

---

## 2. Data model

Principle: the existing `bestowals` row stays the payment record. Holding is a **separate ledger** so that states, audit and the future wallet sweep never depend on payment-row columns.

### 2a. New table `orchard_holdings` — one row per paid pocket bestowal

| Column | Type | Meaning |
|---|---|---|
| id | uuid pk | |
| orchard_id | uuid → orchards | |
| bestowal_id | uuid → bestowals, unique | The paid row this holding represents. |
| bestower_user_id | uuid | Copied at creation for the refund path. |
| pockets | int | `bestowals.pockets_count`. |
| pocket_kind | text: `bestowal` \| `gift` | Launch only. Uplift rows are always `gift`. |
| gross_amount | numeric | `bestowals.base_amount` (pocket price × pockets, fee-inclusive). |
| sower_amount | numeric | `gross / 1.15`, from the snapshot. |
| s2g_amount | numeric | `gross − sower_amount`. Held with everything else. |
| processor_fee | numeric | What the bestower paid on top; never refunded by the rail, S2G absorbs on cancel. |
| rail | text: `solana` \| `paypal` | |
| rail_reference | text | Solana tx signature or PayPal capture id, from `bestowals.payment_reference`. |
| payer_address | text null | Solana: the sender's wallet, resolved from the transaction at hold time (see §5). PayPal: null; the capture id is enough. |
| delivery_address | jsonb null | Launch `bestowal` pockets only. Name, line1, line2, city, region, postal code, country, phone. |
| location | text: `hot_wallet` \| `paypal_balance` \| `orchard_wallet` | Where the money physically is. `orchard_wallet` is reserved for the later sweep. |
| state | text | See 2c. |
| created_at, updated_at | | |

Indexes on `orchard_id`, `bestower_user_id`, `(orchard_id, state)`.

### 2b. New tables for the exits

`orchard_releases` — one row per orchard release, plus its payments.

| Column | Meaning |
|---|---|
| id, orchard_id (unique), released_by (gosat or `system`), released_at | |
| sower_total, s2g_total, gift_units | Totals at release. |

`orchard_release_payments` — one row per party S2G pays on release (Uplift; Launch factory and courier when S2G pays them).

| Column | Meaning |
|---|---|
| id, release_id, orchard_id, payee_label (`dealer`, `supplier`, `courier`, `factory`, …), payee_user_id null | |
| amount, rail, rail_reference, status (`planned` \| `sent` \| `failed`), sent_by, sent_at, notes | |

`orchard_refunds` — one row per holding refunded.

| Column | Meaning |
|---|---|
| id, orchard_id, holding_id (unique), bestower_user_id | |
| amount | `gross_amount` (100% of what they paid before processor fee). |
| rail, destination (Solana address or PayPal capture id), rail_reference (refund tx / PayPal refund id) | |
| status (`queued` \| `sent` \| `confirmed` \| `failed` \| `needs_human`), attempts, last_error, created_at, sent_at | |

`orchard_events` — audit log, same shape as `escrow_events`: `orchard_id, holding_id null, event, from_state, to_state, amount, actor_id, actor_role (member \| gosat \| system), notes, created_at`. Append-only.

### 2c. Changes to existing tables

| Table | Change |
|---|---|
| `orchards` | `orchard_kind text: launch \| uplift` (new; the old `orchard_type` enum is left for the legacy UI and ignored by the new flow). `funding_state text: open \| funded \| released \| cancelled` (new, default `open`). `target_amount numeric` (new: the real all-in target including the 15%, set at creation, replaces recomputing from `seed_value`). `funded_at`, `released_at`, `cancelled_at`, `cancelled_by`. `opened_by_gosat uuid` for Uplift. |
| `bestowals` | `pocket_kind text` and `delivery_address jsonb` captured at bestow time (the holding copies them). No other change; `payout_status` stays `pending` and is **never** set to `credited_to_balance` for orchard rows any more. |
| `credit_earning_for_gift_bestowal` | Must early-return for rows with `orchard_id IS NOT NULL` (orchard money is not an earning until release) and, for gifts, respect `app_settings.s2g_balance_enabled` like its product sibling. |
| `owed_payout_balances()` | Bestowals branch gains `AND (b.orchard_id IS NULL OR EXISTS (SELECT 1 FROM orchard_holdings h WHERE h.bestowal_id = b.id AND h.state = 'released'))`, so orchard money enters the payout queue only after release. |
| `sweep-hot-wallet` | Ceiling check must subtract `sum(gross_amount) FROM orchard_holdings WHERE state = 'held' AND location = 'hot_wallet' AND rail = 'solana'` before deciding what is "excess". |

### 2d. States and the only transitions allowed

Holding (`orchard_holdings.state`):

| From | To | Performed by | Trigger |
|---|---|---|---|
| — | `held` | system, at finalize of the paid bestowal | `finalizeBestowal` for a row with `orchard_id`. Idempotent on `bestowal_id`. |
| `held` | `released` | system, inside the release transaction | Orchard moves `funded → released`. All holdings of the orchard move together, in one transaction. |
| `held` | `refund_queued` | gosat cancel | Orchard moves to `cancelled`. All holdings together. |
| `refund_queued` | `refunded` | system, when the refund is confirmed on the rail | `orchard_refunds.status = confirmed`. |
| `refund_queued` | `refund_failed` | system, after retries are exhausted | Gosat sees it in the console; retry moves it back to `refund_queued`. |

No transition out of `released` or `refunded`. No transition from `held` to `refunded` without `refund_queued` (the refund must be recorded before money moves).

Orchard (`orchards.funding_state`):

| From | To | Performed by | Trigger |
|---|---|---|---|
| `open` | `funded` | system | Funded detection (§3) finds `held_total ≥ target_amount`. |
| `funded` | `released` | Launch: system, immediately after `funded` in the same job. Uplift: gosat, from the console, once release payments are planned. | |
| `open` or `funded` | `cancelled` | gosat only | Cancel action. A `released` orchard cannot be cancelled. |

`funded → released` is separate from `open → funded` so that Uplift can pause for the gosat to enter who gets paid, and so a Launch release that fails half-way can be retried without re-detecting funding.

---

## 3. Funded detection

**Formula.** `held_total = sum(gross_amount) FROM orchard_holdings WHERE orchard_id = X AND state = 'held'`. Funded when `held_total ≥ orchards.target_amount`. `target_amount` is stored at creation as the all-in number (costs ÷ 0.85, rounded up to whole pockets × pocket price), so the 15% is inside the target and the comparison is one line. `filled_pockets` becomes a derived display value: `sum(pockets)` of held holdings, maintained by the same code, never by the old trigger function (which is dropped).

**Where it runs.** In the database, as a SECURITY DEFINER function `orchard_apply_holding(bestowal_id)` called from `finalizeBestowal` right after the row is marked completed, replacing the credit call for orchard rows. It inserts the holding (idempotent: `ON CONFLICT (bestowal_id) DO NOTHING`), recomputes `held_total` under `SELECT … FOR UPDATE` on the orchard row, updates `filled_pockets`, and if the threshold is met sets `funding_state = 'funded'`, `funded_at = now()` and writes an `orchard_events` row. Doing this in SQL, not in the edge function, means every rail and every retry path (webhook, capture, sweep, check) gets the same result with one lock.

**Release trigger.** For Launch, the same function goes on to call `orchard_release(orchard_id)` (§4) in the same transaction. For Uplift it stops at `funded` and notifies gosats.

**Over-funding.** A bestowal that would take `held_total` past `target_amount` is refused at order creation (`create-orchard-bestowal-order` compares `pockets_count` against remaining pockets before inserting). A race that still over-fills is accepted and the surplus pockets become gift units (Launch) or surplus (Uplift) recorded on the release row; no money is ever silently dropped.

**Idempotency.** Holding insert is keyed on `bestowal_id`; the orchard transition checks `funding_state = 'open'` inside the lock; the release row is unique per orchard. Re-running any step is a no-op.

---

## 4. Release

Nothing moves on-chain at release. Money stays where it is; the ledger changes who it belongs to.

**Launch.** In one transaction `orchard_release(orchard_id)`:
1. All `held` holdings → `released`.
2. For each holding, the underlying `bestowals` row's `payout_status` stays `pending` and now passes the new `owed_payout_balances()` condition, so the sower's `sower_amount` per row enters the normal weekly / on-request payout pipeline with its existing threshold, cooling-off, caps and claim logic. No new payout code.
3. S2G's share: one `revenue_ledger` entry per orchard (new table if the gosat P&L work in the audit's P1-2 has not created one yet; otherwise reuse it) for `sum(s2g_amount)`, kind `orchard_fee`, referencing the release row. This is the first moment the 15% counts as S2G's.
4. Gift units: `gift_units = sum(pockets) WHERE pocket_kind = 'gift'` written on the release row and to a new `orchard_stock` row (`orchard_id, sower_user_id, units, note`), so the sower's inventory of unclaimed units is a record, not a memory.
5. Delivery: the bestowal pockets' `delivery_address` values are listed on the gosat console and the sower's orchard page; fulfilment stays manual.
6. `orchards.funding_state = 'released'`, `released_at`, event row, notifications to sower and every bestower.

**Uplift.** Gosat opens the release from the console, adds the parties (label, amount, rail, destination), and confirms. Steps 1, 3 and 6 as above; there is no sower payout, since S2G pays parties directly: each `orchard_release_payments` row is executed by a gosat through the existing payout primitives (`sendUsdcPayout` for USDC, PayPal Payouts for PayPal) and recorded with its reference. The sum of party payments must not exceed `sum(sower_amount)`; the console enforces it. The tribe-facing orchard page lists the parties paid, per the spec's "the tribe can always be shown where their gifts went".

**Books.** The existing books sync for orchards is moved from finalize to release, so the sower's income row appears when the money is really theirs.

---

## 5. Cancel and refund

**Who.** Gosat only, from the console, with a typed confirmation of the orchard title. Allowed from `open` or `funded`. One transaction: orchard → `cancelled`, every `held` holding → `refund_queued`, one `orchard_refunds` row per holding (`amount = gross_amount`), event rows, notification to each bestower ("your X USDC / $X is being returned to the wallet / PayPal account you paid from").

**Refund execution.** A new edge function `orchard-refund-worker`, run by the existing `invoke_money_job` cron every 10 minutes and callable by a gosat for one orchard, takes `queued` refunds in small batches:

| Rail | Destination | How | What we store today |
|---|---|---|---|
| USDC | The wallet that sent the payment | `sendUsdcPayout(sender, payer_address, amount)` from the hot wallet, same primitive as payouts | **Not stored today.** `solana_payment_intents` has `reference_pubkey` and `signature` only. At hold time (§3) the worker resolves the sender by `getTransaction(signature)` → source token account → its owner, exactly what `findFallbackWalletMatch` already does in `_shared/solanaPayIn.ts`, and stores it in `orchard_holdings.payer_address`. Holdings created for past bestowals get the same backfill; if a signature cannot be resolved the holding is flagged `payer_unknown` and its refund goes straight to `needs_human`. |
| PayPal | The original capture | `POST /v2/payments/captures/{capture_id}/refund` with the full amount | `bestowals.payment_reference` holds the capture id written by `finalizeBestowal` (confirm with the query below); `provider_order_id` holds the order id, from which the capture id can also be fetched (`GET /v2/checkout/orders/{id}`) if the reference is missing. PayPal returns the buyer's fee share on a full refund within 180 days; S2G absorbs anything it keeps. |

Confirm the PayPal reference shape before building:

```sql
SELECT provider, provider_order_id, payment_reference, payment_status, created_at
FROM public.bestowals WHERE orchard_id IS NOT NULL AND provider = 'paypal'
ORDER BY created_at DESC LIMIT 5;
```

**Caps and fees.** Refund sends bypass the payout daily cap (they are returns, not payouts) but use their own cap, `ORCHARD_REFUND_MAX_DAILY_USD`, defaulting to the orchard's own `held_total`. Network and PayPal fees are S2G's; the bestower receives exactly `gross_amount`.

**Failure handling.** Each attempt increments `attempts` and stores `last_error`. Three failures → `refund_failed` on the holding and `needs_human` on the refund; the console shows it with a retry button that resets it to `queued`. A refund is `sent` when the rail accepts it and `confirmed` when the USDC transaction is finalized or PayPal reports `COMPLETED` (webhook `PAYMENT.CAPTURE.REFUNDED`, already routed through `paypal-webhook`). Idempotency: the worker re-reads the refund row under lock and never sends when `rail_reference` is already set; the USDC send reuses the payout primitive's finalized-commitment wait.

**Partial refund state.** An orchard in `cancelled` shows `refunds: n sent / m total` until every refund is `confirmed`; it never returns to `open`. The bestower's holding shows `refund_queued`, `refunded` or `refund_failed` with the rail reference once known.

**What the bestower sees.** A notification at cancel, a "Refund on its way" line in My Bestowals, then "Refunded, tx …" with the explorer link or PayPal refund id. Nothing they need to do.

---

## 6. Screens

| Screen | Shows | Source |
|---|---|---|
| Orchard page (`OrchardPage.jsx`) | State badge: Open / Funded / Released / Cancelled. Progress = `held_total / target_amount` and pockets held / total. For Launch: "your pocket claims a unit, delivery address required" vs "gift a unit to the sower". For Uplift: "S2G pays the parties directly" and, after release, the list of parties paid. Plain sentence up front: "There is no deadline. Nothing is released until the orchard is fully funded." | `orchards.funding_state`, `target_amount`, `orchard_holdings` sums via a small SECURITY DEFINER count function (same pattern as `chat_room_member_counts`). |
| Bestow step (`QuickBestowModal`) | Pocket kind choice for Launch; delivery address form for bestowal pockets; refuses more pockets than remain. | Writes `pocket_kind`, `delivery_address` on the order. |
| My Bestowals | Per orchard pocket: Held / Released / Refund queued / Refunded (with reference) / Refund failed. | `orchard_holdings` + `orchard_refunds` for the caller's rows. |
| Gosat orchard console (`/gosat/orchards`, new) | Every orchard with state, held total vs target, holdings list with rail and payer address, delivery addresses (Launch), Fund-now override (Uplift only, when the gosat has confirmed a top-up outside the app), Release (Uplift), Cancel with confirmation, refund progress with retry, event log. | All new tables; write actions through new gosat-gated edge functions. |
| Treasury / liability line (`GosatTreasuryPage`, `AdminPayoutsPage`) | "Held for orchards: $X across n orchards" as its own line, next to "held for members" from `owed_payout_balances()`, and "S2G's own = wallet balance − both". | `sum(gross_amount) WHERE state = 'held'`, grouped by `location`. |

---

## 7. Tests

| Phase | Unit (Vitest) | Playwright (needs two non-admin accounts; none exist today, so these are written gated on env credentials like `profiles-public.spec.ts`) |
|---|---|---|
| A | `credit_earning_for_gift_bestowal` mirror: orchard rows are skipped; SQL fixture test in the style of `scripts/s2g-balance-flag-tests.sql` for the new `orchard_apply_holding` (idempotent on repeat, moves to `funded` only once, locks). Sweep ceiling math excludes held USDC. | Bestow one pocket on the USDC rail with the fake wallet (existing Phantom stub) and assert the holding row exists via REST and the orchard page shows Held. |
| B | Release transaction: all holdings flip together; `owed_payout_balances()` includes released orchard rows and excludes held ones; revenue entry equals `sum(s2g_amount)`; gift units counted. | Fund a test orchard to target with two accounts, assert the page flips to Released and the sower's earnings card shows the amount as owed. |
| C | Refund state machine: queued → sent → confirmed; failure counting; no double send when `rail_reference` set; payer address resolution from a recorded devnet transaction. | Gosat cancels; bestower's My Bestowals shows Refund queued, then Refunded after the worker runs against devnet. |
| D | Uplift release payments: sum ≤ sower total; each payment recorded with reference. | Gosat console flow end to end on devnet. |

Every phase also keeps `platform-fee-drift` green: the 15% inside `target_amount` must equal `s2gFeeOn(base)`.

---

## 8. Build order

Each phase ships on its own and is verifiable before the next starts. Migrations are applied by the owner in Studio, as today.

| Phase | Delivers | Migrations | Code | Done when |
|---|---|---|---|---|
| **A. Stop the leak, start the ledger** | Orchard money stops going to the parked ledger; every paid pocket becomes a `held` holding; funded detection works; the sweep respects held money; a read-only liability line appears. No release yet: a funded orchard sits at `funded`. | `orchard_holdings`, `orchard_events`; `orchards.orchard_kind / funding_state / target_amount / funded_at`; `orchard_apply_holding()`; `credit_earning_for_gift_bestowal` skips orchard rows; drop the dead `update_orchard_filled_pockets`; backfill: one holding per existing completed orchard bestowal, `state = 'held'`, and a guarded reversal of their `credited_to_balance` credits (same shape as the Amber revert). | `finalizeBestowal` calls the new function for orchard rows; `sweep-hot-wallet` subtracts held USDC; treasury line; orchard page badge and real progress. | The section 1b query shows `rows_in_parked_ledger = 0` for orchards and every completed pocket has a holding; a devnet pocket bestowal creates a holding and moves the counter. |
| **B. Launch release** | Funded Launch orchards release automatically: sower rows enter the payout pipeline, S2G fee recorded, gift units recorded, delivery addresses collected and listed. | `orchard_releases`, `orchard_stock`, `revenue_ledger` (or reuse), `bestowals.pocket_kind / delivery_address`, `owed_payout_balances()` condition, `orchard_release()`. | Bestow step collects kind and address; release path in `orchard_apply_holding`; books sync moved to release; sower and bestower notifications; My Bestowals states. | A devnet Launch orchard funded by two test accounts releases, the sower sees the amount owed on the payout card, the fee appears in the revenue ledger. |
| **C. Cancel and refund** | Gosat cancel, refunds on both rails, retry and needs-human handling, bestower-facing status. | `orchard_refunds`, `orchard_holdings.payer_address` + backfill from signatures, cancel/refund functions. | `orchard-refund-worker` edge function + `invoke_money_job` schedule; gosat console (cancel, refund progress); PayPal refund call and webhook handling. | A devnet orchard cancelled from the console refunds each bestower to their sending wallet, the holdings read `refunded` with references, PayPal sandbox refund confirmed. |
| **D. Uplift** | Gosat-only creation, manual release with party payments recorded, tribe-facing "where the gifts went". | `orchards.opened_by_gosat`, `orchard_release_payments`. | Creation gate (non-gosat cannot create `uplift`), console release form, party payment execution via existing primitives, orchard page party list. | A devnet Uplift orchard funded, released by a gosat to two parties, both payments recorded with references and visible on the page. |

Optional later, unchanged states: a sweep job that moves `held` USDC from the hot wallet to the Launch or Uplift wallet and flips `location` to `orchard_wallet`; refunds and releases then read `location` to pick the sending key.

### Phase A status (2026-09-05)

**Live as of 2026-09-05 evening.** Migration A1 applied server-side (`npx supabase db query --linked -f`), proof row clean; guard tests `scripts/studio/phase-a-rpc-guard-tests.sql` 9/9 pass (rolled back); all 14 functions deployed; `tests/payments/orchard-holdings.spec.ts` passes against the live backend and created the "Phase A test orchard" `55f4e02e-32fe-4013-aa7b-4eff6da77d37` (sower = test account A, 10 x 10 USDC, physical). **Not yet done: the live devnet pocket test** (one pocket via Phantom on devnet, then proofs on holdings / filled_pockets / no ledger credit / treasury). Cluster is mainnet-beta.

Built. Step 0 (`scripts/studio/phase-a-step0.sql`) found **no** orchard with completed pocket bestowals, no pending orchard rows and no ledger credits from orchards, so the backfill in Migration A1 is a no-op today and stays idempotent.

| Piece | Where |
|---|---|
| Migration A1 | `supabase/migrations/20260905200000_orchard_holdings.sql`: `orchard_holdings`, `orchard_events`, `orchard_funding_status()`, `orchard_apply_holding()`, pocket-count trigger, gift-credit guard, backfill, proof. |
| Proof / tests for the owner | `scripts/studio/phase-a-a1-proof.sql`, `scripts/studio/phase-a-rpc-guard-tests.sql`. |
| Finalize | `_shared/paypal/capture.ts` writes a holding for orchard rows (all four confirmation paths go through it). |
| Checkout | `create-orchard-bestowal-order` accepts `pocketType` + `deliveryAddress`, refuses over-funding. |
| Sweep | `sweep-hot-wallet`: sweepable = balance − held-for-orchards − ceiling. |
| Treasury | `treasury-balances` + `GosatTreasuryPage`: "Held for orchards" line. |
| Orchard page | progress from `orchard_funding_status`; the Support card now opens the real bestow dialog with pocket kind + address. |
| Rules | `_shared/orchardHolding.ts` and `src/lib/orchards/pocketRules.ts` (drift-tested in `src/test/orchard-holding.test.ts`). |
| Playwright | `tests/payments/orchard-holdings.spec.ts` (needs `.env.test`). |

Decisions recorded from the owner's answers: target = `total_pockets × pocket_price`; PayPal refund shortfalls are topped up from S2G's float and recorded as a cost (Phase C); the sower's own pockets are refunded like anyone's (Phase C); the revenue ledger is built in Phase B. Until Phase B, an orchard that reaches its target simply reads "fully funded" and accepts no more pockets; nothing is released and the money stays held.

---

## 9. Open questions

Only what the rules above do not settle.

1. **`target_amount` for the orchards that already exist.** They were created with `seed_value`, `courier_cost` and a fee-inclusive `pocket_price` under two different fee conventions. Phase A needs one number per live orchard; propose `total_pockets × pocket_price` and have the owner confirm per orchard from the section 1b CSV.
2. **Refund amount when the bestower paid on PayPal and PayPal returns only part of its fee.** The rule says S2G absorbs fees, so the bestower gets `gross_amount`; confirm S2G is happy to top up the difference from the hot wallet if PayPal's refund lands short.
3. **Launch pockets bought by the sower themselves, or gift pockets on an orchard the sower cancels.** Refund the sower like anyone else? The rules imply yes; confirming avoids a special case.
4. **Where the revenue entry lives.** The audit's P1-2 (real revenue and liability numbers) has not been built; Phase B needs a `revenue_ledger` table or an agreement to defer S2G's orchard fee record to that work.
5. **Two non-admin test accounts.** Every Playwright proof in section 7 needs them; they do not exist. Creating them is a one-time owner action.
