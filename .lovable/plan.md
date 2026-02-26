

## Plan: Fix Radio Playback — Merge DJ Profiles & Enforce Single Profile

### Root Cause (Verified via Database)

The issue is NOT about routing or schedule selection. The real problem is **duplicate DJ profiles**:

- Your user has **40+ duplicate `radio_djs` entries** (created each time you clicked "Become a DJ")
- Your approved radio slots reference DJ profile `ba1dbb88-...` ("davison - sow2grow guide") — which has **0 music tracks**
- All 26 uploaded music tracks belong to an older DJ profile `bcef36bb-...` ("davison taljaard")
- When the player loads a slot, it queries `dj_music_tracks WHERE dj_id = ba1dbb88-...` → finds nothing → "No Music"

The music was never deleted — it's just linked to a different DJ profile than the one your scheduled slots reference.

### Changes

#### 1. Database Migration: Consolidate DJ profiles

- Move all `dj_music_tracks` from old profiles to the newest active profile (`ba1dbb88-...`)
- Move all `dj_playlists` similarly
- Update any `radio_schedule` entries pointing to old profiles
- Delete all duplicate DJ profiles for this user, keeping only the newest
- Add a **unique constraint** on `radio_djs(user_id)` to prevent future duplicates

```sql
-- Move tracks from ALL old profiles to newest
UPDATE dj_music_tracks SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (SELECT id FROM radio_djs WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55');

-- Move playlists
UPDATE dj_playlists SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (SELECT id FROM radio_djs WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55');

-- Move schedule entries  
UPDATE radio_schedule SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (SELECT id FROM radio_djs WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55');

-- Move shows, stats, badges, etc.
-- Delete duplicates
-- Add unique constraint on user_id
```

#### 2. Fix `useGroveStation.jsx` — `createDJProfile`

Change `createDJProfile` to use **upsert** behavior: check if a profile already exists for the user first, and return it instead of creating a duplicate.

#### 3. Fix `useDJPlaylist.jsx` — `fetchDJProfile`

Currently uses `.limit(1).single()` which may pick an arbitrary profile when duplicates exist. Change to sort by `created_at DESC` and pick the newest, matching what the scheduling system uses.

#### 4. Fix `CreateDJProfileForm.jsx`

Add a pre-check: if the user already has a DJ profile, show their existing profile instead of creating a new one.

---

### Technical Details

**Data migration targets** (all tables with `dj_id` foreign key):
- `dj_music_tracks` — 26 tracks to move
- `dj_playlists` — playlists to move
- `radio_schedule` — already on newest profile (8 slots)
- `radio_shows` — shows to move
- `radio_stats` — stats to move
- `radio_dj_badges` — badges to move
- `radio_live_hosts` — hosts to move
- `radio_seed_plays` — plays to move

**Unique constraint SQL:**
```sql
CREATE UNIQUE INDEX radio_djs_user_id_unique ON radio_djs(user_id);
```

This prevents any future duplicate profile creation at the database level.

