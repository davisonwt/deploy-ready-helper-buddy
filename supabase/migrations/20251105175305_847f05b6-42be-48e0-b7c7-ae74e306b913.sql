-- Drop table if exists
DROP TABLE IF EXISTS public.live_rooms CASCADE;

-- Create live_rooms table for TikTok-style video rooms
CREATE TABLE public.live_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  current_participants INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 10,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_participants CHECK (current_participants >= 0 AND current_participants <= max_participants),
  CONSTRAINT valid_max_participants CHECK (max_participants >= 2 AND max_participants <= 50)
);

-- Create indexes first
CREATE INDEX idx_live_rooms_slug ON public.live_rooms(slug);
CREATE INDEX idx_live_rooms_created_by ON public.live_rooms(created_by);
CREATE INDEX idx_live_rooms_is_active ON public.live_rooms(is_active);

-- Enable RLS
ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active live rooms"
  ON public.live_rooms
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create live rooms"
  ON public.live_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms"
  ON public.live_rooms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Room creators can delete their rooms"
  ON public.live_rooms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);