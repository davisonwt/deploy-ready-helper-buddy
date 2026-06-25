
## Context

The Binance/Cryptomus payment stack was deleted earlier, but two orchard components still import the missing `BinancePayButton` and are breaking the build:

- `src/components/orchard/OrchardPaymentWidget.jsx` (line 9, used at line 91)
- `src/components/orchard/EnhancedBestowalPayment.jsx` (line 10, used at line 380)

Both are reachable (`OrchardPage.jsx` imports `OrchardPaymentWidget`). The audit can't be trusted while the build is broken, so this needs to clear first. No other Binance/Cryptomus/old-Stripe refs remain in `src/`.

## Step 1 — Minimal build fix (scope-locked)

Same pattern as the `PaymentModal.jsx` fix from the previous turn — surgical, no behavior added:

- In both files, remove the `BinancePayButton` import.
- Replace the `<BinancePayButton …/>` block with a small inline notice ("Payments are now handled via PayPal — use the standard bestowal flow") plus a Close/secondary button that calls the existing `onClose` / `onSuccess` no-op path.
- Do NOT wire either component to PayPal here. That belongs in a separate, explicitly-approved task. I will flag these two components plus `PaymentModal.jsx` as PARTIAL in the audit (UI exists, no live payment path).

Verify with `bun run build:dev` before moving on.

## Step 2 — Read-only audit (the actual deliverable)

Once the build is green, produce a single categorized report covering every bucket you listed. No file edits, no DB changes, no secret changes — flag-only.

### Method per bucket

1. **Edge functions (DEAD / PARTIAL / LIVE)** — enumerate `supabase/functions/*/index.ts`, then for each name grep `src/` for `functions.invoke('<name>'`, hardcoded `/functions/v1/<name>` URLs, and any cron/webhook config. Zero refs → DEAD candidate. Referenced only by other (dead) functions → PARTIAL.
2. **Orphan components/pages** — list every `.tsx`/`.jsx` under `src/components/**` and `src/pages/**`, grep for importers, cross-check `src/App.tsx` + any router files for route registration. Zero importers AND zero routes → DEAD.
3. **Duplicate-system patterns** — targeted greps for known duplication shapes: parallel hook names (`use*Chat`, `use*Live`, `use*Payment`, `use*Wallet`), parallel util files with overlapping exports, duplicate type definitions for the same domain concept (message, room, profile, bestowal, wallet). Report each cluster with both implementations + which is wired into the live routes.
4. **Stale docs/scripts** — full `docs/` listing + root-level stray files (`diff.txt`, `actual_diff.txt`, any `deploy*.sh`, `*_FIX*.md`, `CRITICAL_*.md`, multiple `README-*` variants). Classify each as STALE (one-off log, pre-dates current architecture) vs CURRENT (referenced by README/onboarding or describes still-live behavior).
5. **Superseded migrations** — scan `supabase/migrations/` for pairs where a later migration drops/replaces what an earlier one created (table created then dropped, column added then removed, policy created then replaced). Flag, do not squash.
6. **Unused npm dependencies** — for every entry in `package.json` `dependencies` + `devDependencies`, grep `src/`, `supabase/functions/`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`. Zero hits → UNUSED candidate (with the caveat that some deps are transitive-runtime-only, which I'll call out).
7. **Unreferenced DB tables/columns** — pull table list from the schema, grep `src/` and `supabase/functions/` for each table name (string literal in `.from('…')` and in raw SQL). Zero hits → DEAD candidate. Same pass at column granularity only for the DEAD-candidate tables (column-level sweep across 230+ tables is too noisy to be useful in one pass — I'll offer it as a follow-up if you want).

### Output format

One markdown report, posted in chat, structured as:

```text
## 1. Edge functions
DEAD: …
PARTIAL: …
LIVE: (count only)

## 2. Orphan components/pages
…

## 3. Duplicate systems
- Cluster A: <concept>
  - Impl 1: <path> — wired at <route/importer>
  - Impl 2: <path> — wired at <route/importer> / orphan
…

## 4. Stale docs/scripts
STALE: …
CURRENT: …

## 5. Superseded migrations
…

## 6. Unused dependencies
…

## 7. Unreferenced tables
DEAD candidates: …
```

Nothing is deleted, renamed, or migrated. After you review the report, you pick what actually gets removed in follow-up scope-locked tasks.

## Out of scope for this plan

- Wiring `OrchardPaymentWidget` / `EnhancedBestowalPayment` / `PaymentModal` to PayPal.
- Any deletions from the audit findings.
- Column-level DB sweep across live tables.
- Squashing migration history.
