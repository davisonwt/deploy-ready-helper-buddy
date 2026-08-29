# Implementation Package — Platform-wide S2G fee (supersedes spec-s2g-fee.md)

## OBJECTIVE

Every bestowal, of every product type, is charged as:

```
sower's price  +  15% Sow2Grow fee  =  buyer total   (before processor fees)
```

The sower sets the price. Sow2Grow's 15% is added on top and carried by the bestower.
The whisperer's share continues to come **out of** the sower's price, never on top.

## WHY THIS REPLACES THE PREVIOUS SPEC

The previous spec treated this as a classification failure and tried to make the basket
correctly identify music items. That was the wrong target.

The real defect is that the 15% fee was implemented as a **music-only special case**
(`src/lib/pricing/music.ts`), gated behind `isMusicProduct()`. Any product that is not music
— for example `type: "video"` — silently receives no fee. The fee is a platform fee and
must not depend on product type at all.

Second defect: `musicSingleBase(price)` discards its argument and returns a hardcoded `2`.
Sower-set prices on music have therefore been ignored.

Once the fee applies to every type, `isMusicProduct()` becomes irrelevant to pricing. The
classification machinery added for pricing purposes should be removed rather than extended.

## CONFIRMED EVIDENCE

Basket entry that reproduces the fault:

```
id:    "7e87378c-2c5d-43dc-9527-51d787a46941"
title: "Ed · broadcast 2025-11-01"
price: 2
type:  "video"
```

Renders `$2.00` with no fee line. Expected `$2.00 + $0.30 = $2.30`.

## PREREQUISITE — DATA AUDIT

Before deploying, list every product with `type` in (music, audio, radio_recorded) and its
`price`. Any priced other than `2` will change price for buyers when this ships. Report the
list; do not adjust prices without a decision from the owner.

## THE RULE — SINGLE SOURCE

Replace the music-specific module with a general platform pricing module.

```
S2G_FEE_PERCENT = 15

base(product)        = product.price          // as set by the sower
s2gFee(base)         = round2(base * 0.15)    // Sow2Grow's fee, added on top
buyerTotal(base)     = base + s2gFee(base)
whisperShare(base)   = round2(base * 0.15)    // out of base, only when an ACTIVE
                                              // whisperer is credited
sowerNet(base)       = base - whisperShare(base)
```

Rounding: round each line to 2 decimals, then sum. Never sum then round.

This rule lives in **one** client module and **one** server module, and they must produce
identical output for identical input. The server is authoritative.

## SCOPE — FILES

Rewrite:
- `src/lib/pricing/music.ts` → rename to `src/lib/pricing/platformFee.ts`. Keeping the
  music name guarantees someone reintroduces a music special case later. Update all imports.
- `supabase/functions/_shared/musicPricing.ts` → matching server module, same arithmetic.

Modify:
- `src/components/products/BestowalCheckout.tsx` — remove the `isMusicItem` branching;
  every line uses `base = item.price`, every line accrues fee. The fee row is no longer
  conditional on `s2gMusicFee > 0`.
- `supabase/functions/create-basket-bestowal-order/index.ts` — charge `buyerTotal` for
  every line regardless of type.
- `supabase/functions/create-content-purchase-order/index.ts` — same.
- `src/contexts/ProductBasketContext.tsx` — the `restoreProductTypes` resolver exists only
  to support pricing classification. Remove it, unless something else genuinely depends on
  the resolved type; if so, state what and leave it minimal. Removing it also removes the
  render-loop risk entirely.

Check for other consumers:
- Any payout or escrow logic that assumes a `$2` music base — see
  `.lovable/plan/escrow-payout-split-for-bestowals-2026-08-25.md` and
  `docs/cron-money-jobs.sql`. Report anything found; do not change payout logic in this pass
  without flagging it first.

## DO NOT CHANGE

- The whisperer rule: 15% out of the sower's base, only for an ACTIVE credited whisperer,
  falling back to the sower otherwise
- Processor fees remain added on top of the buyer total
- Auth, roles, RLS policies, tables, migrations
- Anything relating to the stuck payment or the SeedSlider crash
- Payout and escrow logic — report, don't touch

## ACCEPTANCE CRITERIA

1. A product with `type: "video"` and `price: 2` shows `$2.00`, a fee row of `$0.30`, and
   total `$2.30`.
2. A music product with `price: 2` shows the same.
3. A product with `price: 7.50` shows fee `$1.13` and total `$8.63`.
4. A basket saved before this change, with no `type` field, prices correctly.
5. A mixed basket of three types sums each line's base and fee correctly.
6. The total displayed equals the amount `create-basket-bestowal-order` charges for the
   same basket. Verify by comparing the client total against the created order amount.
7. With an active credited whisperer on a `price: 2` line: sower net `$1.70`, whisperer
   `$0.30`, S2G `$0.30`, buyer `$2.30`.
8. With no whisperer on the same line: sower net `$2.00`, S2G `$0.30`, buyer `$2.30`.
9. Basket page open 60 seconds produces a bounded number of Supabase requests.
10. `grep` finds no remaining reference to `musicSingleBase` or a hardcoded music base.

## EDGE CASES

- `price: 0` → fee `$0.00`, total `$0.00`
- Very small prices where 15% rounds to `$0.00`
- `price` null or a string rather than a number
- Quantity greater than 1
- An order created before this change that is still pending payment — confirm it settles at
  the amount it was created with, not a recalculated one

## DECIDED — NO PRICE FLOOR

`MUSIC_SINGLE_MIN_USD = 2` is **deleted**, not repurposed. There is no minimum price. A
sower may price a seed at `$0.50` or anything else, including below a dollar. Do not
introduce a floor, a default, or a fallback price anywhere in the pricing path. If
`price` is missing or invalid, that is an error to surface, not a value to substitute.

Rounding consequence to be aware of: `$0.50 × 15% = $0.075`, which rounds to `$0.08`.
Half-cent rounding goes to Sow2Grow. This is acceptable and intended.

## VERIFY BEFORE REPORTING DONE

- `npm run lint`
- `npm test`
- Criteria 1, 2, 4, 6 and 7 confirmed manually in the browser
