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
penalised for someone else's rail preference. Already true for most kinds;
`bookings` is the documented exception (see SESSION-STATE ~line 1303) —
**decide explicitly whether bookings should now match.**

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

1. **Prove PayPal works end-to-end first.** `PAYPAL_WEBHOOK_ID`'s
   `paste_` prefix bug is fixed and deployed, but `processed_webhooks` is
   still 0 rows — it has never been proven against a real event. Until
   PayPal is confirmed working, there is no known-good rail to fall back
   on while crypto is rebuilt. **This is the gate on everything below.**
2. Build Solana inbound detection alongside NOWPayments, not instead of
   it. Both live at once, crypto checkout still goes to NOWPayments.
3. Test the Solana path end-to-end on devnet, then with one small real
   payment on mainnet.
4. Switch the crypto checkout path over. Keep NOWPayments code in place
   but unreachable.
5. Rebuild the Solana payout rail inside `payout-earnings`.
6. Only once both directions are proven: remove NOWPayments code, its
   secrets, and its webhook function.

---

## 7. Open questions

- Bookings currently have the sower absorb the processor fee, unlike every
  other kind. Should that change to match?
- Late Solana payment after expiry: credit-and-reopen, or refund?
- Hot wallet caps: what per-transaction and daily numbers?
- Sweep threshold and cadence for hot wallet → Squad?
- New crypto minimum after the NOWPayments fee is removed?
- Does XRP stay in the plan at all? It is a separate ledger — a Solana
  Squad cannot hold it, and it would need its own custody arrangement.
  Nothing in the current stack requires it.
