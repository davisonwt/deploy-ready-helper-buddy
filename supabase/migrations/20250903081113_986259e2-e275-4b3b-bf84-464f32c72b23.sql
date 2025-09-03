-- Check if duration_seconds column exists and add it if missing
DO $$ 
BEGIN
    -- Add duration_seconds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dj_music_tracks' 
        AND column_name = 'duration_seconds'
    ) THEN
        ALTER TABLE public.dj_music_tracks 
        ADD COLUMN duration_seconds integer;
    END IF;
    
    -- Add file_size column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dj_music_tracks' 
        AND column_name = 'file_size'
    ) THEN
        ALTER TABLE public.dj_music_tracks 
        ADD COLUMN file_size bigint;
    END IF;
    
    -- Add bpm column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dj_music_tracks' 
        AND column_name = 'bpm'
    ) THEN
        ALTER TABLE public.dj_music_tracks 
        ADD COLUMN bmp integer;
    END IF;
END $$;