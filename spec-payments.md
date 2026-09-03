# spec-payments.md — Payment rails, fees, and the direct-Solana migration

Status: **decided 2026-08-30, inbound pay-in built 2026-09-02, S2G Balance
built 2026-09-03.** Section 3 (direct Solana payment detection) and the
checkout-side migration (section 6, steps 1–3) are live: NOWPayments
crypto checkout is replaced by direct Solana USDC pay-in everywhere.
NOWPayments code, secrets, and its webhook remain in place, unreachable
from checkout, for any historical order (step 5 of section 6 — full
removal — is not done). Section 4 (rebuilding the Solana **payout** rail
inside `payout-earnings`) is a separate, still-open piece of work — this
build was inbound (pay-in) only. Section 13 (S2G Balance) is the newest
build: a prepaid custodial member balance, now the default checkout
option, sower/whisperer earnings crediting it on release, and on-demand
withdrawal. See "Implementation notes (2026-09-02)" at the end of section
3 and section 13's own implementation notes for what shipped, what's
still open, and exact human-test steps. Read alongside SESSION-STATE.md
(current live state) and spec-service-seeds.md §9 (booking purchases).

---

## 1. Decisions taken (2026-08-30)

Two payment rails only, both global. **No cards, no EFT, no local-only
processors** — S2G is a global platform, and a South-Africa-only rail
would fracture that.

| Rail | Role |
|---|---|
| **USDC on Solana, direct wallet-to-wallet** | Small and frequent bestowals. No processor in the middle. |
| **PayPal** | Larger amounts, and anyone who won't touch crypto. |

**NOWPayments is being removed entirely.** It currently handles incoming
crypto invoices at 5 functions (`create-basket-bestowal-order`,
`create-content-purchase-order`, `create-wallet-topup`,
`create-gift-bestowal-order`, `create-nowpayments-invoice`). Its outgoing
payout rail was already deleted (`_shared/payouts/nowpaymentsRail.ts`).

Reasons, in order of weight:
1. Its IPN has **never once fired** — `processed_webhooks` is 0 rows
   all-time. Real money has been paid with the platform never learning of it.
2. It charges a flat ~0.27 USDC network fee + 0.010 USDC service fee per
   payment, deducted merchant-side.
3. Its floating-rate invoices caused the `Partially_paid` failure
   (2-decimal exchange sends vs. full-precision quoted amounts).

Going direct removes 1 and 2 and makes 3 our own problem to define rather
than a third party's behaviour to work around.

### PayPal micropayments — closed
Requested from PayPal 2026-08-30. **Declined: not available in ZA.** They
escalated internally; treat as unavailable indefinitely. Standard pricing
stands, which is why small bestowals must route to crypto.

### Fee transparency — confirmed, keep as built
The 15% S2G cut is **added on top** of the sower's bestowal amount, and is
**shown to the grower**, not hidden. Same for the processor fee. Checkout
shows the full breakdown plus what the other rail would cost:

```
Bestowal          $20.00
Platform (15%)     $3.00
Payment fee        $1.19   ← via PayPal
                  -------
Total             $24.19

Pay with USDC instead → total $23.01, save $1.18
```

Rationale, recorded so it isn't re-litigated: hiding a mandatory fee that a
grower can discover later (by comparing a listing to a receipt, or by
asking a sower) is corrosive on a platform whose premise is trust. The
number is identical either way; disclosure costs nothing and is evidence
for the platform's own claims. Drip-pricing disclosure is also a live
regulatory concern in several jurisdictions — **not reviewed by counsel;
worth a real opinion before launch.**

The receipt already does this correctly as of `f9fb4e6b` (buyer total,
separate processor-fee line, then seed/sower/S2G breakdown). Do not
regress it.

### Who absorbs the processor fee
The **grower (payer)** absorbs it. If a cheaper rail is available and they
choose the expensive one, that cost is theirs — the sower shouldn't be
penalised for someone else's rail preference. `bookings` was briefly the
documented exception (see SESSION-STATE ~line 1303) — closed in a later
fix (SESSION-STATE ~line 1513, "closed the booking-payment processor-fee
gap"): `create-booking-paypal-order` now runs through `computeBuyerFee`
exactly like every other `create-*-order` function. Every kind is
consistent as of that fix; no open decision remains here.

---

## 2. Treasury: hot wallet + Squad

Do **not** route customer payments straight into the multisig Squad.

A 2-of-3 Squad requires two human approvals per outbound transaction. That
is correct for a treasury and wrong for payouts — it would break the
platform's existing promise that a whisperer is paid the moment a payment
clears, with no further approval.

| | Holds | Signing |
|---|---|---|
| **Hot wallet** | Working float: incoming payments, outgoing payouts | Single key, automated |
| **Squad (2-of-3)** | Accumulated S2G 15% revenue + reserve | Two of: davison, Ed, Amber |
| **Launch Orchard wallet** | Funds held for Launch orchards | Single key, automated |
| **Uplift Orchard wallet** | Funds held for Uplift orchards | Single key, automated |

The two orchard wallets are a separate pair again — not this hot wallet,
not the Squad. Full detail (addresses, and why they're single-key and
never swept) is in section 10.

A scheduled sweep moves S2G's cut from hot wallet to Squad (daily, or on
threshold), leaving only near-term float exposed.

**Non-negotiables on the hot wallet:**
- Hard per-transaction and daily caps in code. Anything above requires
  Squad approval. This is the circuit breaker for a bug or a compromise.
- Private key in Supabase secrets only. Never in client code, never in the
  repo. Same pattern as the existing payout functions.
- Alert if the balance exceeds its sweep threshold with no sweep having
  run — that means the sweep is broken and revenue is sitting exposed.

**Before the Squad is created:** all three members must have their Phantom
seed phrases genuinely backed up offline. 2-of-3 survives one lost key;
two lost keys freezes the treasury permanently. Confirm each member's
address through a second channel (read back the last 6 characters on a
call) — address-swap interception is a real attack, and changing a member
after creation requires a governance vote.

**Live Squad (created 2026-09-01, on Squads — app.squads.so):**

| | |
|---|---|
| Vault address | `BjBY4uCCEQfE66rYddTBUn9Twg7jKevH1Rze8UfZFWLs` |
| Threshold | 2 of 3 |
| Member — davison | `EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx` |
| Member — Ed | `BnKrWANiiYgK6c8R2bMvN216zDZRhH6V1nsFT7rUasf4` |
| Member — Amber | `4DWsVidKs1scqD6iKxKfvX18wi5MTxG8bJtsSCTkvKJW` |

These three addresses are each member's own personal Phantom wallet, used
here only as a signing key for the Squad. They are distinct from — and
must never share a schema field with — those same people's personal payout
destinations as sowers.

**Live hot wallet (created 2026-09-01):**

| | |
|---|---|
| Address | `6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ` |
| Signing | Single key, automated |
| Secrets | `SOLANA_HOT_WALLET_SECRET_KEY` / `SOLANA_HOT_WALLET_ADDRESS`, configured in Supabase |
| Cluster | devnet (code default — `payout-earnings`' Solana rail switches to mainnet-beta only via explicit config) |
| Status | Not yet funded. No real sends have been made. |

This is the treasury half. The two orchard wallets (Launch, Uplift) are a
different pair again — see section 10 for their addresses and why they
exist separately from both this wallet and the Squad.

---

## 3. Inbound: direct Solana payment detection

This replaces NOWPayments' hosted invoice page. It is the most important
piece of infrastructure in this spec and the one most likely to lose money
if it is wrong.

### The problem
Nothing watches the chain for us any more. We must ourselves answer: did
*this specific order* get paid, by *how much*, and *has it confirmed*.

### Design

**Reference:** every order gets a unique on-chain reference. Use Solana Pay's
reference-key pattern — a generated public key included as a read-only
account in the transfer, which makes the payment findable by
`getSignaturesForAddress` without needing a unique deposit wallet per order.
Store it on the order row alongside the existing provider columns.

**Amount:** quote and store an exact USDC amount at order creation, and
require an exact match on the incoming transfer. USDC has 6 decimals, so
the `Partially_paid` rounding class of failure that broke NOWPayments does
not recur — but underpayment is still possible if a sender's own wallet or
exchange truncates. Treat any underpayment as `underpaid`, not `completed`,
and surface it for manual resolution rather than silently failing or
silently accepting.

**Detection — poll, do not rely on a callback.** This is the direct lesson
of the NOWPayments failure: a payment system whose only confirmation path
is an inbound message from something we don't control is fragile. A cron
job sweeps every order still `pending` past a few minutes, checks the chain
for its reference, and routes a confirmed payment through the *same*
finalize path the rest of the system uses.

**Confirmation depth:** finalize only on `finalized` commitment, not
`processed` or `confirmed`. The difference is seconds on Solana and
eliminates the reorg case entirely.

**Idempotency:** reuse `processed_webhooks` (or an equivalent table) keyed
on the transaction signature. A signature must never be able to credit an
order twice. Fail closed — the existing fail-open bug (`f77d3cf0`) is
already fixed; do not reintroduce it.

Before wiring this up: confirm `processed_webhooks_provider_check`
actually permits whatever `provider` value the Solana path writes (e.g.
`'solana'`). That exact constraint has already silently broken two
payment integrations (see section 6) — check it explicitly rather than
assuming a third provider value will be allowed.

**Reuse, do not fork, the finalize path.** `finalize_basket_order`,
`finalize_content_purchase`, and `credit_sower_balance_from_topup` are
already idempotent and row-locked. Solana confirmation calls them exactly
as PayPal capture does, including `_shared/postFinalize/messaging.ts` for
the thank-you and receipt messages.

### Cases that must be handled explicitly
- **Late payment** — arrives after the order expired. Do not silently
  keep it. Either credit and reopen, or refund; decide and document which.
- **Overpayment** — credit the order, record the excess.
- **Underpayment** — do not finalize. Flag for manual resolution.
- **Double payment** — same order paid twice. Second one is a refund case.
- **Wrong token** — someone sends SOL, or a different SPL token, to the
  address. Detect and flag; do not treat as payment.

`expire_stale_orders()` must be taught the same lesson it learned for
PayPal (`09a56a94`): never expire a Solana order that has a real on-chain
reference until the chain has been positively checked, not merely because
time passed.

### Implementation notes (2026-09-02)

**Built:**
- `solana_payment_intents` table (migration `20260902210000`) — one
  polymorphic table keyed by `(order_kind, order_id)`, the same kind/id
  pairing `paypal-webhook`'s `parseCustomId()` already uses, rather than
  adding reference/expiry columns to each of `basket_orders`/
  `content_purchases`/`bestowals`/`topups` individually.
- `_shared/solanaPayIn.ts` — intent creation (`createSolanaIntent`,
  Solana Pay reference-key pattern, reference private key never generated
  as more than a discarded local variable) and verification
  (`verifySolanaPayment`, `checkAndFinalizeSolanaIntent`). Requires a
  `transferChecked` SPL instruction specifically (not the older `transfer`)
  so the mint is confirmed from the instruction itself, no second RPC call
  needed — a bare `transfer` is left `pending` rather than guessed at.
- `check-solana-payment` (client poll, every 5s while the payment screen
  is open) and `sweep-solana-payments` (cron, every 2 minutes — migration
  `20260902211000`) both call the same `checkAndFinalizeSolanaIntent`, which
  calls the exact same `finalizeCompletedOrder` PayPal capture already uses
  — no forked finalize logic.
- Idempotency: `processed_webhooks(provider='solana', webhook_id=<signature>)`
  — the existing `UNIQUE(webhook_id, provider)` constraint is the actual
  enforcement (insert fails closed on reuse), not a prior SELECT.
- `expire_stale_orders()` now excludes `provider = 'solana'` rows from its
  blanket 48h time-based expiry — a Solana order's own intent (30 min
  expiry, one last positive chain check before `expired`) is authoritative
  instead, per the lesson above.
- Checkout: `create-basket-bestowal-order`, `create-content-purchase-order`,
  `create-gift-bestowal-order`, and `create-wallet-topup` each got a
  `'solana'` branch alongside their existing `nowpayments`/`paypal`
  branches. New `create-solana-bestowal-order` replaces
  `create-nowpayments-invoice` for orchard bestowals (mirrors its pricing
  exactly, swaps the NOWPayments invoice call for a Solana intent).
  NOWPayments functions/webhook untouched, just unreachable from checkout.
- Client: `presentSolanaPayment()` (`src/lib/payments/solanaPaymentGate.ts`)
  is an imperative "show the QR/deep-link screen from anywhere" call,
  resolved by one `<SolanaPaymentHost/>` mounted at the app root (App.tsx)
  — chosen so every checkout call site's existing `await
  createOrder(...); window.location.href = ...` redirect pattern becomes
  `await presentSolanaPayment(payment)` in place, without each of the ~20
  checkout surfaces needing its own QR-rendering code.
  `providerFees.ts`'s `PayoutProviderId` is `'solana' | 'paypal'` now — the
  old `'nowpayments'` id and its $10 minimum are gone (`MIN_CRYPTO_BESTOWAL_USD`
  is 0, not deleted, so every call site's existing `< MIN_CRYPTO_BESTOWAL_USD`
  guard stays correct code, just permanently non-triggering).

**Verified:** all 7 new/changed edge functions deployed cleanly (proves
every import resolves and the TypeScript is valid — Supabase's own
bundler would refuse a broken one). `npx tsc --noEmit` clean across the
whole client. The `verifySolanaPayment` matching logic (transferChecked +
mint + destination + amount, including the "wrong token"/legacy-`transfer`/
wrong-destination/underpayment cases) was run against realistic mocked
Solana RPC response shapes and confirmed correct in every case. A real,
live HTTP round-trip against the deployed `check-solana-payment` (via a
manually-inserted test `topups` + `solana_payment_intents` row for the
disposable Thabo seed account, called with service-role auth) correctly
made a real `getSignaturesForAddress` call to devnet, found no signatures
(nothing was ever sent to the test reference), and returned `{status:
"pending", amountUsdc: 2.01, ...}` — proving the full auth → DB lookup →
live-RPC → JSON-response path works end to end. Test rows deleted after.

**Not verified this session — genuinely open:** a full live devnet send
(build a real Phantom-shaped transaction, submit, confirm
`check-solana-payment` detects and finalizes a genuine payment) was
attempted but `api.devnet.solana.com`'s SOL airdrop faucet returned 429
("reached your airdrop limit today") on every attempt from this
environment — there was no way to fund a test buyer keypair with devnet
SOL, let alone devnet USDC (the hot wallet itself is also "not yet
funded" per section 2, so there is currently no devnet USDC anywhere in
this project's control to send from). The reference-account-inclusion +
`getSignaturesForAddress` lookup mechanism itself is unchanged from the
pattern already live and proven in `_shared/solanaPayout.ts` (used by
`payout-earnings`), and is now also independently confirmed live per the
paragraph above — but the actual *positive-match* path (a real
transferChecked landing and getting detected/finalized) has not been
proven with a real transaction.

**Steps for a real Phantom-on-devnet human test (davison/Ed):**
1. Get a Phantom wallet set to Devnet (Settings → Developer Settings →
   Testnet Mode, then switch the network selector to Devnet).
2. Fund it with devnet SOL via https://faucet.solana.com (for the
   transaction fee) and devnet USDC — Circle's faucet at
   https://faucet.circle.com supports Solana Devnet USDC directly to a
   Phantom address; this is the actual devnet USDC mint checkout uses
   (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, confirmed in
   `_shared/cryptoNetworks.ts`).
3. On the live site, start any bestowal/purchase/top-up flow and pick
   "USDC (Solana)". Scan the QR with Phantom's own scanner, or (on
   mobile) tap "Open in Phantom" — Phantom recognizes the `solana:` URI
   and pre-fills the exact amount/recipient/reference.
4. Approve the send in Phantom. The payment screen should update within
   ~5–10 seconds (its own poll) to "Payment confirmed" without any other
   action.
5. Confirm in the gosat treasury view (or a direct `solana_payment_intents`
   / order-row query) that the signature landed and the order finalized —
   same receipt/Books/escrow behavior as a PayPal order.
6. Worth trying once deliberately: close the tab right after approving in
   Phantom (before the 5s poll can fire) and confirm the order still
   finalizes within 2 minutes via the `sweep-solana-payments` cron.

---

## 4. Outbound: rebuilding the crypto payout rail

`payout-sower-earnings`, `payout-whisperer-earnings`, and
`_shared/payouts/nowpaymentsRail.ts` were deleted 2026-08-29 to 08-31 in
favour of a unified weekly PayPal-only `payout-earnings`. A Solana rail
now has to come back — but as a rail *inside* `payout-earnings`, not as a
second parallel payout system. There must remain exactly one function that
decides who is owed what.

- `owed_payout_balances()` stays the single source of truth for amounts.
- Recipient rail comes from their own stored payout config. Reuse the
  existing `profiles` payout fields rather than introducing a second
  place a person can configure where their money goes.
- The **$20 PayPal minimum exists because PayPal Payouts has a real
  per-item cost.** A Solana transfer does not, so the Solana rail should
  have a much lower floor (or none). Do not blanket-apply the PayPal
  minimum to crypto recipients — that would hold small earnings hostage
  for no reason.
- A recipient with no payout method configured keeps accruing. Never
  block or fail a sale over the recipient's own incomplete setup.
- Record the transaction signature on the payout row. "Where did my money
  go" must be answerable months later.

**Payout timing:** per-transaction is preferred over batching — Solana
fees are low enough that batching saves complexity, not money, and instant
payout is an existing product promise. Keep a scheduled sweep as the
fallback that catches anything the immediate path missed.

---

## 5. Minimums

`MIN_CRYPTO_BESTOWAL_USD` ($10, `providerFees.ts`, enforced at 5
provider-picker points) was set because NOWPayments' flat ~0.27 USDC
network fee plus a sending exchange's ~0.50 USDC withdrawal fee are 25%+
of a $2 bestowal.

Going direct removes the 0.27. **It does not remove the sender's own
exchange withdrawal fee** — that is charged by their exchange, not by us,
and we cannot see or control it. A grower sending from a Phantom wallet
they already fund pays a fraction of a cent; a grower withdrawing from VALR
or Binance for each bestowal still pays ~0.50.

So: **recalculate the floor after the migration, don't just delete it.**
It should come down, but not to zero. Document the new number's reasoning
in the same place, as `3b4287c4` did.

**Decided 2026-09-02, superseding the above:** the direct-Solana build's
own task explicitly called for "no minimum" — `MIN_CRYPTO_BESTOWAL_USD` is
now `0` in `providerFees.ts`, not deleted (every `< MIN_CRYPTO_BESTOWAL_USD`
call site still compiles and behaves correctly, it just never trips). A
grower funding their own Phantom wallet directly pays a fraction of a
cent regardless of amount, so there is no fee-economics floor left to
justify at any number above zero for that case — the exchange-withdrawal
case above still applies, but that is the sender's exchange's fee, not a
reason for Sow2Grow to refuse a small payment.

---

## 6. Migration order

Do not do this in one pass. Each step should be separately verifiable.

**The PayPal gate is cleared.** PayPal was proven live end-to-end on
2026-08-29: `basket_orders` `0a6a0b1a` finalized via a clean,
signature-verified `paypal-webhook` call at 08:36:57 UTC, ~3.4s after the
order completed — tight enough that this is confidently the webhook
itself doing the finalize, not the `capture-paypal-order` safety net.

`processed_webhooks` sitting at 0 rows was never proof this was broken —
it was a false signal from a second, unrelated bug:
`processed_webhooks_provider_check` only permitted
`provider IN ('binance_pay','stripe','other')`, a leftover from an
earlier payment system, so every insert from `paypal-webhook`
(`provider:'paypal'`) or `nowpayments-webhook` (`provider:'nowpayments'`)
silently violated the constraint on every attempt, regardless of whether
the webhook itself worked. Fixed in migration `20260831150000`. **Lesson:
an empty audit table is not proof the thing it audits failed — check the
insert's own error before trusting its silence.**

1. Build Solana inbound detection alongside NOWPayments, not instead of
   it. Both live at once, crypto checkout still goes to NOWPayments.
2. Test the Solana path end-to-end on devnet, then with one small real
   payment on mainnet.
3. Switch the crypto checkout path over. Keep NOWPayments code in place
   but unreachable.
4. Rebuild the Solana payout rail inside `payout-earnings`.
5. Only once both directions are proven: remove NOWPayments code, its
   secrets, and its webhook function.

---

## 7. Open questions

- Late Solana payment after expiry: credit-and-reopen, or refund?
- Hot wallet caps: what per-transaction and daily numbers?
- Sweep threshold and cadence for hot wallet → Squad?
- New crypto minimum after the NOWPayments fee is removed?
- Does XRP stay in the plan at all? It is a separate ledger — a Solana
  Squad cannot hold it, and it would need its own custody arrangement.
  Nothing in the current stack requires it.

---

## 8. Payout rules — when money actually leaves

### The split happens immediately, always

On payment confirmation, every share is calculated and recorded at once:
the sower's share, the whisperer's share (if a whisperer is attributed),
and S2G's 15%. This is independent of when any of it is *paid out*.

S2G's 15% goes to the S2G wallet immediately, every time, no threshold.

### Payout threshold depends on the rail, not the amount

| Recipient's payout rail | Threshold |
|---|---|
| **USDC on Solana** | **None — pay immediately, any amount** |
| **PayPal** | **$20 accumulated balance** |

The reason is honest and should be stated to users in exactly these terms:
PayPal Payouts costs real money per item, so small payouts have to be
batched to be worth sending. A Solana transfer costs a fraction of a cent,
so there is no reason to hold anyone's money.

This applies identically to **sowers and whisperers**. The two are
evaluated independently on the same transaction: a $100 sale with a 10%
whisperer pays the sower ~$75 and the whisperer $10, and each of those is
paid or held according to *that person's own* rail and balance — not the
size of the sale.

### Why this matters beyond fees

Every recipient on the Solana rail is money S2G no longer holds. That
directly reduces the custody exposure described in section 9. Moving
people to instant crypto payout is not only a marketing benefit — it
shrinks a real liability.

### Use it as the reason to switch

Instant payout is a genuine benefit and should be surfaced where it lands
hardest: on the payout settings page, when a recipient has a PayPal
balance sitting below the $20 threshold. Something like "You have $12
waiting. Connect a Solana wallet and get paid immediately instead."

### Do not strand the PayPal holdouts

Some people will never touch crypto, and their small balance sitting
indefinitely is both unfair to them and a growing liability for S2G.
Provide a release valve — **decide which:**
- pay out below threshold anyway after a fixed period (e.g. 90 days),
  absorbing or deducting the fee; or
- let the recipient request an early payout, with the fee deducted and
  shown to them before they confirm.

"We are holding your money because you didn't adopt our preferred rail" is
a bad position however sound the economics.

---

## 9. Held balances: S2G is holding other people's money

**Name this plainly, because it changes what the platform is.** Once S2G
holds a sower's or whisperer's earnings pending a threshold, that is
custody, not payment processing.

Three consequences that must be designed for, not discovered later:

**Regulatory.** Holding client funds pending payout carries real
regulatory weight in many jurisdictions and can require registration or
segregated accounts. **Not reviewed by counsel. Get a real opinion before
volume grows, not after.**

**Accounting.** Held balances are a **liability**, not revenue. S2G's own
books must show them as money owed and keep them distinct from the 15%
that is genuinely S2G's. Conflating the two overstates what the platform
actually has.

**Separability.** If S2G ever hit trouble, held balances must be clearly
distinguishable from operating funds so they cannot be treated as company
assets. This argues for keeping held payouts structurally separate from
the 15% sweep to the Squad — in the wallet layout *and* in the ledger, not
just conceptually.

### The gosat tracking page

The gosat/admin area needs a view answering, at any moment:

- **Who is owed what.** Per recipient: accrued balance, their payout rail,
  whether they're above or below their threshold, and how long the oldest
  unpaid amount has been sitting.
- **Which transactions make up each balance.** Every held amount traces
  back to specific source rows. `owed_payout_balances()` already resolves
  amounts and stays the single source of truth — this view reads it, it
  does not compute its own parallel figures.
- **Two kinds of held money, shown separately, never merged into one
  undifferentiated pile.** They're different in kind, not just source:
  - **Individual payout balances** — sower/whisperer earnings not yet
    paid out, per section 8's thresholds. Resolved from
    `owed_payout_balances()`, short-lived by design (paid on the next
    eligible run).
  - **Orchard holdings** (section 10) — the Launch Orchard and Uplift
    Orchard wallet balances. Resolved from those two wallets' own
    balances, not `owed_payout_balances()` (orchard funds aren't
    per-recipient accrual, they're a fixed target held until fully
    funded, per orchard, indefinitely — no threshold, no aging-toward-a-
    payout-run the way an individual balance has one).
  Show each as its own line/section, not summed into a single
  undifferentiated figure — a gosat reading the page needs to be able to
  tell "held for people" apart from "held for orchards" at a glance.
- **Total held, as one number.** This is S2G's full outstanding
  liability: individual payout balances **plus** both orchard wallets'
  balances, added together. It belongs on the page prominently, not
  buried, because it is the number that matters for both accounting and
  risk — and it is incomplete, understating real exposure, if it omits
  either orchard wallet.
- **Held vs. S2G's own.** The wallet balance is not S2G's money. Show the
  split explicitly: total balance, minus held liabilities (individual +
  orchard), equals what is actually S2G's.
- **Aging.** Anything held unusually long is a flag — either a stuck
  payout or a recipient who has never configured a method and needs
  telling. Applies to individual balances; an orchard sitting unfunded a
  long time is expected behavior (section 10: "there is no deadline"),
  not itself a flag — though it's still worth surfacing on the page for
  visibility, just not as an anomaly.

Read-only. Payouts continue to run through `payout-earnings`; this page
observes, it does not become a second way to move money.

### Platform-only income (no sower)

Decided 2026-09-01. Platform-only income (no sower) — e.g. the Wandering
Hearts call-unlock fee ($5 or $10, both members) — is 100% S2G revenue.
Record the full amount as `s2g_fee` with `sower_amount` 0, treat it as
Squad-bound in the hot-wallet→Squad sweep, and include it in the gosat P&L
(this section). It is NOT subject to the 15%-on-top model.

---

## 10. Orchards — Launch and Uplift

Replaces the open questions previously in this section. Decided 2026-09-01.

### The wallets

Four wallets, four distinct purposes. Nothing shares a wallet with money it
doesn't belong to.

| Wallet | Holds | Signing |
|---|---|---|
| **Hot wallet** | Working float: incoming payments, outgoing payouts | Single key, automated |
| **Squad (2-of-3)** | S2G's own accumulated 15% revenue | Two of: davison, Ed, Amber |
| **Launch Orchard wallet** | Funds held for Launch orchards | Single key, automated |
| **Uplift Orchard wallet** | Funds held for Uplift orchards | Single key, automated |

Addresses:
- Squad vault: `BjBY4uCCEQfE66rYddTBUn9Twg7jKevH1Rze8UfZFWLs`
- Launch Orchard: `13M2yVLWFmm2VeU1SD5PPPzJwBGUR3eny6Mbvdx3ztct`
- Uplift Orchard: `8Aj2bWN4eDxvGiWPNbCuJXvtH5pL3ZHNGeFdcahRMVRD`
- Hot wallet: `6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ`

The two orchard wallets are single-key rather than multisig on purpose: a
release pays several parties at once (factory, courier, sower, S2G), and
requiring two human approvals per release would not scale past a handful of
orchards. They are NOT swept to the Squad — the money in them is not S2G's.

**Money in an orchard wallet is a liability, not revenue.** It belongs to
the bestowers until the orchard funds, and to the paid parties after. It
must never be counted as S2G's own balance. See section 9.

### The shared rule: all-or-nothing

Both orchard types work the same way:

1. An orchard opens with a fixed target.
2. Bestowers fill pockets. Every pocket is the same price within an orchard.
3. **Nothing is released until the orchard is fully funded** — not the
   factory, not the sower, not couriers, and not S2G's 15%.
4. On full funding, everything releases at once.

S2G's 15% waits with everything else. It cannot be taken early: if an
orchard were ever refunded, S2G would have to return it. Holding it with
the rest keeps that impossible.

**There is no deadline.** An orchard stays open until it funds. This is
community capital, not a crowdfunding campaign — it can take a long time,
and the UI must say so plainly and up front so nobody is surprised.

### Launch Orchard

Funds a production run so a sower can start earning.

**One pocket = one unit.** Not a fraction of one. A 100-shirt run is 100
pockets.

Pocket price is built up from the real costs:

```
Factory cost                    $10.00
Sower's margin (their choice)   $10.00
Delivery                         $5.00
                               -------
Subtotal                        $25.00
÷ 0.85 to cover S2G's 15%       $29.41   ← pocket price
S2G's 15%                        $4.41
```

The processor fee is the grower's, as everywhere else on the platform
(section 1).

**Two pocket types, same price:**
- **Bestowal pocket** — the bestower claims that unit and receives it.
- **Free-will gift pocket** — the bestower funds a unit but claims nothing;
  that unit goes to the sower as stock they can then sow normally.

A gifter can take as many pockets as they like. They pay full pocket price
either way — a gift is not a partial contribution.

This is what makes the model work: gifted units become the sower's cashflow
inventory, so the run is never manufactured purely on hope, and the sower
gets both capital and stock.

**Whisperers are not involved in orchards.** No commission, no attribution.

On full funding, release in one operation: factory paid in full, couriers
paid, sower paid their margin, S2G takes 15%.

### Uplift Orchard

Free-will gifting to help a tribe member or family in genuine need — a
vehicle, a home, food, whatever the need is.

**Only S2G can open an Uplift orchard.** Not self-serve, ever. The flow is:
a tribe member nominates someone they know to be in need, S2G does its own
diligence, and only then does the orchard open. This is the single most
abusable surface on the platform — one fabricated need that reaches the
tribe does lasting damage to trust — so the gate is deliberate and manual.

**Target** = the full cost of the need, plus associated costs (courier,
documentation, whatever applies), plus S2G's 15%.

**S2G pays all parties directly.** The released funds do not go to the
recipient's wallet. S2G pays the dealer, the supplier, the courier. The
tribe can always be shown where their gifts went, and the recipient never
has to account for how they spent it.

Every pocket here is a free-will gift. Nobody claims anything.

**Whisperers are not involved.**

### Reuse the existing escrow mechanism

The platform already has `release-escrow`, `escrow_events` and
`release_status`, built for physical-goods orders. Orchard holdings are the
same shape of problem — money held against a future condition, with an
audit trail of who released it and when. Extend that rather than building a
third holding mechanism with its own rules.

Both orchard wallets' balances must appear in the section 9 gosat liability
view and be counted in the total held figure. They are not S2G's money.

### Still open

- What happens if a Launch orchard's sower withdraws, or the factory price
  changes mid-fund? There is no deadline, but there may need to be a
  cancel-and-refund path.
- Refunding crypto costs fees. If an orchard is ever cancelled, who absorbs
  them?
- Does a Launch orchard's bestowal pocket need a delivery address collected
  at pocket time, or at release time?

## 12. Payout-address change security (2026-09-02)

Changing where a member's payout money goes (`update-crypto-payout`) is a
common account-takeover target, so it carries its own re-auth, separate from
a normal session token:

- **Current password, required.** The function does its own fresh
  `signInWithPassword` check, independent of whatever session token
  accompanied the request. A stolen session token alone cannot pass this.
- **One correct security-question answer, also required.** Same store as
  password reset (`user_security_questions`), verified via
  `verify_own_security_answer` — narrower than the password-reset RPC
  (which needs all three answers plus its own lockout, because it's the
  *only* factor for an unauthenticated recovery flow). Here it's a second
  factor on top of an already-verified password, so one correct answer is
  proportionate, and the endpoint's existing rate limit
  (`RateLimitPresets.PAYMENT`, 5/hour) already bounds guessing.
- **No email.** S2G does not use email at all — this endpoint originally
  carried a deliberate, narrow exception (a confirmation email via
  `send_brevo_email`) when the password re-auth requirement above was
  first added; that exception is retired, not replaced. The owner
  notification is in-app only, same as every other notification in this
  app.
- **48-hour cooling-off, unchanged.** A freshly-changed address still can't
  be paid immediately — see `payout-earnings`' check against
  `payout_details_updated_at`.

If a member hasn't set up security questions, `CryptoPayoutSettings` blocks
the form and sends them to set that up first — there's no path that skips
the second factor.

---

## 13. S2G Balance (built 2026-09-03, PARKED 2026-09-03 pending legal)

**PARKED.** Feature-flagged off (`S2G_BALANCE_ENABLED`, off by default)
the same day it was finished, per legal's decision — see section 14 for
what replaced it as the live operating model. Nothing below was deleted:
tables, RPCs, the wallet page, and every checkout branch are intact and
functional, just unreachable while the flag is off. `credit_earning_for_
bestowal` (the one function that would move a released earning into
`balance_ledger`) checks `app_settings.s2g_balance_enabled` and no-ops
when it's false, leaving `payout_status`/`status` at their pre-credit
value so `owed_payout_balances()` sees it instead — the entire mechanism
is one flag flip to reverse, in both directions, once legal clears it.

**Problem.** Per-purchase wallet approval (Phantom popup / QR) proved too
fragile for small ($2) bestowals — wrong wallet app, unrecognized tokens,
missing Solana Pay references, managed browsers blocking extensions. The
fix: top up once (USDC via Phantom, or PayPal), then bestow in one tap —
no wallet interaction per purchase. Sowers' (and whisperers') earnings
land in the same balance and can be withdrawn on demand. This is now the
*default* checkout option; Solana-per-purchase and PayPal-per-purchase
remain as alternatives.

**This is custodial.** A balance is a USD-denominated ledger entry backed
by pooled USDC/PayPal funds, not a segregated per-member account —
exactly the "held balances" concern section 9 already named for
individual payout balances, now extended to cover top-ups too. **Not
reviewed by counsel. Get a real legal opinion before real-money launch —
this was built and shipped on devnet/sandbox rails under an explicit
instruction to treat it as such; it has not been cleared for real funds.**

### Design

- **`balance_ledger`** — append-only, one row per movement (`user_id`,
  signed `amount`, `kind`, a reference back to the order/topup/payout that
  caused it, an `idempotency_key`). Balance = `SUM(amount)`, exposed via
  the computed `balance_available_v` view — never a stored mutable number,
  the same anti-pattern section 9 implicitly warns against for held
  balances generally. `credit_balance_ledger`/`debit_balance_ledger`
  (`SECURITY DEFINER`, service-role only) serialize concurrent moves per
  user via `pg_advisory_xact_lock` and are idempotent on
  `(user_id, kind, idempotency_key)` — a debit that would overdraw raises
  `insufficient_balance:<available>` rather than allowing a race.
- **Top-up** reuses the existing `topups` table and Solana/PayPal
  intent/finalize plumbing (`_shared/solanaPayIn.ts`,
  `_shared/paypal/capture.ts`) unchanged — only the credit target
  changed, from `sower_balances` (a mutable-column table that never
  actually tracked sower earnings, only topups — effectively superseded
  by this section) to `balance_ledger`, via a new
  `credit_balance_ledger_from_topup` RPC.
- **Bestow with balance** — a new `'balance'` provider alongside
  `solana`/`paypal` at every checkout surface: basket, content, gift, and
  (2026-09-03) orchard. `create-basket-bestowal-order`/
  `create-content-purchase-order`/`create-gift-bestowal-order`/
  `create-orchard-bestowal-order` each debit the buyer's ledger (idempotent
  on the order id) then call `finalizeCompletedOrder` directly — the exact
  function every other provider already converges on, so escrow, the 15%
  fee, whisperer split, Books, and receipts behave identically regardless
  of how the buyer paid. No processor fee (there is no processor in the
  middle). `create-orchard-bestowal-order` replaced two predecessor
  functions (`create-solana-bestowal-order`, Solana-only;
  `create-paypal-order`, PayPal-only) with one provider switch, same
  pattern as basket — both predecessors are left in place, unreachable
  from checkout, same retirement pattern as `create-nowpayments-invoice`.
- **Earnings credit the ledger on release/finalize.** A `product_bestowals`
  row's `release_status` becomes `'released'` in two different places —
  `finalize_basket_order` immediately for a digital seed,
  `escrow_release_bestowal` later for a physical one — and both call a
  shared `credit_earning_for_bestowal`, which credits `sower_amount` (and
  any linked whisperer commission) and flips `payout_status` to a new
  `'credited_to_balance'` value. `content_purchases` and `bestowals`
  (gift/orchard) — which have no escrow/release concept, paying out
  immediately on completion — get the identical treatment at their own
  finalize point instead: `finalize_content_purchase` credits atomically
  in the same transaction as its existing idempotent finalize step, and a
  new `credit_earning_for_gift_bestowal` RPC (wired into `finalizeBestowal`
  in `capture.ts`) does the same for gift/orchard, resolving
  recipient/amount exactly as `owed_payout_balances()` already does
  (`distribution_data->>'sower_user_id'`/`'sower_amount'`, falling back to
  the orchard owner/`base_amount`). Neither table ever has a linked
  whisperer_earnings row. The `payout_status`/`status` flip in every case
  is load-bearing: `owed_payout_balances()` (what the old automatic weekly
  `payout-earnings` cron reads) filters on the pre-credit value, so a
  credited row becomes invisible to it — the only way to avoid paying the
  same earning twice, once via on-demand withdrawal and once via the old
  weekly sweep. One-time backfills migrated already-completed-but-unpaid
  rows at each cutover (product_bestowals: 6 rows/$12.00; content_purchases
  and bestowals: 0 rows, checked before running).
- **Withdraw** — `request-balance-withdrawal`: any amount up to available,
  debited from the ledger before any send is attempted. Solana sends
  instantly, synchronously, reusing `payout-earnings`' exact hot-wallet
  primitive and circuit breakers (per-tx/daily caps, 48h cooling-off — see
  section 12). PayPal doesn't send synchronously — queued as a
  `payouts` row that the existing weekly `payout-earnings` PayPal batch
  now also picks up (its own $20 minimum enforced at request time, no
  aggregation of smaller requests). A withdrawal has no source row to
  revert on failure the way an owed-balance payout does, so
  `payout-earnings` and `paypal-webhook`'s async item-failure handler both
  refund the ledger instead.
- **Accounting.** `AdminPayoutsPage` shows the S2G Balance liability
  (`total_balance_ledger_liability()`, admin/gosat-only) as its own figure,
  kept visibly separate from the old unpaid-earnings float — per section
  9's "never merged into one undifferentiated pile" rule, they're
  different liabilities now that released earnings move out of
  `owed_payout_balances()` into the ledger. `GosatTreasuryPage`'s
  "on-platform reserved" figure, previously sourced from the
  topup-only `sower_balances`, now reads the ledger sum for "available"
  and `owed_payout_balances()` for "pending" (earnings still working
  through the old pipeline). Sentinel's new `balance_ledger` check alerts
  if the hot wallet's on-chain USDC balance falls below the total ledger
  liability — it does **not** check the 2-of-3 Squad's balance (no
  multisig balance-read exists anywhere in this codebase today); that gap
  is explicit in the check's own alert copy, not silently treated as
  covered.

### Still open

- **Legal review**, per the custodial note above — the actual blocker
  before any of this touches real money.

Resolved 2026-09-03 (were listed here, now shipped): orchard bestowals'
`'balance'` option (`create-orchard-bestowal-order`), and
content_purchases/bestowals (gift/orchard) earnings crediting the ledger
at their finalize point.

---

## 14. Non-custodial operating model (live, 2026-09-03)

Decided with legal 2026-09-03, same day section 13 was parked. Sow2Grow
does not hold a member's spending funds at all — a grower pays directly
from their own wallet, and Sow2Grow holds only what it must: sale
proceeds awaiting payout, and orchard funds under the existing orchard
rules (section 10).

**Terms disclosure** (`src/pages/TermsPage.tsx`): *"Your funds stay in
your own wallet. Sow2Grow holds only sale proceeds awaiting payout (paid
out automatically at $20) and orchard funds under the orchard rules."*

### Feature flag

`S2G_BALANCE_ENABLED` (client: `VITE_S2G_BALANCE_ENABLED`, server:
`S2G_BALANCE_ENABLED`, both `=== 'true'` to turn on — off by default when
unset, so no config is needed to keep it off) plus
`app_settings.s2g_balance_enabled` (checked from SQL, since a Postgres
function can't read a Deno env var) gate every S2G Balance code path from
section 13 without deleting any of it:

- `src/hooks/useBalanceProvider.ts` is the single choke point every
  checkout call site reads from — gated to a no-op, it removes `'balance'`
  from every `ProviderPicker` and "top up to pay this way" banner at once.
- `/wallet` (`MyWalletPage`) redirects to `/dashboard` instead of
  rendering.
- The 4 `create-*-order` functions reject `provider:'balance'`
  server-side (409) independent of the client flag.
- `credit_earning_for_bestowal` no-ops when `app_settings.
  s2g_balance_enabled` is false, leaving a released earning's
  `payout_status`/`status` at its pre-credit value — exactly the
  pre-S2G-Balance behavior, so `owed_payout_balances()` sees it again.

### My Wallet (dashboard)

A card (`src/components/dashboard/MyWalletCard.tsx`) shows the member's
own connected Solana address and its **live, real on-chain USDC
balance** — public mainnet RPC, read-only, 60s in-memory cache, always
mainnet regardless of `SOLANA_CLUSTER` (this is the member's real
wallet, not the platform's own pay-in/payout rail). Under $5: a banner
pointing at Phantom's own Buy feature. Connect flow: Phantom extension
(desktop), Phantom's documented `browse` universal link (mobile — opens
the page inside Phantom's in-app browser so `window.solana` becomes
available), or paste an address directly. All three save to
`profiles.solana_wallet_address` via the same `updateProfile`/
`validateSolanaAddress` path `ProfilePage` already used.

### Payment path — unchanged

Grower's Phantom → hot wallet, one transaction, exactly the direct
Solana pay-in built in section 3 (PayPal remains the non-crypto
alternative). Sower share, whisperer share, and the 15% `s2g_fee` are
recorded at finalize exactly as before section 13 — none of that logic
changed; only the now-removed `'balance'` provider touched it.

### Payout threshold — unified across both rails

`payout-earnings`: `PAYOUT_THRESHOLD_USD` (env-overridable, default 20,
renamed from the PayPal-only `MIN_PAYOUT_USD`) now gates **both** rails
on the automatic weekly run. Solana previously had no minimum at all on
this run — that stopped fitting the non-custodial model once nothing is
supposed to sit held indefinitely below a real threshold, but a
recipient also shouldn't be paid automatically in a stream of sub-dollar
sends.

New `request-earnings-payout`: the actual "no minimum" path, on demand.
A sower/whisperer on the Solana rail can pull whatever they're currently
owed early, any amount ≥ $1 (rate-limited) — a USDC transfer costs a
fraction of a cent, so there's no reason to make them wait for $20. Same
source of truth as `payout-earnings` (`owed_payout_balances()`), same
claim/send/finalize shape as its Solana leg (`markCoveredRowsProcessing`'s
compare-and-swap keeps concurrent runs safe). PayPal recipients get an
honest status instead of a fake instant send — PayPal's own per-item fee
is exactly why $20 exists, and no button waives that; below $20 they're
told plainly they'll be paid automatically once they cross it. A
`preview:true` call powers the "Your earnings" card on
`PayoutSettingsPage` without exposing `owed_payout_balances()` (service-
role only) to the client directly.

Orchards' Uplift/Launch hold rules (section 10) are untouched — out of
scope for this cutover.

### Settlement consent

A sower must accept a required checkbox — *"I understand Sow2Grow holds
my sale proceeds only until they reach $20 (or on my request), then pays
them to my own wallet. My funds otherwise stay in my wallet."* — before
they can list a seed or have one sold. `settlement_consents` (user_id,
version, accepted_at, ip) is an append-only acceptance log, written only
by the `accept-settlement-consent` edge function (no client INSERT
policy, so `accepted_at`/`ip` can't be spoofed). Enforced at two layers:
a `BEFORE INSERT` trigger on `products`/`orchards` (new listings) and a
check in `create-basket-bestowal-order`/`create-orchard-bestowal-order`
before any order or payment is created (a sale on a listing that
pre-dates this feature) — never at finalize, since rejecting after a
real payment would strand the buyer's money. Gosats see who's accepted
at `/admin/settlement-consents`.

**To change the wording**: edit `SETTLEMENT_CONSENT_TEXT` in
`src/components/payouts/SettlementConsentPrompt.tsx`, then bump
`app_settings.settlement_consent_version` (`UPDATE app_settings SET
value = to_jsonb(<n+1>) WHERE key = 'settlement_consent_version'`).
That's the whole re-prompt mechanism — `has_accepted_settlement_consent()`
stops matching every existing acceptance the moment the version moves,
no other code change needed.

### Still open

- Same legal-review note as section 13 doesn't apply here — this model
  *is* the one legal signed off on 2026-09-03. What's still open:
  whether `PAYOUT_THRESHOLD_USD`'s default ($20) is the right number
  long-term, and the same Squad-balance blind spot noted in section 13's
  sentinel check (hot wallet only, not the 2-of-3 Squad).
- Settlement consent is scoped to products/orchards only — plain P2P
  gifts and content_purchases (premium rooms/library, no company/listing
  concept) don't gate on it yet.
