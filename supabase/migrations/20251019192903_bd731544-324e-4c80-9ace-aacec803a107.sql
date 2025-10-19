-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view public music tracks" ON dj_music_tracks;

-- Recreate the policy
CREATE POLICY "Anyone can view public music tracks"
ON dj_music_tracks
FOR SELECT
USING (is_public = true);