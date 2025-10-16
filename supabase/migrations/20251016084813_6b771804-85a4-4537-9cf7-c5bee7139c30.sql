-- Create typing indicators table
CREATE TABLE IF NOT EXISTS public.typing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert/update their own typing status
CREATE POLICY "Users can manage their typing status"
ON public.typing
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can see typing status in rooms they're part of
CREATE POLICY "Users can view typing in their rooms"
ON public.typing
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = typing.room_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_typing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_typing_timestamp_trigger
BEFORE UPDATE ON public.typing
FOR EACH ROW
EXECUTE FUNCTION update_typing_timestamp();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing;