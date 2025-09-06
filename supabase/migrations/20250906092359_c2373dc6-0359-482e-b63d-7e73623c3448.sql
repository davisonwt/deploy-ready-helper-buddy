-- Add session_id to radio_automated_sessions to link with live sessions
ALTER TABLE public.radio_automated_sessions 
ADD COLUMN session_id UUID REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE;

-- Add current_track_index to track playback progress
ALTER TABLE public.radio_automated_sessions 
ADD COLUMN current_track_index INTEGER DEFAULT 0;

-- Add track timing information
ALTER TABLE public.radio_automated_sessions 
ADD COLUMN track_started_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_radio_automated_sessions_session_id ON public.radio_automated_sessions(session_id);
CREATE INDEX idx_radio_automated_sessions_status ON public.radio_automated_sessions(playback_status);

-- Update RLS policies to allow reading automated session info for listeners
CREATE POLICY "Anyone can view playing automated sessions" ON public.radio_automated_sessions
FOR SELECT
USING (playback_status = 'playing');