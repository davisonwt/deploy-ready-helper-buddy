## Findings (read-only audit complete)

**Verdict: BROKEN / DEAD.** The three `wandering_heart*` tables (`wandering_hearts`, `wandering_heart_connections`, `wandering_heart_feed_events`) are completely unreachable from the application — zero `.from()` calls, zero RPCs, zero edge functions, zero routes, zero UI. Only `src/integrations/supabase/types.ts` references them (auto-generated). Additionally, `wandering_hearts` has an infinite-recursion RLS policy (`42P17`) that crashes every SELECT. Tables were created out-of-band — no `CREATE TABLE` exists in `supabase/migrations/` for any of them, i.e. schema drift.

The live "hearts" feature is **Tribal Hearts** (`tribal_hearts_profiles`, `tribal_hearts_matches`, RPC `get_hearts_browse`), which is unrelated and unaffected.

## Proposed cleanup (awaiting your approval — nothing touched yet)

### Step 1 — DB migration: drop the dead tables
Single migration dropping all three tables. Removes the broken `wandering_hearts` recursive policy along with them, eliminates the anon-readable orphans, and clears the schema drift. The Supabase types file regenerates automatically afterward; no app code references these tables, so the regen is a no-op for the app.

```sql
DROP TABLE IF EXISTS public.wandering_heart_feed_events CASCADE;
DROP TABLE IF EXISTS public.wandering_heart_connections CASCADE;
DROP TABLE IF EXISTS public.wandering_hearts CASCADE;
```

### Step 2 — Verify post-migration
- `tsgo` clean (types.ts will regenerate without the three table entries)
- `npm run build:dev` clean
- REST probe of all three endpoints returns 404 (table not found)

### Step 3 — Out of scope, flagged only
The `WanderingDirectoryPage.jsx` "Wandering Heart" role card routes to `/tribal-hearts` — that's working as intended for Tribal Hearts, not a bug. Naming is confusing (Wandering Directory vs. Tribal Hearts vs. dead Wandering Hearts tables) but renaming is a separate decision and not part of this cleanup.

## What I will NOT touch
- No app code edits — there's nothing in `src/` to remove (tables are referenced only in auto-generated types).
- No changes to Tribal Hearts (`tribal_hearts_*` tables, hooks, page, or RPCs).
- No rename of `WanderingDirectoryPage` or the "Wandering" terminology — flagged only.

## Risks
- **Low.** Tables are empty in prod (REST probe confirmed `[]` for the two readable ones, and the third is unreadable due to recursion). No app code reads or writes them. CASCADE is safe because there are no FK references from any live table (the three only reference each other, if at all).
- If you'd rather keep the schema as-is and only fix the recursive policy on `wandering_hearts`, say so and I'll swap Step 1 for a policy patch instead.

## Approve to proceed?
On approval I'll issue exactly one migration (Step 1) and then verify (Step 2). The separate publish/security-findings blocker is unrelated and stays untouched in this turn.
