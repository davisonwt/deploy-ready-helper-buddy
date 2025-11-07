-- Create premium_rooms table
CREATE TABLE public.premium_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'classroom',
  max_participants INTEGER NOT NULL DEFAULT 50,
  is_public BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC NOT NULL DEFAULT 0,
  documents JSONB DEFAULT '[]'::jsonb,
  artwork JSONB DEFAULT '[]'::jsonb,
  music JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_rooms ENABLE ROW LEVEL SECURITY;

-- Users can create their own premium rooms
CREATE POLICY "Users can create their own premium rooms"
ON public.premium_rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Users can view their own premium rooms
CREATE POLICY "Users can view their own premium rooms"
ON public.premium_rooms
FOR SELECT
TO authenticated
USING (auth.uid() = creator_id);

-- Users can view public premium rooms
CREATE POLICY "Users can view public premium rooms"
ON public.premium_rooms
FOR SELECT
TO authenticated
USING (is_public = true);

-- Users can update their own premium rooms
CREATE POLICY "Users can update their own premium rooms"
ON public.premium_rooms
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- Users can delete their own premium rooms
CREATE POLICY "Users can delete their own premium rooms"
ON public.premium_rooms
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- Create updated_at trigger
CREATE TRIGGER update_premium_rooms_updated_at
BEFORE UPDATE ON public.premium_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();