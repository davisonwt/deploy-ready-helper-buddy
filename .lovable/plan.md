# Verification Report — Seed Upload Flow vs. Founder's Intent

Read-only investigation. No changes made. Findings cited with file:line.

---

## 1. Write paths — single vs. bulk seed upload

**Verdict: PARTIAL MISMATCH.**

| Path | `seeds` | `products` | `orchards` |
|---|---|---|---|
| Single (`SeedSubmissionPage.jsx`) | ✅ insert (L210–229) | ❌ | ✅ insert (L255–274) |
| Bulk (`BulkUploadWizardPage.tsx` → `PublishStep`) | ❌ | ✅ insert via `insertProduct` (L583 → `src/api/products.ts:84`) | ❌ no orchards row created |

What this means for the read layer we just consolidated:

- **`useMyContent` (My Garden + Dashboard "my seeds")** — OK. The `get_my_dashboard_content` RPC UNIONs `seeds` and `products`, so both single-uploaded seeds and bulk-uploaded products show up.
- **`fetchTribeOrchards` (Browse Orchards + Tribal Feed orchard rail)** — BROKEN for bulk. It reads only from `orchards` (`sowerContent.ts:498–516`, filter `status='active'`). Bulk-uploaded items have no `orchards` row, so they are **invisible** in any orchard browsing/feed surface. Only single-seed uploads ever appear there.

This is the divergence: the bulk path skips the auto-create-orchard step the single path performs.

---

## 2. Tribal Gardens / Feed — the 5 named sections

**Verdict: NO. Those tabs do not exist.**

`TribalAliveFeedPage.tsx` has exactly **3 tabs** (L44, L993–1009):

| State | Label shown |
|---|---|
| `following` | **Inner Circle** |
| `foryou` | **Tribe Feed** |
| `local` | **Around Me** |

The strings "Homestead", "Grove", "Orchard", "Estate", "Harvest Works" do exist — but only as:
- `TIER_LABELS` map at `TribalAliveFeedPage.tsx:124–130`, used as a URL query-param filter (`?tier=homestead`) shown as a badge in the header, not a tab.
- `SOWER_TIER_LINKS` href array at `MyOrchardsPage.jsx:38–44`, linking to `/homestead`, `/grove`, etc. (separate pages, not tabs).

So the founder's described 5-sub-tab structure on Tribal Feed has never been built.

---

## 3. Distinct card components per destination

**Verdict: YES — three (actually four) distinct card implementations, none shared.**

| Destination | Card | File |
|---|---|---|
| My Garden (`MyOrchardsPage`) | `buildSeedCard()` / `buildOrchardCard()` rendered inside `<MyGardenSection>` | `components/garden/seedCardBuilders.js` + `components/garden/MyGardenSection.jsx` (L145, L323–331) |
| Dashboard (`DashboardPage`) | `<LivingSeedCard>` (bestowed orchards use `<SeedSlider>`) | `components/garden/LivingSeedCard.tsx` (L1210–1227, L1236) |
| Tribal Feed (`TribalAliveFeedPage`) | Inline JSX, no named component extracted | `pages/TribalAliveFeedPage.tsx` (~L900+) |
| Browse Orchards (`BrowseOrchardsPage`) | Local `function OrchardCard()` | `pages/BrowseOrchardsPage.jsx:111`, rendered L658 |

---

## Bottom line vs. founder's described flow

| Founder's expectation | Reality |
|---|---|
| Single upload populates My Garden / Dashboard / Tribal Feed | ✅ Yes (via `seeds` + `orchards` writes) |
| Bulk upload populates the same 3 destinations | ⚠️ Partial — appears in My Garden + Dashboard (via `products`), but **does NOT appear in Tribal Feed/Browse Orchards rail** because no `orchards` row is created |
| Each page uses its own card design | ✅ Yes — 4 distinct card implementations, nothing shared |
| Tribal Feed has 5 sub-tabs: Homestead / Grove / Orchards / Estate / Harvest Works | ❌ No — feed has 3 tabs (Inner Circle / Tribe Feed / Around Me). The 5 names exist only as URL filter params and as separate page links from My Garden |

---

## Two real gaps if you want to align to the described flow

1. **Bulk path doesn't create orchards rows.** Either (a) make `PublishStep` also insert into `orchards` like the single path does, or (b) change `fetchTribeOrchards` to UNION `orchards` + `products` so the orchard rail reflects both.
2. **Tribal Feed has no Homestead/Grove/Orchards/Estate/Harvest Works sub-tabs.** Would need to add a sub-tab strip on `TribalAliveFeedPage` that filters by tier — the `TIER_LABELS` map and tier-based URL filter already exist, so it'd be wiring a tab bar on top of the existing filter.

No code changes made. Awaiting your call on whether to fix gap 1, gap 2, both, or neither.
