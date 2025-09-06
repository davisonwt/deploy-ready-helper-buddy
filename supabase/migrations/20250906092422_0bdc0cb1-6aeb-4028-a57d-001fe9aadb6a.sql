-- Add session_id to radio_automated_sessions to link with live sessions (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'radio_automated_sessions' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE public.radio_automated_sessions 
        ADD COLUMN session_id UUID REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add current_track_index to track playback progress (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'radio_automated_sessions' 
                   AND column_name = 'current_track_index') THEN
        ALTER TABLE public.radio_automated_sessions 
        ADD COLUMN current_track_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add track timing information (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'radio_automated_sessions' 
                   AND column_name = 'track_started_at') THEN
        ALTER TABLE public.radio_automated_sessions 
        ADD COLUMN track_started_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_radio_automated_sessions_session_id ON public.radio_automated_sessions(session_id);

-- Update RLS policies to allow reading automated session info for listeners
DROP POLICY IF EXISTS "Anyone can view playing automated sessions" ON public.radio_automated_sessions;
CREATE POLICY "Anyone can view playing automated sessions" ON public.radio_automated_sessions
FOR SELECT
USING (playback_status = 'playing');