# Flow v2 orphans

Compiled while executing steps 9-11 (docs/FLOW-V2-MAP.md). Lists every
route/page that is **not reachable from any nav item, menu, button, or
redirect** as of this commit — only reachable by typing the exact URL. Not
a deletion pass (that's step 15) — a KEEP/DELETE recommendation for each,
to save re-deriving this later.

Two categories:
- **Orphaned source files** — the component still exists, but no route or
  embed references it anymore (found directly by steps 6-11's own work).
- **Orphaned live routes** — the route still resolves if visited directly,
  but nothing in the app links to it. Mostly the map's own original
  DELETE list (43 routes, never wired to a redirect or nav item to begin
  with) reconfirmed still orphaned, not newly caused by today's steps.

## Orphaned source files (new this round)

| File | Why orphaned | Recommendation |
|---|---|---|
| `src/pages/AdvancedSearchPage.tsx` | Step 7: `/search` now redirects to `/stalls-feed` instead of rendering this; no other import references it. | DELETE (step 15) |
| `src/components/radio/RadioPage.tsx` | Step 11: `/radio` now redirects to plain `/grove-station` (its own "Listen Now" tab covers the same intent) rather than rendering this; no other import references it. | DELETE (step 15) |

## Orphaned live routes (reconfirmed from the map's own DELETE list)

These were already marked DELETE in docs/FLOW-V2-MAP.md's route table —
none of steps 1-11 wired a nav link, button, or redirect to any of them,
so they remain reachable only by typing the URL. Recommendation matches
the map's own call unless noted.

### Member's own content
| Route | Recommendation | Note |
|---|---|---|
| `/sow/classic` | DELETE | redundant alt chooser |
| `/store/:slug` | DELETE | pre-Farm-Stalls concept |
| `/sow2grow-calendar` | DELETE | superseded by right-panel Today |
| `/live-seed/:orchardId` | DELETE | unclear vs. `/animated-orchard/:id` |
| `/my-radio-opt-in` | DELETE | Uncertain -- could fold into Grove Station DJ onboarding instead of disappearing |
| `/sower/:id` | DELETE | superseded by `/stall/:username` |
| `/ai-assistant` | DELETE | not in v2 scope |

### Browsing others
| Route | Recommendation | Note |
|---|---|---|
| `/regrow-access` | DELETE | alias of `/browse-orchards` |
| `/orchard-alive` | DELETE | Uncertain -- tier-gated feed, purpose not fully inferable |
| `/factories`, `/factories/:slug` | DELETE | Uncertain -- flag if this is real distinct inventory |
| `/s2g-community-library`, `/s2g-community-music` | DELETE | redundant with `/music-library` |

### Tribe/community
| Route | Recommendation | Note |
|---|---|---|
| `/live-lounge` | DELETE | Uncertain -- purpose unclear |
| `/wandering-directory` | DELETE | overlaps `/tribal-hearts` |
| `/364yhvh-orchards` | DELETE | themed orchard listing, not general orchards |
| `/grove-feed` | DELETE | superseded by Tribal Gardens feed |
| `/community-chats` | DELETE | folds into `/chatapp` |
| `/marketing-videos` | DELETE | superseded by Community Videos |
| `/clubhouse` | DELETE | unclear legacy feature |
| `/video/:id` | DELETE | superseded by Community Videos |
| `/join` | DELETE | superseded by `/register` |
| `/achievements` | DELETE | not in v2 scope |
| `/eternal-forest` | DELETE | Uncertain |
| `/live-rooms` | DELETE | Uncertain -- Go Live likely needs *some* live-rooms browse list; `/live/:seedId/room` alone is a detail page |

### Money
| Route | Recommendation | Note |
|---|---|---|
| `/community-offering` | DELETE | superseded by `/create-orchard` |
| `/test-basket` | DELETE | dev/test page |

### Admin/Gosat
| Route | Recommendation | Note |
|---|---|---|
| `/dev/nowpay-test`, `/dev/paypal-test` | DELETE | dev/test pages |
| `/admin/attach-covers` | DELETE | Uncertain |

### Settings
| Route | Recommendation | Note |
|---|---|---|
| `/auth-debug` | DELETE | dev/test page |
| `/profile/:userId` | DELETE | Uncertain -- a brand-new member with no stall yet has no `/stall/:username` fallback |

### Other/infrastructure
| Route | Recommendation | Note |
|---|---|---|
| `/ambassador-thumbnail`, `/gosat-ghost-access-thumbnail` | DELETE | image-generation utilities |
| `/enochian-calendar-design` | DELETE | reference/design page |
| `/stats` | DELETE | superseded by right-panel Growth |
| `/seed-submission` | DELETE | Uncertain |
| `/communications-hub` | DELETE | Uncertain -- hub launcher for mostly-deleted features |
| `/apply-radio-slot` | ~~DELETE~~ now a redirect (step 11) | no longer orphaned |
| `/app-flow` | DELETE | orphan alias of `/browse-orchards` |
| `/trust` | DELETE | Uncertain |
| `/homestead`, `/grove`, `/orchard`, `/estate`, `/harvest-works` (TierSeedFlowPage x5) | DELETE | Uncertain -- `stalls.tier` still a real schema column; confirm tiers mean nothing in v2 before deleting |

## Step 12 update (nav-surface links to DELETE-marked routes, hidden)

Live nav surfaces (not just already-orphaned pages) found still linking to
DELETE-marked routes -- hidden per step 12, routes themselves untouched:

| Surface | Was linking to | Fix |
|---|---|---|
| `DashboardPage.jsx`'s `TribalTiersCard` render | `/factories` + 5 tier pages | Card no longer rendered (file untouched, unmounted) |
| `DashboardPage.jsx`'s "Feeds ▾" dropdown (`TRIBAL_FEED_TIERS`) | `/orchard-alive?tier=<x>` (5 entries with no `to`) | Those 5 entries dropped; `stalls`/`whisperers` kept |
| `CommunityVideosPage.jsx`'s "AI Marketing Assistant" card | `/ai-assistant` | Card removed (no v2 replacement) |
| `MyOrchardsPage.jsx`'s "AI Offering Generator" button | `/community-offering` | Button removed (page's own "New Orchard" flow supersedes it) |
| `CommunicationsHub.tsx`'s "Community Chat" tile | `/community-chats` | Repointed at `/chatapp` (the map's own MERGE target) |

**Correction to this doc's earlier claim**: the "Orphaned live routes" table above listed `/community-chats` and (implicitly) `/communications-hub` as unreached by any nav link as of step 11. That was wrong -- `/communications-hub` was already reachable from `DashboardPage.jsx`'s bottom-bar "Go Live" button, and its own "Community Chat" tile linked to `/community-chats`. Fixed above, not just noted.

**Conflict, not fixed** -- `/live-rooms` is DELETE-marked in FLOW-V2-MAP.md, but it's the real, load-bearing landing/cancel target for the Go-Live 1-on-1 video flow: `ChatApp.tsx`'s "Start a 1-on-1" button, `CreateLiveRoomPage.tsx`'s Back and Cancel buttons, and `CommunicationsHub.tsx`'s "1-on-1 Live" tile all navigate there, with no other browse/landing page for that flow (`/live/:seedId/room` is a detail page, not a list). Left live and linked -- today's build wins over the map's DELETE call here, matching the map's own "Uncertain" note on this exact route.

## Step 13 update (DashboardPage.jsx -> .tsx rewrite)

`/cockpit` now renders the owner's own `StallInteriorView` directly (plus
the Plant Seed/Go Live/Chat bottom bar) instead of the old dashboard.
`SettlementConsentBanner` (a legal settlement-consent nag, not a
"dashboard section" -- see spec-payments.md) was carried forward as a
floating strip rather than dropped with the rest, since it had no other
render site anywhere in the app. Newly orphaned as a direct result:

| File | Why orphaned |
|---|---|
| `src/components/stalls/MyStallCard.tsx` | Its own-stall fetch + "tap to walk in" / "Build your stall" CTA logic is now inlined directly in `DashboardPage.tsx` (the CTA needs to fill the whole page, not a dashboard tile) -- no remaining caller |
| `src/components/dashboard/DashboardTribeStats.tsx` | Was one of the explicitly-named "stats" sections step 13 removes; no other caller |
| `src/components/dashboard/TribalTiersCard.tsx` | Unmounted in step 12 (nav-link cleanup), now also literally deleted from the page it lived on -- still no other caller |

## Orphaned source files (additional, found during step 12)

| File | Why orphaned |
|---|---|
| `src/components/dashboard/StatsFloatingButton.tsx` | Not imported/rendered anywhere in `src/` -- dead code, not reachable by any path (its one action navigated to `/stats`, DELETE-marked) |
| `src/components/dashboard/TopSowersTeaser.tsx` | Same -- not imported/rendered anywhere; its link targeted `/stats?tab=leaderboard` |
| `src/components/MyGardenPanel.tsx` | Mounted in `Layout.jsx`, but its only open trigger is a `window` event (`s2g-open-my-garden`) that nothing in `src/` ever dispatches -- functionally unreachable despite being in the render tree. Carries several more DELETE-marked links (`/eternal-forest`, `/364yhvh-orchards`, the same 5 tier pages) that don't need hiding since no user can ever open the panel to see them. |

## Not orphaned (checked, still reachable -- listed so they aren't re-flagged)

- `/music-library` -- still linked from `MyGardenPanel.tsx`; doc's own "MERGE INTO /stalls-feed" hasn't been executed yet (not part of steps 1-11).
- `/products/upload`, `/products/edit/:id`, `/my-s2g-library/upload`, `/my-s2g-library/edit/:id` -- deliberately kept live (step 10), reached internally from the Products/Library tabs' own Add/Edit actions.
- `RadioSlotApplicationPage`, `RadioManagementPage`, `RadioSessions`, `RadioGenerator`, `AdminRadioPage`, `MyProductsPage`, `MyS2GLibraryPage`, `ProfilePage`, `SellerCredentialsPage`, `SellerBusinessSettingsPage` -- all now embedded as tabs (steps 9 & 11), not orphaned despite their own routes being redirects.
- `src/components/stalls/StallBookshelfNav.tsx` -- flagged in step 8's report: has no live caller anywhere in the app (pre-existing, not caused by steps 9-11). Not a route, so not listed above, but worth remembering for step 15's cleanup pass.
