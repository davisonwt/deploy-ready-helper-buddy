
# Sower-Content Data-Source Consolidation Plan

## 1. What we found (the full map)

Two canonical RPCs exist in the DB:
- `get_my_dashboard_content` — UNIONs `seeds` (by `gifter_id`) + `products` (by `sower_id → sowers.user_id`), already account-scoped via `get_my_account_scope`.
- `get_my_account_scope` — returns primary + linked user_ids.

**Only 2 surfaces use them today** (Dashboard + the just-fixed My Garden). Everything else hits tables directly. The same class of bug ("seeds show on Dashboard but not on My Garden") is present in **11 more surfaces**.

### Surfaces grouped by what they should be doing

**A — "My own content" (logged-in sower's view of their own stuff)** — should all share ONE hook:
| # | File | Current source | Divergence |
|---|------|----------------|------------|
| 1 | `DashboardPage.jsx:470` | `get_my_dashboard_content` RPC | ✅ canonical |
| 2 | `DashboardPage.jsx:473` (fallback) | `seeds WHERE gifter_id = user.id` | misses products + linked accounts |
| 3 | `DashboardPage.jsx:532` (orchards widget) | `orchards WHERE user_id = user.id` | misses linked accounts |
| 4 | `MyOrchardsPage.jsx:105` (seeds section) | `get_my_dashboard_content` RPC | ✅ canonical (just fixed) |
| 5 | `MyOrchardsPage.jsx:65` (orchard list) | fetches ALL orchards then client-filters by `user.id` | misses linked accounts + wasteful |
| 6 | `MyOrchardsPage.jsx:106` (orchards section) | `orchards WHERE user_id = user.id` | misses linked accounts |
| 7 | `MyOrchardsPage.jsx:113-181` (music section) | `products WHERE sower_id = <primary sower>` | misses linked-account sowers |
| 8 | `components/dashboard/DashboardTribeStats.tsx:45` | `orchards WHERE user_id = user.id` (count) | wrong for linked accounts |

**B — "Another sower's public content"** (viewing someone else's profile) — should share one hook:
| # | File | Current source |
|---|------|----------------|
| 9 | `ProfilePage.jsx:411` | `orchards WHERE user_id = targetId` (count only) |
| 10 | `api/products.ts:31,165,224` | `products WHERE sower_id = …` / `IN (…)` (already shared) |
| 11 | `TierSeedFlowPage.tsx:116,142` | `orchards`/`sower_books` by sower id |

**C — "All tribe content" (public feeds / search)** — should share one hook:
| # | File | Current source | Gap |
|---|------|----------------|-----|
| 12 | `BrowseOrchardsPage.jsx:286` (Tribe Garden) | `seeds` + `orchards` + `products` direct (most complete) | template for others |
| 13 | `BrowseOrchardsPage.jsx:264` (Orchards tab) | `orchards` only | OK if intentional |
| 14 | `TribalAliveFeedPage.tsx:200,235` | `seeds` + `orchards` + `fetchActiveProductsForFeed` | OK, products already shared |
| 15 | `AdvancedSearchPage.tsx:38` | `orchards` only | **misses seeds AND products entirely** |

**D — Write-only / Admin** (no change needed): `SeedSubmissionPage`, `FreeWillGiftingPage`, `BulkUploadWizardPage`, `AdminSeedsPage`, `AdminDashboardPage`, `ContentModerationDashboard`.

## 2. Proposed canonical layer

Add ONE shared module: `src/api/sowerContent.ts` exposing three hooks. Every page above imports from here — no more inline `from('seeds')` / `from('orchards')` / `from('products')` for display purposes.

```text
src/api/sowerContent.ts
├─ useMyContent()         → { seeds, products, orchards, music, books, isLoading }
│                           Uses get_my_dashboard_content RPC for seeds+products,
│                           Uses get_my_account_scope + orchards query for orchards,
│                           Returns everything pre-shaped for UI.
│
├─ useSowerContent(userId)→ { seeds, products, orchards } for a public profile
│                           Resolves sower_id from userId, fans out.
│
└─ useTribeContent(opts)  → { seeds, products, orchards } for public feeds/search
                            Wraps the BrowseOrchardsPage Tribe Garden pattern.
```

**Backend change required (one migration):** extend `get_my_dashboard_content` to also return `orchards` rows (new `source = 'orchard'`), OR add a sibling RPC `get_my_orchards_scoped()`. Recommend the sibling RPC — keeps the existing RPC stable and avoids breaking the just-fixed My Garden.

## 3. Rollout order (each step independently verifiable)

1. **DB**: add `get_my_orchards_scoped()` RPC (mirrors account-scope pattern).
2. **Hook layer**: create `src/api/sowerContent.ts` with `useMyContent`. Unit-callable, no UI changes yet.
3. **Migrate Group A one file at a time**, build-verify after each:
   - `MyOrchardsPage` (orchard list + orchards section + music section)
   - `DashboardPage` (fallback path + orchards widget)
   - `DashboardTribeStats`
4. **Add `useSowerContent`** and migrate `ProfilePage` + relevant `TierSeedFlowPage` calls.
5. **Add `useTribeContent`** and migrate `AdvancedSearchPage` (closes the seeds/products invisibility gap), then optionally `BrowseOrchardsPage` Tribe Garden tab and `TribalAliveFeedPage`.
6. **Lint rule / convention**: document in code comments that display surfaces MUST go through `src/api/sowerContent.ts`. Direct `from('seeds'|'orchards'|'products')` for display is forbidden outside that module + admin pages + write paths.

## 4. What this plan does NOT touch (per scope-lock)

- No edits to admin pages, write-only submission pages, or bulk-upload wizard.
- No refactor of `orchardStore.js` / `OrchardState.js` / `communityOrchardsCache.js` (state/cache layer, not display).
- No change to existing payment / live-room / chat code.
- The already-shipped MyOrchardsPage fix stays in place; it just gets re-pointed at the new hook later.

## 5. Decision needed from you before I touch code

Pick the scope you want me to execute:
- **(a) Full plan** — all 3 hooks + DB migration + migrate all 11 divergent surfaces.
- **(b) Group A only** — just consolidate "my own content" (the bug class that bit you). Skips ProfilePage / search / feed.
- **(c) Minimal patch** — no new hook, just fix the 4 remaining "my own content" leaks (DashboardPage fallback, DashboardPage orchards widget, MyOrchardsPage orchards/music sections, DashboardTribeStats) in place. No architecture work.
- **(d) Audit only** — keep this plan as a reference, do nothing yet.

Tell me a/b/c/d and I'll execute exactly that, nothing more.
