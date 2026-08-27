# Implementation Package — One fee model, every money path

Supersedes `spec-platform-fee.md`, which fixed only the marketplace path. This extends the
same rule to every remaining path and deletes the duplicate mechanisms that let three
different fee models coexist.

## THE RULE

There is exactly one fee model in this application.

```
The sower/recipient sets the value.
S2G's 15% admin fee is added ON TOP and paid by the bestower.
The fee is dispatched to the s2gbestow organization wallet.
Where a whisperer is attached to a seed, the sower's configured whisperer
percentage comes OUT OF the sower's amount and goes to the whisperer's wallet.
The sower keeps the remainder.
```

This applies to every path: marketplace bestowals, album checkout, music tracks, library
and premium items, orchard bestowals, gifts, tips, chat coins, and live-session gifts.

Processor fees remain added on top of the buyer total and are not part of this rule.

## WHAT IS BEING REPLACED

Three fee models currently coexist:

- **Model A** — gross-up at checkout (marketplace, content purchases). Correct.
- **Model B** — tithing deducted from the recipient's payout at distribution time
  (orchard bestowals, gifts, tips). Wrong direction: the sower pays instead of the buyer.
- **Broken** — two paths that 404 before payment (see below).

Model B is a survivor of the old fee structure: a 10% "grower" cut plus a 5% tithe. That
structure was replaced by the single 15% admin fee, but the constants were never removed,
so those paths still run the old model.

**`DEFAULT_GROWER_PERCENT` and `DEFAULT_TITHING_PERCENT` are dead concepts.** They are not
rates to reconfigure. Delete them, along with the `grower_*` fields they populate.

The **whisperer** is unaffected and remains real: per-seed, sower-configured, capped at 85%
by an existing DB constraint, paid out of the sower's amount.

## SINGLE SOURCE OF TRUTH

One module defines the fee arithmetic. Client and server import the same rule; the server
is authoritative.

```
S2G_FEE_PERCENT = 15

base(x)          = the value the sower/recipient set
s2gFee(base)     = round2(base * 0.15)      // added on top, paid by the giver
buyerTotal(base) = base + s2gFee(base)
whisperShare(b)  = round2(b * assignmentPercent / 100)   // out of base, seeds only
sowerNet(base)   = base - whisperShare(base)
```

After this change, **`15` must appear in exactly one place** in the codebase as the fee
rate, and exactly one mechanism must decide what a whisperer earns. If a number appears
twice, one of them is wrong and nobody will know which.

## SCOPE — CONVERSIONS

### Orchard bestowals (paths 5)
- `supabase/functions/create-nowpayments-invoice/index.ts` (handler, ~83-114)
- `supabase/functions/create-paypal-order/index.ts` (equivalent handler, ~127)

Gross up before charging: the buyer pays `buyerTotal(base) + processorFee`. The recipient's
amount becomes the full base they set, not `total − tithing`.

### Gifts and tips (path 6)
- `supabase/functions/create-gift-bestowal-order/index.ts` (handler ~94-116,
  `buildGiftDistribution` ~276-317)

Same gross-up. `buildGiftDistribution` stops subtracting tithing — the recipient receives
100% of the value they set. No whisperer applies: a chat tip or live-session gift is not
attached to a seed, and there is no link to resolve one from. Do not invent one.

### Shared distribution (both of the above)
- `supabase/functions/_shared/distribution.ts`

`buildDistributionData` stops deducting the fee from the recipient's share. **Keep the
payout dispatcher** that sends the fee to the `s2gbestow` organization wallet — this is
currently the only path in the entire application where the 15% actually reaches a wallet
rather than being recorded and forgotten. Feed it the fee collected at checkout.

### Freewill gift in the Tribal feed (path 7 — currently broken)
- `src/pages/TribalAliveFeedPage.tsx`, `handleFreewillGift`

Currently calls `addToBasket({ id: 'freewill-...' })`, sending a synthetic id to
`create-basket-bestowal-order`, which 404s every time. Route it to
`create-gift-bestowal-order` directly, the way `BestowalCoin.tsx` and `BestowalDialog.tsx`
already do. No basket entry, no `products.id`.

### DJ track / radio bestow in the Tribal feed (path 8 — currently broken)
- `src/pages/TribalAliveFeedPage.tsx`, `handleBestow`

Splits by kind:
- `kind: 'music'` (DJ tracks) → route to the existing, working path:
  `useMusicPurchase().purchaseTrack(item.id)` → `create-content-purchase-order`. No server
  change needed; it is already Model A.
- `kind: 'radio_recorded'` → a broadcast session is not a track and has no price. This is a
  tip. Route to `create-gift-bestowal-order` with an appropriate `contextKind`.

### Marketplace fee dispatch
The marketplace path records `s2g_fee` on `product_bestowals` but never credits it
anywhere. Route it to the same `s2gbestow` wallet dispatch the orchard path uses, so the
fee reaches one destination regardless of which path collected it.

## DELETIONS — REQUIRED, NOT OPTIONAL

Leaving any of these in place is how three fee models came to coexist in the first place.

- `DEFAULT_GROWER_PERCENT`, `DEFAULT_TITHING_PERCENT` and the `BESTOWAL_*_PERCENT` env vars
- `grower_wallet`, `grower_amount`, `grower_user_id` from distribution data
- `WHISPER_SHARE_PERCENT` in `src/lib/whisperer/policy.ts` — a client display constant that
  duplicates the server's `COALESCE(a.commission_percent, 15)`. Two independently
  maintained numbers that happen to match today. Derive the display from the shared module.
- `supabase/functions/purchase-music-track` — deployed, zero callers anywhere in `src/`.
  Dead code that this session already edited to no effect. Remove it, or state why it must
  stay.
- Any remaining per-path fee arithmetic. Both `distribution.ts` and the platform fee module
  must compute the fee by calling one shared implementation.

At the end, `grep` for `0.15`, `15`, `tithing`, `grower` and `WHISPER_SHARE` must show a
single fee definition and a single whisperer mechanism.

## LEGACY MARKER — IN-FLIGHT BESTOWALS

Existing `bestowals` rows carry `distribution_data` computed under the deduction model.
Whatever reads `sower_amount` and `tithing_admin_amount` at payout time must know which
convention produced a given row, or in-flight bestowals will settle wrongly.

Add an explicit marker — `fee_model: 'gross_up' | 'deduction'` inside `distribution_data`,
or an equivalent — written by the new code and checked at payout. Same pattern as the
`fee_inclusive` marker added to `finalize_basket_order` earlier today.

Fence it with a clearly commented legacy branch and state the removal condition: delete it
once no unpaid bestowal predates this deploy.

Do not rely on a deploy-order drain window. There is already a payment that has sat
unfinalized for over 30 hours, which is exactly the case a drain window fails to cover.

## DO NOT CHANGE

- Whisperer configurability: per-assignment `commission_percent`, sower-set, 85% DB cap
- The 85% CHECK constraint
- `resolve_whisperer_by_ref_code` and ref-code attribution
- Processor fee handling (still added on top)
- Escrow hold/release timing, which branches on `delivery_type`
- Auth, roles, RLS policies, table structure
- Historical `product_bestowals` rows — no retroactive recomputation without sign-off

## ACCEPTANCE CRITERIA

1. A $10 marketplace seed: buyer pays $11.50, sower receives $10.00, S2G wallet receives
   $1.50.
2. The same seed with a 20% whisperer: buyer $11.50, whisperer $2.00, sower $8.00, S2G
   $1.50.
3. A $10 orchard bestowal: buyer $11.50, recipient $10.00, S2G $1.50 — no grower deduction.
4. A $10 gift or chat tip: giver $11.50, recipient $10.00, S2G $1.50, no whisperer.
5. A DJ track bestow from the Tribal feed completes without `product_not_found`.
6. A radio_recorded bestow completes as a gift without `product_not_found`.
7. A freewill gift completes without `product_not_found`.
8. For every path above, the amount displayed at checkout equals the amount charged, and
   the fee recorded equals the fee displayed.
9. The S2G fee reaches the `s2gbestow` wallet on every path, not only orchard bestowals.
10. A bestowal created before this deploy and paid after it settles under the deduction
    convention, not the new one.
11. `grep` finds one fee definition and one whisperer mechanism.

## EDGE CASES

- `base` of 0, and values small enough that 15% rounds to $0.00
- Whisperer at the 85% cap
- A pending pre-change bestowal finalizing after deploy
- Mixed baskets
- A recipient with no configured wallet

## VERIFY BEFORE REPORTING DONE

- `npm run lint`, `npm test`
- Unit tests covering criteria 1-4 in the shared fee module
- Criteria 5, 6 and 7 confirmed manually in the browser
- State plainly which criteria were not verified and why
