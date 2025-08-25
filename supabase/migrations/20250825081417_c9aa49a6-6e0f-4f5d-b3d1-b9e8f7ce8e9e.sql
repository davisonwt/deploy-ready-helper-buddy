-- Create rooms table with proper structure for Clubhouse-style sessions
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  admins UUID[] DEFAULT '{}',
  co_hosts UUID[] DEFAULT '{}', 
  starting_guests UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  max_participants INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create participants table for tracking session participants
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'admin', 'co_host', 'guest', 'audience')),
  queue_position INTEGER,
  is_speaking BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT true,
  hand_raised_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- Create recordings table for audio messages
CREATE TABLE public.room_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gifts table for virtual currency
CREATE TABLE public.room_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gift_type TEXT NOT NULL CHECK (gift_type IN ('hearts', 'usdc', 'diamonds')),
  amount NUMERIC NOT NULL DEFAULT 1,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms they have access to"
ON public.rooms FOR SELECT
USING (
  creator_id = auth.uid() OR 
  auth.uid() = ANY(admins) OR 
  auth.uid() = ANY(co_hosts) OR 
  auth.uid() = ANY(starting_guests) OR
  is_active = true
);

CREATE POLICY "Users can create their own rooms"
ON public.rooms FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Room creators and admins can update rooms"
ON public.rooms FOR UPDATE
USING (creator_id = auth.uid() OR auth.uid() = ANY(admins));

-- RLS Policies for participants
CREATE POLICY "Users can view participants in accessible rooms"
ON public.room_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id AND (
      creator_id = auth.uid() OR 
      auth.uid() = ANY(admins) OR 
      auth.uid() = ANY(co_hosts) OR 
      auth.uid() = ANY(starting_guests) OR
      is_active = true
    )
  )
);

CREATE POLICY "Users can join as participants"
ON public.room_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
ON public.room_participants FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.rooms 
  WHERE id = room_id AND (creator_id = auth.uid() OR auth.uid() = ANY(admins))
));

-- RLS Policies for recordings
CREATE POLICY "Users can view recordings in accessible rooms"
ON public.room_recordings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id AND (
      creator_id = auth.uid() OR 
      auth.uid() = ANY(admins) OR 
      auth.uid() = ANY(co_hosts) OR 
      auth.uid() = ANY(starting_guests) OR
      is_active = true
    )
  )
);

CREATE POLICY "Users can create their own recordings"
ON public.room_recordings FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for gifts
CREATE POLICY "Users can view gifts in accessible rooms"
ON public.room_gifts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id AND (
      creator_id = auth.uid() OR 
      auth.uid() = ANY(admins) OR 
      auth.uid() = ANY(co_hosts) OR 
      auth.uid() = ANY(starting_guests) OR
      is_active = true
    )
  )
);

CREATE POLICY "Users can send gifts"
ON public.room_gifts FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_rooms_creator ON public.rooms(creator_id);
CREATE INDEX idx_rooms_active ON public.rooms(is_active);
CREATE INDEX idx_room_participants_room ON public.room_participants(room_id);
CREATE INDEX idx_room_participants_user ON public.room_participants(user_id);
CREATE INDEX idx_room_recordings_room ON public.room_recordings(room_id);
CREATE INDEX idx_room_gifts_room ON public.room_gifts(room_id);