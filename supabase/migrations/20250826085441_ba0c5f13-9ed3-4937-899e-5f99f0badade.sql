-- Add missing is_active column to dj_playlist_tracks table
ALTER TABLE dj_playlist_tracks 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Also ensure dj-music bucket exists (in case there was an issue)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dj-music', 'dj-music', true) 
ON CONFLICT (id) DO NOTHING;