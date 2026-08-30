# spec-payments.md — Payment rails, fees, and the direct-Solana migration

Status: **decided 2026-08-30, not yet built.** Supersedes the NOWPayments
portions of the current payment implementation. Read alongside
SESSION-STATE.md (current live state) and spec-service-seeds.md §9 (booking
purchases).

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
- **Total held, as one number.** This is S2G's outstanding liability. It
  belongs on the page prominently, not buried, because it is the number
  that matters for both accounting and risk.
- **Held vs. S2G's own.** The wallet balance is not S2G's money. Show the
  split explicitly: total balance, minus held liabilities, equals what is
  actually S2G's.
- **Aging.** Anything held unusually long is a flag — either a stuck
  payout or a recipient who has never configured a method and needs
  telling.

Read-only. Payouts continue to run through `payout-earnings`; this page
observes, it does not become a second way to move money.

---

## 10. Orchard bestowals

All bestowals to community orchards and production orchards are held in
S2G's wallet (Phantom) or account (PayPal) rather than paid out per
transaction.

**This is the highest-trust-risk holding on the platform** and needs
explicit rules before it scales. Orchard funds are raised *for* a stated
purpose; S2G holding them without defined release conditions is exactly
where trust breaks down — and it is a larger custody position than the
$20 batching in section 9.

**Open, must be decided:**
- What condition releases orchard funds? A funding goal being met, a
  deadline, an S2G decision, an orchard-owner request?
- Who authorises release — the orchard creator, S2G, or both?
- What happens if an orchard never reaches its goal? Refund to bestowers,
  release anyway, or hold indefinitely?
- Are bestowers told, at the point of giving, what the release condition
  is and what happens if it isn't met? **They should be.**

**Reuse, don't reinvent.** The platform already has an escrow mechanism —
`release-escrow`, `escrow_events`, and `release_status` on physical-goods
orders. Orchard holdings are the same shape of problem: money held against
a future condition, with an audit trail of who released it and when.
Extend that system rather than building a second holding mechanism with
its own separate rules.

Orchard holdings must appear in the section 9 gosat view alongside
individual held balances, and must be counted in the total liability
figure. They are not S2G's money either.
