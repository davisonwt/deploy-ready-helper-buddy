
# ChatApp Go-Live launcher — investigation report

Source of truth for the launcher: `src/pages/CommunicationsHub.tsx` (`LAUNCH_TYPES` + `createLaunch`). Each tile inserts a row in a different table and then `navigate(actionUrl)` to a destination route.

DB row counts (live): live_rooms=1, chat_rooms=82, chat_messages=179, classroom_sessions=1, skilldrop_sessions=1, premium_rooms=1, radio_broadcasts=0, live_room_participants=0, live_call_participants=0.

Note that the `LAUNCH_TYPES` list maps Training → `premium_rooms`, not a training-specific table.

---

## 1. 1-on-1 Live  →  VERDICT: BROKEN

- **Insert:** `live_rooms` (`name, slug, description, max_participants:2, created_by, is_active:true`).
- **Destination:** `navigate("/live-rooms?room=<id>")`.
- **Route conflict:** `src/routes/AppRoutes.tsx` declares `/live-rooms` **twice** — line 331 `<LiveRooms />` and line 443 `<LiveRoomsPage />`. React Router picks the first one.
  - `LiveRooms` (`src/pages/LiveRooms.tsx`) queries **`chat_rooms`**, not `live_rooms` (line 38). So the freshly inserted `live_rooms` row is invisible.
  - The Jitsi-capable `LiveRoomsPage` (which actually queries `live_rooms` and embeds `JitsiRoom`) is **unreachable** via this route.
  - `?room=<id>` query param is ignored by both pages — no auto-join.
- **RLS:** `live_rooms` SELECT policy is `is_active = true` — i.e. **any authenticated user can list and join any active 1-on-1**, no participant/invitee gate. `live_room_participants` and `live_call_participants` are both empty, so no enforcement exists in data either.
- **Backend:** Jitsi (when reachable) via `JitsiRoom`. No custom WebRTC. No edge function backing the 1-on-1 flow.
- **Evidence of dead-end:** invitees inserted only into `user_notifications` with an `action_url` pointing at the broken `/live-rooms?room=...` URL.

## 2. Community Chat  →  VERDICT: PLACEHOLDER-ONLY (dead-end redirect)

- **Insert:** `chat_rooms` (`room_type:'group'`, metadata stashes `scheduled_at`, `files`, `price`).
- **Destination:** `navigate("/chatapp?room=<id>")`.
- **Route:** `AppRoutes.tsx:272` — `/chatapp` is a `<Navigate to="/communications-hub#chats" replace />`. The `?room=<id>` query is **dropped** during the Navigate. User lands back on the same CommunicationsHub page (`#chats` doesn't render anything special there; the hub has no chat list view).
- The real `ChatApp` page (`src/pages/ChatApp.tsx`, which reads `?room=` and embeds `JitsiCall`) is **orphaned** — no route mounts it. So the creator never sees the room they just created from this entry point.
- **Tables actually working:** `chat_rooms` (82 rows), `chat_messages` (179 rows), `chat_participants` exist with sound RLS (`chat_messages` SELECT gated by `chat_participants.is_active=true`). But the launcher does **not** insert any `chat_participants` rows, so even if you reached `ChatApp`, the creator wouldn't satisfy the SELECT policy for messages.
- **Auth:** chat_rooms SELECT is `created_by OR is_member_of_chat(...)` — sound. But because launcher skips `chat_participants`, the invitees can't read either.

## 3. Classroom  →  VERDICT: PARTIALLY WORKING (row created + listed in feed, no actual classroom UI)

- **Insert:** `classroom_sessions` (`title, description, scheduled_at, instructor_id, is_free, session_fee, status:'scheduled'`).
- **Destination:** `navigate("/orchard-alive?classroom=<id>")` → `TribalAliveFeedPage`.
- `TribalAliveFeedPage` does `useSearchParams` but only reads `tier` (line 123) — `?classroom=<id>` is **ignored**. It does fetch `classroom_sessions` (line 229) and render each as a feed card with `href: "/classroom"` (line 461). `/classroom` route does **not exist** in `AppRoutes.tsx` → clicking through is a 404.
- No Jitsi/WebRTC wiring. No "join lecture" button bound to a meeting URL. The `classroom_sessions` table has `meeting_url` columns elsewhere, but the launcher doesn't populate them.
- **RLS:** SELECT policy `Authenticated users can view all classroom sessions: true` — wide open, no circle gating, despite a second per-circle policy. (Policies are OR'd, so the permissive one wins.) **Not correctly scoped**: anyone can see Classroom rows meant to be circle-gated.
- 1 row currently in table — confirms creation works, viewing does not.

## 4. SkillDrop  →  VERDICT: PARTIALLY WORKING (same shape as Classroom)

- **Insert:** `skilldrop_sessions` (`title, description, scheduled_at, presenter_id, pricing_type, session_fee, status:'scheduled'`).
- **Destination:** `navigate("/orchard-alive?skilldrop=<id>")` — also ignored by `TribalAliveFeedPage`. Feed card href is `/skilldrop` (line 477), and `/skilldrop` is **not a registered route** → 404.
- No Jitsi/WebRTC wiring; no join flow; `host_application` / `subscriptions` tables exist (`skilldrop_host_applications`, `skilldrop_session_subscriptions`) but launcher doesn't touch them.
- **RLS:** SELECT is `circle_id IS NULL OR member_of_circle OR presenter_id = auth.uid()`. Launcher inserts `circle_id = NULL`, so **every SkillDrop session created here is publicly visible to all authenticated users**, regardless of presenter intent.
- 1 row in table.

## 5. Training  →  VERDICT: PARTIALLY WORKING (row + viewer exist, no live-call surface)

- **Insert:** `premium_rooms` (`creator_id, title, description, room_type:'training', is_public:true, price, pricing_type, documents/artwork/music`).
- **Destination:** `navigate("/premium-room/<id>")` → `PremiumRoomViewPage` (`src/pages/PremiumRoomViewPage.tsx`) which **does** load the row by `useParams.id` (line 39, 237). So the creator and other users land on a real detail page.
- However, this is a content/media viewer, not a "training session" with a live call. No JitsiCall/JitsiRoom is mounted from this page based on my read. So it's a misnamed Training tile that really creates a public premium-room listing.
- Forced `is_public: true` means even sessions a creator wanted private get exposed; the launcher offers no "private" toggle.
- **RLS:** `Users can view public premium rooms (is_public = true)` OR owner — sound for the chosen public flag.
- 1 row in table.

## 6. Radio  →  VERDICT: BROKEN

- **Insert:** `radio_broadcasts` (`title, description, scheduled_at, broadcaster_id, status:'scheduled', thumbnail_url`).
- **Destination:** `navigate("/grove-station?radio=<id>")` → `GroveStationPage.jsx`. Searched the file: **zero references** to `radio_broadcasts`, `radio=`, `searchParams`, or `broadcaster`. The `?radio=<id>` is silently ignored; the page renders the generic Grove Station landing.
- **RLS — fatal bug:** `radio_broadcasts` SELECT is gated by `circle_id IN (user's circles)`. Launcher inserts **without `circle_id`** (NULL). NULL is not `IN (...)`, so the SELECT policy returns the row to **no one — not even the broadcaster who created it**. Combined with the destination ignoring the row, the radio entry is end-to-end dead.
- No edge function for radio session start (e.g. `grove-station-stream` exists but is for streaming, not for "go-live a scheduled broadcast"). 0 rows in `radio_broadcasts` confirms no one has ever successfully used this path.

---

## Cross-cutting issues

- **Duplicate `/live-rooms` route** (AppRoutes.tsx:331 and :443) — first wins, shadows the working Jitsi-backed page.
- **Orphan page:** `src/pages/ChatApp.tsx` — the only place that reads `?room=` and embeds `JitsiCall` for chat — has no route after the `/chatapp → /communications-hub` redirect was added.
- **Invitee notifications** (`user_notifications` inserts) point at action URLs that lead to dead-ends (Classroom/SkillDrop 404, Community Chat redirect-loop, Radio nowhere, 1-on-1 wrong table). Invitees who tap notifications will land on broken pages.
- **No `chat_participants` insert on community chat creation** — even if the destination page existed, the creator wouldn't satisfy the messages SELECT policy.
- **`/classroom` and `/skilldrop` routes are absent** from `AppRoutes.tsx`.
- **No console errors are guaranteed** because the failure mode is silent (queries return empty rows / redirect to a working page / 404 page); errors visible only after Click-through to non-existent routes.

## Per-feature summary table

| Feature | DB insert | Destination route | Reachable? | Backend (Jitsi/etc) wired? | Auth gating | Verdict |
|---|---|---|---|---|---|---|
| 1-on-1 Live | live_rooms ✅ | /live-rooms?room=… | Wrong page mounted (LiveRooms reads chat_rooms); Jitsi page unreachable | No | SELECT open to all auth users (no invitee gate) | BROKEN |
| Community Chat | chat_rooms ✅ | /chatapp?room=… | Redirect strips param; ChatApp page is orphaned | Jitsi exists in orphan page only | RLS sound on chat_rooms/messages, but no chat_participants insert | PLACEHOLDER-ONLY |
| Classroom | classroom_sessions ✅ | /orchard-alive?classroom=… | Feed lists row; per-id viewer 404 (`/classroom`) | No | SELECT wide-open ("Authenticated… true") | PARTIALLY WORKING |
| SkillDrop | skilldrop_sessions ✅ | /orchard-alive?skilldrop=… | Same as Classroom; `/skilldrop` 404 | No | circle_id NULL ⇒ public to all auth users | PARTIALLY WORKING |
| Training | premium_rooms ✅ | /premium-room/:id | Yes, viewer renders | No live-call surface | is_public:true forced; RLS sound for that | PARTIALLY WORKING |
| Radio | radio_broadcasts ✅ | /grove-station?radio=… | Param ignored, no per-id viewer | No | RLS requires circle_id but launcher leaves it NULL → invisible to all incl. creator | BROKEN |

No code changes made. Awaiting your instruction on which (if any) of these to fix first.
