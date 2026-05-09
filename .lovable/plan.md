# Plan — Live Rooms 2.0 + Dashboard / Sower fixes

Big batch of related fixes. Grouped by area, in order.

## 1. Bugfix — sower names showing as "Sower" (image 3)

Wherever a seed is rendered (dashboard "MY SEEDS", Living Seed cards, Live placeholder), we currently fall back to the literal string `"Sower"` when no name is found. Resolve the real name from the same source we already use elsewhere:
- `profiles.display_name` → `profiles.first_name + last_name` → `profiles.username` → email prefix → "Sower"

Apply in:
- `src/components/garden/LivingSeedCard.tsx`
- `src/pages/DashboardPage.jsx` (MY SEEDS section)
- new live placeholder card (see §3)

## 2. Bugfix — user can't see their own seeds on dashboard (image 2)

Inspect the dashboard query that powers "MY SEEDS / your own". The dashboard currently shows "No orchards yet — your own + bestowed will live here." even when the user has seeds. Likely an RLS or `user_id` filter mismatch (e.g. filtering on `seed.owner_id` while data is `seed.sower_id`, or query returning bestowed-only rows). Fix the query and add a visible empty-state distinction between "no seeds planted" and "no bestowals yet".

## 3. Live notifications across Dashboard + Tribal Feeds

Today `useTribalLiveOrchard` already tracks who is live globally via Supabase presence on `tribal-orchard:global`. We will surface this:

**a. Dashboard** — new `<LiveNowStrip />` near the top of `DashboardPage`, hidden when no one is live. Each card:
  - Seed image / product cover
  - LIVE pulse badge
  - Host avatar + real name
  - "Join the Live" button → opens `LiveStageOverlay` as guest

**b. Tribal Feeds (`TribalAliveFeedPage`)** — same strip pinned at the top, plus an inline notice item in the feed when a new live starts.

## 4. "Live Pocket" — host invites guests up + faceless/camera

Already in `useLiveStage`: `raiseHand('voice'|'video')` + `approveHand`. We extend the host UI on `LiveStage` and the guest UI on the new "Joiners page":
- Guest taps **Ask to come up** → choose **Faceless (voice)** or **Camera on (video)**
- Host sees request in tray → **Bring up** → guest enters the pocket
- Pocket already supports up to N seats with mute/spotlight/remove

## 5. Second Live page — `/live/:seedId/room`

New route `LiveRoomDetailPage` opened from a "See everyone" button on the overlay. Shows:
- **Front stage** (left): host + currently spotlighted speaker only (mirrors what main view shows)
- **Pocket** (right top): approved guests with faceless/camera state
- **Queue** (right middle): hand-raised list with want=voice/video and Ask-Big requests
- **Joiners** (right bottom): everyone present (from presence) with avatar + display_name
- **Host tools panel**: product image carousel + videos for the seed
- **Inline chat**: existing `liveroom:${seedId}` broadcast channel

Front-stage `LiveStageOverlay` keeps showing only host + spotlighted speaker + names list (no full grid).

## 6. Delete buttons on seeds and lives

- **Seed delete**: trash button on each owned seed card (Dashboard MY SEEDS + Living Seed card when `sower_id === user.id`). Confirm dialog → `delete from seeds where id = ? and sower_id = auth.uid()`. RLS already restricts; we'll add a delete policy if missing.
- **Live delete (end live)**: red "End Live" button visible to host inside `LiveStageOverlay` and on the Live Now strip cards (host only). Calls existing `endLive()` + untracks presence.

## 7. Reset all currently-active lives

Lives are ephemeral Supabase **presence** records — there is no DB row to delete. Two safe actions:
- Server: bump the channel name to `tribal-orchard:global:v2` so all stale presences are dropped instantly.
- Also clear any `live_streams` / `live_sessions` rows flagged `is_live = true` via a one-shot SQL update setting them to ended (for any DB-backed live rows, if present).

## 8. Bugfix — `chat_participants_user_id_fkey` violation (image 1)

Seed messages tries to insert into `chat_participants` with a `user_id` that no longer exists in `auth.users` (or the wrong column). Fix:
- Change the seed-message open flow to look up an existing chat by `(seed_id, sower_id, viewer_id)` and only insert participants that exist in `auth.users`.
- Wrap in an upsert/`on conflict do nothing` so re-opens don't re-insert.
- Skip insert when `user_id == null`.

---

## Technical notes

**Files to add**
- `src/components/live/LiveNowStrip.tsx`
- `src/pages/LiveRoomDetailPage.tsx`
- route entry in `src/App.tsx` for `/live/:seedId/room`

**Files to edit**
- `src/components/garden/LivingSeedCard.tsx` — real sower name + delete button
- `src/pages/DashboardPage.jsx` — fix "MY SEEDS" query, real name, mount `<LiveNowStrip />`, delete button
- `src/pages/TribalAliveFeedPage.tsx` — mount `<LiveNowStrip />`, slim front stage
- `src/components/live/LiveStageOverlay.tsx` — open second page button, host-only End Live
- `src/components/live/LiveStage.tsx` — guest "Ask to come up" picker (faceless/camera)
- `src/hooks/useLiveStage.ts` — already exposes everything needed
- `src/hooks/useChat.jsx` (or seed-chat opener) — fix participant insert
- `src/hooks/useTribalLiveOrchard.ts` — bump channel to `:v2`

**DB migration (one)**
- (If missing) `seeds` delete RLS policy: `using (auth.uid() = sower_id)`
- One-time UPDATE on any `is_live` flagged rows in `live_*` tables to mark ended.
