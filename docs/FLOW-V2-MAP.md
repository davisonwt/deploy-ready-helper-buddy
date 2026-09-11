# Flow v2 map

Read-only design mapping, built from docs/FLOW-INVENTORY.md (175 routes) against the target flow (Login → YOUR STALL home, tribe left panel, Today/Omer/Growth/Wallet right panel, everything else merged or cut). No code changed to produce this.

**Header tap = OWNER MENU** (owner only; bottom-bar Plant Seed opens the same menu, the old top-bar "Sow a seed" button is gone): **Edit stall** (wizard — absorbs /my-products, /my-s2g-library, /profile, seller settings), **Sow a seed** (/sow + every /sow/* leaf), **Bulk upload seeds** (/dashboard/sower/upload the upload tool, plus every /bulk/* page), **My orchards** (/my-orchards, and from there /create-orchard + /edit-orchard/:orchardId) — orchards do NOT fold into Edit stall, they're their own menu item.

Every route gets exactly one call: **KEEP** (still a route, v2 destination noted), **MERGE INTO <route>** (folds into another surface, its own path goes away), or **DELETE** (dropped, not reachable at all in v2). Calls I'm not confident about are in the "Uncertain" section after the table, not hedged in the table itself — the table always commits to one answer per the brief.

**Approved**, with 13 rows flipped from DELETE to KEEP: `/premium-rooms`, `/premium-room/:id`, `/premium-room/:id/edit`, `/create-premium-room`, `/companions`, `/classroom`, `/classroom/:id`, `/classroom/:id/dashboard`, `/skilldrop`, `/skilldrop/:id`, `/prescription/submit/:sowerId`, `/my-garden/prescriptions` (all now live under **More ▾**), and `/tequfah-clock` (under **364yhvh**). The `/bulk/*` routes were NOT flipped this round — they were already KEEP from the Owner Menu correction, and are reconfirmed here as their own thing: the wholesale-selling rail, a separate business concept from stall products, not a legacy duplicate of them. Every other DELETE/MERGE call stands as written.

## Route map

### Member's own content
| Route | v2 | Reason |
|---|---|---|
| /sow | KEEP | Owner Menu → "Sow a seed" (header tap or bottom-bar Plant Seed) |
| /sow/classic | DELETE | redundant alt chooser, /sow already is the chooser |
| /sow/music | KEEP | leaf of /sow, feeds stall Music content |
| /sow/art | KEEP | leaf of /sow |
| /sow/book | KEEP | leaf of /sow, feeds stall Books/Lyrics content |
| /sow/product | KEEP | leaf of /sow, feeds stall Mugs/products content |
| /sow/hand | KEEP | leaf of /sow, services |
| /seed/hand/:id | KEEP | detail view reached from /sow/hand |
| /store/:slug | DELETE | pre-Farm-Stalls storefront concept, superseded by /stall/:username |
| /sow2grow-calendar | DELETE | orphan; calendar now lives in right-panel Today |
| /stall/build | KEEP | anchor: "Edit stall" wizard |
| /animated-orchard/:id | KEEP | orchard detail, reached from Tribal Gardens' Orchards tab |
| /create-orchard | KEEP | Owner Menu → "My orchards" → create new |
| /plant-new-seed | MERGE INTO /create-orchard | literal alias, same component |
| /edit-orchard/:orchardId | KEEP | Owner Menu → "My orchards" → edit existing |
| /orchard-created | MERGE INTO /create-orchard | confirmation step, not a distinct destination |
| /my-orchards | KEEP | Owner Menu → "My orchards" (own menu item, NOT absorbed into Edit stall) |
| /live-seed/:orchardId | DELETE | orphan, unclear distinction from /animated-orchard/:id |
| /my-radio-opt-in | DELETE | orphan; see Uncertain |
| /sower/:id | DELETE | public sower profile superseded by /stall/:username |
| /ai-assistant | DELETE | not in v2 scope |
| /my-seeds | MERGE INTO /stall/build | "my content" absorbed like /my-products |
| /my-tribe | KEEP | explicit left-panel item |
| /my-products | MERGE INTO /stall/build | spec: Edit stall explicitly absorbs this |
| /products/upload | MERGE INTO /stall/build | uploading a product = editing stall content |
| /seller/credentials | MERGE INTO /stall/build | seller settings = stall edit |
| /seller/business-settings | MERGE INTO /stall/build | seller settings = stall edit |
| /prescription/submit/:sowerId | KEEP | More ▾ (approved correction) |
| /my-garden/prescriptions | KEEP | More ▾ (approved correction) |
| /products/edit/:id | MERGE INTO /stall/build | editing a product = stall edit |
| /sower-library/:mode | DELETE | superseded by per-stall sheets |
| /my-s2g-library | MERGE INTO /stall/build | "my content" absorbed like /my-products |
| /my-s2g-library/upload | MERGE INTO /stall/build | same |
| /plant-a-seed | MERGE INTO /sow | orphan alias of the sow flow |

### Browsing others
| Route | v2 | Reason |
|---|---|---|
| /stall/:username | KEEP | anchor: visiting another member's stall |
| /bulk/sower/:slug | KEEP | Owner Menu → "Bulk upload seeds" — the wholesale rail, a separate business concept from stall products (confirmed) |
| /bulk/sower/:slug/feed | KEEP | Owner Menu → "Bulk upload seeds" — wholesale rail |
| /bulk/products/:slug | KEEP | Owner Menu → "Bulk upload seeds" — wholesale rail |
| /bulk/directory | KEEP | Owner Menu → "Bulk upload seeds" — wholesale rail |
| /bulk/whisperer | KEEP | Owner Menu → "Bulk upload seeds" — wholesale rail |
| /regrow-access | DELETE | alias of /browse-orchards, which itself merges away |
| /browse-orchards | MERGE INTO /stalls-feed | spec: becomes the Orchards tab |
| /orchard-alive | DELETE | see Uncertain (tier-gated feed) |
| /stalls-feed | KEEP | anchor: "Tribal Gardens" |
| /factories | DELETE | see Uncertain |
| /factories/:slug | DELETE | see Uncertain |
| /homestead | DELETE | see Uncertain (tier landing page) |
| /grove | DELETE | see Uncertain (tier landing page) |
| /orchard | DELETE | see Uncertain (tier landing page) |
| /estate | DELETE | see Uncertain (tier landing page) |
| /harvest-works | DELETE | see Uncertain (tier landing page) |
| /orchards/:orchardId | MERGE INTO /orchard/:orchardId | duplicate route, same component |
| /orchard/:orchardId | KEEP | orchard detail, reached from Orchards tab |
| /orchard-error/:orchardId | DELETE | error state, can be inline instead of a route |
| /music-library | MERGE INTO /stalls-feed | see Uncertain — cross-stall music browse |
| /music-track/:id | KEEP | track detail/bestow, needed regardless of discovery path |
| /search | MERGE INTO /stalls-feed | spec: explicit merge |
| /products | MERGE INTO /stalls-feed | general marketplace browse folds into Tribal Gardens |
| /s2g-community-library | DELETE | orphan, redundant with /music-library merge |
| /s2g-community-music | DELETE | orphan, redundant with /music-library merge |

### Tribe/community
| Route | v2 | Reason |
|---|---|---|
| /tribal-hearts | KEEP | anchor: "Wandering Hearts" |
| /live/:seedId/room | KEEP | live room detail, supports Go Live |
| /live-lounge | DELETE | see Uncertain |
| /learn-share | KEEP | anchor |
| /learn-share/:videoId | KEEP | video detail within Learn & Share |
| /wandering-directory | MERGE INTO /tribal-hearts | overlaps Wandering Hearts |
| /whisperers | KEEP | anchor (More ▾) |
| /whisperer-requests | MERGE INTO /whisperers | management sub-page |
| /become-a-whisperer | MERGE INTO /whisperers | signup sub-page |
| /364yhvh-days | KEEP | anchor |
| /364yhvh-orchards | MERGE INTO /364yhvh-days | themed orchard listing, not general orchards |
| /grove-feed | DELETE | orphan, superseded by Tribal Gardens feed |
| /chatapp | KEEP | anchor |
| /community-chats | MERGE INTO /chatapp | chat variant folds into main chat |
| /classroom | KEEP | More ▾ (approved correction) |
| /classroom/:id | KEEP | More ▾ (approved correction) |
| /classroom/:id/dashboard | KEEP | More ▾ (approved correction) |
| /skilldrop | KEEP | More ▾ (approved correction) |
| /skilldrop/:id | KEEP | More ▾ (approved correction) |
| /radio-slot-application | MERGE INTO /grove-station | see Uncertain (radio consolidation) |
| /premium-rooms | KEEP | More ▾ (approved correction) |
| /premium-room/:id | KEEP | More ▾ (approved correction) |
| /premium-room/:id/edit | KEEP | More ▾ (approved correction) |
| /community-videos | KEEP | anchor |
| /marketing-videos | DELETE | orphan, superseded by Community Videos |
| /grove-station | KEEP | anchor |
| /radio-management | MERGE INTO /grove-station | see Uncertain (radio consolidation) |
| /radio | MERGE INTO /grove-station | see Uncertain (radio consolidation) |
| /radio-sessions | MERGE INTO /grove-station | see Uncertain (radio consolidation) |
| /radio-generator | MERGE INTO /grove-station | see Uncertain (radio consolidation) |
| /clubhouse | DELETE | orphan, unclear legacy feature |
| /video/:id | DELETE | orphan, superseded by Community Videos |
| /companions | KEEP | More ▾ (approved correction — protected area, correctly not cut) |
| /join | DELETE | orphan, superseded by /register |
| /call/:roomKind/:roomId | KEEP | generic call infra, underlies ChatApp/Grove Station |
| /achievements | DELETE | not in v2 scope |
| /eternal-forest | DELETE | see Uncertain |
| /live-rooms | DELETE | see Uncertain |

### Money
| Route | v2 | Reason |
|---|---|---|
| /receipt/:orderId | KEEP | order receipts |
| /tithing | MERGE INTO /admin-fee | already a redirect there |
| /tithing-2 | MERGE INTO /admin-fee | already a redirect there |
| /free-will-gifting | MERGE INTO /wallet | see Uncertain |
| /community-offering | DELETE | superseded by generic /create-orchard |
| /support-us | MERGE INTO /wallet | support/tithing hub folds into right-panel Wallet |
| /basket | MERGE INTO /products/basket | duplicate basket implementation |
| /test-basket | DELETE | dev/test page |
| /wallet-settings | MERGE INTO /settings/payouts | already a redirect there |
| /my-orders | KEEP | order history |
| /books | KEEP | anchor (More ▾ "Books/bookkeeping") |
| /books/catalog/:itemId | KEEP | part of Books |
| /books/invoices/new | MERGE INTO /books/jobs/new | already a redirect |
| /books/invoices/:id | KEEP | part of Books |
| /books/invoicing | KEEP | part of Books |
| /books/jobs/new | KEEP | part of Books |
| /books/jobs/:id | KEEP | part of Books |
| /books/estimates/new | KEEP | part of Books |
| /pay/paystack/return | KEEP | payment callback infra (redirect target changes, route stays) |
| /pay/:publicToken | KEEP | public payment link infra |
| /estimate/:publicToken | KEEP | public estimate approval, part of Books |
| /wallet | KEEP | anchor: right-panel Wallet |
| /payment-cancelled | KEEP | checkout infra (redirect target changes, route stays) |
| /payment-success | KEEP | checkout infra (redirect target changes, route stays) |
| /products/basket | KEEP | anchor: checkout basket |

### Admin/Gosat
| Route | v2 | Reason |
|---|---|---|
| /admin-fee | KEEP | fee/tithing info page |
| /admin/treasury | KEEP | part of Gosat's |
| /admin/payouts | KEEP | part of Gosat's |
| /admin/orchards | KEEP | part of Gosat's |
| /gosat/escrow | KEEP | part of Gosat's (currently orphaned — should be linked from the dashboard) |
| /admin/subscriptions | KEEP | part of Gosat's |
| /dev/nowpay-test | DELETE | dev/test page |
| /dev/paypal-test | DELETE | dev/test page |
| /admin/analytics | KEEP | part of Gosat's |
| /admin/dashboard | KEEP | anchor (More ▾ "Gosat's", role-gated) |
| /admin/moderation | MERGE INTO /admin/dashboard | already a redirect |
| /admin | MERGE INTO /admin/dashboard | duplicate route, same component |
| /admin/radio | MERGE INTO /grove-station | see Uncertain (radio consolidation) |
| /admin/seeds | KEEP | part of Gosat's, seed moderation |
| /admin/settlement-consents | KEEP | part of Gosat's |
| /admin/credentials | KEEP | part of Gosat's |
| /admin/payout-confirmations | KEEP | part of Gosat's |
| /admin/attach-covers | DELETE | see Uncertain |
| /admin/ai-usage | KEEP | part of Gosat's, cost monitoring |

### Settings
| Route | v2 | Reason |
|---|---|---|
| /login | KEEP | anchor: entry point |
| /register-wandering | KEEP | whisperer/hand registration |
| /privacy | KEEP | legal, always needed |
| /terms | KEEP | legal, always needed |
| /register | KEEP | anchor |
| /start-your-journey | MERGE INTO /register | alias |
| /auth-debug | DELETE | dev/test page |
| /onboarding/security | KEEP | required security setup |
| /onboarding/payout | KEEP | required payout setup |
| /forgot-password | KEEP | auth necessity |
| /profile | MERGE INTO /stall/build | spec: profile edits absorbed into Edit stall |
| /profile/:userId | DELETE | see Uncertain |
| /settings/payouts | KEEP | anchor (More ▾ "Settings") |
| /settings/payouts/paypal-connected | KEEP | part of payout settings |

### Other / infrastructure
| Route | v2 | Reason |
|---|---|---|
| / | KEEP | logged-out landing/marketing page |
| /.lovable/oauth/consent | KEEP | platform infra, not a user flow decision |
| /ambassador-thumbnail | DELETE | image-generation utility, not user-facing |
| /gosat-ghost-access-thumbnail | DELETE | image-generation utility, not user-facing |
| /tequfah-clock | KEEP | under 364yhvh (approved correction) |
| /calendar/print | KEEP | reached from right-panel Today's "Print My Calendar" |
| /enochian-calendar-design | DELETE | reference/design page, not core flow |
| /cockpit | KEEP | anchor: YOUR STALL home |
| /dashboard | MERGE INTO /cockpit | already a redirect; stays as legacy alias |
| /dashboard/sower/upload | KEEP | Owner Menu → "Bulk upload seeds" (this is the upload wizard itself) |
| /stats | DELETE | superseded by right-panel Growth |
| /seed/:seedId | MERGE INTO /live/:seedId/room | duplicate route, same component |
| /seed-submission | DELETE | see Uncertain |
| /communications-hub | MERGE INTO /grove-station | see Uncertain — hub launcher for mostly-deleted features |
| /apply-radio-slot | MERGE INTO /grove-station | duplicate of /radio-slot-application |
| /create-premium-room | KEEP | More ▾, paired with /premium-rooms (approved correction) |
| /app-flow | DELETE | orphan alias of /browse-orchards, which itself merges away |
| /create-live-room | KEEP | supports the Go Live bottom-bar button |
| /trust | DELETE | see Uncertain |

**Tally: 175 routes → 90 KEEP, 42 MERGE, 43 DELETE** (a KEEP includes every "anchor" the target flow names explicitly, plus routes that are still real, distinct destinations even though they aren't nav-visible, e.g. detail/callback pages). Verified by counting the table rows, not hand arithmetic.

## Uncertain — flagged, not confidently resolved

These got a definitive call above (the brief requires one), but each is a real product decision, not a mechanical merge:

- **Radio consolidation** (`/radio-management`, `/radio`, `/radio-sessions`, `/radio-generator`, `/radio-slot-application`, `/admin/radio`, `/apply-radio-slot` — 7 routes) — I merged all seven into `/grove-station`. That's a lot of surface area folding into one route; it likely needs real tab/section design inside Grove Station, not just redirects. Confirm Grove Station is meant to be that broad.
- **Tier landing pages** (`/homestead`, `/grove`, `/orchard`, `/estate`, `/harvest-works` — 5 routes, all `TierSeedFlowPage`) — marked DELETE since v2 collapses everything into one stall model, but `stalls.tier` still exists as a real schema column/concept. If tiers still mean something in v2 (different privileges, different stall capabilities), these might need to become tier-specific sections somewhere rather than disappearing outright.
- **`/factories` + `/factories/:slug`** — a vendor/business directory separate from stalls. Marked DELETE; flag if this represents real distinct inventory not otherwise reachable once gone.
- **`/music-library`** — merged into `/stalls-feed` as general community music browsing, but that's my inference for where "browse everyone's music, not just one stall's" lives in v2 — the spec doesn't say.
- **`/my-radio-opt-in`** — becoming a radio DJ. Could plausibly merge into Grove Station instead of disappearing, if DJ onboarding stays a feature there.
- **`/live-rooms`** — the live-rooms landing/list page. Marked DELETE, but the Go Live button likely needs *some* place to show currently-live rooms; `/live/:seedId/room` alone is a detail page, not a browse list.
- **`/profile/:userId`** — public profile fallback. Marked DELETE in favor of `/stall/:username`, but a brand-new member with no stall yet has no `/stall/:username` to show — needs a fallback or "build your stall" prompt instead of a 404.
- **`/orchard-alive`, `/live-lounge`, `/eternal-forest`, `/wandering-directory`, `/seed-submission`, `/trust`** — each a low-traffic or orphaned page whose real purpose isn't fully inferable from the route inventory alone; marked DELETE/MERGE on best guess from the name and component, not confirmed intent.

## Seed Card consolidation

Target: one shared `<SeedCard>` used everywhere a seed/product/orchard/track/book shows as a card — cover/preview, title, sower, actions **Message · Voice · Video · Heart · Go Live (live orchards only) · Share · Report**, sample play (45s music / "Read a page" 2-page books preview via `StoryPdfViewer.tsx`), Bestow. Gold "Whisperer X%" badge + "Whisper this" apply button when the seed has a commission. Built from a fresh read of the actual codebase, not assumed.

**Amendment (Heart-as-gift, unified rail, owner greying)** — applies to both `variant="feed"` and `variant="compact"`:
- **Heart is not a like.** Tapping it opens a small amount picker (10¢ · 50¢ · $1 · $5 · $10, USDC) that feeds the same `useGiftBestowal`/`ConfirmBestowModal` path as the main Bestow button — no `product_likes`/`orchard_likes` writes, no separate "liked" state. Tooltip/label: "Heart — a small gift".
- **The compact card carries the exact same right-hand action rail as the feed card**, overlaid on the cover: Message · Voice · Video · Heart · Go Live/Step In (live orchards only) · Share · Report — plus the 45s play bar under/on the cover for music and the full-width `🎁 Bestow & Get This Seed — $X` button below. One component, two sizes; the compact variant no longer has its own separate bottom icon row or Step In button.
- **Owner viewing their own card sees the rail rendered but disabled** (`opacity-50`, non-interactive) rather than hidden, so they see what a visitor gets. `StallHotspotSheet`'s Owner Menu "View as visitor" toggle (`forceViewerIsOwner={false}`) is what makes it live for them again.

**Decided** (this round):
- **Donate merges into Bestow** — same action, one button, not two.
- **Follow stays**, placed on the card's sower line (not in the main action row).
- **Go Live / Step In stay, but conditional** — orchard cards only, and only when that orchard is actually live. Not a universal SeedCard action.
- **Bloom reactions (🌱🌿🌳) are dropped** — Heart covers the same need.
- **MusicLibraryTable stays a table**, not a SeedCard — it's the owner's own management list, a different job than a public browse card. Every public-facing music view (community/cross-stall browsing — includes `PublicMusicLibrary.jsx`, found in the same research pass) uses `SeedCard` instead.
- **The 3 Bulk-page card renderers** (`BulkProductDetailPage.tsx`, `BulkSeedFeedPage.tsx`, `BulkSowerPage.tsx`) migrate to `SeedCard` in build-order step 3, alongside `ProductCard` and `LivingSeedCard`.
- **Whisperer badge/apply reads and writes `product_whisperer_assignments` for real** — badge shows only on a live `status='active'` row with its actual `commission_percent`; "Whisper this" inserts a `pending` row. The hardcoded `10` fallback (`LivingSeedCard`'s `whispererSharePct` default, and every builder function's `?? 10`) is dropped entirely — no commission data means no badge, full stop.

### Current variants (7 found, none match the target action set)

| Variant | Renders | Actions today | Gap vs. target |
|---|---|---|---|
| `src/components/products/ProductCard.tsx` | `products` rows, any type | Play/Pause + preview (music), Report overlay, owner Edit/Delete, Bestow/Free-Download, + `SocialActionButtons` (Heart, Follow, Share, Donate) | Missing Message, Voice, Video — decided: Donate merges into Bestow, Follow stays (sower line) |
| `src/components/garden/LivingSeedCard.tsx` + `seedCardBuilders.js` | seed/orchard/music/book/video via 5 builder functions | Play/Open, Bestow (navigates, no modal), Go Live/Step In (Jitsi), bloom-reaction taps (🌱🌿🌳), Share, owner "⋯" (Edit/Repost/Park/Delete) | Missing Message, Voice, Report — decided: Go Live/Step In stays but only on live orchard cards, bloom reactions dropped (Heart covers it) |
| `src/components/CrowdfundingCard.jsx` (+ `FeaturedOrchards.jsx`) | hardcoded mock orchard data — **never queries real orchards** | "Support" button + `SocialActionButtons` | Dead code, not a real variant — see below |
| `BrowseOrchardsPage.jsx`'s inline `OrchardCard` | orchards (real data) | Bestow link, a "live" link, Report overlay | Thinnest real variant — no Message/Voice/Video/Heart/Share |
| `BrowseOrchardsPage.jsx`'s inline `MediaCard` | whatever the active browse tab holds | "Open" — one action, nothing else | Thinnest of all 7 |
| `src/components/music/MusicLibraryTable.tsx` | music tracks — **table rows, not cards** | `TrackPreviewButton` (real 45s sample, confirmed), Bestow, Share, Download/Gift, owner Edit | Decided: stays a table — it's the owner's own management list, not a public browse card, so it's not a SeedCard variant at all |
| `src/components/social/SocialActionButtons.tsx` | n/a — the actions strip embedded in #1 and #3 | Heart, Follow, Share, Donate | Superseded by SeedCard's own action row once #1/#3 migrate |

Out of scope, no migration needed: `S2GCommunityMusicPage.tsx`'s own card (hardcoded `whisperer_percentage: 0`, a 30-second sample — a third, inconsistent length next to the 45s standard) and `S2GCommunityLibraryPage.tsx`'s own card — both hosted on routes already marked DELETE in the route map above, so they disappear with their page, not migrated.

`BulkProductDetailPage.tsx` / `BulkSeedFeedPage.tsx` / `BulkSowerPage.tsx`'s own card rendering was not inspected in the original research pass — resolved by decision, not investigation: these three migrate to `SeedCard` in step 3 regardless of what their current card shape turns out to be.

### Whisperer commission — the real model exists and is completely unused

`public.product_whisperer_assignments` is a real, fully-built table nobody reads or writes: a polymorphic link (`product_id` / `orchard_id` / `book_id`, exactly one populated) to `whisperer_id` + `sower_id`, a real `commission_percent numeric NOT NULL`, and a `status` (`pending` / `active` / `declined` / `revoked` / `withdrawn`) enforced by a trigger that **already implements the exact "apply" flow this spec asks for** — a whisperer-initiated insert is forced to `pending`, only the sower can move it to `active`/`declined`/`revoked`, a whisperer can only withdraw their own pending request, and a unique partial index blocks a second open application by the same whisperer on the same seed. **Zero rows exist in production** — scaffolded, never used.

None of the 7 card variants above read this table. The one whisperer badge that exists today — `LivingSeedCard`'s gold `🎤 {whispererSharePct}%` — is wired to something else entirely: `orchards.whisperer_share_pct` (a column that only exists on `orchards`, `NOT NULL DEFAULT 10`), and every builder function for every other content type just hardcodes the literal `10` as a fallback. So today's badge renders unconditionally, showing a fake default, regardless of whether any whisperer relationship exists — the opposite of the target ("if a seed **has** a commission, show the badge").

**Decided**: `SeedCard` queries `product_whisperer_assignments` for a `status='active'` row on that specific seed and only renders the badge (with the row's real `commission_percent`) when one exists — the `10` fallback is deleted, not carried forward. "Whisper this" inserts a `pending` row for any viewer who isn't the seed's owner and doesn't already have a `pending`/`active` row on it (the trigger + unique index enforce the rest server-side — the button should also reflect "Application pending" client-side rather than relying on the insert failing).

### Merge table

| Component | v2 | Reason |
|---|---|---|
| `ProductCard.tsx` | MERGE INTO SeedCard | primary products-grid card, direct migration target |
| `LivingSeedCard.tsx` + `seedCardBuilders.js` | MERGE INTO SeedCard | closest existing analog; `/my-orchards` (a KEEP route) depends on it today |
| `CrowdfundingCard.jsx` + its mock data in `FeaturedOrchards.jsx` | DELETE | dead code — never renders real data, unrelated to the SeedCard merge itself |
| `BrowseOrchardsPage.jsx`'s `OrchardCard` + `MediaCard` | MERGE INTO SeedCard | replaced wholesale when `/browse-orchards`'s content moves into the new Tribal Gardens feed (build-order step 6) — no separate migration step needed |
| `StallHotspotSheet.tsx`'s inline item cards | MERGE INTO SeedCard | already closest to the target (has Bestow, cover, title) — the natural reference implementation to build SeedCard from, then swap back in |
| `MusicLibraryTable.tsx` | KEEP as a table | decided: owner's own management list, a different job than a public browse card — not a SeedCard variant |
| `PublicMusicLibrary.jsx` | MERGE INTO SeedCard | public-facing music browsing — decided: every public music view uses SeedCard |
| `BulkProductDetailPage.tsx` | MERGE INTO SeedCard | decided, migrates alongside ProductCard/LivingSeedCard in step 3 |
| `BulkSeedFeedPage.tsx` | MERGE INTO SeedCard | decided, migrates alongside ProductCard/LivingSeedCard in step 3 |
| `BulkSowerPage.tsx` | MERGE INTO SeedCard | decided, migrates alongside ProductCard/LivingSeedCard in step 3 |

All open questions from the previous round (Donate/Follow, Go Live/bloom reactions, MusicLibraryTable's layout, the 3 Bulk renderers) are resolved by the decisions above — nothing left flagged uncertain for Seed Card.

## 15 highest-impact code changes, in build order

Ordered so the app stays deployable after every step — new surfaces get built and proven before old ones are removed, and removals happen last.

| # | Change | Why this order | Done when |
|---|---|---|---|
| 1 | Redirect the 6 known duplicate routes (`/orchards/:id`→`/orchard/:id`, `/admin`→`/admin/dashboard`, `/admin/moderation`→`/admin/dashboard`, `/seed/:seedId`→`/live/:seedId/room`, `/tithing`+`/tithing-2`→`/admin-fee`, `/wallet-settings`→`/settings/payouts`) | Zero-risk cleanup, already-redirects or literal duplicates; clears noise before the real work starts | All 6 old paths 302 to their target and no file in `src/` still links to the old path string |
| 2 | Build the shared `SeedCard` component — cover, title, sower (with Follow on that line), Message · Voice · Video · Heart · Share · Report, sample play (45s music / "Read a page" 2-page preview via `StoryPdfViewer.tsx`), Bestow (Donate folds in), Go Live/Step In shown only on live orchard cards, gold Whisperer-% badge + "Whisper this" apply reading/writing `product_whisperer_assignments` with no hardcoded fallback — using `StallHotspotSheet.tsx`'s existing item cards as the reference implementation | Additive, new component only, ships independently; becomes the target every later card migration points at | `SeedCard` renders all 5 content kinds with every decided action wired; Go Live only appears on live orchards; the whisperer badge only appears on a real `active` assignment row (never a fallback %) |
| 3 | Migrate `ProductCard.tsx`, `LivingSeedCard.tsx`'s callers (`/my-orchards` among them), `PublicMusicLibrary.jsx`, and the 3 Bulk-page card renderers (`BulkProductDetailPage.tsx`, `BulkSeedFeedPage.tsx`, `BulkSowerPage.tsx`) onto `SeedCard`; delete the dead `CrowdfundingCard.jsx` + its mock data in `FeaturedOrchards.jsx` along the way. `MusicLibraryTable.tsx` stays a table — it's the owner's own management list, not migrated | Only safe once step 2's component is proven live in the stall sheets; `BrowseOrchardsPage`'s own inline cards need no separate migration — they're replaced wholesale by step 6's new Tribal Gardens feed | No page imports `ProductCard.tsx`, `LivingSeedCard.tsx`, or the old Bulk-page/PublicMusicLibrary cards directly anymore; `CrowdfundingCard.jsx` and its mock data are deleted, not just unused; `MusicLibraryTable.tsx` is untouched |
| 4 | Add a Wallet balance + "Let It Rain" section to `StallTodayPanel.tsx`'s right panel | Additive; right panel already exists (batch 2e), this just extends it | The right panel (desktop column and mobile drawer both) shows a live wallet balance and a working Let It Rain trigger |
| 5 | Build the Owner Menu (header tap; bottom-bar Plant Seed opens the same menu) — Edit stall · Sow a seed · Bulk upload seeds · My orchards — and remove the old top-bar "Sow a seed" button | Purely additive: all four targets (`/stall/build`, `/sow`, `/dashboard/sower/upload` + `/bulk/*`, `/my-orchards`) already exist as live routes today, so this is new UI chrome in front of working destinations, not a rebuild of any of them | Header tap and bottom-bar Plant Seed both open the same 4-item menu; the old top-bar button no longer renders anywhere |
| 6 | Build the combined "Tribal Gardens" page (stall-fronts feed + an "Orchards" tab folding in `/browse-orchards`'s content + a working search box), as a NEW route, `/stalls-feed`'s content rewritten in place | Biggest net-new page; build and test it live at its existing route before anything points away from `/browse-orchards`/`/search` | `/stalls-feed` shows real stall fronts AND a real "Orchards" tab with live orchard data AND working search, all in one page |
| 7 | Point `/browse-orchards` and `/search` at redirects to `/stalls-feed` (with the right tab/query pre-selected) | Only safe once step 6 is live and confirmed to carry the same functionality | Visiting either old path lands on `/stalls-feed` with the matching tab/query already selected |
| 8 | Update `src/lib/nav/cockpitNav.ts` to the v2 left-panel list (Tribal Gardens, Wandering Hearts, My Tribe, ChatApp, Grove Station, Community Videos, Learn & Share, 364yhvh) + build a "More ▾" submenu for everything else KEEP-but-secondary: Books, Whisperers, Gosat's (role-gated), Settings, Companions, Classroom, SkillDrop, Premium Rooms, Prescriptions, Bulk directory/products. `/tequfah-clock` nests under 364yhvh instead | Nav config is consumed by both the Cockpit sidebar and the stall interior's nav panel (one shared source since batch 2e) — one change updates both surfaces | Every route above is reachable from either the left panel or More ▾, and `cockpitNav.ts` is the only place both surfaces read from |
| 9 | Extend `/stall/build` with real product/library/profile management tabs (not just front/interior/tiles/story) — the actual CRUD UI currently on `/my-products`, `/my-s2g-library`, `/profile`, seller settings. Orchards stay OUT of this — they're the Owner Menu's own "My orchards" item, not absorbed here | Second-largest lift; do it after the nav (step 8) so there's already a working "Edit stall" entry point (from step 5's Owner Menu) driving traffic to validate it against | An owner can fully manage their products, library items, and profile from inside `/stall/build` without visiting `/my-products`, `/my-s2g-library`, or `/profile` |
| 10 | Point `/my-products`, `/my-s2g-library`, `/profile`, `/products/upload`, `/products/edit/:id`, `/seller/credentials`, `/seller/business-settings` at redirects into the relevant `/stall/build` tab (NOT `/my-orchards` — that stays its own route) | Only safe once step 9's tabs cover 100% of what those pages did | All 7 old paths land on the matching `/stall/build` tab with no functionality gap |
| 11 | Consolidate the 7 radio routes into tabbed sections inside `/grove-station` | Independent of the stall work; can happen in parallel with 9-10, but do it before step 12 touches nav-visibility | Slot applications, management, sessions, and the generator are all reachable from tabs inside `/grove-station`; the 7 old routes redirect there |
| 12 | Feature-flag-hide (not yet delete) nav entries/links for everything still marked DELETE in the map above (Factories, tier landing pages, marketing-videos, /stats, etc. — Premium Rooms, Classroom, SkillDrop, Companions, Bulk, and Prescriptions are OFF this list now, all KEEP via More ▾) | Makes the app "look like v2" without removing the underlying routes/code yet — reversible if a flagged item turns out to still be needed (see Uncertain list) | No nav surface links to a DELETE-marked route, but each route still resolves if visited directly (nothing deleted yet) |
| 13 | Redefine `/cockpit`'s content to be YOUR STALL (full-screen owner interior + header-tap Owner Menu + bottom bar) only, removing `DashboardPage.jsx`'s remaining dashboard sections (stats, tiers, week beads, etc. — the "Your Living Garden" list was already removed in an earlier batch) | The riskiest step — it's the literal home/landing route — done last among the "build" steps, once every section it currently shows has a confirmed new home (steps 5-11) | `/cockpit` shows only the stall interior, the Owner Menu, and the bottom bar — no dashboard stats/tiers/week-beads sections remain |
| 14 | Update checkout/payment flow redirect targets (`/products/basket`, `/basket`, `/payment-success`, `/payment-cancelled`, `/pay/paystack/return`) to return to the originating stall (`/stall/:username` or `/cockpit`) instead of `/dashboard` | Depends on step 13 being live, since "the stall you bought from" needs to be a real, working destination first | Completing (or cancelling) a real purchase lands back on the stall you bought from, not `/dashboard` |
| 15 | Sweep the ~51 files that still link to `/dashboard` (the literal redirect string) to point at `/cockpit` directly, then delete the code/routes for everything still marked DELETE (and merge-source routes once their redirects in steps 7/10/11 have been live a while) | Last step — pure cleanup plus final deletion, once nothing internal references the old paths and any bookmarked/external links have had time to hit the redirects instead | Zero files reference the literal `/dashboard` string; every DELETE-marked route's component and route entry are removed from `AppRoutes.tsx` |
