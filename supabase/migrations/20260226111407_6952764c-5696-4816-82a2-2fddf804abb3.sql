
-- ============================================================
-- CONSOLIDATE DJ PROFILES: Move all data to newest profile
-- Target: ba1dbb88-6527-4004-b931-2b41279b5e55
-- User: 04754d57-d41d-4ea7-93df-542047a6785b
-- ============================================================

-- 1. Move all music tracks from old profiles to newest
UPDATE dj_music_tracks SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 2. Move all playlists
UPDATE dj_playlists SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 3. Move schedule entries
UPDATE radio_schedule SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 4. Move shows
UPDATE radio_shows SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 5. Move stats
UPDATE radio_stats SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 6. Move badges
UPDATE radio_dj_badges SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 7. Move live hosts
UPDATE radio_live_hosts SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 8. Move seed plays
UPDATE radio_seed_plays SET dj_id = 'ba1dbb88-6527-4004-b931-2b41279b5e55'
WHERE dj_id IN (
  SELECT id FROM radio_djs 
  WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55'
);

-- 9. Delete all duplicate DJ profiles (keep only newest)
DELETE FROM radio_djs 
WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
AND id != 'ba1dbb88-6527-4004-b931-2b41279b5e55';

-- 10. Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS radio_djs_user_id_unique ON radio_djs(user_id);
