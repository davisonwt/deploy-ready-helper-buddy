# Plan: Music preview/delivery flow + premium-room lockdown

You answered three things. Two are straightforward. One (#3) changes the safest order of operations, so I'm asking before doing anything.

---

## Your answers, restated

1. **Music flow you want:**
   - Anyone can play a **40-second preview** of a song (no payment).
   - To get the full file, a listener must **bestow** the song (or full album).
   - On successful bestowal, the full file is **delivered as a 1-on-1 ChatApp message** to the buyer, where they can download it.
   - Separately, the **sower can opt-in** each song/album to "available for radio." Opted-in tracks appear in a pool that radio hosts pick from.

2. **Premium-room paywall bypass:** full fix (private bucket + signed URLs gated by purchase check, not just a stop-gap).

3. **You've never seen "Create Premium Room" in the app.** But the code exists (`src/pages/CreatePremiumRoomPage.jsx`, `PremiumRoomForm`, tables `premium_rooms` / `premium_item_purchases` / `premium_room_access`, and 100+ files live in the `premium-room` storage bucket from multiple users between Nov 2025 and Mar 2026).

---

## Why #3 matters before I change anything

Files are in the bucket → **someone is uploading**. Either:
- (a) It's reachable from a page/route you forgot about or that's hidden behind a role/flag, **or**
- (b) It was reachable in a past version and the uploads are stale, **or**
- (c) A different app/admin tool writes to it.

If I flip the bucket private + add signed-URL gating before knowing which, I could either:
- break a live seller flow you didn't know existed, or
- lock down dead data and waste effort.

**I need to investigate first** (read-only) and report back. No DB or storage changes until you see what I find.

---

## Proposed execution order

### Step 0 — Investigate premium-room (read-only, no changes)
- Search the whole repo (not just `src/`) for routes/links pointing to `/create-premium-room` or `PremiumRoomForm`.
- Check `App.tsx` / router config to see if the route is mounted, and behind what guard.
- Query `premium_rooms` and `premium_item_purchases` for row counts + latest `created_at` to see if it's live or dormant.
- Report back to you: "Here's what's using it / nothing is using it / it's behind X role." **Then** you decide.

### Step 1 — Premium-room lockdown (full fix), only after Step 0
1. Flip `premium-room` bucket to `public=false`.
2. Drop the wide-open `SELECT` policy on `storage.objects` for this bucket.
3. New SELECT policy: owner OR matching `premium_item_purchases`/`premium_room_access` row OR admin.
4. New edge function `get-premium-room-asset`: verifies purchase/access, returns a short-TTL signed URL.
5. Update `PremiumRoomForm` and any consumer to fetch via the edge function instead of the public URL.

### Step 2 — Music: 40-second preview + bestowal-gated full delivery
**Schema (one migration):**
- `dj_music_tracks`: add `preview_url text` (40s clip), `radio_eligible boolean default false`, `radio_approved_at timestamptz`.
- `products` (music license rows already exist via `music_purchases`): no new columns needed; we'll use existing `music_purchases.payment_status='completed'` as the gate.
- New bucket `music-previews` (public, ≤40s clips only) + keep full-quality files in a private bucket `music-full` (migrate existing if needed — TBD in Step 0-style audit of current music storage).

**Frontend:**
- `RadioMode.tsx` and any music player: play from `preview_url` for non-purchasers; full `file_url` only if `music_purchases` row exists.
- Upload flow: when a sower uploads a song/album, auto-generate a 40s preview (server-side via edge function using ffmpeg in Deno, OR client-side via Web Audio API — I'll pick whichever you prefer in Step 0).
- Upload form: add **"Allow this on the radio"** checkbox → sets `radio_eligible=true`.

**Bestowal → ChatApp delivery:**
- Extend the existing bestowal/purchase webhook (the same one that writes `music_purchases.payment_status='completed'`) to:
  1. Create or fetch a 1-on-1 chat room between buyer and sower.
  2. Generate a signed URL for the full file (long TTL, e.g. 7 days, or regenerable on demand).
  3. Insert a `chat_messages` row with `message_type='music_delivery'` containing track metadata + download link.
- Buyer opens ChatApp → sees message → downloads.

**Radio host picker:**
- New page or admin section: list `dj_music_tracks WHERE radio_eligible=true AND radio_approved_at IS NOT NULL`.
- Hosts add to their `dj_playlists` from this pool.

### Step 3 — Verify
- Run `security--run_security_scan` again, confirm premium-room finding is gone and no new criticals.
- Manually test: non-purchaser plays preview (works), tries full URL (blocked), bestows → receives chat message → downloads (works).

---

## Scope I am NOT touching unless you say so
- Existing music already uploaded without previews → migration strategy TBD (regenerate previews? leave as-is?).
- Album bestowals: I'll mirror song flow but ask before changing `download-album` edge function behavior.
- Any other unrelated security warns from the scanner.

---

## What I need from you to proceed

**(A) Confirm I should start with Step 0 (read-only investigation of premium-room) and report back before any DB/storage changes.**

**(B) For the 40s preview generation, pick one:**
- Server-side (ffmpeg in an edge function) — runs once at upload, accurate, slightly more setup.
- Client-side (Web Audio API in the browser) — simpler, but the user's browser does the work.

**(C) Confirm: full song file is delivered ONLY via the 1-on-1 chat message — not also exposed in any "My Library" download page. Or do you want both?**

Once you answer A/B/C, I execute in order and check in after Step 0 before any destructive changes.
