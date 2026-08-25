# Escrow + Payout Split for Bestowals

Goal: S2G safely **receives and holds** every bestowal, then **releases** it to the right people — sower, whisperer (when one made the sale), and S2G's 15% — with physical goods held until delivery is confirmed.

## The money rule (one place, every sale)

For each line item on a bestowal:

```text
line total
  ├─ 15%            → S2G platform (always)
  ├─ whisperer %    → whisperer, ONLY on an active sower-approved link that made the sale
  └─ remainder      → sower  (absorbs the whisper share when no whisperer earned it)
```

This split already exists in `finalize_basket_order`. Nothing about the maths changes — what changes is **when the money leaves escrow**.

## Hold rules

| Seed type | Hold | Released when |
|---|---|---|
| Digital (delivered in ChatApp) | none | payment confirmed → released immediately |
| Physical (needs transport) | held in escrow | buyer confirms delivery, **or** courier marks delivered + 3-day auto-release window passes |
| Disputed | held indefinitely | GoSat decision |

Sower and whisperer are always released together — one event, both paid, so nobody waits on the other.

## What gets built

### 1. Seed knows if it ships
`products.delivery_type` exists but every row is `digital`. Add `physical` as a real option and surface a **Digital / Physical delivery** choice on the seed upload + edit forms. Physical seeds also capture whether the sower ships themselves or uses a tribe courier.

### 2. Escrow ledger
`product_bestowals` already carries `release_status`, `hold_reason`, `released_at`, `delivery_confirmed_at` — currently unused. Wire them up:

- `finalize_basket_order` sets `release_status = 'released'` for digital lines and `'held'` for physical lines (with `hold_reason`).
- Whisperer earnings rows follow the same gate: `payable` for released lines, `held` for escrowed ones.
- Every state change writes a row to an escrow audit ledger so there is a permanent trail of who released what and why.

### 3. Delivery confirmation
- Buyer gets a **Confirm delivery** action on their order (and inside the chat thread for that seed).
- Courier/sower can mark shipped + delivered; that starts the 3-day auto-release clock.
- Buyer can instead **Raise an issue**, which flips the line to `disputed` and freezes release.

### 4. Release engine
A `release-escrow` backend job that:
- releases every `held` line whose delivery is confirmed or whose auto-release window has expired,
- flips the matching whisperer earnings to `payable`,
- never touches `disputed` lines.
Runs on a schedule and can be triggered by the buyer's confirm action for instant payout.

### 5. Actually paying people out
`payout-whisperer-earnings` already sends whisperer money over USDC-Solana / XRP. Add the mirror for sowers: a `payout-sower-earnings` job that sums released `sower_amount`, pays to the sower's configured payout wallet, and records into `sower_payouts`. Sowers with no wallet configured simply accumulate a pending balance — a sale never fails because of it.

S2G's 15% accrues to the treasury ledger already visible on the GoSat Treasury page.

### 6. What everyone sees
- **Buyer:** order shows `Paid → Held in escrow → Delivered → Released`.
- **Sower (My Garden / Books):** "Held in escrow" vs "Available" balance, per seed.
- **Whisperer feed:** same two-state balance.
- **GoSat:** escrow queue with disputed and long-held lines, plus manual release/refund.

## Technical notes

- DB migration: `delivery_type` check constraint + `physical` support, escrow audit table with GRANTs and RLS, indexes on `release_status`.
- `finalize_basket_order` rewritten to set hold state per line; existing completed rows backfilled as `released` so nothing historical is frozen.
- New edge functions: `release-escrow` (scheduled + on-demand), `payout-sower-earnings`.
- New RPCs: `confirm_delivery(bestowal_id)` (buyer only), `raise_delivery_issue(...)`, `gosat_release_escrow(...)` (admin only) — all SECURITY DEFINER with ownership checks so no one can release their own money.
- Payout rails need `SOLANA_SENDER_PRIVATE_KEY`, `SOLANA_RPC_URL`, `XRP_SENDER_SEED`, and `CRON_SECRET` for the scheduler before real funds move. Everything above works and records correctly without them; only the final on-chain send is blocked.

## Out of scope for this pass
Membership billing, Stripe finish-out, and legal pages — tracked separately.
