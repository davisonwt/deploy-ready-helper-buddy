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
- `f4d9ebf2` — Move the notice from a toast to inline UI at the 5 `window.location.href` sites (a toast fired immediately before a full-page navigation isn't reliably visible — the page can start navigating before it renders). Toasts stay at the 3 `window.open` sites, where the page persists. Since `useContentPurchase`/`useMusicPurchase`/`useGiftBestowal` are hooks with no UI of their own, this meant adding the inline line to every real caller: `ConfirmBestowModal` (covers 5 call sites in one place), `MusicTrackDetailPage`, `BestowalDialog`, `BestowalCoin`, `TribalAliveFeedPage`'s gift panel, `MyWalletPage`, plus 6 content-purchase modals never touched before (`S2GCommunityLibraryPage`, `S2GCommunityMusicPage`, `PremiumRoomMedia`, `RoomAccessModal`, `PremiumItemPurchaseModal`, `live/media/PurchaseModal`) that also call `useContentPurchase`.
- `9d1a9b7d` — Those same 6 content-purchase modals turned out to be crypto-only with no PayPal option and no $10 floor (a literal "Pay with crypto" button, discovered while inlining the notice above). Confirmed `create-content-purchase-order` already has a full PayPal branch and `useContentPurchase`'s type already allows `provider: 'paypal'` before touching anything. Replaced the single button in all 6 with the shared `ProviderPicker` + `MIN_CRYPTO_BESTOWAL_USD`, matching the other 8 bestowal sites exactly. Also corrected the displayed price in all 6 (was showing the seller's raw price, not the S2G-fee-inclusive buyer total the picker's fee preview and the actual charge use).
- `4300dabb` — Unify the crypto pay currency: `DEFAULT_CRYPTO_PAY_CURRENCY = 'usdcsol'` in `providerFees.ts`, replacing the legacy `'usdttrc20'` (BestowalCoin, TribalAliveFeedPage, the 6 content-purchase modals, and the `useMusicPurchase`/`useLiveBestowal`/`useRadioBestowal` fallback defaults) and the already-correct-but-hardcoded `'usdcsol'` literals (BestowalCheckout, AlbumBuilderCart, MusicTrackDetailPage, QuickBestowModal, MyWalletPage) with the one constant everywhere. Grepped `src/` and `supabase/functions/` for stragglers — only a dev-only test page's placeholder example text and 3 edge-function occurrences (comments or already-`usdcsol` server-side defaults in a separate Deno runtime) remain; see Open list.
- `36a92086` — Add `_shared/paypal/capture.ts`: `captureAndFinalize(kind, recordId, paypalOrderId)` and `finalizeCompletedOrder(kind, recordId, paymentReference)`, covering all five PayPal order kinds. Extracted from the basket-only capture logic so the other four kinds (which have never had anything call PayPal's `/capture` on their behalf) get it without copying that logic four more times. See the new "PayPal integration" section below.
- `17778af9` — `paypal-webhook` now calls `captureAndFinalize` for every kind on `CHECKOUT.ORDER.APPROVED` (previously basket-only) and `finalizeCompletedOrder` for every kind on `PAYMENT.CAPTURE.COMPLETED`. Confirmed `finalize_basket_order`, `finalize_content_purchase`, and `credit_sower_balance_from_topup` are all already idempotent (row-locked, short-circuit on already-completed) — no RPC changes needed. Incidental fix: 3 of 5 kinds previously logged an RPC failure under `CAPTURE.COMPLETED` and returned 200 anyway (silently dropping the event, no retry); they now throw, so PayPal retries on a genuine failure.
- `1a3d7f60` — Generalize `capture-paypal-basket-order` (deleted) into `capture-paypal-order`, accepting any of the five kinds with the same ownership/admin check. `PaymentSuccessPage.tsx` now resolves which kind it's looking at from whichever of `?basket=` / `?purchase=` / `?bestowal=` / `?topup=` is present and polls that order's own status/amount columns, instead of only ever knowing about `?basket=`.
- `fba8e113` — Fix the PayPal return URLs: `create-paypal-order` (orchards) and `create-gift-bestowal-order`'s PayPal branch pointed at `/bestowals/:id`, a route that has never existed — every orchard or gift PayPal payment landed on `NotFound` after approval. `create-wallet-topup`'s PayPal branch pointed at `/wallet?topup=success`, which reads nothing. All three now point at `/payment-success?<kind>=<id>`. NOWPayments branches in all three functions were left untouched — confirmed by diff review and by grep (the two remaining `/bestowals/${id}` occurrences are both NOWPayments-only code).
- `47c427b1`/`4e11cb83` — Add `sower_earnings_v`: unions `product_bestowals`/`content_purchases`/`bestowals` into one `(source, source_id, sower_id, whisperer_id, buyer_id, gross, s2g_fee, sower_amount, whisperer_amount, provider, status, paid_at)` shape, completed/paid rows only. `bestowals` has no `sower_id` column — resolved from `distribution_data->>'sower_user_id'` with an `orchards.user_id` fallback; its `s2g_fee` is derived as the residual (`gross - processor_fee - base`) since that table never stored a fee column directly. RLS baked into the view's own `WHERE` (not relied on from the base tables — a plain view runs as its owner, bypassing base-table RLS). `4e11cb83` fixed a same-session bug: `whisperer_id` stores `whisperers.id`, not the whisperer's `auth.users.id` (confirmed by reading `resolve_whisperer_by_ref_code`) — the first version's `whisperer_id = auth.uid()` check would never have matched a real whisperer.
- `64ab9058` — Switch `DashboardTribeStats` (the dashboard "Bestowals received" tile) fully to the view — one query instead of two, one of which had no status filter at all (confirmed live: sower "Ed" showed 13/$18.80, only 2 rows/$3.40 ever actually completed). Label fixed from "(USDC)" to "(USD)". Switch `BulkWhispererDashboardPage` ("My Earnings")'s sale count to the view; pending/paid stays on `whisperer_earnings` (payout status, a concept the view has no column for). `api/escrow.ts`'s `fetchMySales`/`fetchMyPurchases` (feeds `/my-orders`) got the same missing status filter added directly — not switched to the view, since the escrow UI needs `release_status`/`shipped_at`/`product_id`, none of which the view carries. `components/books/CatalogTab.tsx`/`BooksCatalogItemPage.tsx` untouched: already correctly filtered, and need `product_id` to group by, which isn't in the view's requested column list.
- `965ed443` — Fix `sower_earnings_v`'s product branch: `product_bestowals.sower_id` stores `sowers.id`, not the sower's auth id (same bug class as the whisperer_id fix, missed on the first pass) — `rows.sower_id = auth.uid()` never matched a real sower. Now joins `sowers` and emits `sowers.user_id`. **Not yet applied live** — see Open item below.
- `a33e05bf` — Add `profiles.bestowal_thank_you_message` (nullable text) — a sower's custom thank-you note, used by the post-bestowal messaging feature below. **Not yet applied live** — see Open item below.
- `fb7d351e` — Move post-bestowal chat messaging (thank-you-from-sower, thank-you-from-S2G, receipt) server-side onto finalize, for all 5 PayPal/NOWPayments order kinds, replacing `bestowalChat.ts`'s client-side pre-payment call (deleted). New `_shared/postFinalize/messaging.ts`, called from `_shared/paypal/capture.ts`'s `finalize()` and every completion branch in `nowpayments-webhook`. Best-effort (never throws) and independently idempotent per `(kind, recordId, sower)`. New `BestowalReceiptMessage.tsx` renders the receipt (`message_type: 'bestowal_receipt'`) in `ChatMessage.jsx`. A multi-sower basket gets one thank-you+receipt per sower; top-ups (no sower/seed) get an S2G-only pair in a dedicated per-buyer system room. Full design detail in the commit message.
- `7d2240a5` — Fix `PaymentSuccessPage`'s "Distribution Overview": was hardcoded 70/15/15, didn't match the real fee model (S2G flat 15%, whisperer share variable and taken from the sower's base, not a fixed extra layer). Now computed from the order's own polled amount via `backOutFee()`. Top-ups get their own line (wallet credit, no fee).
- `81ae6451` — Remove a malformed duplicate `config.toml` entry (`[functions.-Remnants-Wheel-Calendar]`, invalid leading hyphen) left over from the earlier `320c21a0` hardening pass — the CLI validates every configured function name before deploying any single one, so this one bad entry silently broke `supabase functions deploy <any-function>` project-wide. Found while trying to deploy the messaging feature.
- `0ca032b2` — Add `get-seed-file`: purchase-gated access to a product-sourced seed's full file (spec-seed-protection.md Phase 2, narrowed to product_bestowals only, per explicit instruction — content_purchases/dj_track untouched). See "Keystone problem" below — this is the fix for the "buyer can't access what they paid for" gap.
- `fa9a769b` — Add `item_id`/`item_title` to `sower_earnings_v` (new migration, `20260828120000` left untouched) — `product_id`/`products.title` for the product branch, `content_id` + a per-`content_type` title resolution (including `'premium_item'`'s JSONB-array-embedded title, via a `LATERAL` search on `premium_rooms`) for content, `orchard_id`/`orchards.title` for bestowals (naturally `NULL` for gifts). This redefinition also carries forward `965ed443`'s `sower_id`-join fix in full. Same migration adds `expire_stale_orders()` — a janitorial function (mirrors the existing `expire_stale_xrp_quotes()` pattern: plain function + `pg_cron`, no edge function) marking any `product_bestowals`/`content_purchases`/`bestowals`/`basket_orders` row still `pending`/`processing` after 48h as `expired`, scheduled hourly, returning a `jsonb` per-table count. **Neither half of this migration is applied live yet** — see Open item #13.
- `6805cb78` — Switch `CatalogTab.tsx`/`BooksCatalogItemPage.tsx` to `sower_earnings_v` now that `item_id` exists, dropping their direct `product_bestowals` queries (and the now-redundant status filter, since the view is already completed-only).
- **All four pending DB migrations confirmed applied live** (`a33e05bf`, `fa9a769b`): `profiles.bestowal_thank_you_message` exists, `sower_earnings_v` has `item_id`/`item_title` (and carries the `sower_id`-join fix), `expire_stale_orders()` exists with its `expire-stale-orders` cron job (jobid 13, hourly). Ran `expire_stale_orders()` by hand: **11 `product_bestowals` rows** (all ~179 days old), **1 `basket_orders` row** (~60h old) marked `expired`; `content_purchases`/`bestowals` were both empty, 0 touched.
- `a22273d7` — Add `backfill-post-finalize`: admin-only (service-role bearer or `has_role('admin')`), re-runs `deliverFinalizeMessages` for completed orders across all five kinds, safe to re-run (idempotent underneath, own coarse pre-check on top). Run for basket order `04e5ef3a` (completed 11:39, before `fb7d371e` existed): delivered all 3 messages into the buyer/sower direct room (`f49b0200-29c1-46f0-8911-5c289c47a1ee`, a pre-existing room between davison and Ed) — confirmed via direct query, not just the function's own return value. Receipt shows `seed_lines: [{"Truth Will Mend", 2.30}]`, `sower_amount: 2.00`, `s2g_fee: 0.30`, `buyer_total: 2.30`, `provider: paypal`, no whisperer. Both participants' `last_read_at` predate these messages, so davison's Unread counter now reflects all 3.
- `f9fb4e6b` — Fix `messaging.ts`'s receipt total: `04e5ef3a`'s receipt showed "Total paid $2.30" but the real PayPal charge was $2.88 — the basket branch summed `product_bestowals.amount` (S2G-inclusive line total, no processor fee) straight into `buyer_total`, silently dropping `basket_orders.processor_fee`. `content`/`gift`/`orchard` were arithmetically right (their `buyer_total_amount` already includes the processor fee) but showed no separate fee line; `topup` had one under a different name. `SowerLeg` now separates `gross` (before any processor cut) from `processorFee`; `buyer_total = gross + processorFee` always. Basket prorates the order's one processor fee across sowers by subtotal share (no per-line fee stored); content/gift/orchard read `processor_fee_amount` directly. `BestowalReceiptMessage.tsx` now shows buyer total + a processor-fee line before the seed/sower/S2G breakdown. Idempotency changed alongside this: the receipt is now an **upsert** (updated in place if one exists) rather than insert-only, so a backfill re-run after a format fix corrects existing receipts instead of skipping them — `backfill-post-finalize`'s coarse pre-check was removed accordingly (it would have blocked exactly this correction). Also: `get-seed-file` now takes a `purpose: 'play'|'download'` field — play mints a 1-hour URL (won't expire mid-listen once set as an `<audio src>`), download stays 60s. Re-ran the backfill for `04e5ef3a`: same 3 message rows, receipt now reads `subtotal 2.30 + processor_fee 0.58 = buyer_total 2.88`, matching the real charge exactly.
- `9a81494e` — Fix unread counts silently excluding system messages: `DashboardTribeStats.tsx`'s `.neq('sender_id', user.id)` is plain SQL `<>`, which is `NULL` (excluded) for a `NULL` sender — dropped both system messages (S2G thank-you, receipt) from every unread count, undercounting by 2 on any order finalized after `fb7d351e`. Same bug independently found and fixed in `LiveRoomsPage.tsx`'s `live_room_messages` query; grepped the rest of `src/` for the identical `.neq('sender_id', ...)` pattern — no other real occurrences (`ContactsList.tsx`/`ChatListView.tsx`/`LiveActivityWidget.jsx` all have their own separate "unread" TODOs — hardcoded 0 or a 24h-window heuristic, neither touches `sender_id`, so neither has this bug). Fixed via `.or('sender_id.is.null,sender_id.neq.<id>')`. Also added a second "given" line to the dashboard Bestowals tile (count + `buyer_total` of the user's own completed purchases) reading the new `buyer_purchases_v` view.
- `1b709248` — Add `buyer_purchases_v`: the buyer-side mirror of `sower_earnings_v` — `(source, source_id, buyer_id, sower_id, item_id, item_title, subtotal, processor_fee, buyer_total, provider, status, paid_at)` across `product_bestowals`/`content_purchases`/`bestowals`/`topups`. Basket prorates the order's one processor fee per line by subtotal share, same formula as the receipt fix above. RLS baked into the view (`buyer_id = auth.uid()` or admin/gosat), buyer-only (no whisperer-style secondary grant). **Not yet applied live** — see Open item below.
- `08face0e` — Auto-log every finalized order into Books: new `_shared/postFinalize/books.ts`, wired into the same 4 trigger points as `messaging.ts`. `books_income`/`expenses` already had `source_table`/`source_id`/`income_type`/`linked_income_id` columns sitting completely unused — nothing anywhere ever inserted a `books_income` row before this. Chose finalize-time-insert over pointing Books' reads at the two views, and for a structural reason beyond preference: both views embed `WHERE ... = auth.uid()` directly in their SQL body (not a table RLS policy), so a service-role edge function calling either would see **zero rows**, always — service-role bypasses table RLS, not a hardcoded `auth.uid()` predicate baked into a view. `books.ts` re-derives the same per-row numbers directly from the base tables instead (same granularity/`source_id`s as the views — one row per `product_bestowals` line for a basket, one per `content_purchases`/`bestowals`/`topups` record otherwise), and upserts by `(source_table, source_id)` so re-running (a backfill) corrects rather than duplicates. Only logs for a user who already has a Books workspace (`companies` row, `books_enabled = true`, created via `BooksPage`'s own opt-in "Open my books" flow) — never auto-creates one. Caught and fixed one real bug before it shipped: `expenses.category` has a CHECK constraint (`Software`/`Travel`/`Meals`/`Office`/`Marketing`/`Payroll`/`Other` only) — the first version's descriptive category labels ("Bestowal", "Digital purchase", etc.) all silently failed that constraint and the insert never happened (caught only by re-querying the table after the first backfill run showed nothing there); switched to `'Other'` for all sync-derived expenses. Verified against `04e5ef3a`: davison's expense reads exactly `$2.88` — the receipt total, confirmed correct. Ed's income could not be verified then — he had no `companies` row; now moot, see the incident below (same root fact, resolved by a decision not to auto-provision one — nothing to update).
- **2026-08-29 — Ed→davison stuck-payment incident, fully repaired.** See "Second incident" below for the full writeup. Six commits: `4df73eba` (`check-paypal-order`, read-only diagnostic), `16d0ee4c` (fix `captureAndFinalize` throwing on a non-422 capture error before checking real status — PayPal returned 404 live), `afe8edab` (service-role bypass on `capture-paypal-order` for admin recovery calls), `34cb7012` (root cause: `books_income`/`expenses` had no unique constraint matching two pre-existing triggers' `ON CONFLICT (source_table, source_id)`, plus `books.ts` deleting the triggers' now-redundant shadow expense rows), `09a56a94` (`reconcile-paypal-orders`, every 15 min, + `expire_stale_orders` now skips any PayPal row with a real provider order id), `5f71b1cd`+`f470b6db` (trigger dropped outright instead of patched further — `books.ts` is now the sole Books writer; the category-CHECK-constraint fix migration that would have patched the trigger instead was removed as moot).
- `b7740585` — Overnight check (2026-08-28 18:00 SAST → 2026-08-29 07:19 SAST, read-only, no changes made that turn) surfaced a real gap in `reconcile-paypal-orders`: `basket_orders` `70f28cf8-d15c-4866-ac12-c8431c2f1cd9` (davison's own order, provider order id `2KB80142DF576124P`) got a genuine PayPal `404 RESOURCE_NOT_FOUND`/`INVALID_RESOURCE_ID` on every single 15-minute check since at least 23:30 UTC the day before, and was never closed — a 404 isn't `ok` in fetch terms, so it fell into the same `left_pending` bucket as a transient lookup failure rather than the "positively confirmed" rule that would let it close. Fixed: new `paypal_reconcile_misses` side table (RLS enabled, no policies, same lockdown as `processed_webhooks`) tracks a consecutive-404 streak per `(table_name, record_id)` — incremented on each 404, cleared on any non-404 result. 3 consecutive 404s **and** past the existing 48h threshold closes the row `failed`, stamping `resolved_reason = 'paypal_order_not_found'` on the miss row as a permanent audit trail. Also: `expire_stale_orders` is now routed through `invoke_money_job` (new thin-wrapper `expire-stale-orders` edge function, same `CRON_SECRET`/service-role/admin auth as `release-escrow`) so its actual per-table expired-count return value lands in `net._http_response` instead of vanishing into a generic `"1 row"` — the RPC itself is unchanged, `cron.schedule()` updated jobid 13 in place. Also surfaced (same overnight check): `function_edge_logs` returned **zero rows for all four functions checked, across all time**, including ones with known, certain traffic — the log-analytics endpoint's unreliability (documented earlier this session) is confirmed to extend to total silence, not just gaps; `processed_webhooks` (0 rows, all-time) is the only thing confirming `paypal-webhook`'s `401` issue is still live. **Not yet applied live** — see Open item below.

## Fixed — 2026-08-29 to 2026-08-31 (PayPal webhook root cause, unified payout system, PayPal Connect)

- **`paypal-webhook`'s 401s, root-caused and fixed.** The keystone problem's open question — why every real PayPal webhook event was failing signature verification — turned out to be a copy-paste bug: `PAYPAL_WEBHOOK_ID` was stored as `paste_8VB48015VP667780M` (a literal `paste_` prefix), which fails PayPal's own `^[a-zA-Z0-9]+$` validation on that field before signature verification ever runs. Found via `function_logs`' existing error logging (`6b481773`'s work) — PayPal's `400 INVALID_REQUEST` response echoed the bad value back, so this was read from our own logs, not extracted by probing the secret. Corrected via the Management API's secrets endpoint (write-only; the old value was never read back), then `paypal-webhook` redeployed. **Still not proven live end-to-end** — `processed_webhooks` was 0 rows immediately after the fix (baseline, expected), and the recommended cheapest test (resend the `CHECKOUT.ORDER.APPROVED` event for order `03d07ce7` from PayPal's live Event Log) hasn't been confirmed done. See Open below.
- **Unified payout system**, replacing two separate, broken mechanisms:
  - `payout-sower-earnings` (old, deleted) had a real bug, found while tracing it: it grouped owed balances by `product_bestowals.sower_id` (which is `sowers.id`, not an auth user id) but then queried `profiles` by that same value as if it were `user_id` — the lookup could never match, so **this function had never successfully paid a single sower**, confirmed live (davison's balance was skipped `no_payout_method_configured` despite having a fully valid, long-configured crypto payout method).
  - `dispatchPayouts()` (still defined in `distribution.ts`, no longer called) handled gift/orchard bestowals separately — immediate dispatch at finalize, PayPal-or-crypto per a snapshotted rail, with its own dead-end: PayPal payouts for whisperers/sowers were only ever wired to the `bestowals` table, never to `product_bestowals` (where the real money was).
  - New `payout-earnings`: one weekly run (Friday 02:00 UTC), reading `owed_payout_balances()` (new SQL function — same source tables and sower-id resolution as `sower_earnings_v`, plus `whisperer_earnings`, filtered to each table's own not-yet-paid state). PayPal Payouts only, $20 minimum per recipient, requires an active + verified `user_wallets` PayPal wallet. One PayPal batch per run covering every eligible recipient; new `payouts` table (one row per recipient, `covered_rows` recording exactly which source rows it settles). `paypal-webhook`'s `PAYMENT.PAYOUTS-ITEM.*` handling rewritten to resolve against `payouts` by `sender_item_id` instead of writing straight to `bestowals` (that old assumption only worked when a batch always had exactly one recipient).
  - `payout-sower-earnings`, `payout-whisperer-earnings`, and `_shared/payouts/nowpaymentsRail.ts` deleted outright (confirmed no other callers). `dispatchPayouts()`'s call sites removed from both PayPal (`capture.ts`) and NOWPayments (`nowpayments-webhook.ts`) finalize paths; the function body itself left in place, unused — same "retire the call site, leave the shared module" pattern as the Books triggers earlier this session.
  - New `/admin/payouts` (gosat/admin): current float + next-run preview (`dry_run:true`, read-only, no manual trigger).
- **PayPal payout-destination verification: OTP tried, then replaced with PayPal Connect.** First built email-OTP verification (6-digit code, hashed, 10-min expiry, 3 attempts) — deployed, then a live test (`check-email-transport`, a diagnostic mirroring the OTP send path) surfaced two real problems: (1) `send-resend-email`'s sending domain `sow2grow.online` is unverified on Resend, so no OTP email could ever actually arrive, and (2) `send-resend-email` silently returned `{success:true}` even when Resend rejected the send — a genuine bug, now fixed (checks `emailResponse.error`, returns a real `502`; no caller changed). Rather than chase the Resend domain issue, the decision changed to **"Connect with PayPal"** (Log in with PayPal / OpenID Connect Identity API) — PayPal itself asserts the verified email, nothing for us to send or the user to type. OTP code, its table, and the manual "Add PayPal email" UI are all deleted. New `paypal-connect` (`authorize_url` + `callback` actions), `ConnectPaypalButton`, `PaypalConnectedPage` at `/settings/payouts/paypal-connected` (with a `state` param for CSRF protection on the redirect round-trip). Payout notifications now go to chat (`deliverPayoutNotification`, `messaging.ts`, into the same per-user "🌻 Sow2Grow" system room topup receipts use) instead of email — "$X sent to your PayPal ending …@domain" / "Balance $X, below $20, carries over" / "Connect your PayPal to get paid", one message per owed recipient per real run.
- **`/privacy` and `/terms` added** — neither existed; PayPal's Log-in-with-PayPal consent screen links to both. Public routes (no login), simple placeholder content matching what's actually true of the platform today. **Not reviewed by counsel.**
- **All of the above applied/deployed live**, 2026-08-31: `owed_payout_balances()` + `payouts` table + weekly cron (migration `20260831090000`, cron `unschedule` calls made idempotent via `DO` blocks after `payout-sower-earnings-daily` was removed by hand in Studio mid-session); `paypal_email_verifications` dropped + `user_wallets.paypal_payer_id` added (migration `20260831120000`); `payout-earnings`, `paypal-connect`, `paypal-webhook`, `send-resend-email` all redeployed, `verify_jwt` confirmed correct on each (`paypal-connect` — self-service, real user session only — is `true`; the rest `false`, matching their CRON_SECRET/service-role/admin auth pattern). PayPal's own side (Log-in-with-PayPal enabled, return URL registered) confirmed done by the user. **Not yet published to the live frontend.**

## 2026-08-29 morning check-in (read-only)

- **`processed_webhooks` still 0 rows, all-time — including since the `PAYPAL_WEBHOOK_ID` fix landed at 08:41.** The fix is deployed but still hasn't been proven against a real event; Open item 1 stands exactly as before. No change made this check — read-only.
- **`reconcile-paypal-orders` is healthy and still running** (job 14, every 15 min, confirmed live) — `70f28cf8` just hasn't hit its close condition yet, not stuck. `paypal_reconcile_misses` shows **9 consecutive 404s** for it (well past the 3-strike trigger), but the close rule is 3 strikes **and** 48h age — the order was created 2026-08-28 08:27 UTC, so it isn't eligible to close until ~2026-08-30 08:27 UTC regardless of streak length. Expect it to close on its own around then; nothing to intervene on before that.
- **A cron job briefly existed at jobid 15, between `reconcile-paypal-orders` (14) and `payout-earnings-weekly` (16), and was unscheduled by hand** (user-reported) before it ever fired — confirmed independently from this end: the jobid gap is real, and `cron.job_run_details` has zero rows for jobid 15, so whatever it was never actually ran. Its name/command aren't recoverable now (removed from `cron.job`, and `job_run_details` doesn't retain a removed job's definition) — noted here as a fact, not a mystery to chase.
- **A Lovable sync stall around 07:46** was reported by the user this morning — outside what I have visibility into (Lovable's own git-sync pipeline, not the Supabase project), so this is recorded as user-reported and not independently verified from this end.

## Fixed — 2026-08-29 (sowing forms: music album, new entry points, old-form retirement)

Continuing `spec-sowing-forms.md`'s build (Step 0/music-single itself — `/sow`,
`/sow/music`, the shared components, `generate-preview` — landed in a prior
session and was never logged here; noted for the record). Four commits today:

- Album mode added to `/sow/music`: "Single or album?" is the first
  question; album mode adds a multi-file track drop zone (order by
  filename, drag to reorder, optional per-track price) and writes the same
  row shape the old album upload form wrote (one `products` row, `file_url`
  → a `manifest.json` of individually-uploaded tracks). `isAlbum()` picks
  this up from the manifest.json `file_url` alone; `metadata.is_album` is
  also set. The old form's 8-tracks-minimum was carried forward since
  nothing asked to relax it.
- New entry points into `/sow`: a "Sow a seed" button on the dashboard next
  to Feeds; My Garden's old four buttons (Sow New Seed, Sow a Song, Sow an
  Album, Bulk Upload) collapsed into one "Sow a seed"; `/sow` itself gained
  a "Bulk upload" link (kept visually separate from the six kind tiles)
  opening the existing bulk uploader at `/dashboard/sower/upload`.
- Music retired from the old upload form (`UploadForm.tsx`, `/products/upload`):
  removed the Release Type (single/album) selector, ZIP upload/extraction
  (JSZip), the album track list and its validation, and audio-format
  checking — none of it is reachable anymore since Music is no longer a
  Type option. A note under Type points sowers looking for music at `/sow`.
  The route itself stays live for Art/File. Fixed two links this would
  otherwise have left dangling: `MusicLibraryPage`'s "Upload new" and
  `MyGardenPanel`'s "Drop Music" quick action both pointed at
  `/products/upload` and now go to the new flow instead.
  `DJMusicUpload.jsx` (DJ radio track uploads — a separate feature and
  table, `dj_music_tracks`) was left untouched; it only shares the word
  "album" with the form retired here, not any code.

tsc/lint clean on every commit; each pushed immediately.

Two follow-up commits, same day:

- `ba1477b1` — My Garden's Total Seeds / Total Raised / Active Seeds tiles
  were reading `userSeeds`, which is actually the orchards-only crowdfunding
  query — a sower with 34 products and 0 orchards always showed 0/0.00/0.
  Now Total/Active Seeds count the sower's `products` (any status /
  non-archived) plus their `orchards` (any status / active) directly; Total
  Raised sums `sower_amount` from `sower_earnings_v`, same source
  `DashboardTribeStats` already trusts. Removed the "Payment Method: USDC
  (USD Coin)" line; the Total Raised tile is now labeled "USD" instead of
  routing through `formatCurrency`'s "USDC" suffix.
- `cf941ea9` — Real banner images for `/sow` and `/sow/music`, in
  `PageHeroBanner`'s style (image + bottom gradient + title/subtitle).
  Willow (the image companion, `companion-invoke`) needs a real signed-in
  user session and spends that user's own per-account image-generation
  quota — not callable from a build script, so existing bundled assets were
  used instead: `chat-mode-radio.jpg` (already used for the Radio chat
  mode) for `/sow/music`, `seeds-strip.jpg` for `/sow`. No new storage
  bucket needed since both are repo-bundled, not Willow output.

## Sowing forms — per-kind status (spec-sowing-forms.md)

Tracked here so the rest of `UploadForm.tsx` gets retired one kind at a
time, the same way music just was, rather than all at once.

| Kind | New form | Old form (`/products/upload`) |
|---|---|---|
| Music — single | **Live** — `/sow/music` | Retired — Type option removed |
| Music — album | **Live** — `/sow/music`, "Album" mode | Retired — Type option removed |
| Artwork / image | **Live** — `/sow/art` | Retired — Type option removed |
| Document / e-book | **Live** — `/sow/book` | Retired — Type option removed |
| Physical goods (Field/Hearth/Forge/Shop) | **Live** — `/sow/product`, kind from the business (`companies.kind`) | Untouched — old form's Physical/Digital delivery toggle still there, not retired this task |
| Service — Hand | **Live** — `/sow/hand`, role-gated | **Not covered** — the old form has never had a Service type |
| Service — Wheel / Pillow | Not built — role-gated placeholders | **Not covered** |
| Orchard | Not built | N/A — orchards are a separate flow (`/create-orchard`, `orchards` table), never part of `UploadForm.tsx` |

Next in `spec-sowing-forms.md`'s own order: Wheel, then Pillow (booking
already works per spec-service-seeds.md §9 once Hand's booking purchase
kind ships), then Orchard. Only once every kind has a live `/sow` form
does `UploadForm.tsx` itself get retired outright.

## Fixed — 2026-08-29 (WAV preview failure on /sow/music, and the 150MB upload work that led to it)

A sower's 42.5MB WAV single failed with `preview_upload_failed` (the track
itself uploaded fine). Investigated read-only first, then fixed:

- **Root cause**: `generate-preview` trims the 45-second preview as raw,
  uncompressed PCM at the source file's own sample rate/bit depth/channels
  — a 48k/24-bit stereo clip alone is ~13MB. The `seed-previews` bucket's
  `file_size_limit` was 5MB (set when the bucket was created, sized for
  plain 44.1k/16-bit content), so any higher-resolution WAV's preview was
  rejected after the main file had already uploaded successfully.
- `seed-previews` bucket `file_size_limit`: 5MB → 20MB (migration
  `20260829181000`, applied and confirmed live).
- `_shared/audioTrim.ts`'s `trimWav()`: 24-bit/32-bit sources are now
  truncated to 16-bit before upload — a pure byte-selection operation (keep
  each sample's top two bytes, closest to the MSB; no decode), consistent
  with the rest of this file's "no ffmpeg available" constraint. Brings a
  48k/24-bit preview down to ~9MB. 8-bit/16-bit sources are unchanged.
  `generate-preview` now also logs the raw Storage error to console on the
  `preview_upload_failed` path (it never did before — the only way to see
  the real message was the client's own response body).
- **Failure kinds separated**, since they'd been conflated into identical
  blocking behavior: `previewStatus: 'unsupported'` (format genuinely can't
  be trimmed — not WAV/MP3) still blocks Plant, per
  spec-seed-protection.md's "if preview generation fails, the upload
  fails" — that rule was written for this case. A new
  `previewStatus: 'preview_failed'` (main file uploaded fine, in a
  supported format; only the preview step failed for an infrastructure
  reason) does **not** block — `SowMusicPage.tsx`'s `fileReady` now accepts
  either `'ready'` or `'preview_failed'`. The dropzone shows "Track
  uploaded. Preview couldn't be generated — we'll retry it automatically."
  `missingReason` no longer says "Add your track to continue" once
  `seedFile.fileUrl` is set — it shows the specific reason instead (this
  was actively misleading before: a sower whose file had genuinely
  uploaded was told to "add" it).
- New `retry-seed-previews` (every 15 min, cron jobid 17, same
  `invoke_money_job`/`CRON_SECRET` pattern as `reconcile-paypal-orders`):
  finds music products with `preview_url IS NULL` and a real file in
  `premium-room` (excludes albums — manifest.json has no single file to
  preview), up to 10 per run, and calls `generate-preview` for each,
  writing `preview_url` back onto the product itself (`generate-preview`
  itself never touches the `products` table — that's this function's job).
  `generate-preview` gained a second auth path for this: CRON_SECRET bearer
  + an explicit `userId` in the body (no real user session to derive it
  from), resolved by the retry function from `products.sower_id ->
  sowers.user_id` before calling. Required flipping `generate-preview`'s
  `verify_jwt` to `false` in `config.toml` (it was `true`, which would
  reject a CRON_SECRET bearer at the platform level before the function's
  own auth logic ever ran) — the function already validates real user
  sessions manually, same as `reconcile-paypal-orders`/`release-escrow`.
- **Fixed same day, follow-up task**: the gap noted just above (player never
  served `preview_url`) is closed. `MusicTrackDetailPage.tsx` now plays
  `preview_url` directly for a non-owner/non-buyer on a product-sourced
  track (public bucket, no signing needed) instead of `null`; owners/buyers
  are unchanged (still `get-seed-file`). The existing "45-second preview"
  label and "not available yet" fallback needed no changes — both already
  keyed off `audioUrl` being null/non-null, which now reflects reality.
  Same gap found and fixed in two more places: `ProductCard.tsx`'s inline
  play button was setting `audioUrl = product.file_url` directly — a raw
  URL into the private `premium-room` bucket that a bare `<audio src>` can
  never load (no auth header), so this had actually never worked for
  *anyone*, owner included; now uses `preview_url`, with the play button
  itself hidden when there's none. `TribalAliveFeedPage.tsx`'s community
  feed already attempted `createSignedUrl` on the real file (correctly
  succeeding for an owner/buyer per premium-room's RLS, denied for anyone
  else) but fell back to the same broken raw URL on denial — `preview_url`
  is now the fallback instead. Albums are untouched in all three (no
  per-track preview exists for them — a separate, bigger gap, not part of
  this fix). Two related-but-different issues found and *not* touched,
  flagged here instead: `LivingSeedCard.tsx` (My Garden / dashboard "your
  own seeds") has the identical raw-`file_url` bug, but only ever renders
  the viewing user's own content — there's no non-owner case there, so it's
  a different bug (broken even for the owner), not "the same gap"; and
  `/products` (`ProductsPage.tsx`, the main marketplace grid — a bespoke
  card, not `ProductCard`) has a "Play 30s" button with **no `onClick`
  handler at all** — never functional, would need real playback UI built
  from scratch rather than a URL swap, which is a materially bigger task
  than this one.

## Fixed — 2026-08-29 (previews playable everywhere a card renders, not just the detail page)

`preview_url` was being served correctly by this point (previous entry), but
almost nothing actually offered a way to *hear* it — a sower could plant a
seed, the preview would trim and upload fine, and the only place anyone
could ever press play was the detail page opened via a direct link. Built
one shared playback stack and wired it into every remaining surface that
renders a music card or row:

- **New shared infrastructure**: `src/lib/media/previewPlaybackStore.ts` (a
  module-level singleton — one real `Audio` object, `startPreviewPlayback`/
  `stopPreviewPlayback`/`subscribeToPreviewPlayback` — so "only one preview
  plays at a time" holds across completely unrelated component trees
  without a Context provider); `src/hooks/usePreviewPlayer.ts` (the shared
  state machine: lazy — only fetches anything on click, never on mount —
  tries `get-seed-file` first when a `productId` is given and the viewer is
  signed in, falling back to `previewUrl` on 403/failure; optional
  `capSeconds` for a source that might resolve to a full file with no real
  preview object behind it); `src/components/media/PreviewPlayer.tsx` (the
  visual overlay — play/pause, progress bar, "45s preview"/"Full track"
  label — renders nothing when `previewUrl` is null, regardless of
  ownership, matching "no preview = no button"); `src/lib/media/getSeedFileUrl.ts`
  (the `get-seed-file` caller, extracted out of `MusicTrackDetailPage.tsx`
  so the hook can share it instead of re-implementing).
- **`ProductCard.tsx`**: a `PreviewPlayer` now sits on every music card's
  cover (visible without hovering, for touch), fed `product.preview_url` +
  `product.id`. Albums are unchanged (still the old manifest-fetch
  mechanism — no per-track preview or `get-seed-file` concept for them).
- **`BrowseOrchardsPage.jsx`** ("Tribal Gardens" — Orchards/Seeds/Music/
  Books/Videos tabs): `products` query gained `preview_url`; product-sourced
  music items now carry `preview_url`/`productId` through to `MediaThumb`,
  which renders the same `PreviewPlayer` on its cover. **Scoped to
  product-sourced tracks only** — the `dj_music_tracks` half of this same
  feed (`musicRows`) intentionally gets no play button: its own
  `preview_url` (a different table, different bucket, may need signing) has
  no cheap way to become a synchronously-playable URL for up to 200 cards
  on load without either eager per-card signed-URL calls or a bigger
  refactor; deferred, not done silently — cards without a preview_url
  already correctly show no button, so this just means dj-sourced cards
  stay silent here for now.
- **`MusicLibraryPage.tsx`**: fixed a real bug — the products branch
  hardcoded `preview_url: null` for every row regardless of the real
  column value, and the query didn't even select it. Both fixed.
- **`MusicLibraryTable.tsx`**: its own bespoke `handlePreview`/
  `playingTrack`/`audioElement` state (table-local, 40s cap, no
  cross-component coordination) is gone. New `TrackPreviewButton` per row:
  product-sourced rows (`source_type==='product'` + `product_id`) go
  through the shared hook exactly like `ProductCard`; `dj_music_tracks` rows
  keep their previous resolve-then-cap-at-40s behavior (unchanged logic,
  since that table has no `get-seed-file`/entitlement concept here) but now
  route through the shared `previewPlaybackStore` so starting one stops
  whatever else was playing anywhere on the page, including a `ProductCard`.
- **`MusicTrackDetailPage.tsx`** refactored onto the same hook (removed its
  own local `audioUrl`/`playing`/`elapsed`/`audioRef`/`onTime`/`toggle` and
  the eager mount-time `get-seed-file` call for owners). `productId` is now
  always passed for a product-sourced track regardless of client-known
  ownership — `get-seed-file` is the entitlement authority, not a client
  flag — so an owner still sees the player and gets the full file on click
  even if `preview_url` happens to be null; a non-owner's "not available
  yet" fallback is still keyed strictly on `preview_url` being null, per
  spec. `dj_track` rows keep the existing signed-URL resolve, now passed
  into the hook with `capSeconds` for non-owners (preserves the pre-existing
  "don't let a non-owner stream the full file past 45s when no real dj
  preview object exists" protection, which the shared hook doesn't bake in
  by default).
- **Explicitly not touched, with reasons**: `SowerProfile.tsx` — confirmed
  (grepped) it renders no `products`/`ProductCard` content at all, entirely
  `dj_music_tracks`/`radio_djs`, a different card, not "the same gap" from
  this task's instruction. `/my-seeds` (`MySeedsPage.tsx`) — no cover image,
  no card reuse; a compact purchase-history row whose "Play" button already
  links to the (now-fixed) detail page. Video previews — grepped the schema,
  no table has a trailer/preview-video column anywhere, so the "only if it
  already exists" condition was never met; zero changes needed.
- `npx tsc --noEmit` and `npx eslint` both clean across every file touched.

## Fixed — 2026-08-29, later same day (finished the preview playback work)

Closed the three remaining gaps from the previous entry:

- **`BrowseOrchardsPage.jsx`'s `dj_music_tracks` half of the Music/Seeds tabs
  now gets a Play button too** — previously deferred (only product-sourced
  cards had one). Solved the "up to 200 cards, can't eagerly sign 200
  URLs" problem by moving the signing itself into the shared hook instead
  of the page: new `src/lib/media/resolvePlayableUrl.ts` — given a raw URL,
  returns it as-is unless it parses into a known private bucket
  (`music-tracks`/`dj-music`/`premium-room`), in which case it signs it,
  lazily, only on an actual click. `usePreviewPlayer`'s `toggle()` now
  routes its `previewUrl` fallback through this before playing, for every
  caller, not just this one — a product-sourced `preview_url` (already
  public) round-trips through it for free (bucket doesn't match, returned
  as-is). `dj_music_tracks` select gained `preview_url`; `musicRows.map()`
  now carries it through with no `productId` (no get-seed-file/entitlement
  concept for that table). No fallback to `file_url` when a dj track has no
  preview_url — per spec, no preview means no button, full stop.
- **`ProductsPage.tsx`**: the "Play 30s" button (`no onClick handler at
  all`, confirmed dead in the previous entry) is now a real `PreviewPlayer`,
  gated on `!isAlbum(product)` same as `ProductCard`. `preview_url` was
  already in the page's `select('*')`.
- **`LivingSeedCard.tsx`**: owner-only, so instead of playing `preview_url`
  outright (a downgrade — the owner should hear their own full track), it
  now uses `usePreviewPlayer` with `productId` set so a click tries
  `get-seed-file` first, falling back to the row's own `preview_url` only
  if that fails — exactly the hook's existing precedence, unchanged. The
  raw `<audio src={mediaUrl}>` (bug: private-bucket URL, no auth header,
  never worked even for the owner) and its local `previewing`/`audioRef`
  state are gone for the audio case; video is untouched (different bug
  class, own working mechanism, not part of this fix). Threaded
  `previewUrl`/`productId` all the way from `sowerContent.ts`'s
  `useMyContent()` (added `preview_url` to both the `dj_music_tracks` and
  `products` selects, and to the shared `MusicRow` type) through
  `buildMusicCard()` → `SeedSlider.jsx` / `DashboardPage.jsx`'s direct
  render site. `useMyContent()`'s RPC-sourced music rows
  (`get_my_dashboard_content`) read `preview_url` defensively (`?? null`)
  since that RPC's own row shape isn't confirmed to carry it — those rows
  still work via `get-seed-file` (their `productId` is set), just without
  the `preview_url` fallback if that call fails. `useSowerContent`/
  `useTribeContent`/`fetchSowerContent`/`fetchSowerContentBulk` were left
  untouched — they don't feed `LivingSeedCard`.
- **Video, everywhere touched today**: still correctly zero rows — no
  table has a trailer/preview-video column (re-confirmed live). No video
  Play buttons added.
- **Found, not touched — flagged, not silent**: `MyGardenSection.jsx`'s
  `GardenCard` (rendered by `/my-orchards`, "My Garden") has the identical
  raw-`file_url`-into-`<audio src>` bug as `LivingSeedCard` had — but it's
  a separate, unrelated component, and the task named `LivingSeedCard.tsx`
  specifically. Not touched. **Fixed later the same day — see the next
  entry below.**
- `npx tsc --noEmit` and `npx eslint` both clean across every file touched.

## Fixed — 2026-08-29, later still (MyGardenSection's own copy of the same bug; preview-length constant drift)

- **`MyGardenSection.jsx`'s `GardenCard`** (rendered by `/my-orchards`, "My
  Garden" — flagged but explicitly not touched in the previous entry since
  the task had named `LivingSeedCard.tsx` specifically) had the identical
  bug: a raw `card.mediaUrl` (private-bucket `file_url`) straight into a
  bare `<audio src>`, no auth header, never actually playable even for the
  owner. Fixed the same way as `LivingSeedCard`: `usePreviewPlayer` with
  `productId` (so a click tries `get-seed-file` first — the owner's real
  file) and `previewUrl` as the fallback. No new threading needed —
  `card.previewUrl`/`card.productId` were already populated by
  `buildMusicCard()` from the earlier `LivingSeedCard` fix, `MyGardenSection`
  just wasn't reading them yet. The raw `<audio ref controls>` element and
  local `audioRef` are gone for the audio case; video is unchanged (own
  separate, working mechanism, not this bug). Local `styles.previewTrack`/
  `previewFill`/`previewLabel` added to this file's existing plain-object
  style system to show a progress bar + "45s preview"/"Full track" label
  while playing, matching the visual language used everywhere else this
  session.
- **`MusicLibraryTable.tsx`'s local `PREVIEW_SECONDS = 40`** (its
  `dj_music_tracks` fallback-to-full-file cap) replaced with the shared
  `PREVIEW_SECONDS = 45` from `src/lib/media/previewLength.ts` — the same
  constant every other preview surface already uses. Behavior change is
  real but tiny: a non-owned dj-track-with-no-real-preview now plays 5
  seconds longer before the client-side cap kicks in.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-books.md build order steps 1–2: multiple sets of books, schema + resolution)

`spec-books.md` and `spec-service-seeds.md` added to the repo root (copied
from Downloads — `spec-books(2).md` and `spec-service-seeds(1).md`, the
latter carrying the "Decided 2026-08-29 after report" sections 4 and 6).
Did build order steps 1–2 of `spec-books.md` only, per instruction —
steps 3+ (switcher UI, /sow Books field, per-set payouts, admin view) not
started.

**Step 1 — migration (`20260829183000_books-multi-set-schema.sql`), verified counts:**
- `companies` gained `registration_no`/`vat_no`/`address` (nullable) and
  `is_default boolean not null default false`, plus a partial unique index
  (`companies_one_default_per_owner`, one `is_default = true` per
  `owner_user_id`).
- Backfill: every sower without a `companies` row got one (name = sower
  display name, `is_default = true`, `books_enabled = false` — today's
  column default, so nobody's Books state changed). **Live count: 4 of 6
  sowers had no company yet (Ed, Amber Wheeles, "The R.I.S.E. Coach" =
  Rodney, and "ClayRoses" — a brand-new sower who signed up and planted a
  product mid-migration, see below) — all 4 got one.** The oldest company
  per owner was then marked default in the same pass (covers the
  pre-existing 1-row case — davison, Louw — and would have covered any
  >1-row case too; live count of owners with more than one company: 0,
  both before and after).
- **A live sow happened mid-migration** ("ClayRoses" planted "The
  Journey" at 12:44:33 UTC, between the companies backfill and the
  products backfill) — its `company_id` came up null on the first
  products-backfill pass; re-ran the (idempotent) companies-backfill and
  products-backfill once each and it resolved cleanly. In response, added
  two safety nets beyond what the spec's migration section itself asked
  for, given this was directly observed, not hypothetical: a `BEFORE
  INSERT` trigger on `products` and one on `orchards` that fill
  `company_id` from the inserting owner's default set whenever a writer
  leaves it null (harmless once every writer sets it explicitly — see
  below — but closes the window before that was true), and an `AFTER
  INSERT` trigger on `sowers` that gives a **brand-new** sower a default
  company immediately, so their very first product isn't the one that
  discovers the new NOT NULL constraint the hard way.
- `products.company_id` (pre-existing, unused, and — discovered live — already
  carrying an `ON DELETE SET NULL` FK to `companies.id` from whenever the
  column was first added) backfilled to each product's owner's default
  set, then locked `NOT NULL`. **Verified: 58/58 products have a
  `company_id`, 6 distinct companies, column `NOT NULL` confirmed.**
- `orchards.company_id` added (new column, plain FK, no `ON DELETE`
  clause), backfilled, locked `NOT NULL`. **Live count: 0 orchards exist
  at all**, so this was schema-only — trivially satisfied, nothing to
  backfill.
- **Final verification, all confirmed live:** every sower has exactly one
  default company (0 without); 6 companies total, 6 marked default (1:1);
  both FK constraints present.

**Step 2 — resolution logic (§5):**
- `books_backfill_products(_business_id)` (new migration
  `20260829184000`): the products half now pulls only `WHERE p.company_id
  = _business_id`, dropping the old `OR p.sower_id IN (scoped sowers)`
  fallback that pulled every product across the caller's whole account
  scope into whichever business asked. Top-level ownership check
  unchanged. `sower_books` (no `company_id` column — out of scope for
  this spec, §2 never adds one) keeps its existing
  `get_my_account_scope()`-based filter, untouched. No orchard-equivalent
  backfill function exists to mirror this in — checked (`pg_proc` for
  anything else `%backfill%`), only `books_backfill_products` itself.
- `books.ts` (`supabase/functions/_shared/postFinalize/books.ts`) no
  longer resolves `business_id` from "the sower's/buyer's Books
  workspace" (the old `findBooksCompany`, an arbitrary/unordered
  `books_enabled` lookup by user). Two new resolvers: `findCompanyIfBooksEnabled(companyId)`
  for seed-sourced sale income — reads the *specific* product's or
  orchard's own `company_id`, since a member with two businesses may have
  sown a given seed into either one; `findDefaultBooksCompany(ownerUserId)`
  (now `is_default = true AND books_enabled = true`, replacing the old
  unordered lookup) for everything with no seed behind it: a buyer's own
  expense record (always), a bare P2P gift with no orchard, and
  `content_purchases`-sourced income (premium rooms / library items /
  live-session media — none of those backing tables have a `company_id`
  column, so there's nothing seed-specific to resolve there). **Whisperer
  and referral income aren't logged into Books anywhere yet — grepped
  `supabase/functions` and `pg_proc` to confirm, nothing writes either
  into `books_income` today — so "→ recipient's default set" is recorded
  as the rule for whenever that's built, not new functionality added now.**
- **Re-ran `books_backfill_products` for davison, Ed, Amber, Rodney
  (`the-r-i-s-e-coach`) — Catalog and totals confirmed unchanged for all
  four:** davison: 34 `books_items` before and after (33 products
  upserted in place + 1 book, untouched), `books_income` 1 row/$2,
  `expenses` 5 rows/$14.40 — identical before and after. Ed/Amber/Rodney:
  0/0/0 before and after (`books_enabled = false` for all three — Books
  was never turned on, backfill correctly no-ops exactly as it did when
  they had no `companies` row at all). Independently confirmed davison's
  one existing `books_income` row's `business_id` already matches what
  the new product-`company_id` resolution computes for that same sale —
  the new logic agrees with what was already recorded, nothing to correct.
- **Every `products` writer sets `company_id`.** Grepped for
  `.from('products').insert` across `src/` and `supabase/functions/` —
  exactly one real writer exists: `insertProduct()` in `src/api/products.ts`,
  called from three sites (`UploadForm.tsx`, `sow/SowMusicPage.tsx`,
  `BulkUploadWizardPage.tsx` — the DJMusicUpload/video-upload writers
  spec-books.md §4 also names insert into different tables entirely,
  `dj_music_tracks`/`community_videos`, not `products`, so they're not
  `products` writers and were left alone). New
  `src/lib/products/getDefaultCompanyId.ts` (`sowers.id` ->
  `sowers.user_id` -> `companies.owner_user_id where is_default`,
  matching every writer's existing sower-resolution step) — all three now
  set `company_id` on the insert payload; the bulk-upload wizard resolves
  it once before its per-row loop rather than once per row.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-service-seeds.md build order steps 1–2: /sow chooser, role unlock, Directory fix)

Did build order steps 1–2 of `spec-service-seeds.md` only, per instruction
— steps 3+ (the four seed forms themselves, booking as a purchase kind,
grower-side "Request booking") not started; `/sow/hand`, `/sow/wheel`,
`/sow/pillow`, `/sow/heart` all correctly 404 for now via the existing
catch-all route, exactly as the spec expects at this stage.

**Step 1 — migration (`20260829190000_wandering-roles-and-service-seeds.sql`), confirmed applied live:**
- New `wandering_roles` table (`user_id`, `role` — CHECK'd to
  `wheel|hand|pillow`, `display_name`, `base_town`, `lat`/`lng`, `status`
  default `'active'`, `declared_self_operated_at`, `accepted_terms_at`,
  timestamps, `UNIQUE(user_id, role)`). RLS: owner can read/insert/update
  their own rows; a separate public policy lets anyone read `status =
  'active'` rows — verified all 4 policies live.
- `community_drivers`/`service_providers`/`stay_listings` marked
  deprecated via `COMMENT ON TABLE` (plain ASCII text — the first attempt
  used `§`/em-dash and came back mojibake in a client display, redone
  clean rather than left ambiguous); nothing dropped, nothing else reads
  them going forward except the Directory, which is fixed below.
- `products.file_url` — `DROP NOT NULL` (service seeds have no file).
- `products.kind` (new, `CHECK (kind is null or kind in
  ('music','ebook','hand','wheel','pillow','heart'))`) backfilled from
  `type`. **Live counts before backfill: 56 `music`, 1 `ebook`, 1
  `product`.** Only `music`/`ebook` map cleanly into the new vocabulary —
  the one legacy `product`-typed row was left `kind = NULL` rather than
  forced into a mismatched value; confirmed live afterward: 56
  `kind='music'`, 1 `kind='ebook'`, 1 `kind=NULL`.
- `products.service_details jsonb` (new, nullable) — for the kind-specific
  fields section 5 defines (not built yet, this task is schema-only for it).
- `wandering_role` column (the uploader's personal badge, read by
  TribalAliveFeed/DJMusicUpload/video upload) was **not** reused or
  touched, per the spec's explicit warning that it means something
  different from the new `kind` column.

**Step 2 — application code:**
- **`/sow` is now the chooser** (`SowChooserPage.tsx`, new) — four
  groups per §3: Creations (Music → live `/sow/music`; Art/Books → `/sow/classic`,
  "coming soon"), Services & time (Hand/Wheel/Pillow/Heart), Produce &
  goods (Field/Forge → `/sow/classic`), Orchards (Community/Production →
  existing `/create-orchard`, both — the form itself distinguishes the
  type). The old flat tile picker (`SowIndexPage.tsx`) is unchanged and
  now lives at **`/sow/classic`** — every "coming soon" card links there,
  matching what the spec calls "the old form."
- **Service card routing**: on mount, fetches the viewer's own
  `wandering_roles` rows plus a `tribal_hearts_profiles` existence check.
  A card for a role already held routes straight to `/sow/<kind>`
  (currently 404 — no seed form built yet, expected at this stage). A
  role not yet held routes to `/register-wandering?role=<kind>` — **except
  Heart**, which routes straight to its own existing `/tribal-hearts`
  onboarding instead, since Heart was never a `wandering_roles` concept
  and the new unlock screen doesn't handle it (spec §4 is explicit that
  Heart keeps its current flow untouched).
- **`/register-wandering`** (`RegisterWanderingPage.tsx`, new — this route
  never existed before; SESSION-STATE previously flagged it as "a dead
  link," see Open list) is the role-unlock screen for `hand`/`wheel`/`pillow`
  only. Prefills display name and base town from the profile (`profiles.display_name`/
  `location`/`latitude`/`longitude`, when set). Both the self-operation
  declaration (the lawyer's exact wording, §2) and the terms checkbox are
  required before the button enables. Submits an `upsert` on
  `(user_id, role)` — reactivating a previously-`inactive` role works the
  same as a first-time unlock — then navigates to `/sow/<role>`.
- **`WanderingDirectoryPage.jsx`**: Wheel/Hand/Pillow now query
  `wandering_roles` (`role = <x> AND status = 'active'`) instead of
  `community_drivers`/`service_providers`/`stay_listings`. **The Heart
  tab's fetch — entirely missing before, a real bug independently
  confirmed both by reading the code and previously flagged in this log —
  is added**, reading `tribal_hearts_profiles` (`status = 'active'`); its
  card already correctly linked to `/tribal-hearts` regardless of row
  shape, so that part needed no change. `getName`/`getLocation`/`getAvatar`
  extended to read the new row shapes (`display_name`/`base_town` for
  wandering_roles; `display_first_name`/`location_region`+`location_country`/
  `photos[0]` for tribal_hearts_profiles) without removing any existing
  fallback. Whisperer/Field/Forge/Story/Hearth tabs are unchanged — not
  part of this spec's role system (Whisperer is role-only and explicitly
  never a seed; Field/Forge are deferred "coming soon").
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-storefronts.md build order step 1: schema + public /store/:slug page)

Did build order step 1 of `spec-storefronts.md` only, per instruction —
`bulk_upload_jobs`/`basket_orders` changes (steps 2 and 4) explicitly
skipped; the shop card in Tribal Gardens/Directory, Follow, basket/
checkout, and the four-screen bulk upload flow are all later steps, not
started.

**Migration (`20260829200000_storefronts-schema.sql`), confirmed applied live:**
- `companies` gained `is_store` (default false), `store_tagline`,
  `store_theme` (jsonb), `store_categories` (text[]), `collect_address`,
  `offers_collect` (default true), `offers_delivery` (default false),
  `location_lat`/`location_lng`. `slug`/`logo_url`/`banner_url` already
  existed, reused as the spec's own note said.
- `products`: **`sku` and `category` already existed live** — checked
  before writing the migration, confirmed nullable/unconstrained/all-null,
  so nothing to add there; the migration only adds `stock` (nullable
  integer). `status`'s existing `CHECK (status = ANY ('active','paused'))`
  extended to include `draft`/`archived` in the same constraint rather
  than replaced — live data was 58/58 `active` before and after, no rows
  touched.
- New partial unique index `(company_id, sku) WHERE sku IS NOT NULL`.
- `is_store` turned on for davison's default company (`dd069637-...`,
  slug `davison-9cb1b1`) as the test shop — confirmed live: 33 active
  products, matching exactly what `/store/davison-9cb1b1` now queries.

**App code:**
- **`/store/:slug`** (`StorePage.tsx`, new) — public route, no auth (same
  pattern as `/learn-share/:videoId`). `?ref=` referral capture needed no
  extra code: `useReferralCapture()` in `App.tsx` already runs app-wide
  for every route. Shows the shop header (logo, name, tagline), a scoped
  search box (debounced, `ilike` on title) and category chips (from
  `store_categories`), and a paginated grid (24/page, "Load more") of the
  company's `status = 'active'` products via the existing `ProductCard`.
  New `fetchStoreBySlug`/`fetchStoreProducts` in `api/products.ts` (a
  pre-existing `fetchProductsByCompany` helper existed but was built for
  a different page with a narrower field projection and no
  active-only/search/category filtering — not reused, a fresh
  narrowly-scoped helper written instead, matching this file's own
  established one-helper-per-page convention). The owner (`companies.owner_user_id
  === auth user`) sees a Manage bar with **only** Edit shop (→ `/profile`)
  and Books (→ `/books`) — the fuller Manage bar (Bulk upload, Add one
  seed, Orders) is a later step.
- **`ProductCard.tsx`** gained an optional `hideSowerInfo` prop (default
  `false`, every existing caller unaffected) — every card on a shop's own
  page belongs to the same shop, so its avatar/name row is redundant per
  spec §4 ("ProductCard with the shop badge hidden, it's implied");
  `StorePage` is the only caller that sets it.
- **Profile → My businesses** (`MyBusinessesSection.tsx`, new component,
  dropped into `ProfilePage.jsx`'s existing "profile" tab right after the
  Wallet & Payments card — that 1855-line file wasn't otherwise touched)
  — this section didn't exist at all before now (spec-books.md's own
  step 3, which was meant to build the full switcher/create-workspace
  version of it, was never done — out of scope for both that task and
  this one). Built the minimal version this spec actually needs: one card
  per `companies` row the member owns (in practice exactly one, per the
  books migration's default-set backfill) with a Storefront switch and,
  once on, tagline / comma-separated categories / collect-address fields,
  explicit Save per card, and a "View your shop" link once live.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-books.md build order step 3: My businesses, switcher, Books never creates rows)

No migration this time — pure application-layer work on top of the
schema step 1 already applied. No app-level code from the storefronts
task's step 1 needed touching beyond `MyBusinessesSection.tsx` itself.

- **Profile → My businesses** (`MyBusinessesSection.tsx`, extending the
  card the storefronts task built) now shows, per business: name,
  currency, a "Default" badge, and — for every non-default one — a "Make
  default" button. Editable fields: name, currency, registration no., VAT
  no., address (spec-books.md §2's identity fields), plus the existing
  Storefront toggle/tagline/categories/collect-address from the
  storefronts task, all in one card, one Save. **"Add a business"** is a
  new inline form (name, currency — prefilled from the current default
  business's currency, editable — optional registration no./VAT no./
  address); submitting inserts a `companies` row with `is_default: false`
  and **`books_enabled` copied from the default business** — per the
  spec, that insert *is* the new business's set of books, nothing further
  to activate. "Make default" is a two-step client-side update (clear the
  old default, then set the new one) since the partial unique index only
  allows one `is_default = true` per owner at a time — checked
  `companies`' RLS first (owner can already insert/update/select/delete
  their own rows, confirmed live, no policy changes needed). Copy
  audited: "business" / "set of books" throughout, "company"/"workspace"
  only in code comments, never in anything a member reads.
- **`useBooksBusiness.ts`** rewritten to the shape the spec asks for:
  `{ businesses, current, setCurrent, loading, saving, updateBusiness,
  applyCountryPreset, reload }`. `current` defaults to the owner's
  `is_default` row and is remembered per user in `localStorage`
  (`books:currentBusiness:<userId>`), falling back to `is_default` (then
  the oldest row) if nothing stored matches what's actually there anymore
  (e.g. a business got deleted). **`createWorkspace` is gone —
  the hook never creates rows now; the profile does**, per the spec.
  `updateBusiness`/`applyCountryPreset` (used by the Settings tab, unrelated
  to creation) kept, just re-scoped from the old singular `business` to
  `current`.
- **`BooksPage.tsx`**: header gained a business switcher (a `Select`
  listing `businesses`, calling `setCurrent`) — **rendered only when
  `businesses.length > 1`**, per instruction — plus an always-shown
  "Manage businesses" link to `/profile`. Every tab now reads `current.id`
  instead of the old `businessId`. The old inline "create your Books
  workspace" form (name field + `createWorkspace()` call) is gone —
  structurally unreachable now anyway, since every sower has always had a
  default business since the earlier books migration's trigger; the
  zero-businesses fallback state just points to `/profile` instead.
  `BooksCatalogItemPage.tsx` (the only other real consumer besides
  `MyOrchardsPage.jsx`, which discards the hook's return value entirely
  and needed no change) updated the same way.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-books.md build order step 4: Books field on /sow/music, lock-after-first-sale)

No migration — pure application-layer work on the schema already in
place. The other §4 item ("every products writer sets company_id") was
already done in the earlier books steps-1-2 task (`insertProduct()`'s
three call sites), so not repeated here.

- **`SowMusicPage.tsx`**: "More options" gained a "Books" field — a
  `Select` of the sower's own businesses, defaulting to `is_default`,
  **rendered only when `businesses.length > 1`** (matches the same
  "silent with one set" rule used everywhere else in this feature). Fetches
  once on mount via `owner_user_id = user.id` directly (doesn't need to
  wait for the sower-row resolution the rest of Plant does, since
  `companies` keys off the auth user, not the sower row). On Plant,
  `company_id` is set from the field's own selection; if the field never
  rendered (one business) or somehow never resolved, falls back to the
  existing `getDefaultCompanyId(sowerId)` call from the earlier task —
  never blocks Plant either way, per spec.
- **`MusicTrackDetailPage.tsx`** gained a **"Seed settings"** card, owner-only
  — and "owner" here specifically means *the uploader*, a check this page
  never had before (its existing `owned` state means "this viewer
  bestowed," a buyer concept, unrelated). Resolves the uploader via
  `products.sowers.user_id === auth user`. **Locked once the seed has any
  `product_bestowals` row at all** (the spec's own literal definition of
  "first sale" — not narrowed to `completed` status, matching the
  parenthetical in §4 exactly): shows the current business name, read-only,
  with the one-line reason ("its business can't be changed after a sale,
  for clean books"). Not locked: a `Select` of the uploader's businesses,
  saving straight to `products.company_id` on change. Same "silent when
  there's only one business" gate as the Sow form — the whole card is
  hidden unless the uploader actually has more than one to choose between.
  Only applies to product-sourced tracks (`dj_music_tracks` has no
  `company_id`/business concept at all).
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-sowing-forms.md: /sow/art, the second live sowing form)

Built `/sow/art` following `SowMusicPage.tsx`'s single-track pattern
exactly (same shared pieces, same layout, same non-blocking More-options
philosophy, same Books field from the earlier task). Two small schema
prerequisites found live and fixed first (`20260829210000_sow-art-schema.sql`):
`products.kind`'s CHECK vocabulary (added by the service-seeds migration)
didn't include `'art'` yet; `seed-previews`' `allowed_mime_types` was
audio-only and would have rejected the watermarked-JPEG upload — both
confirmed and fixed live before writing any page code.

- **The image *is* the cover, and the two are deliberately different
  files.** `SeedDropZone kind="image"` (10MB check, already existed)
  uploads the real, full-resolution original straight to `premium-room`
  (private) → `file_url`, gated behind `get-seed-file` exactly like
  music's full track. Separately, **client-side, canvas-only, no edge
  function** (new `src/lib/media/generateWatermarkedPreview.ts`): resizes
  to a max 1200px width (never upscales), tiles a diagonal, 30%-opacity
  "Sow2Grow preview" watermark across it, exports as JPEG, uploads to the
  public `seed-previews` bucket. That watermarked copy is what actually
  goes into **both** `cover_image_url`/`image_urls` (so every feed card,
  `SeedPreviewCard`, and this listing's own gallery show it — never the
  gated original) **and** `preview_url` (keeping the same
  public-preview/gated-full-file column shape music already established,
  for whatever reuses it later). Generation runs automatically right
  after upload finishes (mirrors audio's "generating…" UX) and is
  non-blocking on failure, same reasoning as audio's `preview_failed`: the
  real file already uploaded fine.
- **Required pieces, fixed order**: image, title, price, category,
  description, licence. Licence (personal / commercial / print rights,
  default personal — a new `RadioGroup`, stored in `metadata.usage_license`;
  `products.license_type` stays exactly what it already meant elsewhere,
  free-vs-bestowal payment model, a different concept, checked live before
  reusing it) is a real puzzle piece but satisfied from the start, since it
  always has a default. More options (never block Plant): medium,
  dimensions (both free text, `metadata`), whisperer %, tags
  (comma-separated — spec-sowing-forms.md's general "tags removed" rule is
  explicitly overridden for this build, per this task's own literal
  instruction), explicit. `type: 'art'` — confirmed live this is what
  the old `UploadForm.tsx` already used (`<SelectItem value="art">`), kept
  identical. `category`/One Picker fills the same "where does this belong"
  role genre plays for music, with its own art-specific option list.
  Books field (spec-books.md §4) — identical pattern to music's, hidden
  with one business. On Plant: confetti, then
  `navigate('/bulk/products/${id}')`.
- **Detail page**: confirmed live (via `git log`, predates this session by
  months) that `/bulk/products/:slug` → `BulkProductDetailPage.tsx` is the
  genuinely old, generic, type-agnostic product page — the "old artwork
  detail route." Its existing gallery needed no changes (it already just
  renders `cover_image_url`/`image_urls`, which for an art seed is now
  correctly the safe watermarked preview). Added the one new piece it was
  missing: a **"Download full resolution"** button, shown only when
  `product.type === 'art'` and the viewer is the uploader or holds a
  completed `product_bestowals` row — same `fetchSeedFileUrl`/
  `get-seed-file` call music's Download button uses (confirmed the
  function has no type-specific assumptions — purely `products.id` +
  entitlement). Scoped strictly to `type === 'art'`; every other product
  type on this shared page is completely unchanged.
- **`/sow` chooser**: Art card flipped to `live: true`, routed to
  `/sow/art`. `/sow/classic` (the old flat tile picker) is untouched and
  still where Books/Physical/Field/Forge's "coming soon" cards land.
- Known gap, disclosed rather than silently accepted: unlike audio, there
  is no `retry-seed-previews`-equivalent for a failed watermark
  generation — if it fails, `preview_url`/`cover_image_url` stay null for
  that seed until the sower re-uploads. Not built now; not asked for.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-storefronts.md §4a: shop presets by Wandering kind)

`spec-wandering-doors.md` (new) and an updated `spec-storefronts.md` (now
with §4a) copied in from Downloads first — confirmed the update was
additive (same 1–9 numbering, 4a inserted) before overwriting the
committed copy. **No door pages built** — explicitly out of scope for
this task (spec-wandering-doors.md's own build order says door pages come
after this; not started).

- **Banner assets don't exist.** Checked live before writing any code:
  `src/assets/wandering/` doesn't exist at all — not one of the seven
  `<kind>-banner.jpg` files the task described, not in `dist/`, not
  untracked, not in Downloads either. Built `src/lib/store/presets.ts`
  with every kind's `bannerImage` set to `null` and a gradient fallback
  (built from the kind's own accent colour) everywhere a banner renders —
  the same fallback the task specified for forge/heart specifically,
  applied to all seven since none of the five "existing" ones actually
  do. Swapping in the real photos later is a one-line change per kind;
  nothing else about the preset shape moves.
- **`src/lib/store/presets.ts`** (new): one entry per kind (pillow, hand,
  wheel, field, hearth, forge, heart) — accent colour, title, promise
  line, description, chips, button text, `bannerImage`. Copy and chips
  for pillow/hand/wheel/field/hearth straight from spec-storefronts.md
  §4a's table; forge/heart were marked `(to write)` there, so drafted in
  the same short style — disclosed as drafted, not literal spec text.
  **Hand's chips are trades only** — Plumbers, Electricians, Mechanics,
  Builders, Carpenters — no Dentists/Doctors, per spec-wandering-doors.md
  §4's explicit note (used its slightly longer list, since presets.ts is
  described as shared between the shop preset and the door page, which
  needs the fuller version). Whisperer has no entry — deliberately, it's
  a hired service, not a shop (§1 of the doors spec). `getPreset(kind)`
  returns `null` for whisperer or anything unrecognised.
- **`StorePage.tsx`**: when `store_theme.preset` is set, renders that
  preset's banner (photo once one exists, gradient fallback today) with
  its promise line, its accent colour on the active category-chip
  button, and its chips/tagline as the fallback — `store_categories`/
  `store_tagline` still win when the shop has set its own, exactly the
  precedence spec-storefronts.md §4a states. A business with no
  `store_theme.preset` (or an unrecognised one) renders exactly as
  before today — no regression for davison's test shop, which has no
  theme set.
- **`RegisterWanderingPage.tsx`**: on successful role unlock, best-effort
  (never blocks the unlock itself) sets `store_theme.preset = <role>` on
  the user's **default** business, but only if it has no preset yet — a
  business that already picked one, or unlocked a second role later,
  keeps its first. Heart still never reaches this page (unchanged, its
  own `/tribal-hearts` onboarding).
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-sowing-forms.md: /sow/book, the third live sowing form)

Built `/sow/book` on the same `/sow/art` / `/sow/music` single-track
pattern. Three schema/dependency checks done live before writing page
code, two came back already-satisfied:

- `products.kind`'s CHECK already allowed `'ebook'` (added by the
  service-seeds migration) — the task's own "add if missing" was
  correctly hedged; confirmed live, no migration needed.
- `seed-previews` already allowed `image/jpeg` (added building `/sow/art`)
  — also already satisfied.
- `premium-room` did **not** allow EPUB's MIME type
  (`application/epub+zip`) — genuinely missing, fixed live
  (`20260829220000_sow-book-schema.sql`) before any EPUB upload could
  have worked.
- `pdfjs-dist` was not a dependency — added (`^6.3.289`). Verified the
  Vite `?url` worker-import pattern actually resolves by running a real
  production build (not just `tsc`), since a pdf.js worker
  misconfiguration is exactly the kind of thing type-checking can't
  catch — it built clean, and `SowBookPage` is its own lazy-loaded chunk
  (~495KB, pdfjs-dist included), so the ~2MB `react-pdf.browser` chunk
  pdfjs-dist depends on only loads for a visitor who actually opens
  `/sow/book`, never anywhere else.
- **`type: 'ebook'`, not `'document'`** — spec-sowing-forms.md's own
  table says `type document`, but live data, `sowerContent.ts`,
  `CatalogTab.tsx` and others already branch on `type === 'ebook'`
  throughout the app; `'ebook'` is also the value the `kind` CHECK (and
  `LibraryUploadForm.tsx`, a *different* table's old ebook form —
  `s2g_library_items`, confirmed not what this build writes to) already
  settled on. Used `'ebook'` for both `type` and `kind` to match the
  ecosystem that already exists, not the spec table's shorthand label.
- `SeedDropZone.tsx` gained the missing 50MB ceiling for `kind='document'`
  (audio and image already had one; document didn't).
- **Required pieces, fixed order**: file (PDF or EPUB, `SeedDropZone
  kind="document"`), cover (`CoverDropZone`, required, same as music),
  title, price, category, description.
- **Preview**: PDF renders its first up-to-3 pages to 1200px JPEGs,
  **no watermark** (unlike art's watermarked preview — the task was
  explicit these are meant to actually be read, not just previewed),
  client-side via `pdfjs-dist` (new `src/lib/media/generatePdfPreview.ts`),
  uploaded to `seed-previews` as `page-1.jpg`…`page-3.jpg`, stored as
  `metadata.preview_pages` with `preview_url` = page 1. The real page
  count from pdf.js (not a heuristic) auto-fills the "page count"
  More-options field. EPUB gets no page preview — `preview_pages` stays
  unset and `preview_url` stays null; the cover (already shown) is what
  stands in for a preview, per the task's own "for EPUB, use the cover."
  Generation is eager (right after upload, same timing as art's
  watermark) and non-blocking on failure — same reasoning as every other
  preview step in this whole build: the real file already uploaded fine.
  `file_url` (the real upload, `premium-room`, private) stays gated
  behind `get-seed-file` regardless of format.
- More options (never block Plant): author, page count (auto from the
  PDF, still editable — an EPUB has no auto-source, sower fills it in by
  hand), language, ISBN, whisperer %, tags, explicit. Books field
  (spec-books.md §4) — identical pattern to music/art's, hidden with one
  business.
- **Detail page**: no dedicated single-ebook `products` detail route
  exists (`/sower-library/:mode` and `/my-s2g-library` are both list
  pages, not per-item detail; `BooksCatalogItemPage` is the
  bookkeeping-catalog feature, unrelated) — confirmed, then reused
  `BulkProductDetailPage.tsx` exactly like art. Its full-res/entitlement
  logic (added for art) is now `['art', 'ebook'].includes(product.type)`
  instead of art-only; a new swipeable strip (the same horizontal-scroll-
  snap pattern the page's own "Related" row already uses) shows
  `metadata.preview_pages` to non-buyers only — an entitled viewer (owner
  or completed buyer) sees the Download button instead, not both. Every
  other product type on this shared page is unaffected.
- **`/sow` chooser**: Books card flipped to `live: true`, routed to
  `/sow/book`. `/sow/classic` still handles Physical/Field/Forge's
  "coming soon" cards.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (Heart is matchmaking, not a service seed)

**No "updated" `spec-service-seeds.md` was actually available** — checked
Downloads, same two files as when it was first copied in
(`spec-service-seeds.md`/`spec-service-seeds(1).md`, both unchanged since
then), no newer variant. The committed spec still describes a Heart seed
form in §4/§5. Proceeded anyway since the instruction itself was fully
self-contained and unambiguous — not guessing at anything, just
implementing exactly what was asked; the spec file itself was **not**
edited to match (should be, once a real updated copy exists to bring in).
`heart-banner.jpg` was also not present in Downloads — skipped per the
instruction's own "if present."

- **`products.kind` CHECK**: confirmed live first — 0 rows used
  `kind = 'heart'` — then dropped it from the vocabulary
  (`20260829230000_remove-heart-service-seed.sql`; now `music | ebook |
  art | hand | wheel | pillow`).
- **`SowChooserPage.tsx`**: Heart removed from `SERVICES`/`ServiceKind`
  entirely (no more role-unlock check, no `/sow/heart`). New standalone
  `HEART_CARD`, labelled **"Find your Heart"**, always routes straight to
  `/tribal-hearts` — rendered in the same "Services & time" row so it's
  still where a member would look for it, but as a plain, always-live
  link rather than a role-gated tile. The page's own `wandering_roles`
  lookup effect and `chooseService()` both lost the now-dead
  `tribal_hearts_profiles` branch that existed only for Heart.
- **`presets.ts`**: `'heart'` removed from `WanderingKind`, `PRESETS`,
  and `WANDERING_KINDS` — Heart never gets a shop preset (it's not a
  shop), joining Whisperer as the two Wandering concepts with none.
- **`WanderingDirectoryPage.jsx`**: Heart cards already linked to
  `/tribal-hearts` — true since the very first build of this page, not
  something that needed changing; confirmed unchanged.
- **Learn & Share**: "Become a Wandering Heart"'s description ("How to
  offer care & community support" — a service framing) fixed to "Set up
  your Tribal Hearts profile so singles in the tribe can find and connect
  with you", matching "Find a Wandering Heart"'s existing matchmaking
  framing right next to it.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-sowing-forms.md: /sow/product, the fourth live sowing form)

Built `/sow/product` on the `/sow/art` single-track pattern, no
`SeedDropZone` at all — a physical seed has nothing digital to gate, so
there's no `file_url` and no `preview_url`, per the task.

- **First check, `products.stock` vs `products.stock_qty`**: both existed
  live, both 100% empty (0/58 populated), zero conflicts anywhere — the
  "migrate" step was a no-op. Kept `stock` (it's what the storefronts spec
  and the new `(company_id, sku)` index are built around), dropped
  `stock_qty` (`20260829240000_sow-product-schema.sql`). Fixed every
  reader first, before dropping the column: 5 spots in
  `BulkProductDetailPage.tsx` (JSON-LD availability, the "Out of stock"
  badge, "Add to basket"'s disabled condition, the "N in stock" text) and
  1 writer in `BulkUploadWizardPage.tsx` (line 576 insert mapping). The
  wizard's own internal CSV-column-mapping key is still called
  `stock_qty` in a few places — that's the wizard's own vocabulary for a
  spreadsheet header, unrelated to the DB column, left alone.
- **`type`**: the one legacy physical-goods row ("coffee mugs x6") has
  `type = 'product'` — confirmed live, used unchanged. `kind = 'product'`
  added to the CHECK vocabulary (now `music | ebook | art | hand | wheel
  | pillow | product`) in the same migration.
- **Required pieces, fixed order**: photo (`CoverDropZone`, 10MB, already
  built-in — no change needed there), title, price, category, stock,
  description. Stock is the one piece with a "blank is a valid final
  value but doesn't count as done" rule: `stock: number | null` state,
  the puzzle only counts it complete once the sower has typed an explicit
  number — including 0 ("out of stock") — never on blank ("not tracked").
- **Photo**: goes straight to `cover_image_url` and as the first entry in
  `image_urls` (matching how `BulkProductDetailPage.tsx`'s gallery only
  falls back to `cover_image_url` when `image_urls` is empty — same
  pattern art already established).
- **More options (never block Plant)**: sku (unique per business — the
  existing `(company_id, sku)` partial index catches a duplicate; the
  catch block checks for Postgres's `23505` and shows "That SKU is
  already used by another item in this business — pick a different one."
  instead of the raw error), up to 5 more photos (a small inline
  uploader, not a new shared component — reuses the same crop-to-square-
  JPEG-then-upload logic `CoverDropZone` uses internally, uploaded to
  `premium-room` under `covers/{user.id}/extra-*.jpg` so they get the
  same public-read carve-out the main cover already relies on — confirmed
  live in the storage policies before building this), weight/size (free
  text), fulfilment note (prefilled `"Collect from {business's
  collect_address}"` once the selected business is known, editable —
  never overwrites a note the sower already typed), whisperer %, tags.
  Books field — identical pattern to every other `/sow/*` form, hidden
  with one business.
- **Detail page**: `BulkProductDetailPage.tsx` already handled physical
  goods before this task (stock badge, basket) — verified, not changed,
  beyond the stock/stock_qty fix above: stock badge and "Out of stock"
  read `product.stock`, "Add to basket" disables at 0, and the
  full-res-download button's `['art', 'ebook'].includes(product.type)`
  guard already excludes `'product'` by construction.
- **`/sow` chooser**: added a "Physical product" card to the "Produce &
  goods" group (alongside the still-`live: false` Field/Forge
  placeholders) rather than "Creations" — "Produce & goods" is literally
  "goods", and Field/Forge are specific not-yet-built subtypes of
  physical goods, so Physical product reads as the general one that's
  ready now. Routes to `/sow/product`, `live: true`.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-sowing-forms.md: /sow/product revised — Field/Hearth/Forge/General, Hearth corrected)

**Hearth is home-made goods (crafts, cakes, jams, chutneys), not
"Creations"** — the previous session's chooser wiring never touched
Hearth, but Learn & Share's "Become a Hearth Creator" copy did say "How to
list music, art, books & creations", which is the wrong framing; fixed to
"How to list your home-made goods — crafts, baked goods, preserves &
more."

- **First check, re-verified live**: only `products.stock` exists —
  `stock_qty` was already dropped in the prior `/sow/product` task
  (`20260829240000_sow-product-schema.sql`). Nothing to migrate this
  time; confirmed rather than assumed.
- **`products.kind` CHECK** gains `field`, `hearth`, `forge` alongside the
  existing `product` (`20260829250000_sow-product-goods-kinds.sql`) — now
  `music | ebook | art | hand | wheel | pillow | product | field | hearth
  | forge`. `type` stays `'product'` for all four — only `kind` carries
  the Field/Hearth/Forge/General distinction, since `type` still matches
  the one legacy physical-goods row and everything downstream
  (`BulkProductDetailPage.tsx`'s download-button exclusion, the JSON-LD
  block) keys off `type`, unaffected by this change.
- **`/sow/product`** gained a "What kind of goods?" tile row above the
  required pieces — Field / Hearth / Forge / General, preselected from
  `?kind=` in the URL (falls back to General/`product` if missing or
  unrecognised). Category becomes kind-dependent: Field/Hearth/Forge each
  get their own fixed `OnePicker` list (vegetables/fruit/eggs/dairy/
  meat/honey/plants; baked goods/preserves/crafts/candles/soap/clothing;
  metalwork/woodwork/leather/repairs/custom), General stays free text.
  Switching kind resets the category choice, since a value from one
  kind's list wouldn't make sense under another's. Banner heading/subtext
  also vary by kind ("Sow from the field/hearth/forge" vs "Sow physical
  goods").
- **Forge-only field**: "Made to order — lead time (days)" in More
  options, `metadata.lead_time_days` when set, never blocks Plant like
  every other More-options field.
- **`/sow` chooser**: "Produce & goods" row is Field · Hearth · Forge ·
  Physical product, all `live: true`, each routing to
  `/sow/product?kind=<field|hearth|forge|product>` (revised again the
  same day — Physical product had briefly been chooser-only-via-
  `/sow/classic`; put back as the row's fourth, explicit tile per this
  task's own instruction). `/sow/classic`'s own "Physical product" tile
  still also routes to `/sow/product` (no `?kind=`, defaults to General)
  as a second path to the same form.
- **Detail page**: `BulkProductDetailPage.tsx` needed no changes — stock
  badge/"Out of stock"/basket-disable all read `product.stock` (fixed the
  prior task), and the download button's `['art', 'ebook'].includes(
  product.type)` guard already excludes every physical-goods kind, since
  `type` is `'product'` for all of them.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-service-seeds.md §5: /sow/hand, the first service seed)

Built `/sow/hand` on the `/sow/product` pattern — same layout, SeedPuzzle
+ SeedPreviewCard, More options never blocking Plant, Books field with
>1 business, company_id on insert, confetti → detail page.

- **Role gate**: the chooser only links here once `wandering_roles` has
  an active `hand` row for the viewer, but a bookmark or typed URL can
  reach the page directly — added a page-level guard querying
  `wandering_roles` on mount, redirecting to `/register-wandering?
  role=hand` (replace, not push) if missing/inactive. `base_town` from
  that row feeds the service-area copy and gets copied into
  `service_details.base_town` at insert (never re-typed).
- **Schema**: `products.type` CHECK gained `'service'` (`kind='hand'`
  already allowed from the earlier service-seeds migration).
  `get_my_dashboard_content()` — the RPC My Garden's `useMyContent` reads
  — never selected `kind`/`price`/`service_details` at all; needed a
  drop+recreate (return-type change, not a bare `CREATE OR REPLACE`) to
  add those three, so My Garden could tell a Hand seed apart from every
  other product and show its rate. Both changes:
  `20260829260000_sow-hand-schema.sql`.
- **Required pieces, fixed order**: photo (`CoverDropZone`), title,
  category (`OnePicker` — plumbing/electrical/mechanic/building/
  carpentry/welding/gardening/cleaning/IT-repairs/tutoring/other, "other"
  reveals a free-text field whose value becomes the stored category),
  rate (amount + a unit `Select` — per hour / per job / call-out fee +
  quote), service area (`RadioGroup` — "I come to you within N km of
  {base_town}", N defaulting to 30 and editable, or "You come to me"),
  description. Service area counts as satisfied from the start (it
  always has a complete default state), unlike `/sow/product`'s stock
  field which deliberately requires an explicit touch.
- **No `PriceWithSplit`** — Hand's own spec text never mentions a Free
  option (unlike the old, now-removed Heart spec text), so rate is a
  bespoke amount+unit pair rather than reusing the shared Price
  component's Free toggle; still calls `priceBreakdown()` for the live
  split line, per spec-sowing-forms.md's "never a second copy of the
  maths" rule.
- **No `file_url`, no `preview_url`** — a Hand seed has nothing digital
  to gate. `price` = the rate amount; `service_details` carries
  `rate_unit`, `area_mode`, `radius_km`, `base_town`.
- **More options**: availability days (`ToggleGroup`, Mon–Sun →
  `service_details.availability_days`), years of experience
  (`service_details.years_experience`), tools & equipment supplied
  toggle (`service_details.tools_supplied`), up to 5 more photos (same
  inline crop-and-upload-to-`premium-room`-`covers/` pattern as
  `/sow/product`), whisperer %, tags.
- **Detail page — built new, not reused**: `/seed/hand/:id`
  (`HandSeedDetailPage.tsx`), not `BulkProductDetailPage.tsx`. Reasoning:
  a Hand seed is booked, not bought — no basket, no download, a
  rate+unit instead of a price, a service area instead of stock —
  different enough that bolting it onto the generic product page would
  mean threading service-only branches through code that already carries
  art/ebook/physical-goods logic for a shared page with no service
  concept at all today. Shows photo, title, category badge, rate
  ("$X per hour" etc.), service area, availability (if set), a static
  "🤲 Wandering Hand" badge, and a **disabled** "Request booking —
  Bookings coming soon" button — spec-service-seeds.md §7/step 4 wires
  it up once the booking purchase kind exists. No Add to basket, no
  download button, by construction (this page never had either).
- **`/sow` chooser**: Hand card was already wired (`live: true,
  service: 'hand', route: '/sow/hand'`) from the earlier service-seeds
  build — confirmed, not changed.
- **My Garden kind filter row** (spec §8): `useMyContent`'s `seeds`
  bucket previously pooled every non-music/non-book product kind
  together (art, general goods, field/hearth/forge, and now hand) plus
  the legacy `seeds` table — split apart in `MyOrchardsPage.jsx` (the
  page titled "My Garden") using the `kind` now available on each row:
  new Art / Goods / Hand / Wheel / Pillow sections alongside the
  existing Seeds / Music / Books / Orchards / Videos ones, each
  filterable from the category dropdown. Wheel/Pillow sections render
  (always empty for now, "aren't open yet") rather than being hidden,
  matching how every other always-visible section on this page already
  behaves rather than special-casing not-yet-live kinds. `buildSeedCard`
  (`seedCardBuilders.js`) shows a Hand card's rate ("$X per hour") as its
  subtitle instead of the generic description/category text, and links
  it to `/seed/hand/:id` instead of the legacy `/seed/:id` route — the
  only card slot available for a price/rate at all in this shared card
  component. Scoped to exactly what's needed for Hand today; Wheel/
  Pillow slot into the same `KIND_CARD_META`/section pattern the moment
  those forms exist, no further plumbing required.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (Heart tile removed from /sow; Field/Hearth/Forge moved from seed kind to business kind)

Two separate, quick-succession corrections.

**"Find your Heart" removed from the `/sow` chooser** — Wandering Hearts
is the dating feature with its own Dashboard tile; it was never a seed to
sow, and having a tile here (even one that just redirected to
`/tribal-hearts`) implied otherwise. `SowChooserPage.tsx`'s "Services &
time" row is Hand · Wheel · Pillow only now; the `HEART_CARD` constant
and its render are gone.

**Field / Hearth / Forge are business types, not seed kinds** —
corrected the same day's earlier work (`/sow/product`'s "What kind of
goods?" tile picker, and spec-service-seeds.md §3 describing it that
way). A farmer is a Field business; everything they sow inherits it,
the same way a Hand/Wheel/Pillow role belongs to a *person*, not a seed.

- **Schema**: `companies.kind text` (nullable, CHECK
  `field|hearth|forge|shop`) — `20260829270000_companies-kind.sql`.
- **New `src/lib/store/businessKind.ts`**: `BUSINESS_KIND_OPTIONS`
  (label + one-line description per kind, shared by both UIs below),
  `productKindForBusinessKind()` (`shop` → `'product'`, everything else
  passes through), and `saveBusinessKind(companyId, kind)` — the one
  place that writes `companies.kind`, also defaulting
  `store_theme.preset` to match *if the business has no preset yet*
  (same "only if unset" rule `RegisterWanderingPage.tsx` already used
  for role unlock — this is that same behaviour, generalized into a
  shared helper both paths below now call).
- **Profile → My businesses** (`MyBusinessesSection.tsx`): a "What kind
  of business?" picker (Field — smallholdings & farms supplying the
  community; Hearth — home-owned business; Forge — factory/workshop;
  Shop — general stock) on both Add a business and each existing card,
  optional at creation (not forced), editable any time via `save()`.
- **`presets.ts`**: new `shop` preset — deliberately titled just "Shop",
  not "Wandering Shop" (unlike the other three), since Shop is the
  neutral/general business kind, not a specific trade identity like
  Field/Hearth/Forge. Neutral grey accent, "Everything under one roof."
  `WanderingKind`/`WANDERING_KINDS` both gained `'shop'`.
- **`/sow/product`**: the tile picker is gone. Kind now resolves as
  `?kind=` override → the selected business's own `companies.kind` →
  (if neither) a one-time inline picker shown above the rest of the
  form, using the same `BUSINESS_KIND_OPTIONS`. Choosing there doesn't
  touch the business until **Plant**, when `saveBusinessKind()` commits
  it — never re-asked after that for the same business. Switching the
  Books-field business (More options) re-evaluates kind and resets the
  not-yet-saved choice and the category, since a category from one
  kind's list wouldn't make sense under another's. Category rendering,
  the Forge-only lead-time field, and the banner copy all now key off
  the *resolved* kind instead of a user-toggled tile state.
- **`/sow` chooser**: "Produce & goods" collapsed to one card, "Product"
  → `/sow/product` (no `?kind=`) — the form itself now figures out the
  kind from the business, so the chooser doesn't need to ask.
- **`StorePage.tsx`**: a breadcrumb above the shop name — "Wandering
  Field › {shop}" (or Hearth/Forge/Shop) — reading `companies.kind`
  directly via `getPreset(store.kind)`, kept deliberately separate from
  the existing `preset` variable (`store_theme.preset`, which drives the
  banner/accent/chips and could in principle diverge from `kind` later
  via Edit shop, even though no such override UI exists yet). Only
  renders when a preset exists for the kind — a business with no kind
  set shows no breadcrumb.
- **Specs updated to match**: spec-service-seeds.md §3 (Produce & goods
  is one card now; kind lives on `companies.kind`; also dropped the
  stray "Heart → /tribal-hearts" mention from the Services & time line,
  since there's no Heart tile at all anymore) and spec-storefronts.md
  §4a (new `shop` preset row; a paragraph recording that kind lives on
  the business, with `hand`/`wheel`/`pillow` explicitly called out as
  staying role-based since those belong to a person, not a business).
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-service-seeds.md §7: booking steps 1-2, no payment)

Built the request → accept/decline round trip and its 24h auto-expiry.
Step 3 (Pay button → PayPal) and step 4 (finalize messages + booking
confirmation card) are explicitly not this task — the accept response's
Pay button is wired disabled ("Payment next").

- **Schema**: new `bookings` table (`product_id, grower_user_id,
  sower_user_id, company_id, status, starts_at, ends_at, quantity,
  rate_unit, amount, s2g_fee, total, note`, `expires_at` defaulting to
  `created_at + 24h`) — `20260829280000_bookings.sql`. RLS: grower/sower
  read their own rows, grower inserts, sower updates (status). A partial
  index on `(expires_at) where status = 'requested'` backs the cron
  query. Same migration adds `expire_bookings()` (marks overdue
  `requested` rows `expired`, posts one notification message per booking
  into the existing grower↔sower direct room — both see it, since
  `get_or_create_direct_room` already adds both as participants) and
  schedules it via `invoke_money_job('expire-bookings')` every 15
  minutes, the exact same thin-wrapper-RPC pattern `expire-stale-orders`
  already established.
- **New edge function `expire-bookings`** — byte-for-byte the same
  auth/shape as `expire-stale-orders` (CRON_SECRET / service-role /
  admin session), just calling `expire_bookings()` instead. Deployed
  live via the Supabase CLI (`supabase functions deploy expire-bookings
  --no-verify-jwt`), `config.toml` updated to match (`verify_jwt =
  false`, same as its sibling).
- **No new edge function for create/accept/decline** — considered one
  (mirroring `verify-chatapp`'s "action button calls a function"
  pattern), but `chat_messages`' own RLS already allows a participant to
  insert a message as themselves in a room they belong to, and
  `bookings`' RLS already scopes insert-as-grower / update-as-sower
  correctly — so both the request and the response are plain,
  RLS-guarded client-side writes, consistent with how every `/sow/*`
  form this session has worked. The accept/decline UPDATE carries
  `.eq('status', 'requested')` as a guard, so a click that loses a race
  against the 15-min expiry cron fails cleanly (a toast, not a wrong
  state) instead of resurrecting an already-expired booking.
- **`HandSeedDetailPage.tsx`**: "Request booking" now opens a bottom
  Sheet — date, time, quantity (hidden entirely for `callout_quote`,
  since a call-out is a flat fee, not rate × quantity; labelled Hours or
  Jobs otherwise, per `rate_unit`), an optional note, and a live total
  via `priceBreakdown()` (rate × quantity, then 15% on top — the exact
  same split every other seed's price uses). Submitting inserts the
  `bookings` row, opens/reuses the direct room
  (`get_or_create_direct_room`), and posts a `booking_request` message.
  Guards against booking your own seed and against a missing sower id.
- **Chat**: two new message types, rendered as full custom cards exactly
  like `bestowal_receipt`/`purchase_delivery` do (keyed off
  `message.message_type`, not the inline-addition pattern
  `verification`/`credential_verification` use) —
  `src/components/chat/BookingRequestMessage.tsx` (details + total,
  Accept/Decline buttons shown only to the non-sender — i.e. the sower —
  and only while a **live** re-fetch of the booking's own status still
  reads `requested`, so a stale card from before an expiry or another
  device's response doesn't offer buttons that would just fail) and
  `BookingResponseMessage.tsx` (the sower's decision, Accept's Pay button
  disabled with "Payment next"). Wired into `ChatMessage.jsx` alongside
  the existing two custom types.
- **Dashboard Unread tile — verified, no change needed.** Read
  `DashboardTribeStats.tsx`'s unread count first: it's already fully
  generic (`chat_messages` in any room the viewer participates in,
  `sender_id IS DISTINCT FROM me`, `created_at > last_read_at` — no
  `message_type` filter at all), and `get_or_create_direct_room` already
  adds both grower and sower as participants. Booking messages are
  ordinary `chat_messages` rows in that same room, so they were already
  going to be counted correctly the moment they existed — confirmed by
  reading the query, not assumed.
- `npx tsc --noEmit` and `npx eslint` both clean.

## Fixed — 2026-08-29, still later (spec-service-seeds.md §7 step 3: booking payment, wired per the prior report's recommendation)

Smallest change set, exactly as recommended: `bookings` stays lightweight
(3 new columns only), the real financial record is ONE `product_bestowals`
row inserted at finalize — so payout, `sower_earnings_v` and
`release-escrow` need zero changes to also cover a paid booking.

- **Schema**: `bookings` gains `provider`, `provider_order_id`,
  `payment_reference` (all nullable text) —
  `20260829290000_bookings-paypal-columns.sql`.
- **New `create-booking-paypal-order`**: input `bookingId`; checks caller
  === `grower_user_id` and `status === 'accepted'`; re-reads
  amount/s2g_fee/total from the `bookings` row itself (never trusts a
  client-submitted amount); creates the PayPal order
  (`custom_id: "booking:<id>"`, `return_url` →
  `/payment-success?booking=<id>`); writes `provider`/`provider_order_id`
  back. Deployed, `verify_jwt = false` in `config.toml` (matches every
  sibling create-*-order function — auth is checked manually inside, same
  pattern as `create-basket-bestowal-order`).
  - **Known, disclosed gap**: every other `create-*-order` function runs
    its buyer total through `computeBuyerFee` so the buyer (not the
    sower) absorbs PayPal's processor cut — this one doesn't. The order
    amount is exactly `bookings.total`, no processor fee layered on top,
    since `bookings` has no `processor_fee` column and adding one wasn't
    part of this change set's explicit column list. Flagged, not silently
    decided — worth a follow-up if parity with the other payment paths
    matters here.
- **`paypal-webhook`**: `parseCustomId` gains the `booking:` prefix.
  `markProcessing`/`markFailed` both get a `case "booking"` that's a
  deliberate no-op (with a comment explaining why) — `bookings.status`'s
  CHECK constraint has no `'processing'` or `'failed'` value (it's
  `requested|accepted|declined|expired|paid|cancelled`, carrying the
  pre-payment accept/decline lifecycle that no other table's status
  column does). A payment-pending booking just sits at `'accepted'`
  through the whole window; a failed/denied capture leaves it there too,
  so the grower can simply retry Pay.
- **`_shared/paypal/capture.ts`**: `PaypalOrderKind` gains `'booking'`;
  `finalize()` gets `case "booking"` → new `finalizeBooking()`. Locks via
  a plain select + `status === 'paid'` short-circuit (same non-SQL-lock
  idempotency pattern `finalizeBestowal` already uses for gift/orchard,
  not a real `FOR UPDATE` — accepted here for the same reason: webhook
  dedup already prevents most double-delivery, and this only runs once
  ever per booking in practice). Resolves a whisperer exactly like
  `finalize_basket_order` does (`resolve_whisperer_by_ref_code`, share
  taken out of the sower's base) — **currently always resolves to "no
  whisperer"** since `/sow/hand`'s booking Sheet never captures a
  ref_code or live_session_id today; implemented for parity anyway, so
  the moment that capture exists this path already handles it correctly
  with no further change. Inserts ONE `product_bestowals` row:
  `amount = booking.total` (**not** `booking.amount` — see the
  column-name trap noted in both files' comments: `bookings.amount` is
  the sower's pre-fee base, `product_bestowals.amount` is the buyer-paid
  gross, same name opposite meaning), `delivery_type: null` so it
  releases immediately (a service has nothing to physically hold in
  escrow). Then sets `bookings.status = 'paid'`,
  `payment_reference = <PayPal capture id>`. Whisperer bookkeeping
  (`whisperer_earnings`, `whisperer_conversions`, the referral-link/
  assignment running totals) mirrors `finalize_basket_order`'s inserts,
  read-then-write instead of SQL's `+= 1` since the JS client has no
  increment operator. **Not mirrored**: `finalize_basket_order`'s
  `escrow_events` audit-log insert — skipped deliberately, out of the
  requested scope, and not very meaningful for a row that's always
  `released` immediately anyway.
- **`capture-paypal-order`**: `BodySchema`/`KIND_CONFIG` gain `'booking'`
  (`table: 'bookings', ownerColumn: 'grower_user_id', doneValues:
  ['paid']`) — its generic column-selection branch already worked
  unchanged, since `bookings` now has real `provider`/`provider_order_id`
  columns like every other table it handles.
- **`PaymentSuccessPage.tsx`**: reads `?booking=`; `isOrderDone` now
  treats `status === 'paid'` as booking's terminal-success value (every
  other kind uses `'completed'` — bookings' status column doubles as the
  pre-payment lifecycle tracker, so it never gets a `'completed'` value
  at all). `processorFeeColumn` is nullable (booking has none); the
  Distribution Overview block needed no new branch — with
  `processorFee` reading `0`, `backOutFee(booking.total)` already
  recovers the right platform-fee/sower-share split, since
  `bookings.total` is fee-inclusive by construction. Booking-specific
  copy ("Booking Paid!", a "See the confirmation in chat" button →
  `/chatapp` instead of `/my-seeds`).
- **`reconcile-paypal-orders`**: `collectTargets()` sweeps `bookings`
  where `provider='paypal', status='accepted'` (not
  pending/processing — see the no-`'processing'`-value note above).
  Found and fixed a real bug before it could fire: the existing
  mark-failed code paths wrote `status: 'failed'` directly, which would
  have violated `bookings.status`'s CHECK constraint the first time a
  booking's PayPal order genuinely went stale — added a `markOrderFailed`
  helper that no-ops (with a warning log) for booking specifically,
  leaving it at `'accepted'` for retry, same choice `paypal-webhook`'s
  `markFailed` already made.
- **`_shared/postFinalize/messaging.ts`**: `FinalizeMessagingKind` gains
  `'booking'`; `deliverFinalizeMessages` routes it to new
  `postBookingConfirmation()` (same special-case pattern `topup` already
  uses) — reopens the SAME grower↔sower direct room the request/accept
  messages used (`get_or_create_direct_room` is idempotent), posts the
  sower thank-you (their own `bestowal_thank_you_message` if set) + the
  platform thank-you + a `booking_confirmed` card (product title,
  date/time, quantity, total). No download receipt — nothing to
  download for a service. Idempotent: checks for an existing
  `booking_confirmed` message carrying this `booking_id` first.
- **New `BookingConfirmedMessage.tsx`** + wired into `ChatMessage.jsx`
  alongside the other three booking message types, same full-card
  pattern as `BestowalReceiptMessage`/`PurchaseDeliveryMessage`.
- **`_shared/postFinalize/books.ts`**: `BooksSyncKind` gains `'booking'`;
  new `syncBooking()` — since `bookings` has no direct FK to the
  `product_bestowals` row `finalizeBooking` created, looks it up by
  `(product_id, bestower_id, payment_reference)` — the same
  `payment_reference` value both rows carry — then syncs from THAT row,
  `source_table='product_bestowals'` (never `'bookings'`), matching
  exactly what `syncBasketOrder` would have written had this gone
  through the basket path. Can't double-count against a real basket
  purchase (or against itself on a re-run) since both are the same
  upsert-by-`(source_table, source_id)` key.
- **`BookingResponseMessage.tsx`**: Accept's Pay button is now real —
  live-fetches the booking's current `status`/`grower_user_id` on mount
  (the message's own frozen `system_metadata` only has `decision`/
  `total`/`product_title`), shows the button enabled only for the
  grower while `status === 'accepted'`, disabled with "Payment next" for
  the sower's own view of the same message, and a "✓ Paid" state once
  `status === 'paid'`. Uses `invokePaymentFunction` (the same
  retry-once, real-status-surfacing wrapper every other payment call
  site uses), not a raw `supabase.functions.invoke`.
- **Deployed live** via the Supabase CLI (Docker wasn't running — CLI
  falls back to a plain asset upload, same as every other function
  deployed this session): `create-booking-paypal-order` (new),
  `paypal-webhook`, `capture-paypal-order`, `reconcile-paypal-orders`
  (redeployed — all three bundle the changed `_shared/paypal/capture.ts`
  / `_shared/postFinalize/{messaging,books}.ts` at deploy time, confirmed
  from each deploy's own "Uploading asset" log).
- `npx tsc --noEmit` and `npx eslint` both clean.

## Open — priority order

1. ~~Live proof that `paypal-webhook` actually works now~~ — **resolved, see Keystone problem**: order `0a6a0b1a` finalized via a clean webhook call at 08:36 UTC 2026-08-29. The `processed_webhooks`-insert bug (separate from the webhook itself) is also fixed; watch for its first real row as confirmation the fix landed, not as proof the webhook works — that's already established.
2. **Unified payout system deployed, not yet exercised end-to-end.** `payout-earnings`, `paypal-connect`, and the rewritten `paypal-webhook` payouts-item handling are all live; migrations applied; PayPal's side (Log-in-with-PayPal enabled, return URL registered) confirmed by the user. Nothing has actually gone through the flow yet: no one has connected PayPal via the new OAuth flow, and the last `dry_run:true` preview showed a $8.00 float across 3 recipients, all skipped on the $20 minimum alone (davison $2, Ed $2, Rodney $4) — so even a first real Friday run may pay no one until balances grow. Not published to the live frontend yet either.
3. **Resend's sending domain (`sow2grow.online`) is unverified**, confirmed live via a real send attempt (403 from Resend). No longer blocks payouts (notifications moved to chat), but still blocks every *other* `send-resend-email` caller — check whether the actually-verified domain in the Resend dashboard is `sow2growapp.com` instead (the live app's real domain) rather than the `.online` one hardcoded in `ALLOWED_FROM`.
4. **PayPal capture-gap fix not yet proven live** — `36a92086`/`17778af9`/`1a3d7f60`/`fba8e113` fix content/gift/orchard/topup PayPal orders never being captured, but none of it has been exercised against a real PayPal payment yet. See "PayPal integration" below for what to test and where.
5. **Reconciliation poller** — not built yet. Needed so a bestowal can self-heal by polling NOWPayments' own payment-status API instead of depending solely on IPN delivery. Explicitly deferred by request ("I'll ask for that separately") — do not start without being asked.
6. **`PublicMusicLibrary.tsx` deletion decision** — confirmed dead (Vite resolves the `.jsx` sibling for the bare import in `RadioManagementPage.jsx`), still has an un-fixed hardcoded-provider call at line 213. Waiting on a decision to delete.
7. **`affiliates` CORS failure** — a plain PostgREST query from `ensureReferralCode()` occasionally returns no `Access-Control-Allow-Origin` header. Extensively tested live, could not reproduce on demand. Fails completely silently (`console.warn` only) for every caller of `useReferralCode` (`TribalAliveFeedPage`, `LivingSeedCard`, `MyTribePage`, `VideoSocialShare`, `ShareSeedDialog`). Unresolved.
8. **39 remaining pages** without a Back/Return control (10 of 49 fixed).
9. **`spec-seed-protection.md`** — Phase 0 (broken `download-album` fetch/entitlement) is done. **Phase 2 (purchase-gated `get-seed-file` for `products`/`product_bestowals`) is done as of `0ca032b2`, narrowed to product-sourced tracks only per explicit instruction** — awaiting the user's live browser confirmation (asked, not yet reported back). Phase 1 (real preview generation — a separate 45s object, both upload paths, backfill for 118+26 existing files), Phase 3's `content_purchases` half (this function is `products`-only, `content_purchases`-sourced seeds still have no gate), Phase 4 (DJ-track RLS policy fix — "DJs can view their own music tracks" grants every DJ every track, not just their own), and Phase 5 (chat delivery via the reference-not-URL pattern) not started.
10. **`get-premium-room-asset` and admin-role-check silent-error findings** — flagged during the webhook sweep, explicitly deferred ("can wait").
11. **`S2GCommunityMusicPage.tsx`'s 4th duplicate `isAlbum()` check** — flagged during consolidation, still not fixed. The file has since been touched for unrelated payment-picker/pay-currency work (`9d1a9b7d`, `4300dabb`) — the `isAlbum()` duplicate itself was not part of that and remains outstanding.
12. ~~Product-sourced track previews only play for the track's own uploader~~ — **fixed, `0ca032b2`** (see item 9).
13. **Cross-table duplicate seeds** — 4 tracks exist in both `dj_music_tracks` and `products` for the same account (DJ-track-first-then-product-later pattern), currently live in a DJ playlist with real play/vote history. No action taken; user to decide.
14. **Pay currency not unified server-side** — `DEFAULT_CRYPTO_PAY_CURRENCY` (`4300dabb`) is a client-only constant. `supabase/functions/create-wallet-topup` has its own server-side `'usdcsol'` default (already the right value, just not shared with the client one). Not touched; would need a mirrored `_shared/` Deno constant if this is ever worth centralizing further.
15. ~~Four DB migrations committed but not yet applied live~~ — **all applied, confirmed live**. `expire_stale_orders()` has been run by hand — see "Fixed" above for counts.
16. **Live confirmation of `get-seed-file` (item 9) is still pending** — `get-seed-file` has had **zero invocations, ever** (checked with no time-window filter), so Play/Download on `/music-track/50340b46-...` have not actually been exercised in a browser yet. The product itself still resolves correctly (`type='music'`, `file_url` intact) and the buyer's `product_bestowals` row is `completed`, so nothing found points to a code regression — just that the page hasn't been opened/tested since the fix shipped.
17. ~~`buyer_purchases_v` migration not yet applied live~~ — **applied live** (confirmed: table exists, `/my-seeds` reads from it, davison's real purchases from both Ed and Rodney show up correctly).
18. **Ed (`110b5a23-...`) has no `companies` row**, so `books.ts` correctly found nothing to attach his `04e5ef3a` `$2.00` income to and skipped it (by design: never auto-creates a Books workspace). **Decided: leave it for Ed to set up himself** — no auto-provisioning. Once he opens his own workspace (`/books` → "Open my books"), a `backfill-post-finalize` re-run (already idempotent/upsert-safe) will pick up this and every other historical sale automatically; nothing else to do until then.
19. ~~`trg_books_sync_gift` still exists, untouched~~ — **dropped live, same as `trg_books_sync_product_sale`** (migration `20260829160000`). `books.ts` is now the sole writer for both the `product`/basket and `bestowal`/gift-orchard sources — no remaining redundant trigger anywhere.
20. **Two orphaned functions left live, neither called by anything**: `books_sync_product_sale()` and `books_sync_gift()` — only their triggers were dropped in each case, matching exactly what was run live. Left as-is, not part of either drop decision.
21. ~~`paypal_reconcile_misses` migration not yet applied live~~ — **applied live**, confirmed (table exists).
22. **`/privacy` and `/terms` are placeholder content, not reviewed by counsel** — real enough to unblock PayPal's Log-in-with-PayPal consent screen, not vetted as an actual legal policy.
23. **`payout-sower-earnings`/`payout-whisperer-earnings`'s old crypto rails are gone, not migrated forward** — anyone who had a crypto payout method configured (e.g. davison's `solana_usdc`) now has no working payout path until they connect PayPal. Solana comes back with the native crypto spec later (explicit decision) — until then, existing crypto-configured sowers/whisperers are effectively unpaid unless they connect PayPal too. Nobody has been told this proactively.

The $10 crypto minimum (formerly a gap at 3 checkout paths) and the client-side "round up" rounding guidance (formerly flagged as having no target in this codebase) are both resolved as of `cf7413de` and `6cd23783` — see "Fixed — this session" above. The rounding guidance lives at the point of redirect (`CRYPTO_ROUNDING_NOTICE`), not as a standalone amount display, since no such display exists anywhere in `src/` — every crypto checkout opens NOWPayments' own hosted `invoiceUrl` page, which renders the actual amount and QR itself.

## PayPal integration

**One lifecycle, five kinds.** Every PayPal order — regardless of kind — goes through the same sequence:

1. A `create-*-order` function creates the row (`status`/`payment_status: 'pending'`) and a PayPal order (`intent: "CAPTURE"`, `custom_id` encoding the kind + record id), returns `approveUrl`.
2. Buyer approves on PayPal's hosted page → PayPal calls `paypal-webhook` with `CHECKOUT.ORDER.APPROVED`.
3. Webhook: idempotency check (`processed_webhooks`) → row set to `'processing'` → `captureAndFinalize()` calls PayPal's `/capture` → on a PayPal-confirmed `COMPLETED` status, runs the finalize step for that kind.
4. A second webhook event, `PAYMENT.CAPTURE.COMPLETED`, arrives independently and calls `finalizeCompletedOrder()` — safe, finalize is idempotent per kind.
5. If the buyer's browser reaches `/payment-success` before (or instead of) the webhook, `capture-paypal-order` is called from there as a recovery path — same capture-and-finalize logic, never marks anything paid without an authoritative PayPal response first.

**The five kinds and what each finalizes into:**

| kind | created by | order row | custom_id prefix | finalize | entitlement table |
|---|---|---|---|---|---|
| `basket` | `create-basket-bestowal-order` | `basket_orders` | `basket:` | RPC `finalize_basket_order` | `product_bestowals` |
| `content` | `create-content-purchase-order` | `content_purchases` | `content:` | RPC `finalize_content_purchase` | one of `s2g_library_item_access` / `premium_item_purchases` / `premium_room_access` / `live_session_media_purchases` / `music_purchases`, by `content_type` |
| `gift` | `create-gift-bestowal-order` | `bestowals` | `gift:` | `finalizeBestowal()` (capture.ts, not a DB RPC) + `dispatchPayouts()` | `bestowals` itself |
| `orchard` | `create-paypal-order` | `bestowals` | *(none — custom_id is the bare bestowal id)* | same `finalizeBestowal()` as gift | `bestowals` itself |
| `topup` | `create-wallet-topup` | `topups` | `topup:` | RPC `credit_sower_balance_from_topup` | `sower_balances` |

`gift` and `orchard` are the same table and the same finalize function — the two labels exist only because their `custom_id` shapes differ (one has a prefix, one doesn't); nothing downstream needs to tell them apart. All five finalize paths are idempotent — a `basket_orders`/`content_purchases` row locks itself and short-circuits on an already-`'completed'` status; `credit_sower_balance_from_topup` short-circuits on `credited_at` already set; `finalizeBestowal` short-circuits on `payment_status` already `'completed'`/`'distributed'`.

**Not yet done, and out of scope for this pass:** none of this has been proven against a live PayPal payment yet — the fix is code-verified (idempotency confirmed by reading every RPC, URLs confirmed by grep) but not yet exercised end-to-end. The cheapest live test recommended earlier (buy a $2 digital product via `/music-track/:id`, PayPal-only since it's under the $10 crypto floor) still applies and now actually has somewhere to land. NOWPayments code was deliberately left untouched throughout this pass — its own equivalent gaps (if any) are a separate investigation.

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

**First confirmed payment: `basket_orders` `04e5ef3a-6212-4820-86fb-3832df4fd29a`, PayPal, $2.88, completed 2026-08-28 11:39:52 UTC.** "Truth Will Mend" ($2 base), bought by `04754d57-...`. `product_bestowals` row `158ee443-107e-4f81-902c-a88fa70a2dcd`: `amount 2.30`, `s2g_fee 0.30`, `sower_amount 2.00`, `status completed`, `release_status released`. The math checks out exactly (`0.15/1.15 × 2.30 = 0.30`). This is the first real, live, end-to-end payment this codebase has ever completed.

**Original conclusion (2026-08-28): it did NOT go through `paypal-webhook`.** At the time, `processed_webhooks` was zero rows, all-time, and `paypal-webhook` was observably returning `401 invalid_signature` on real PayPal traffic, including minutes after this order completed. Given `provider='paypal'` (ruling out `nowpayments-webhook`), the only other path to `finalize_basket_order` is `capture-paypal-order` (the client-triggered recovery call from `PaymentSuccessPage.tsx`) — so the conclusion was **this payment completed entirely through the safety net, not the primary path.** That conclusion still stands for this specific order: the `401`s were positive, direct evidence of webhook failure at that time (the `paste_` prefix bug below), not an inference from the empty table.

**RESOLVED, 2026-08-29 — the PayPal front door works.** `basket_orders 0a6a0b1a-a799-4a7e-a287-249e142af78c` (created 08:35:10 UTC, completed 08:36:53.996 UTC) finalized via a clean `paypal-webhook` call at 08:36:57 — 200, no verification failure logged, timing tight enough (~3.4s) that this is confidently the webhook doing the finalize, not the safety net. Two bugs, both real, both now fixed, easy to conflate but genuinely separate:

1. **`PAYPAL_WEBHOOK_ID` had a literal `paste_` prefix** (`paste_8VB48015VP667780M`), failing PayPal's signature-verification API before any real signature check ran — this *was* the cause of the `401`s described above. Fixed 2026-08-29 06:39 UTC.
2. **`processed_webhooks` stayed at zero rows anyway, even after fix #1**, because of a completely unrelated bug: `processed_webhooks_provider_check` only ever allowed `provider IN ('binance_pay','stripe','other')` — a leftover from an earlier payment system — so every insert from `paypal-webhook` (`provider:'paypal'`) or `nowpayments-webhook` (`provider:'nowpayments'`) violated the constraint, silently, on every attempt, all session, regardless of whether the webhook itself worked. Order `0a6a0b1a` proved this: a fully successful, signature-verified `paypal-webhook` call still left no row. Fixed 2026-08-29 (migration `20260831150000`, plus both webhooks now check the insert's error and log it rather than swallowing it silently).

**The empty table was never proof the webhook was broken — it was proof the table's own insert was broken.** The two `401`s-are-real / table-is-empty facts happened to coincide and looked like one problem; they were two.

**New problem, found by this real transaction, more urgent than the above — fixed as of `0ca032b2`, live confirmation pending:** the buyer could not access what they paid for. `product_bestowals` says `completed`/`released`, but `MusicTrackDetailPage.tsx`'s `resolveMediaUrl()` could only create a signed URL on the `premium-room` bucket for the track's own uploader — a pre-existing, already-documented RLS gap (formerly Open item #10) — so `audioUrl` resolved to `null` for the actual buyer, and the UI had no download affordance at all for a product-sourced (non-`dj_track`) owned track. The buyer's screen showed: "Preview isn't available for this seed yet." plus "✓ Bestowed — thank you for supporting this sower," with no way to play or download the file. Confirmed live: `GET` on the stored `file_url` directly returned `400` (the bucket is genuinely private, not the misleading `/object/public/...` shape stored in `products.file_url` would suggest).

New `get-seed-file` edge function grants access to the caller only if they're the seed's uploader or hold a completed `product_bestowals` row for it, then mints a 60-second signed URL server-side (service role, bypasses the broken client-side RLS entirely). `MusicTrackDetailPage` now calls it for an owned product-sourced track instead of the direct client-side `createSignedUrl` that only ever worked for the uploader; Play and a new Download button both work off it. Independently verified via read-only DB checks: the buyer's `product_bestowals` row for this exact product is `completed` (the entitlement query would return `true`), and the `file_url` parses to the expected bucket/path. **Not yet verified end-to-end in a real browser session** — `get-seed-file` has had zero invocations, ever, meaning the page hasn't actually been opened since the fix shipped (see Open item #14).

**Third problem, also found by this transaction, now fixed:** the buyer also had no thank-you messages, no receipt, and an Unread count of 0 — this order finalized at 11:39 that day, before `fb7d351e`'s post-finalize messaging feature existed at all, so nothing ever triggered it. `backfill-post-finalize` (`a22273d7`) fixed this by re-running the messaging step for this specific order; all 3 messages confirmed landed via direct query (see "Fixed" above for the exact contents and room).

**2026-08-28 findings, from a live NOWPayments test payment:**

- **Root cause of the immediate symptom (identified and fixed, `5f3da38d`):** the payment landed `Partially_paid` because the buyer's exchange (VALR) could only send 2-decimal USDC while NOWPayments required 2.33057556 USDC — floating-rate invoices recompute the exact crypto amount against the live exchange rate at payment time, so a 2-decimal send will essentially always fall short of a rate that isn't fixed. NOWPayments also deducted its own fees from the merchant side on this payment: a 0.274 USDC flat "network fee" + 0.010 USDC service fee (payment's own record: `Fee paid by user: False`, `Fixed rate: False` — both now forced `true` on every future invoice via `5f3da38d`).
- **The IPN callback URL IS stored correctly on the payment.** `create-basket-bestowal-order` (and the other 4 invoice-creating functions) wire `ipn_callback_url` correctly — confirmed both by reading the code (`${SUPABASE_URL}/functions/v1/nowpayments-webhook`, Supabase's own auto-injected env var) and by inspecting the live payment record itself. The callback wiring was never the problem.
- **Reachability test (does NOT touch the webhook itself):** `curl -X POST` to the deployed `nowpayments-webhook` URL with a dummy JSON body and a deliberately invalid `x-nowpayments-sig` header returned a clean `401 {"error":"invalid_signature"}`, and the same invocation appeared in `function_edge_logs` (`POST | 401 | .../nowpayments-webhook`) at the matching timestamp. **The endpoint is fully reachable and its signature check works correctly.** This rules out infrastructure/reachability as the cause of the missing IPN.
- **Conclusion:** the gap is entirely on NOWPayments' delivery side (or IPN/account configuration), not in this codebase's routing, wiring, or the webhook function's health. For the real payment: `nowpayments-webhook` had zero invocations in `function_edge_logs` over a 4-hour window despite the linked `basket_orders` row changing status; `processed_webhooks` gained no row; the `basket_orders` row itself sat at `pending`/`Partially_paid` with `updated_at == created_at`, untouched since insert. Next diagnostic step (not started): check the invoice's live status directly via NOWPayments' own API/dashboard to see whether they consider the IPN delivered-and-failing versus never attempted. The reconciliation poller (Open #2) is the planned mitigation — polling NOWPayments' status API directly instead of depending solely on IPN delivery — but is explicitly deferred until asked for separately.

## Second incident: Ed → davison stuck PayPal payment — RESOLVED

**Basket order `1b68e18f-57d6-4600-a7e5-1cb06bd09ddf`: Ed paid davison $2.88 via PayPal on 2026-08-26 at 01:29:51 UTC (03:29:51 SAST), for "visions, dreams and riddles." PayPal's own order (`6J7987755E982320B`) shows `COMPLETED`, capture `5Y565344588152020`. Our system marked the order `expired` — days later, by the unrelated `expire_stale_orders` janitorial job, purely on age. Ed received nothing; davison's Books showed 0 sold.** As of 2026-08-28 this is fully repaired and verified — see below.

**What Ed actually did:** 4 basket-order attempts within about an hour, all PayPal, all for songs from davison. Three (`3de0d196`, `a0fa30cd`, `46f58ccf`, 23:49–23:50 UTC) have `provider_order_id: null` — the PayPal order was never even created for them (the create-order call itself failed, before ever reaching PayPal); confirmed nothing to check on PayPal's side for any of the three. The 4th, `1b68e18f` (00:58 UTC), got a real PayPal order and — 31 minutes later — a real capture. Confirmed via `check-paypal-order` (a new read-only diagnostic function, no side effects) directly against PayPal, not inferred.

**Root cause, found by trying to repair it — four independent bugs stacked on a code path nothing had ever exercised before:**

1. **`captureAndFinalize` threw on a non-422 capture error.** PayPal returns a range of error codes for a re-capture attempt on an order that's already `COMPLETED` — the code only treated the documented `422` as "check the real status before giving up"; live, PayPal returned `404`, and the old code threw immediately without ever checking. Fixed (`16d0ee4c`): always check the authoritative `GET` regardless of the capture call's error code; only throw if that GET also fails to confirm completion.
2. **`capture-paypal-order` had no path for an admin/internal caller** — only a real buyer/admin user session. Added a service-role bypass (`afe8edab`), same pattern as `backfill-post-finalize`.
3. **The actual root cause of the original 08-26 failure: `books_income`/`expenses` had no unique constraint matching two pre-existing DB triggers' `ON CONFLICT (source_table, source_id)`.** `trg_books_sync_product_sale` (on `product_bestowals`) and `trg_books_sync_gift` (on `bestowals`, orchard rows) — both discovered mid-incident, neither known about when `books.ts` was built earlier this session. The `INSERT ... ON CONFLICT` only actually runs once the sower has a `books_enabled` company — davison does, Ed (the earlier `04e5ef3a` order's sower) doesn't, which is exactly why `04e5ef3a` finalized fine and `1b68e18f` didn't. Because it's an `AFTER INSERT` trigger, the Postgres error aborted the entire `finalize_basket_order` transaction — rolling back the `product_bestowals` insert and the `basket_orders` status update, even though PayPal had already taken the money. Fixed (`34cb7012`): added the missing unique constraints. This also surfaced a second problem — the trigger and `books.ts` now both fired, disagreeing on the numbers (trigger: gross income + separate fee/whisperer expense lines; `books.ts`: net income, this session's established model) — which would have double-counted. `books.ts` initially compensated by deleting the trigger's redundant expense rows; **the user then dropped `trg_books_sync_product_sale` outright instead (`5f71b1cd`/`f470b6db`) — `books.ts` is now the sole Books writer**, and that cleanup code was removed as no-longer-needed. `trg_books_sync_gift` was initially left alone, then dropped too a turn later, same reasoning (Open #17 — now resolved); both now-orphaned functions, `books_sync_product_sale()` and `books_sync_gift()`, were left in place, only their triggers dropped (Open #18).
4. **A fourth bug in the same trigger** (`expenses.category` values `'Platform fees'`/`'Whisperer commission'` violating `expenses_category_check`'s allowed list) was found and a fix drafted, then made moot by decision 3 above — never applied, migration file removed.

**Fix, permanent:** `expire_stale_orders()` (`09a56a94`) no longer touches any `basket_orders`/`content_purchases`/`bestowals` row with `provider = 'paypal'` and a real PayPal order id (`provider_invoice_id` for `basket_orders`, `provider_order_id` for the other two). New `reconcile-paypal-orders` function sweeps every such row every 15 minutes (cron job 14, via `invoke_money_job`/`CRON_SECRET`, same pattern as `release-escrow`), checks PayPal directly, finalizes anything `COMPLETED` that never got captured, and marks a row `failed` only once PayPal *positively* confirms it isn't completed and it's past 48h — a confirmed answer, not just staleness. This is the class fix — a stuck-but-captured order should now never survive more than ~15 minutes undetected, regardless of cause.

**Repair, verified end to end:**
- `basket_orders.1b68e18f` → `status: completed`, `completed_at: 2026-08-28 15:59:19 UTC`.
- `product_bestowals.b3518c23-7ab5-4b7d-a527-eb212a96ceea` → `completed`/`released`, `amount 2.30`, `s2g_fee 0.30`, `sower_amount 2.00`.
- 3 messages landed in Ed/davison's existing room (`f49b0200-...`): sower thank-you (from davison), S2G thank-you, and a receipt reading `subtotal 2.30 + processor_fee 0.58 = buyer_total 2.88`, matching the real PayPal charge exactly.
- `books_income` row for davison: `amount 2.00`, `platform_fee 0.30`, `buyer_reference "Ed"` — the sower's real net take-home, no stray expense rows (trigger's gone, nothing to leave behind).
- Confirmed what Catalog would show (davison's session, simulated the same way as the earlier account-linking investigation, since minting a real session is still classifier-blocked): **1 sold** for "visions, dreams and riddles," `sower_amount 2.00` — exactly matching `CatalogTab.tsx`'s own query shape (`sower_earnings_v`, `source='product'`, `item_id` in his catalogued products).

## Known gotchas

- **A plain `supabase functions deploy <name>` resets `verify_jwt` to `true` for any function with no `[functions.<name>]` entry in `supabase/config.toml`** — discovered when deploying the PayPal unification reset `create-gift-bestowal-order`, `create-wallet-topup`, and the new `capture-paypal-order` from `false` to `true`, silently, with no warning. Every function actually running with `verify_jwt = false` now has an explicit `config.toml` entry (added in one pass, cross-checked against the Management API's live list) specifically so this can't happen again on a future redeploy of any of them.
- **Two music tables, easy to confuse**: `music_purchases` (`buyer_id`, `track_id` — for `dj_music_tracks` only) vs `product_bestowals` (`bestower_id`, `product_id`, `sower_id`, `amount`, `s2g_fee`, `sower_amount` — for `products` rows). Multiple bugs this session came from code querying the wrong one.
- **Lovable publish is separate from `git push`.** This is a Lovable-managed project served through Lovable's own publish pipeline (confirmed via live header inspection — Cloudflare-fronted `x-deployment-id`, no `x-vercel-id`, despite `vercel.json` existing). A push to `main` does not necessarily go live on `sow2growapp.com` until a separate Lovable "Publish" action runs. Also: Lovable's agent can push directly to this repo — pull before starting work.
- **Four pre-existing uncommitted files**, present since before this session started, not touched by any of the work above: `package.json`, `package-lock.json`, `supabase/.temp/cli-latest`, `supabase/functions/mcp/index.ts` (all modified), plus `spec-platform-fee.md` (untracked). Left alone throughout — not part of any commit in this log.
- **The Management API's `database/query` endpoint does DDL fine** — every migration from `20260830090000` onward was applied directly through it (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE FUNCTION`, `cron.schedule`/`unschedule`, all confirmed live). Earlier entries in this log describing it as "classifier-blocked" (the reason every prior migration needed a Studio SQL-editor paste instead) no longer reflect reality — something changed, or the earlier finding was wrong. `supabase db push` itself remains untested since; no reason to assume it's fixed too.
- **Secret *values* still can't be read back anywhere** — the Management API's secrets endpoints (list, and the `api-keys` one used for Supabase's own anon/service_role keys) both stayed available this session, but only ever expose names/metadata for arbitrary function secrets (`PAYPAL_WEBHOOK_ID`, `PAYPAL_PAYOUTS_ENABLED`, etc.) — never the value. Every secret fix this session (webhook ID correction) was a blind *write*, verified after the fact only by its `updated_at` timestamp or by real downstream behavior (a log line, a function response) — never by reading the value back.
- **An empty audit table can mean a broken insert, not a broken process — check the insert error.** `processed_webhooks` sat at 0 rows all session and read as damning evidence `paypal-webhook`/`nowpayments-webhook` weren't working. The real cause was a stale `CHECK` constraint on `provider` rejecting every insert from both, silently — neither function checked the insert's returned `error`. A clean, signature-verified, fully-successful webhook call still left no row. Any table whose only job is recording success is a liability if nothing checks whether the recording itself succeeded.
