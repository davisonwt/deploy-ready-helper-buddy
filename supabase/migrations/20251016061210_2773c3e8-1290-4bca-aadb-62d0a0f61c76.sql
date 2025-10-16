-- Add fields for sower music marketplace
ALTER TABLE dj_music_tracks
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 1.25,
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS is_original BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- Add payment fields to radio_schedule
ALTER TABLE radio_schedule
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Add payment fields to chat_rooms (status already exists)
ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS current_listeners INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER;

-- Create table for tracking session purchases
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES radio_schedule(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payment_reference TEXT,
  amount NUMERIC NOT NULL,
  UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own session purchases"
ON user_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert session purchases"
ON user_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dj_music_tracks_sower ON dj_music_tracks(dj_id) WHERE is_original = true;
CREATE INDEX IF NOT EXISTS idx_radio_schedule_free ON radio_schedule(is_free, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Update music_purchases to track split payments
ALTER TABLE music_purchases
ADD COLUMN IF NOT EXISTS artist_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_amount NUMERIC,
ADD COLUMN IF NOT EXISTS admin_amount NUMERIC;