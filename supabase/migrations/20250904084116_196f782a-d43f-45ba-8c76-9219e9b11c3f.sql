-- Fix the BMP column name to BPM
DO $$ 
BEGIN
    -- Rename bmp to bmp if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dj_music_tracks' 
        AND column_name = 'bmp'
    ) THEN
        ALTER TABLE public.dj_music_tracks 
        RENAME COLUMN bmp TO bpm;
    END IF;
END $$;