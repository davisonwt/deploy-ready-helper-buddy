# Implementation Package — Seed file protection

No seed file is obtainable without a confirmed bestowal. A 45-second sample is the only
audio a non-purchaser can ever reach. On bestowal, the full file is delivered to the grower
through their 1-on-1 chat with the sower.

## THE CURRENT EXPOSURE

Established by direct testing, not inference:

- Both `music-tracks` and `premium-room` correctly reject anonymous requests. No random
  stranger can pull a file. That part works.
- The playback path calls `createSignedUrl(path, 3600)` from the browser. **The signed URL
  is itself the credential** — Supabase serves it with no auth header, so anyone holding
  the string downloads the full file for the next hour. It is visible in devtools, the
  network tab, and `document.querySelector('audio').src`.
- The 45-second cap is a `timeupdate` listener calling `pause()`. It never touches the
  network. The whole file has already been served.
- The RLS policy named **"DJs can view their own music tracks"** does not check ownership.
  Its qual only checks that `auth.uid()` exists in `radio_djs`. **Any registered DJ can mint
  a working download link for every track in the bucket.**
- **No policy anywhere checks whether anyone bought anything.** Access is by DJ role or file
  ownership. There is no purchase gate in the system at all.

## THE RULE

```
Preview  — a real 45-second audio file, a separate object, publicly readable.
Full     — never reachable by URL. Served only through a server-side check
           that confirms a completed bestowal by that user for that seed.
Delivery — on confirmed bestowal, the grower receives the seed in their 1-on-1
           chat with the sower.
```

The cap must be a fact about **what object exists**, not about how the player behaves.
Anything enforced in the browser is not enforced.

## DEPENDENCY — READ FIRST

Entitlements are granted on **confirmed** bestowal. The PayPal webhook currently rejects
every call and `processed_webhooks` has zero rows, all-time. Until confirmation works, no
entitlement would ever be granted and every purchaser would be locked out of what they paid
for.

**Do not ship the full-track gate until payment confirmation is verified working.** The
preview work below is independent and can ship first.

## SCOPE

### 1. Preview generation

Generate a real 45-second clip at upload time and store it as a separate object.

- Client-side trimming before upload is acceptable here. The sower generates the preview for
  their own track — a sower who uploads a full-length "preview" only gives away their own
  work, so there is no adversary to defend against at this step.
- Store previews in a dedicated bucket (`seed-previews`), public read, audio MIME types only,
  small file size limit.
- Store the preview path on the seed row alongside the full file path.
- If preview generation fails, the upload fails. A seed without a preview must not publish —
  otherwise the player falls back to the full track and we are back where we started.

Both upload paths need this: `UploadForm.tsx` → `products`, and `DJMusicUpload.jsx` →
`dj_music_tracks`.

### 2. Backfill

Existing content has no previews. `premium-room` holds 118 audio objects; `dj_music_tracks`
holds at least 26. Every one needs a preview generated before the player stops serving full
tracks, or existing seeds become silent.

Report the exact count first. Propose a backfill approach — a one-off script is fine — and
do not switch the player over until it has run.

### 3. Purchase-gated full-track access

Replace direct `createSignedUrl` from the browser with an edge function.

`get-seed-file`:
- Authenticates the caller.
- Checks for a **completed** bestowal by that user for that seed, across both
  `product_bestowals` and `content_purchases`. State plainly which table is authoritative for
  which seed type, and whether a sower automatically has access to their own seed.
- Returns a short-lived signed URL (60 seconds) only if entitled.
- Returns 403 otherwise, and logs the reason.

The client never receives a full-track storage path. It calls this function and gets a URL
or a refusal.

### 4. Fix the mis-scoped DJ policy

"DJs can view their own music tracks" grants every DJ read access to every track.

**Before narrowing it, establish what radio legitimately needs.** A DJ playing a playlist is
playing tracks they do not own — that is what a radio station is. Tightening this to
ownership alone would break broadcasting.

Report what the radio path actually requires, then write a policy that grants exactly that:
likely "tracks you own, or tracks in a playlist scheduled to a slot you are broadcasting."
Not broader.

### 5. Delivery to chat

On confirmed bestowal, post a message into the 1-on-1 conversation between grower and sower
containing the seed and a download action.

The message must not embed a signed URL — those expire and would leave a dead link in the
chat forever. It carries a reference; the download button calls `get-seed-file` and mints a
fresh URL each time, re-checking entitlement on every request.

## DO NOT CHANGE

- The bestowal, fee and payout logic fixed earlier today
- Cover art and thumbnail public read — those are meant to be public
- The classroom, session-materials and voice-note flows sharing `premium-room`
- `music-tracks` file size limits and MIME restrictions
- Auth, roles, or any RLS outside the two policies named above

## ACCEPTANCE CRITERIA

1. An anonymous visitor can play a 45-second preview and cannot obtain the full file by any
   means available in the browser, including reading the audio element's `src`.
2. A logged-in user who has not bestowed on a seed cannot obtain its full file. The edge
   function returns 403.
3. A user who has completed a bestowal can download the full file, and it arrives in their
   1-on-1 chat with the sower.
4. A DJ who has not bestowed on a track cannot download it, but can still broadcast it in a
   playlist they are scheduled for.
5. No full-track storage path is present anywhere in the client bundle or network responses
   for a non-entitled user.
6. Every existing seed has a preview and still plays.
7. A signed URL issued by `get-seed-file` expires within 60 seconds.
8. An upload with no generatable preview is rejected, not published.

## EDGE CASES

- A sower accessing their own seed
- A seed bestowed on, then refunded or reversed
- The same track existing in both `products` and `dj_music_tracks`
- A track already in a playlist when the policy narrows
- Album purchases granting access to every track
- Preview generation failing on an unusual audio container

## VERIFY BEFORE REPORTING DONE

- `npm run lint`, `npm test`
- Criteria 1, 2 and 4 tested by hand, including a devtools attempt to extract a full URL
- Confirm anonymous `curl` against the full-track path returns 403
- State plainly which criteria were not verified and why
