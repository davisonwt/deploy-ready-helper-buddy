-- Add room_features column to chat_rooms for storing feature toggles
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS room_features JSONB DEFAULT '{"video_calls": true, "screen_share": true, "file_sharing": true, "voice_memos": true}'::jsonb;

-- Create chat_room_documents table for storing uploaded documents
CREATE TABLE IF NOT EXISTS chat_room_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploader_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chat_room_documents
ALTER TABLE chat_room_documents ENABLE ROW LEVEL SECURITY;

-- Policies for chat_room_documents
CREATE POLICY "Room participants can view documents"
ON chat_room_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = chat_room_documents.room_id
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
);

CREATE POLICY "Room moderators can upload documents"
ON chat_room_documents FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id AND
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = chat_room_documents.room_id
    AND cp.user_id = auth.uid()
    AND cp.is_moderator = true
    AND cp.is_active = true
  )
);

-- Create room_playlists table for linking playlists to rooms
CREATE TABLE IF NOT EXISTS room_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES dj_playlists(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, playlist_id)
);

-- Enable RLS on room_playlists
ALTER TABLE room_playlists ENABLE ROW LEVEL SECURITY;

-- Policies for room_playlists
CREATE POLICY "Room participants can view playlists"
ON room_playlists FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = room_playlists.room_id
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
);

CREATE POLICY "Room moderators can manage playlists"
ON room_playlists FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = room_playlists.room_id
    AND cp.user_id = auth.uid()
    AND cp.is_moderator = true
    AND cp.is_active = true
  )
);

-- Create room_monetization table for storing monetization settings
CREATE TABLE IF NOT EXISTS room_monetization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES chat_rooms(id) ON DELETE CASCADE,
  enable_paid_entry BOOLEAN DEFAULT false,
  entry_fee NUMERIC(10,2),
  enable_ads BOOLEAN DEFAULT false,
  ad_slots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on room_monetization
ALTER TABLE room_monetization ENABLE ROW LEVEL SECURITY;

-- Policies for room_monetization
CREATE POLICY "Room participants can view monetization settings"
ON room_monetization FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = room_monetization.room_id
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
);

CREATE POLICY "Room creators can manage monetization"
ON room_monetization FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = room_monetization.room_id
    AND cr.created_by = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_room_documents_room_id ON chat_room_documents(room_id);
CREATE INDEX IF NOT EXISTS idx_room_playlists_room_id ON room_playlists(room_id);
CREATE INDEX IF NOT EXISTS idx_room_playlists_playlist_id ON room_playlists(playlist_id);
CREATE INDEX IF NOT EXISTS idx_room_monetization_room_id ON room_monetization(room_id);