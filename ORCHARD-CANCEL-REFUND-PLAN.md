# Orchard cancel and refund (P0-5 Phase C)

Design only, written 2026-09-06 against the live schema and the code as it stands after Phases A and B. Nothing is built until the owner approves this document.

Owner decisions taken as fixed: cancel is a gosat action only; every bestower gets back 100% of what they paid, on the rail they paid with; S2G absorbs every refund transaction and processor fee; whisperers are not involved in orchards.

What exists and is reused:

| Piece | Where | Role here |
|---|---|---|
| Holdings, one per paid pocket | `orchard_holdings` (status held, released, refund_pending, refunded already in the CHECK) | The unit of refund. |
| Orchard state | `orchards.funding_state` open, funded, released, cancelled | Cancel is a transition of this. |
| Hot wallet USDC send | `_shared/solanaPayout.ts` `sendUsdcPayout(seed, destination, amountUsd)`, micro-sol-signer, finalized-commitment wait | The USDC refund primitive, unchanged. |
| Sender lookup | `_shared/solanaPayIn.ts` `getTokenAccountOwner(sourceAta)` and its parsed-transaction reader | The backfill and capture of the payer wallet. |
| PayPal calls | `_shared/paypal/client.ts` `paypalFetch(path, {body})` | The refund call, `POST /v2/payments/captures/{id}/refund`. Not wired today; the helper is generic. |
| Capture id | `bestowals.payment_reference`, written by `captureAndFinalize` from `capture.data.id`, copied to `orchard_holdings.rail_reference` | What a PayPal refund is made against. |
| Costs | `revenue_ledger` via `record_revenue('refund_cost', …, 'orchard_refunds', <refund id>)`, already accepted as a source once the table exists | Where S2G's absorbed fees are booked. |
| Scheduling | `pg_cron` + `invoke_money_job` | The refund worker's clock. |
| Audit | `orchard_events` | Every transition. |

---

## 1. Current state: what a bestower paid and what we know about it

A pocket is one `bestowals` row (gross `base_amount`, the payer's `buyer_total_amount` including the processor fee, `provider`, `provider_order_id`, `payment_reference`) and, once paid, one `orchard_holdings` row (`gross_amount`, `rail`, `rail_reference`, `location`, `payer_address`).

| Rail | What the bestower paid | What we store | Refund destination | Recoverable today? |
|---|---|---|---|---|
| Solana USDC | `gross + 0.01` flat fee, e.g. 10.01 for a 10.00 pocket | the confirmed signature (`rail_reference` and `solana_payment_intents.signature`), the intent's reference key, the cluster | the wallet that signed the transfer | **Yes, from the chain.** `getTransaction(signature)` gives the `transferChecked` instruction's authority, which is the owner of the source token account, and `preTokenBalances` names the same owner. Not stored yet: `payer_address` is NULL on every holding. |
| PayPal | `gross + PayPal's processor fee` | the capture id in `rail_reference`, the PayPal order id in `bestowals.provider_order_id` | the original capture | **Yes, by capture id.** No PayPal orchard pocket exists yet, so this is confirmed by code, not by a live row. |
| Balance | `gross`, no fee | nothing beyond the bestowal | the member's `balance_ledger` | Yes, a credit back. The feature is parked, so this rail is idle. |

**Proof on the two real holdings**, `scripts/studio/phase-c-refundability.sql` (read-only), plus the chain read for each signature:

| Holding | Orchard | State | Rail | Gross | Signature | Sender found on chain |
|---|---|---|---|---|---|---|
| `2df2ff33` | Phase A test `55f4e02e` | held | solana, devnet | 10.00 | `eFkR7VNu…` | `EbSUvuE8…`, from both the instruction authority and the pre-balance owner |
| `4be08578` | Phase B test `9d8fbab2` | released | solana, devnet | 10.00 | `b4NquLfz…` | `EbSUvuE8…`, same two readings agree |

Both holdings carry a signature, both signatures resolve to one unambiguous sender, both are the owner's own Phantom. So every holding that exists is refundable to a known wallet once C1 writes that wallet down. A holding without a reference would not be, and none exist.

Two things the design must respect from this table: the refund amount is the holding's `gross_amount`, not the payer's `buyer_total_amount`, because the 0.01 processor fee is S2G's and the owner has decided S2G absorbs fees rather than claws them back, so the payer receives the pocket price in full and S2G eats both the original fee it kept and the new send fee. And a released holding (the Phase B one) is never refundable: its money is owed to the sower already.

---

## 2. Data model

### Refund states, per holding, and the only transitions

`orchard_holdings.status` already allows `refund_pending` and `refunded`. C2 adds `refund_failed` and `written_off`.

| From | To | Who or what |
|---|---|---|
| held | refund_pending | `orchard_cancel()`, gosat, in the cancel transaction |
| refund_pending | refunded | the worker, after the rail confirms the send |
| refund_pending | refund_failed | the worker, after `ORCHARD_REFUND_MAX_ATTEMPTS` (3) failed attempts |
| refund_failed | refund_pending | a gosat pressing Retry on the console |
| refund_failed | written_off | a gosat, with a typed reason; the money stays in the hot wallet and a `refund_cost`-style note is written |
| released | (nothing) | a released holding never enters this machine |

Nothing else. A refunded or written-off holding is terminal.

### Orchard states

| From | To | Who or what |
|---|---|---|
| open, funded | cancelling | `orchard_cancel()`, gosat, typed confirmation of the title |
| cancelling | cancelled | the worker, when every holding is refunded or written off |
| released | (nothing) | refused with `released_orchards_cannot_be_cancelled` |
| cancelling, cancelled | (nothing) | never reopened |

`funded` is included because Phase B releases a Launch orchard the instant it funds, so a Launch orchard is never observed at `funded`; the row exists for Uplift, which waits for a gosat and can be cancelled while funded.

### Refund records

| Table | Purpose | Key columns |
|---|---|---|
| `orchard_refunds` | One row per holding to refund; the worker's unit of work and the audit of every attempt. | `id`, `orchard_id`, `holding_id` UNIQUE, `bestower_user_id`, `rail`, `amount` (= `gross_amount`), `destination` (payer wallet, PayPal capture id, or member id for balance), `status` (`queued`, `sending`, `sent`, `confirmed`, `failed`, `needs_human`, `written_off`), `attempts`, `last_error`, `rail_reference` (refund signature or PayPal refund id), `environment` (live, devnet, sandbox), `fee_cost` (network or PayPal fee S2G absorbed), `claimed_at`, `sent_at`, `confirmed_at`, `written_off_by`, `written_off_reason`, `created_at`, `updated_at` |
| `orchard_holdings` | | add `payer_address` population (C1), `payer_source` (`chain`, `intent`, `manual`, `unknown`), `refund_id` |
| `orchards` | | `cancelled_at`, `cancelled_by`, `cancel_reason` |
| `revenue_ledger` | reused | one `refund_cost` row per confirmed refund with a non-zero fee, `source_table = 'orchard_refunds'`, `source_id = refund id`, amount = the fee S2G paid to send it. The original `orchard_fee` was never recorded for a held orchard, so there is nothing to reverse. |
| `orchard_events` | reused | `cancelled`, `refund_queued`, `refund_sent`, `refund_confirmed`, `refund_failed`, `refund_written_off` |

The refund row's `status` is the fine-grained machine the worker drives; the holding's `status` is the coarse one members and the treasury read. They move together in the same transaction.

---

## 3. Sender-address capture and backfill

**The method, both for backfill and going forward.** For a Solana holding, read `getTransaction(signature, jsonParsed)` on the holding's cluster and take the `transferChecked` (or `transfer`) instruction whose `destination` is the hot wallet's USDC token account and whose `mint` is USDC. Its `source` is the payer's token account; `getTokenAccountOwner(source)`, which `solanaPayIn.ts` already has, reads that account's owner from its on-chain state. Cross-check against `preTokenBalances`: the owner of the pre-balance entry that is not the hot wallet must match. If the two agree, that is `payer_address` with `payer_source = 'chain'`. If they disagree, or the instruction is not found, or the transaction is not found, the holding gets `payer_source = 'unknown'` and its refund will go straight to `needs_human`.

Why the owner and not the fee payer: the fee payer is normally the same wallet, but with a sponsored transaction it would be ours. Refunds go to whoever owned the tokens.

**Backfill, C1.** A one-off edge function `backfill-orchard-payers`, gosat or service-role only, walks every holding with `rail = 'solana'` and `payer_address IS NULL`, resolves each as above, and writes `payer_address` and `payer_source`. It is idempotent and reports per holding. Two holdings exist today and both resolve to `EbSUvuE8…`. PayPal holdings need no backfill; the capture id is already on the row. Balance holdings record the member id.

**Capture going forward, C1.** In `_shared/solanaPayIn.ts`, where the checker and the sweep confirm an intent and call `finalizeCompletedOrder`, the same resolution runs on the confirmed transaction and the sender is written to the intent (`solana_payment_intents.payer_address`, new column). `orchard_apply_holding()` then copies it onto the holding at hold time (`payer_source = 'intent'`). If the confirmer could not resolve it, the holding still gets created, with `payer_source = 'unknown'`, and the treasury console shows a warning count so it is never a surprise at cancel time.

**What is not recoverable.** A Solana transaction older than the RPC node's history is the only realistic gap; devnet nodes prune, mainnet public nodes keep years. A holding whose signature is missing altogether cannot happen through the pay-in path, because the intent is marked paid by the signature. Anything `unknown` is a human's decision: the console shows the bestower, the amount and the reference, and the gosat either enters the address by hand (`payer_source = 'manual'`, logged) or writes it off.

---

## 4. The refund worker

**Cancel, one transaction, `orchard_cancel(orchard_id, reason)`**, SECURITY DEFINER, gosat or admin only, typed title confirmation checked client-side and the reason stored:
1. Lock the orchard row. Refuse `released` (`released_orchards_cannot_be_cancelled`), `cancelling`, `cancelled`, and any orchard with a holding in `released`.
2. `funding_state = 'cancelling'`, `cancelled_at`, `cancelled_by`, `cancel_reason`.
3. Every `held` holding → `refund_pending`; one `orchard_refunds` row each at `queued` with `amount = gross_amount`, `destination` from `payer_address`, the capture id, or the member id by rail, `environment` from the intent's cluster or PayPal's setting. A holding with `payer_source = 'unknown'` is queued straight to `needs_human`.
4. Events, and a notification to each bestower: "your 10.00 USDC is being returned to the wallet you paid from".
5. If there are no holdings at all, go straight to `cancelled`.

**Execution, the worker.** A new edge function `orchard-refund-worker`, run by `invoke_money_job` every 10 minutes and callable by a gosat for one orchard. Each run:
1. Claims up to 10 `queued` refunds with `UPDATE … SET status = 'sending', claimed_at = now() WHERE status = 'queued' … FOR UPDATE SKIP LOCKED RETURNING`, so two runs never touch the same row.
2. **The money-direction guardrail, checked again inside the worker before any send**, from a fresh read under lock: the refund row is `sending` and has no `rail_reference`; its holding is `refund_pending`; the holding's orchard is `cancelling`; `amount` equals the holding's `gross_amount` to the cent; `destination` equals the holding's `payer_address` for USDC, or its `rail_reference` for PayPal; the environment matches the cluster the function is configured for, so a devnet refund never goes out while the cluster is mainnet and vice versa; and the daily refund total plus this amount is under `ORCHARD_REFUND_MAX_DAILY_USD`, default the sum of the orchard's own holdings. Any mismatch marks the row `needs_human` with the reason and sends nothing.
3. USDC: `sendUsdcPayout(seed, destination, amount)`. The primitive waits for finalized commitment, so a returned signature is a confirmed send. Write `rail_reference`, `sent_at`, `confirmed_at`, `fee_cost` = the transaction fee in USD at the stored SOL rate, status `confirmed`. PayPal: `POST /v2/payments/captures/{capture}/refund` with `{ amount: { value, currency_code: 'USD' } }`; on `COMPLETED` write the refund id and confirm; on `PENDING` write the id, status `sent`, and let `PAYMENT.CAPTURE.REFUNDED` in `paypal-webhook`, a new case, confirm it. `fee_cost` = what PayPal did not return of its original fee, read from the refund response's `seller_payable_breakdown`.
4. On confirmation, in one transaction: holding → `refunded`, `record_revenue('refund_cost', fee_cost, environment, 'orchard_refunds', refund id, rail, signature)` when the fee is non-zero, events, notification "Refunded, tx …". If every holding of the orchard is now `refunded` or `written_off`, the orchard → `cancelled`.
5. On failure: `attempts + 1`, `last_error`, status back to `queued` for a retry on the next run; on the third failure `failed` and holding `refund_failed`, surfaced as `needs_human`. A send that threw after broadcasting is the dangerous case: before retrying a USDC refund the worker searches the hot wallet's recent signatures for a transfer of exactly `amount` to `destination` since `claimed_at`, and if it finds one it records it instead of sending again. That search is the second half of idempotency; the first half is that a row with `rail_reference` set is never sent.

**Fees.** Network fees come from the hot wallet's SOL; PayPal keeps part of its fee on refunds. Both land in the ledger as `refund_cost`. The bestower always receives exactly `gross_amount`.

**The Phase B gap.** `orchard_apply_holding()` gains a guard: if the orchard is `released`, `cancelling` or `cancelled` when a payment arrives, it creates the holding directly at `refund_pending` with an `orchard_refunds` row at `queued`, writes a `late_payment` event, and never counts the pocket. The worker then returns it like any other refund. This also closes the stale-intent case noted in the Phase B proof.

---

## 5. Screens

| Screen | What it shows |
|---|---|
| Gosat console, orchard row | Cancel button, only on `open` and `funded` Uplift; typed title confirmation, reason field, the list of holdings it will refund with amount, rail and destination, and a warning count for `payer_source = 'unknown'`. |
| Gosat console, refund progress | Per bestower: paid, rail, destination masked, refund state, attempts, last error, rail reference with explorer or PayPal link; Retry on `failed`; Write off with a reason; Enter payer address for `unknown`; "Run worker now" for this orchard. Orchard header: `cancelling, n of m refunded`. Reuses the treasury page's table style. |
| Bestower, `MySeedsPage` bestowals list and the dashboard "given" line | Pocket state: "Refund on its way", then "Refunded, tx …" with the link. Nothing to do. |
| Sower, orchard page | "Cancelled" badge with the reason; the progress card frozen. |
| Treasury | Held for orchards drops as holdings leave `held`; `refund_cost` appears in S2G own; the per-wallet expectation subtracts refunds sent from the hot wallet. `liability_snapshot` needs one change: holdings in `refund_pending` still count as held, since the money is still S2G's liability until it leaves. |

---

## 6. Tests

**SQL fixture, `scripts/studio/phase-c-refund-tests.sql`, BEGIN…ROLLBACK through `db query`.** A 3-pocket orchard sown by B, two pockets paid by A on Solana with a stored `payer_address`, one on PayPal. Cases: cancel from `open` queues three refunds and flips the holdings; cancel of a released orchard is refused; cancel of an orchard with an `unknown` payer queues that one to `needs_human`; a simulated worker confirmation moves one holding to `refunded` and writes one `refund_cost`; confirming it again is a no-op with still one ledger row; three failures move a refund to `failed` and the holding to `refund_failed`; retry re-queues it; write-off with a reason is terminal; the orchard becomes `cancelled` only when the last holding is refunded or written off; a late payment into a cancelling orchard lands at `refund_pending`, never counted. Every row `pass = true`.

**Unit tests.** The guardrail as a pure function in `_shared/orchardRefund.ts` with a client twin: `refundSendAllowed(refundRow, holding, orchard, clusterEnv, dailyTotal, cap)` returns null or the exact refusal; sender resolution from a parsed transaction fixture, with the authority and pre-balance disagreeing; the "did it already go out" matcher over a list of recent signatures. Existing tests stay green.

**Devnet proof, smallest real test, only on the owner's go.** The Phase A test orchard `55f4e02e…` already holds one real devnet pocket of 10.00 from `EbSUvuE8…`, and it is `open`, so it can be cancelled without any new payment. The proof: flip to devnet, run the C1 backfill and show the holding's `payer_address` is `EbSUvuE8…`, cancel the orchard from the console, let the worker run, then verify on chain that the hot wallet sent exactly 10,000,000 raw units to `EbSUvuE8…`, the holding reads `refunded` with the signature, the refund row is `confirmed`, one `refund_cost` row exists (devnet), the treasury's devnet held-for-orchards drops by 10.00, and the orchard is `cancelled`. Flip back. No further payments from the owner are needed for this proof; the PayPal path is proven in the sandbox by the fixture and a sandbox capture-and-refund, not on a live card.

---

## 7. Build order

| Sub-phase | Delivers | Migrations | Code | Done when |
|---|---|---|---|---|
| **C1. Know the payer** | Every holding knows who to refund. | `solana_payment_intents.payer_address`; `orchard_holdings.payer_source`; `orchard_apply_holding()` copies the payer from the intent. | `solanaPayIn.ts` resolves the sender on confirmation; `backfill-orchard-payers` function; the two order confirmers redeployed. | Backfill reports both existing holdings resolved to `EbSUvuE8…`; a new devnet pocket lands with `payer_address` set at hold time; the refundability query shows no `unknown`. |
| **C2. Cancel and refund** | The state machine, the worker, the guardrail, the fees, the Phase B gap. | `orchard_refunds`; `orchards.cancelled_at/by/reason`; `orchard_holdings.status` gains `refund_failed`, `written_off`; `orchard_cancel()`, `orchard_refund_confirm()`, `orchard_refund_fail()`, `orchard_refund_write_off()`; `orchard_apply_holding()` late-payment guard; cron `orchard-refund-worker` every 10 minutes through `invoke_money_job`; `liability_snapshot` counts `refund_pending` as held. | `orchard-refund-worker` edge function; `_shared/orchardRefund.ts` guardrail twin; `paypal-webhook` `PAYMENT.CAPTURE.REFUNDED` case. | Fixture all pass; unit tests pass; the devnet proof above returns the Phase A pocket to its payer with the signature on the row. |
| **C3. Screens** | The console and the member states. | none | Gosat cancel dialog and refund-progress table on the admin orchard view; `MySeedsPage` and dashboard states; sower badge; treasury wording. | Playwright as gosat account C (still to be created) cancels a fixture orchard and sees the progress table; as A sees "Refund on its way" then "Refunded". |

C1 ships first because it is read-mostly, safe, and closes the one true unknown. C2 is the risky one and should ship on a day the owner can watch the first worker run. C3 can follow without money risk.

---

### Status

**Design approved 2026-09-06.** Owner answers to section 8: (1) yes, manual payer entry by a gosat, logged as manual; (2) the same absolute ceiling as the payout circuit breaker, Squad approval above it; (3) written-off money stays an unclaimed surplus, not income; (4) PayPal past 180 days is `needs_human` with a manual payout fallback; (5) C3's Playwright uses the owner's own gosat account.

**C1 built and applied 2026-09-06.** `supabase/migrations/20260906200000_orchard_payer_capture.sql`: `solana_payment_intents.payer_address / payer_source`, `orchard_holdings.payer_source`, `orchard_apply_holding()` copies the payer from the intent at hold time, `orchard_record_payer()` (service role) and `orchard_set_payer_manual()` (gosat, note mandatory, logged). `_shared/solanaSenderRules.ts` (pure, two of three readings must agree, any disagreement is unknown) + `_shared/solanaSender.ts` (fetch on the holding's own cluster). `_shared/solanaPayIn.ts` resolves the sender when it marks an intent paid. `backfill-orchard-payers` edge function. Proof: the backfill resolved both existing holdings, `2df2ff33` (held) and `4be08578` (released), to `EbSUvuE8…` with source `chain`, events written; the refundability query shows no unknowns. Unit tests `src/test/solana-sender.test.ts` 6. The pocket-time capture is proven by a new devnet pocket (see the session state). C2 built (below); C3 not started.

**C2 built, applied, and proven by fixture 2026-09-06 (13:00 UTC). Devnet cancel/refund proof NOT yet run.** Migration `supabase/migrations/20260906210000_orchard_cancel_refund.sql` (applied server-side, idempotent): `orchard_refunds` (one per holding, UNIQUE holding_id, status queued|sending|sent|confirmed|failed|needs_human|written_off, attempts, rail_reference, environment, fee_cost); `orchards.cancelled_at/by/reason` and `funding_state` now allows `cancelling` (Phase B's CHECK did not, found by the fixture); `orchard_holdings.status` gains `refund_failed`, `written_off`, plus `refund_id`. RPCs: `orchard_cancel(orchard_id, reason)` gosat/admin only, reason mandatory (refuses released, already cancelling/cancelled, any released holding; held -> refund_pending + queued refund; unknown payer / balance rail / PayPal older than 180 days -> needs_human with the holding at refund_failed; no holdings -> cancelled at once; sower + bestower + gosat notifications). Worker seam, service role only: `orchard_refund_claim(limit, orchard_id)` (queued -> sending, FOR UPDATE SKIP LOCKED, returns the guardrail facts), `orchard_refunds_sent_today(env)`, `orchard_refund_confirm(id, ref, fee, detail)` (idempotent per reference; holding refunded, bestowal payout_status refunded, one `refund_cost` ledger row per confirmed refund with a fee, orchard -> cancelled when the last holding is refunded/written off), `orchard_refund_sent` (PayPal PENDING, stores the fee for the webhook), `orchard_refund_fail` (3rd failure -> failed + holding refund_failed + gosat alert), `orchard_refund_defer` (no attempt counted: cluster flipped, cap full, wallet short), `orchard_refund_needs_human`. Gosat actions: `orchard_refund_retry` (refreshes the destination from a manually entered payer; refuses while unknown) and `orchard_refund_write_off(id, reason)` (terminal, no ledger row: unclaimed surplus by owner decision). `orchard_apply_holding()` late-payment guard: a payment into a released / cancelling / cancelled orchard is held at refund_pending with a queued refund and a `late_payment` event, never counted; a cancelled orchard goes back to cancelling until it settles. `liability_snapshot()` counts held + refund_pending + refund_failed and reports `held_for_orchards.refunding` {total, holdings, needs_human}; `sweep-hot-wallet` subtracts the same three statuses. Cron `orchard-refund-worker` every 10 minutes (jobid 25) through `invoke_money_job`.

Code: `supabase/functions/_shared/orchardRefundRules.ts` (pure: `refundSendAllowed()` = the money-direction guardrail with ok / defer / park outcomes, `findRefundSendInParsedTxs()` = the "did it already go out" search, cap = payout circuit breaker `SOLANA_MAX_PER_TX_USD` 50 / `SOLANA_MAX_DAILY_USD` 200, `SOLANA_REFUND_FEE_USD` 0.01 booked per Solana refund); `supabase/functions/orchard-refund-worker/index.ts` (auth = CRON_SECRET / service apikey / gosat session; body `{orchardId?, limit?}`; stale-sending re-examination after 15 min; hot-wallet USDC + SOL pre-flight as a deferral; Solana via `sendUsdcPayout`, finalization timeout -> chain search before failing; PayPal `POST /v2/payments/captures/{id}/refund` with `PayPal-Request-Id` = refund id, COMPLETED -> confirm, PENDING -> sent, fee = capture fee minus fee returned); `paypal-webhook` handles `PAYMENT.CAPTURE.REFUNDED` (confirms a `sent` orchard refund by its refund id, keeps the stored fee). Proofs: fixture `scripts/studio/phase-c-refund-tests.sql` 27/27 (rolled back); unit tests `src/test/orchard-refund.test.ts` 15; the worker fired once through the cron path (`scripts/studio/phase-c-worker-invoke.sql`) and answered `ok, cluster mainnet-beta, paypal live, claimed 0`; `orchard_refund_claim` therefore proven through PostgREST. Not yet proven through PostgREST: the new `liability_snapshot` body (only the holding filter changed; opening /admin/treasury exercises it). Live state after C2: no refund rows; the Phase A orchard `55f4e02e` still open with holding `2df2ff33` held (payer `EbSUvuE8...`, chain); cluster mainnet-beta.

**Next: the devnet cancel/refund proof** (`scripts/studio/phase-c-refund-proof.sql` before and after): flip `SOLANA_CLUSTER=devnet`; as gosat call `orchard_cancel('55f4e02e-32fe-4013-aa7b-4eff6da77d37', reason)` (a Studio file, or the C3 console later); fire the worker (`phase-c-worker-invoke.sql`, or wait for the 10-minute cron); expect the refund row confirmed with a devnet signature, the holding refunded, the bestowal `refunded`, one `refund_cost` -0.01 devnet row, orchard cancelled, and 10.00 USDC back at `EbSUvuE8...` on devnet; flip back to mainnet-beta. While the cluster is mainnet, the worker defers a devnet row (environment mismatch) and sends nothing.

## 8. Open questions

1. **Manual payer entry.** When the chain cannot tell us the sender, may a gosat type the address the bestower gives them, with the entry logged? Drafted yes; it is the only way an `unknown` ever gets paid.
2. **Cap for a large orchard.** Drafted as the orchard's own held total per day, so a 2,000 USDC cancel refunds in one day if the hot wallet holds it. Should there be an absolute ceiling requiring Squad approval above it, matching the payout circuit breaker?
3. **Write-off destination.** A written-off refund leaves the money in the hot wallet. Book it as S2G income (`correction`) or leave it as an unexplained surplus until claimed? Drafted: leave it, shown on the treasury page, no income recognised.
4. **PayPal refunds past 180 days.** PayPal refuses the API refund after that window; the fallback is a manual PayPal Payout to the buyer's email, which we hold from PayPal Connect for members but not for guests. Accept `needs_human` there?
5. **Gosat test account C.** C3's Playwright needs it; A and B must stay non-admin.
