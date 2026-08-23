# Whisperer Attribution & Three-Way Payout — Investigation Report

Everything below is confirmed against the live schema and current code, not assumed.

## 1. How a whisperer's approved link to a product is stored

Table: `product_whisperer_assignments`
- `id`, `whisperer_id` -> `whisperers.id`, `sower_id`
- one of `product_id` / `orchard_id` / `book_id` (the seed being marketed)
- `commission_percent` (per-assignment, sower-set)
- `status` — only `'active'` pays (DB trigger `enforce_whisperer_assignment_flow` blocks self-approval)
- rolling counters `total_bestowals`, `total_earned`

Supporting tables that already exist:
- `whisperers` — the whisperer identity row (`user_id`, `display_name`, verification flags)
- `whisperer_invitations` — sower-initiated invite with `proposed_commission_percent`
- `whisperer_earnings` — per-sale credit ledger (`whisperer_id`, `assignment_id`, `bestowal_id`, `amount`, `commission_percent`, `status`, `processed_at`)
- `resolve_active_whisperer(_product_id, _whisperer_id)` — server-side re-validation used at checkout

Live counts today: `whisperers` 0, assignments 0, earnings 0 — nothing in production yet, so schema changes are low risk.

## 2. Live-session sale attribution — what exists vs what is missing

**Exists (link-based, last-touch):**
- `src/lib/whisperer/attribution.ts` stores `?w=<whispererId>` in localStorage per seed, 30-day TTL
- `useWhispererCapture` captures it on navigation
- `BestowalCheckout` sends `whispererId` per basket line
- `create-basket-bestowal-order` calls `resolve_active_whisperer` and stamps `whisperer_id` / `whisperer_user_id` onto the order item
- `finalize_basket_order` writes `product_bestowals.whisperer_id` + `whisperer_amount` and inserts `whisperer_earnings` on payment confirmation

**Exists but completely unused (empty, no code references):**
- `whisperer_referral_links` (`ref_code`, `assignment_id`, `product_id/orchard_id/book_id`, `is_active`, counters)
- `whisperer_clicks` (`ref_link_id`, `visitor_id`, `ip_hash`, `referrer_url`)
- `whisperer_conversions` (`ref_link_id`, `click_id`, `bestowal_id`, `commission_amount`, `attribution_type`)

**Missing: live-session attribution.** `live_streams` / `live_rooms` / `live_session_participants` have no link to any sale. No `session_id` is passed through checkout, no order or bestowal column stores it. A sale made during a whisperer's live show is only credited if the buyer happened to click that whisperer's `?w=` link — which is exactly the wrong assumption for a TikTok-style live where people buy from an on-screen tile.

### Recommended mechanism for #2

Use the dormant `whisperer_referral_links` table as the single source of truth instead of a raw `?w=` id, and add a session dimension.

```text
whisperer goes live
   -> ensure_whisperer_ref_link(assignment_id, session_id)  -> ref_code (short, unique)
   -> every buy tile / share link in that live = /product/:id?w=<ref_code>
   -> click logged in whisperer_clicks (ref_link_id, visitor_id, session_id)
   -> code stored client-side per seed (existing attribution.ts, upgraded to codes)
   -> checkout sends ref_code per line
   -> resolve_active_whisperer_by_code() re-validates: link active AND assignment active
   -> finalize_basket_order writes whisperer_conversions row incl. session_id
```

Schema deltas needed:
- `whisperer_referral_links.live_session_id uuid null` + `session_kind text null` (one code per whisperer per seed per live, plus one evergreen code with null session)
- `whisperer_clicks.live_session_id`, `whisperer_conversions.live_session_id`
- `basket_orders.items[].ref_code` (jsonb, no migration) and `product_bestowals.ref_link_id uuid null`

Second, in-session path (no link click): when a viewer is a `live_session_participant` of an active session hosted by a whisperer and buys within that session (or within a short window after), attribute to that session's ref link. Precedence: **explicit ref_code click > in-session participation > stored last-touch > none (falls back to sower)**. Attribution reason is recorded in `whisperer_conversions.attribution_type`, so every cent is auditable.

Why codes rather than raw whisperer ids: the code is revocable, scoped to one seed and one live, and cannot be guessed and pasted onto another seed to farm commission.

## 3. Whisperer payout readiness

- Payout infrastructure lives on `profiles`: `payout_network`, `payout_address`, `payout_tag`, `payout_wallet_type`, `preferred_payout_method`, `payout_setup_complete`.
- `send-solana-usdc-payout` and `send-xrp-payout` both resolve a destination from `profiles` by `recipient_user_id`, and log to `crypto_payout_transfers`.
- `whisperers.user_id` is a real auth user, so **the same infrastructure works unchanged** — no schema reason it can't be reused. There is a separate `whisperer_payout_wallets` table (`user_id`, `wallet_address`, `wallet_type`), currently empty and unused; recommendation is to ignore/retire it and standardise on `profiles`, so one person selling and whispering has one payout config.
- Gap: nothing today reads `whisperer_earnings` and actually sends money. Earnings are written with `status='payable'` and stop there.

## 4. Intended end state — assessment

Current split in `finalize_basket_order` is hardcoded: 15% S2G, and when a whisperer is credited a flat 15% to whisperer / 70% to sower — it **ignores `assignment.commission_percent`**, so a sower's 2%–30% choice is not honoured. That must be fixed as part of this work: sower share = line total − 15% S2G − (line total × assignment commission%).

Your pending-balance recommendation is correct and matches the architecture: `whisperer_earnings.status` already models this (`payable` -> `paid`), and `sower_balances` shows the same pattern is already accepted here. Never block a sale on a missing payout config.

## Technical summary of the proposed build (not yet implemented)

1. Migration: session columns on the three dormant whisperer tables, `ref_link_id` on `product_bestowals`, RLS + GRANTs for each.
2. `ensure_whisperer_ref_link(assignment_id, live_session_id)` and `resolve_whisperer_by_ref_code(product_id, ref_code, buyer_id, live_session_id)` security-definer functions.
3. Rewrite the split in `finalize_basket_order` to honour `commission_percent`, and record `whisperer_conversions`.
4. Client: upgrade `attribution.ts` to store codes, log clicks, pass `refCode` at checkout; whisperer live UI generates and displays its own buy links.
5. Payout: a `payout-whisperer-earnings` function that batches `payable` earnings per whisperer and calls the existing Solana/XRP senders, marking `paid`; unpaid stays pending when no payout config.
