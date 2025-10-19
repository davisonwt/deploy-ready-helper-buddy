-- Add is_public column to dj_music_tracks to control visibility in public library
ALTER TABLE dj_music_tracks
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add index for faster public track queries
CREATE INDEX IF NOT EXISTS idx_dj_music_tracks_public 
ON dj_music_tracks(is_public, created_at DESC) 
WHERE is_public = true;

-- Update RLS policy to allow public viewing of public tracks
CREATE POLICY "Anyone can view public music tracks"
ON dj_music_tracks
FOR SELECT
USING (is_public = true);

COMMENT ON COLUMN dj_music_tracks.is_public IS 'Whether this track is visible in the public music library for purchase';