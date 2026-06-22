## Goal
Make 1-on-1 Live a real private DM room: invite-gated, with persisted text + voice notes + video clips + a true 2-person Jitsi call. No partial pieces.

---

## 1. Route collision — `AppRoutes.tsx`

- Remove the **first** `/live-rooms` route (lines 331–333) that mounts the orphan `LiveRooms` component (which queries `chat_rooms`, wrong table).
- Keep the second `/live-rooms` route (line 443) using `LiveRoomsPage`, but wrap it in `ProtectedRoute` (it's a private DM surface now, not a public lobby).
- **Recommendation for the orphan `src/pages/LiveRooms.tsx` + its lazy export:** delete both. It was a duplicate built against the wrong table and nothing else links to it. Cleaner than repurposing.

## 2. RLS — `live_rooms` + `live_room_participants` (migration)

Replace the current "Anyone can view active live rooms" + "Authenticated users can join rooms" policies.

**`live_rooms`:**
- `SELECT`: only if `auth.uid() = created_by` OR `EXISTS(select 1 from live_room_participants where room_id = live_rooms.id and user_id = auth.uid())`.
- `INSERT`: `auth.uid() = created_by` (keep).
- `UPDATE`/`DELETE`: creator only (keep).

**`live_room_participants`:**
- `SELECT`: only participants of the same room (use security-definer helper `is_live_room_participant(room_id, uid)` to avoid recursion).
- `INSERT`: creator can add anyone; user can insert their own row only if they were already invited (row exists with `role='invited'`) — we'll handle invite seeding server-side in step 3, so client-side INSERT can be restricted to `auth.uid() = user_id AND is_live_room_participant(room_id, auth.uid())`.
- `UPDATE` self / `DELETE` self only.

Add security-definer fn `public.is_live_room_participant(_room uuid, _user uuid) returns boolean`.

## 3. Invite seeding — `CommunicationsHub.tsx` `createLaunch()`

After the `live_rooms` insert (line 76), in the same flow:
- Insert participant rows into `live_room_participants` for **(a)** the creator (`role='host'`) and **(b)** every `invitees[]` user (`role='invited'`).
- Keep the existing `user_notifications` insert with `action_url = /live-rooms?room=<id>`.
- Bump `max_participants` to match the actual invite count + 1 (capped, default 2 for true 1-on-1).

## 4. `?room=<id>` auto-join — `LiveRoomsPage.tsx`

Rewrite the page from "public lobby grid" to "my private rooms + auto-join":
- Read `room` (uuid) from `useSearchParams`.
- Query only rooms the user can see (RLS now scopes this to host + invited rows).
- If `?room=<id>` is present and matches one of those rows → directly mount the room view (no display-name gate when authed — use profile display_name).
- Otherwise show the list of the user's own 1-on-1 rooms.
- Use `room.id` (uuid) — not `slug` — as the Jitsi room name so two different 1-on-1s can never collide. Pass it to `JitsiRoom roomName={`s2g-1v1-${room.id}`}`.

## 5. Messaging surface — new component `src/components/live/OneOnOneRoom.tsx`

A single split view rendered by `LiveRoomsPage` when a room is active:
- **Header:** room name, the other participant's name, "Start video call" + "Start audio call" buttons, "Leave" button.
- **Message thread (main):** uses new table `live_room_messages` (see step 6). Realtime via Supabase channel scoped to `room_id`. Renders text, audio-note bubble (inline `<audio controls>`), video-clip bubble (inline `<video controls>`).
- **Composer (bottom):** text input + send, mic button (record voice note), camera button (record short video clip ≤30s using `MediaRecorder`), or file-pick fallback. Uploads to `chat-media` bucket then inserts a message row.
- **Call modal:** clicking call buttons opens `JitsiRoom` overlay (existing component) with `roomName = s2g-1v1-${room.id}` + `?audio` flag for audio-only (start muted-video).

Helper hooks/files:
- `src/hooks/useLiveRoomMessages.ts` — fetch + realtime subscribe + send.
- `src/hooks/useMediaRecorder.ts` — small wrapper around `MediaRecorder` for audio + video clip capture with duration cap and Blob return.
- `src/lib/liveRoom/uploadMedia.ts` — uploads Blob to `chat-media/<room_id>/<uuid>.<ext>`, returns public/signed URL.

## 6. DB — new table `live_room_messages` + storage bucket (migration)

```sql
create table public.live_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  sender_id uuid not null,
  message_type text not null check (message_type in ('text','voice','video')),
  content text,                  -- text body, or caption
  media_url text,                -- for voice/video
  media_duration_seconds int,
  mime_type text,
  created_at timestamptz not null default now()
);
-- GRANTs (authenticated + service_role; no anon)
-- RLS: SELECT/INSERT only if is_live_room_participant(room_id, auth.uid()); sender_id must = auth.uid() on INSERT
-- Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE public.live_room_messages;
-- Index on (room_id, created_at).
```

Storage: create private bucket `chat-media` via `supabase--storage_create_bucket`. Add `storage.objects` RLS so only participants of the room (path prefix = `<room_id>/...`) can read/insert.

## 7. Jitsi — true 2-person isolation

- Use `roomName = s2g-1v1-<live_room.id>` everywhere (uuid is unguessable). 
- Pass `password` derived deterministically from the room id + a server-side secret? Out of scope unless you want it — the uuid alone is already infeasible to guess. **Flag: confirm uuid-only is acceptable, or do you want me to also set a Jitsi room password?**
- Audio-only call = launch Jitsi with `startWithVideoMuted: true` (already supported by `JitsiRoom` config — verify and pass through prop).

---

## Files touched

**Edit**
- `src/routes/AppRoutes.tsx` — remove dup route, protect kept route.
- `src/routes/lazyPages.ts` — remove `LiveRooms` export.
- `src/pages/LiveRoomsPage.tsx` — rewrite for owned-rooms list + `?room=` auto-mount.
- `src/pages/CommunicationsHub.tsx` — seed `live_room_participants` on create.
- `src/components/jitsi/JitsiRoom.tsx` — accept `audioOnly?: boolean` prop.

**Create**
- `src/components/live/OneOnOneRoom.tsx`
- `src/hooks/useLiveRoomMessages.ts`
- `src/hooks/useMediaRecorder.ts`
- `src/lib/liveRoom/uploadMedia.ts`

**Delete**
- `src/pages/LiveRooms.tsx`

**Migrations**
- One migration: new `live_room_messages` table + GRANTs + RLS + realtime publication + `is_live_room_participant()` definer fn + rewritten policies on `live_rooms` and `live_room_participants`.
- `chat-media` bucket via storage tool + `storage.objects` policies migration.

---

## Open questions (please confirm before I build)

1. **Jitsi password:** uuid-only room name (unguessable) vs. also setting a per-room password? I lean uuid-only — simpler, no UX friction.
2. **Voice/video clip length cap:** propose 60s for voice notes, 30s for video clips. OK?
3. **Bucket public vs private:** I'll make `chat-media` **private** + serve via signed URLs (5-min expiry on fetch). Confirm — public would be simpler but leaks media if URL escapes.
4. **Orphan `LiveRooms.tsx`:** delete (my recommendation), or do you want it repurposed for something else first?
