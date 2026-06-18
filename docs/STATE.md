# State Management — Where Does It Go?

This document codifies the rule for new state in Sow2Grow so we stop sprawling
across React Query, Zustand, 6 contexts, and local `useState` with no
consistent reasoning.

## The rule

Pick the **first** bucket that applies, top-down:

### 1. Server data → React Query (always)

If the value comes from Supabase (Postgres, edge functions, storage) or any
other network source, it belongs in `@tanstack/react-query`.

- Hooks live under `src/hooks/queries/` (e.g. `useOrchardQueries.ts`,
  `useProductsBySower.ts`).
- Pure fetch functions live under `src/api/<entity>.ts` (e.g.
  `src/api/products.ts`, `src/api/orchards.ts`). They take inputs, return
  data, throw on error — no React, no caching.
- Query keys are stable factories per entity.
- **Never** call `supabase.from(...)` from inside a component when a hook
  exists or could exist. The 193-file direct-import sprawl is the single
  biggest source of waterfall fetches and missing cache invalidation.

### 2. Cross-page UI state → Zustand (`src/store/useAppStore.ts`)

If the state outlives a single page/feature and is **not** server data
(theme, notifications toasts, sidebar collapsed, user preferences, active
filter memory), put it on `useAppStore`.

- One store. Partialized persistence (already configured).
- Don't create a second store unless we have a real reason and a
  documented boundary.

### 3. Feature-scoped ephemeral state → Context

If state is **only meaningful inside one feature** and needs to reach
multiple components within that feature without prop-drilling, a Context
is acceptable.

Examples of legitimate contexts in this codebase:

- `ProductBasketContext` — basket items + localStorage sync, scoped to the
  basket/checkout flow.
- `AlbumBuilderContext` — track selection buffer while building an album.
- `LiveSessionPlaylistContext` — track selection buffer for live sessions.
- `VisualEditorContext` — editor mode + selected element while editing.
- `CallManagerContext` — call lifecycle reachable from any page that can
  receive an incoming call.
- `AppContext` — first-visit / onboarding / voice-commands flags.

Rules for new contexts:

- Must be **feature-scoped**. "App-wide" is a smell — that's Zustand.
- Must have an `interface` for its value and a `useXxx()` hook with a
  meaningful `throw` if used outside its provider.
- Must persist to localStorage **only** if losing the state on reload is
  unacceptable for that feature.
- **Do not** put server data in a Context. Use React Query.
- Aim to keep contexts under ~150 lines. If a context grows past that,
  it's probably hiding server data or doing too much.

### 4. Truly local UI state → `useState` / `useReducer`

Form values, hover, open/close of a single popover, draft text before
submit. If only one component cares, keep it local.

## Anti-patterns to reject in review

- A new context that wraps Supabase calls → that's React Query.
- A new context for a single boolean used in 2 sibling components → lift
  to `useAppStore` or accept the prop.
- A 7th top-level context that overlaps with an existing one.
- `useEffect(() => { supabase.from(...).then(setState) }, [...])` in a
  component — replace with a query hook.
- `console.log` for debugging — use `src/lib/logging.ts`.

## When in doubt

Default to **React Query (server) → Zustand (UI) → local `useState`**.
Reach for Context last, and only with a documented feature boundary.
