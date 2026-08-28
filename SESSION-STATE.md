# Session State — 2026-08-28

Working notes on where the Sow2Grow codebase stands. Not a spec, not permanent documentation — a snapshot for picking work back up.

## Fixed — last session (2026-08-27)

- `e152e4fc` — Auto-recover open tabs after a deploy via SW `controllerchange` + no-cache `sw.js` (stale-module crash on publish).
- `0a31fc35` — Unify the fee model: S2G's 15% on top everywhere, no more sower-side tithing.
- `e08a134f` — Revert orchard S2G gross-up — was double-charging fee-inclusive pocket prices (urgent live double-charge bug).
- `a4019024` — Fix stale fee copy/math in `QuickBestowModal` and `BestowalDialog`.
- `c2f7e1a2` — Orchards: fix `pocket_price` fee rate to 15%, back it out at distribution.
- `a34b3183` — Take down `/commissions` — misrepresented a commission programme that doesn't exist.
- `0341dc20` — Add a "My Earnings" link on `WhisperersFeedPage` for registered whisperers.
- `6b481773` — PayPal client: stop silent sandbox fallback, log `verification_status`.
- `dc4e342b` — Basket: repair stuck items on load instead of leaving them 404 forever.
- `c59d94be` — Fix `download-album`: broken storage fetch (unauthenticated fetch against a private bucket) and wrong-table entitlement check (was querying `music_purchases.product_id`, which doesn't exist — fixed to query `product_bestowals`).
- `f77d3cf0` — Fix silent-error entitlement bug on payment webhooks (#1, #2, #3): fail-open idempotency checks in `paypal-webhook`/`nowpayments-webhook`, fail-closed `bestowals` lookup in `paypal-webhook`.
- `39f76135`, `33f71de2` — Fix music-upload routing dead-ends.
- `c672b49c`, `3e0a83c4` — Album cart: display and charge the real computed total instead of a hardcoded $20; match `BestowalCheckout`'s full pricing breakdown presentation.
- `592797cf`, `4eb44c97`, `f2b99e5c` — Commit specs and outstanding music-upload fixes; ignore `supabase/.temp/`.
- `4fb22599` — Make music seed pages source-aware (`dj_music_tracks` vs `products`), fix "Open" routing, add Music Library entry point.

## Fixed — this session (2026-08-28)

- `c4776ea2` — Consolidate four copies of `isAlbum()` into one shared helper; exclude albums from the music library / AlbumBuilder pool.
- `5ca1cd1d` — Fix `EditForm.tsx`: price ratchet (field now shows/saves TOTAL, unchanged), price field no longer hidden for bestowal license type, album tag no longer stripped on save.
- `c8e39fca` — Add `relevantGroups` filter to `CategoryTagPicker`; scope music uploads to trust/logistics tags only.
- `76e9e747` — Add "Sow an Album" entry point (presets Release Type) and Back button to `UploadForm.tsx`.
- `b8165930` — Add Back buttons to the 10 sower-facing pages that lacked one.
- `c598ba28` — Add golden rule to CLAUDE.md: every routed page needs a way back; audited all 140 routes (49 lacking one, 10 fixed so far, 39 remain).
- `37891c6e` — Stop sending `x-my-custom-header` on every Supabase client request — dead boilerplate causing silent CORS preflight failures on ~59 edge functions that didn't happen to allowlist it (root-caused a live "Failed to send a request to the Edge Function" bug on `/settings/payouts`).
- `b8dc85c6` — Require an explicit payment provider at all 13 bestow/gift entry points instead of silently defaulting to NOWPayments. New shared `ConfirmBestowModal` for the 5 sites with no existing pause step; `useMusicPurchase`/`useLiveBestowal`/`useRadioBestowal` now require `provider`.
- `a85b6594` — Add "Product principles" section to CLAUDE.md.
- `418bc10f` — Add this SESSION-STATE.md snapshot.
- `5f3da38d` — Set `is_fixed_rate: true` and `is_fee_paid_by_user: true` on every NOWPayments `/v1/invoice` call (5 functions: `create-basket-bestowal-order`, `create-content-purchase-order`, `create-wallet-topup`, `create-gift-bestowal-order`, `create-nowpayments-invoice`) — root fix for the Partially_paid rounding failure below.
- `ec8d289a` — Add a $10 crypto-bestowal minimum (`MIN_CRYPTO_BESTOWAL_USD` in `providerFees.ts`); below it, PayPal only, one-sentence explanation, at the 5 provider-picker pause points (`ConfirmBestowModal`, `MusicTrackDetailPage`, `BestowalDialog`, `BestowalCoin`, `TribalAliveFeedPage`'s gift panel).
- `cf7413de` — Extend the $10 floor to the last 3 checkout paths (`BestowalCheckout.tsx`, `AlbumBuilderCart.tsx`, `QuickBestowModal.tsx`) — same behaviour, same `providers` filter mechanism. All 8 crypto-bestowal pause points now covered.
- `3b4287c4` — Correct the `MIN_CRYPTO_BESTOWAL_USD` doc comment: it's a fee-economics floor (NOWPayments' flat ~0.27 USDC network fee + a buyer exchange's flat ~0.50 USDC withdrawal fee are 25%+ of a $2 bestowal, ~2.5% of a $20 one), not a decimals fix — a fixed-rate invoice still quotes a full-precision crypto amount at any price, floor or no floor.
- `6cd23783` — Add `CRYPTO_ROUNDING_NOTICE` (`providerFees.ts`) and show it as a toast at all 8 sites that redirect a buyer to a NOWPayments invoiceUrl (`useContentPurchase`, `useMusicPurchase`, `useGiftBestowal`, `AlbumBuilderCart`, `QuickBestowModal`, `BestowalCheckout`, `MyWalletPage`, `MusicTrackDetailPage`'s product branch) — only fires when the chosen provider is actually nowpayments. This is where the "round up, never down" rounding guidance now lives; see Open list below, formerly item #12 there.

## Open — priority order

1. **Payment confirmation has never fired** (see Keystone problem below) — nothing else matters if bestowals aren't actually confirming.
2. **Reconciliation poller** — not built yet. Needed so a bestowal can self-heal by polling NOWPayments' own payment-status API instead of depending solely on IPN delivery. Explicitly deferred by request ("I'll ask for that separately") — do not start without being asked.
3. **`PublicMusicLibrary.tsx` deletion decision** — confirmed dead (Vite resolves the `.jsx` sibling for the bare import in `RadioManagementPage.jsx`), still has an un-fixed hardcoded-provider call at line 213. Waiting on a decision to delete.
4. **`affiliates` CORS failure** — a plain PostgREST query from `ensureReferralCode()` occasionally returns no `Access-Control-Allow-Origin` header. Extensively tested live, could not reproduce on demand. Fails completely silently (`console.warn` only) for every caller of `useReferralCode` (`TribalAliveFeedPage`, `LivingSeedCard`, `MyTribePage`, `VideoSocialShare`, `ShareSeedDialog`). Unresolved.
5. **39 remaining pages** without a Back/Return control (10 of 49 fixed).
6. **`spec-seed-protection.md`** — Phase 0 (broken `download-album` fetch/entitlement) is done. Phases 1–4 (real preview generation via pre-rendered file, purchase-gated `get-seed-file` function, DJ-track RLS policy fix, chat delivery) not started.
7. **`get-premium-room-asset` and admin-role-check silent-error findings** — flagged during the webhook sweep, explicitly deferred ("can wait").
8. **`S2GCommunityMusicPage.tsx`'s 4th duplicate `isAlbum()` check** — flagged during consolidation, not fixed (file wasn't touched).
9. **Product-sourced track previews only play for the track's own uploader** — `premium-room` RLS gap, documented but not fixed, on `MusicTrackDetailPage`.
10. **Cross-table duplicate seeds** — 4 tracks exist in both `dj_music_tracks` and `products` for the same account (DJ-track-first-then-product-later pattern), currently live in a DJ playlist with real play/vote history. No action taken; user to decide.

The $10 crypto minimum (formerly a gap at 3 checkout paths) and the client-side "round up" rounding guidance (formerly flagged as having no target in this codebase) are both resolved as of `cf7413de` and `6cd23783` — see "Fixed — this session" above. The rounding guidance lives at the point of redirect (`CRYPTO_ROUNDING_NOTICE`), not as a standalone amount display, since no such display exists anywhere in `src/` — every crypto checkout opens NOWPayments' own hosted `invoiceUrl` page, which renders the actual amount and QR itself.

## Key decisions

- **One 15% Sow2Grow fee, added on top**, applied uniformly across every product type (not just music) — no more sower-side tithing baked into displayed prices.
- **Whisperer share comes out of the sower's amount**, not added on top of the buyer's charge (`whisperShareFromBase`).
- **Orchards are fee-inclusive**: `pocket_price` already includes the 15% fee; the fee is backed out at distribution time (`backOutFee` in `distribution.ts`), not added on top of the pocket price.
- **Instant delivery, batched payouts at a $20 threshold.**
- **Treasury: 2-of-3 multisig.**

## Three commitments waiting

1. **Pharmacy franchise** — bulk product upload.
2. **Auditing firm** — 600 clients needing bookkeeping.
3. **Amber's album** — distribution across 6,000 radio stations.

## Keystone problem

**Payment confirmation has never fired.** `processed_webhooks` has zero rows, all-time. Every fix made to the webhook idempotency/entitlement logic this session (`f77d3cf0`, `c59d94be`) was correctness work on a path that, per this row count, has not actually completed a confirmed payment yet. This is the load-bearing blocker — everything downstream of "a bestowal actually gets marked paid" depends on finding why confirmations never reach (or never write to) `processed_webhooks`.

**2026-08-28 findings, from a live NOWPayments test payment:**

- **Root cause of the immediate symptom (identified and fixed, `5f3da38d`):** the payment landed `Partially_paid` because the buyer's exchange (VALR) could only send 2-decimal USDC while NOWPayments required 2.33057556 USDC — floating-rate invoices recompute the exact crypto amount against the live exchange rate at payment time, so a 2-decimal send will essentially always fall short of a rate that isn't fixed. NOWPayments also deducted its own fees from the merchant side on this payment: a 0.274 USDC flat "network fee" + 0.010 USDC service fee (payment's own record: `Fee paid by user: False`, `Fixed rate: False` — both now forced `true` on every future invoice via `5f3da38d`).
- **The IPN callback URL IS stored correctly on the payment.** `create-basket-bestowal-order` (and the other 4 invoice-creating functions) wire `ipn_callback_url` correctly — confirmed both by reading the code (`${SUPABASE_URL}/functions/v1/nowpayments-webhook`, Supabase's own auto-injected env var) and by inspecting the live payment record itself. The callback wiring was never the problem.
- **Reachability test (does NOT touch the webhook itself):** `curl -X POST` to the deployed `nowpayments-webhook` URL with a dummy JSON body and a deliberately invalid `x-nowpayments-sig` header returned a clean `401 {"error":"invalid_signature"}`, and the same invocation appeared in `function_edge_logs` (`POST | 401 | .../nowpayments-webhook`) at the matching timestamp. **The endpoint is fully reachable and its signature check works correctly.** This rules out infrastructure/reachability as the cause of the missing IPN.
- **Conclusion:** the gap is entirely on NOWPayments' delivery side (or IPN/account configuration), not in this codebase's routing, wiring, or the webhook function's health. For the real payment: `nowpayments-webhook` had zero invocations in `function_edge_logs` over a 4-hour window despite the linked `basket_orders` row changing status; `processed_webhooks` gained no row; the `basket_orders` row itself sat at `pending`/`Partially_paid` with `updated_at == created_at`, untouched since insert. Next diagnostic step (not started): check the invoice's live status directly via NOWPayments' own API/dashboard to see whether they consider the IPN delivered-and-failing versus never attempted. The reconciliation poller (Open #2) is the planned mitigation — polling NOWPayments' status API directly instead of depending solely on IPN delivery — but is explicitly deferred until asked for separately.

## Known gotchas

- **Two music tables, easy to confuse**: `music_purchases` (`buyer_id`, `track_id` — for `dj_music_tracks` only) vs `product_bestowals` (`bestower_id`, `product_id`, `sower_id`, `amount`, `s2g_fee`, `sower_amount` — for `products` rows). Multiple bugs this session came from code querying the wrong one.
- **Lovable publish is separate from `git push`.** This is a Lovable-managed project served through Lovable's own publish pipeline (confirmed via live header inspection — Cloudflare-fronted `x-deployment-id`, no `x-vercel-id`, despite `vercel.json` existing). A push to `main` does not necessarily go live on `sow2growapp.com` until a separate Lovable "Publish" action runs. Also: Lovable's agent can push directly to this repo — pull before starting work.
- **Four pre-existing uncommitted files**, present since before this session started, not touched by any of the work above: `package.json`, `package-lock.json`, `supabase/.temp/cli-latest`, `supabase/functions/mcp/index.ts` (all modified), plus `spec-platform-fee.md` (untracked). Left alone throughout — not part of any commit in this log.
