## Goal

At the top of the Tribal Feed (`/orchard-alive`), add a sticky "Live Now" placeholder strip that lets a tribe member jump into any active live session — radio, 1-on-1, community chat, classroom, SkillDrop, training and premium rooms — without leaving the feed.

```text
┌──────────────────────────────────────────────────────────────────┐
│  ●LIVE NOW   [ All ][ Radio ][ Classroom ][ SkillDrop ]…    7  │
│  ─────────────────────────────────────────────────────  Open →  │
│   "Friday Night Tribe"  ·  Davison  ·  Radio  ·  41 listening   │
└──────────────────────────────────────────────────────────────────┘
```

Tap the strip → opens the new `Live Lounge` page where the user can scroll through every active live session and pick one to join.

## What to build

### 1. New page — `Live Lounge` (`/live-lounge`)

A vertically scrollable list of every active live session, grouped by kind:

- **1-on-1 Live** — `live_rooms` where `is_active = true`
- **Community Chat** — `chat_rooms` (active flag)
- **Classroom** — `classroom_sessions` (status active / live)
- **SkillDrop** — `skilldrop_sessions` (status live)
- **Training / Premium Room** — `premium_rooms` where `is_live = true` (or has active `live_streams` row)
- **Radio** — `radio_live_sessions` (status `live`)

Each card shows: kind badge, title, host name + avatar, listeners/participants count, started-at, "Join" CTA. Filter chips at the top (`All / 1-on-1 / Community / Classroom / SkillDrop / Training / Radio`). Empty state per kind: "No live sessions yet — be the first to go live" with a button linking to `/communications-hub`.

Joining behavior:
- Radio → `/radio-sessions?session=:id`
- 1-on-1 / Community / Premium / Training → existing room route (Jitsi)
- Classroom / SkillDrop → respective session pages

Reuses `MidnightShell` for unified aesthetic.

### 2. New strip — `LiveNowStrip` placed at top of Tribal Feed

Sticky inside the feed header (below the SeedFlow row and tabs, above the dropdowns). Polls or subscribes to a single aggregate count + most-recent live session every 30s.

Renders:
- `● LIVE NOW · n` pill (red dot pulse)
- Quick-filter chip row: All · Radio · Classroom · SkillDrop · Training · 1-on-1 · Community
- One ticker line showing the most recent live ("Friday Night Tribe · Davison · Radio · 41 listening")
- Right-side `Open Lounge →` CTA

Clicking any chip opens the Lounge with that filter pre-applied (`/live-lounge?kind=radio`). Clicking the ticker opens the lounge or jumps directly into that session if only one is active. If `n === 0`, the strip becomes a soft prompt: "No tribe members live right now — Go Live →" linking to `/communications-hub`.

### 3. Route registration

Add lazy route in `src/App.tsx`:
```text
/live-lounge → ProtectedRoute > Layout > LiveLoungePage
```

### 4. Shared hook — `useLiveSessions(kind?)`

`src/hooks/useLiveSessions.ts` — fetches the active rows from each table in parallel, normalizes into one shape `{ id, kind, title, host, hostAvatar, count, startedAt, joinPath }`, exposes `{ sessions, total, byKind, loading, refresh }`. Realtime subscription where the table supports it (radio_live_sessions, live_rooms); 30s polling fallback otherwise.

## Technical notes

- **Files to add**
  - `src/pages/LiveLoungePage.tsx`
  - `src/components/live/LiveNowStrip.tsx`
  - `src/hooks/useLiveSessions.ts`
- **Files to edit**
  - `src/pages/TribalAliveFeedPage.tsx` — mount `<LiveNowStrip />` just below the SeedFlow header
  - `src/App.tsx` — register `/live-lounge` route
- **Aesthetic** — both new surfaces use `MidnightShell` + cyan/amber accents to match the Dashboard.
- **No DB migrations** — read-only over existing tables.
- **Performance** — single hook, parallel queries, 30s revalidation, suspense-friendly.

## Out of scope (not in this pass)

- Going live itself (already handled by `/communications-hub`).
- Listener count accuracy beyond what each table already exposes.
- Push notifications when someone goes live.
