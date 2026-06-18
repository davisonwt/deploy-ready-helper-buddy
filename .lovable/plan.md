## Scope (F1 confirmed — legacy tracks stay playable as-is)

Two deliverables, nothing else:

### 1. "Allow on radio" opt-in on music sow

**Migration:**
- `dj_music_tracks.radio_eligible boolean not null default false`
- `dj_music_tracks.radio_opted_in_at timestamptz`

**UI:**
- `useDJPlaylist.jsx` `uploadTrack()` accepts `radioEligible` in `trackData` and writes it to the insert.
- Find the music upload form (likely `src/components/dj/...` or used by `useDirectMusicUpload`) and add one checkbox:
  > ☐ Allow this track on community radio playlists (radio hosts can include it in their shows)

**Radio host picker:** Out of scope for this message — column is set now, hosts can filter `radio_eligible = true` from existing picker later. (Confirm before extending.)

### 2. GoSat roundup message to existing music sowers

**New page** `src/pages/MyRadioOptInPage.tsx` at route `/my-radio-opt-in`:
- Lists logged-in user's `dj_music_tracks` rows.
- Toggle per track to flip `radio_eligible`.
- Save updates `radio_opted_in_at = now()`.

**New edge function** `gosat-radio-roundup` (admin-invoked, one-shot):
- Service-role client.
- Loops every distinct `dj_id` in `dj_music_tracks` that has ≥1 track and no `radio_opted_in_at` set.
- For each, resolves the GoSat system user (config: env `GOSAT_USER_ID`).
- Calls `get_or_create_direct_room(gosat_id, user_id)` RPC.
- Inserts one `chat_messages` row from GoSat:
  > "Greetings from GoSat 🌳 — you've sown {N} music seeds on Sow2Grow. Pick which you'd like the community radio hosts to be able to play: [link to /my-radio-opt-in]"
- Logs sent users to avoid re-sending (uses a tiny `gosat_radio_roundup_sent` table or an `audit_log` row).

**Trigger:** I'll add an admin button on `/admin/radio` (or wherever convenient — point me to it) that POSTs to the function. Or you run it once via SQL editor — your call.

### Files touched
- `supabase/migrations/<new>.sql` (column adds + tiny sent-log table)
- `src/hooks/useDJPlaylist.jsx` (pass-through)
- The music upload form component (one checkbox) — I'll grep for it after approval
- `src/pages/MyRadioOptInPage.tsx` (new)
- `src/App.tsx` (route)
- `supabase/functions/gosat-radio-roundup/index.ts` (new)

### Out of scope (will NOT touch this round)
- Step 2 music preview/private bucket/full-song delivery (separate next message — you said simpler & rock-solid; that's its own focused pass).
- Existing radio host picker UI.
- Legacy track migration.

### Two things I need from you
1. **GoSat sender identity:** is there an existing user UUID for GoSat (the system bot)? If yes, share it; if no, I'll add an env var `GOSAT_USER_ID` you fill in after creating the profile.
2. **How to trigger the roundup:** admin button on `/admin/radio`, or one-shot manual invoke from Supabase dashboard?
