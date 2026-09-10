# Daily.co meeting sessions (join/leave times, no dashboard)

Lists Daily's own record of who joined a given room and when, straight
from their Meetings API -- useful for confirming whether two people who
both "joined fine" actually landed in the same live session, without
needing the Daily dashboard.

## 1. Get the API key

Supabase dashboard -> Project Settings -> Edge Functions -> Secrets (or
Project Settings -> API -> Edge Function Secrets, depending on dashboard
version) -> copy the value of `DAILY_API_KEY`. `supabase secrets list`
only prints secret *names*, never values, so this has to come from the
dashboard UI.

## 2. Run in PowerShell

```powershell
$DAILY_API_KEY = "paste-the-key-here"
$roomName = "custom-s2g-1v1-65790ecf-..."   # exact Daily room name, e.g. from the on-screen "Room: ..." line

curl.exe -s "https://api.daily.co/v1/meetings?room=$roomName" `
  -H "Authorization: Bearer $DAILY_API_KEY" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

(`curl.exe` explicitly, not the bare `curl` alias -- PowerShell aliases
`curl` to `Invoke-WebRequest`, which takes different flags and would
otherwise silently do the wrong thing here.)

## 3. What to look at in the response

Each entry in the returned array is one meeting *session* in that room:

- `id` -- Daily's session id. **If a call that felt like "both joined
  the same room" actually produced two different session ids for the
  two participants, that confirms they were in separate live sessions
  despite the same room name/URL** -- the thing this script exists to
  check.
- `room` -- should match `$roomName` exactly.
- `start_time` / `duration` -- when that session started and how long
  it ran.
- `participants` -- one entry per participant in *that* session, each
  with `user_id`, `join_time`, `duration`. Compare the two participants'
  `join_time`s and see whether they're in the same `participants` array
  (same session) or listed under two different top-level entries
  (different sessions -- the bug).

## Why this bug is plausible here

`create-daily-meeting-token` reuses one Daily room per pair of callers
indefinitely (`s2g-1v1-<sorted user ids>` / `custom-s2g-1v1-<roomId>`),
rather than minting a fresh room per call -- intentional, so repeat
callers land in an identifiable, persistent "room for us two." Every
room is created with `exp` (a Unix timestamp) and `eject_at_room_exp:
true`. Until the fix in this same commit, `exp` was set ONCE at create
time and never refreshed on later joins -- a room reused past its
original `ROOM_TTL_SECONDS` (4h) window is already expired, and
`eject_at_room_exp` forcibly ends whatever session was in it at that
moment. A participant joining well after that boundary can end up in
what Daily treats as a fresh call instance under the same name/URL as an
earlier participant who joined before expiry. `exp` is now refreshed on
every join (see `getOrCreateDailyRoom` in
`supabase/functions/create-daily-meeting-token/index.ts`) -- this script
is how to confirm from Daily's own data whether that was in fact what
happened on the test that prompted this.
