-- Refresh schema cache by updating table comments to force PostgREST reload
COMMENT ON TABLE public.dj_playlist_tracks IS 'DJ playlist tracks - refreshed schema cache';
COMMENT ON TABLE public.dj_music_tracks IS 'DJ music tracks with duration_seconds column - refreshed schema cache';

-- Ensure all necessary columns exist and are properly typed
DO $$ 
BEGIN
  -- Verify dj_music_tracks has duration_seconds column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dj_music_tracks' 
    AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE public.dj_music_tracks ADD COLUMN duration_seconds INTEGER;
  END IF;
END $$;