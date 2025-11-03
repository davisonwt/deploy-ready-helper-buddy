-- Add is_chatapp_verified column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_chatapp_verified BOOLEAN DEFAULT false;

-- Create index for faster verification checks
CREATE INDEX IF NOT EXISTS idx_profiles_chatapp_verified 
ON public.profiles(is_chatapp_verified);

-- Allow system messages (NULL sender_id) for verification
ALTER TABLE public.chat_messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- Function to create verification room for new user
CREATE OR REPLACE FUNCTION public.create_verification_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id uuid;
BEGIN
  -- Only create verification room if user_id exists (not anonymous)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create private room for verification
  INSERT INTO public.chat_rooms (name, is_private, created_by)
  VALUES ('Sow2Grow Verification', true, NEW.user_id)
  RETURNING id INTO new_room_id;
  
  -- Add new user as participant
  INSERT INTO public.chat_participants (room_id, user_id)
  VALUES (new_room_id, NEW.user_id);
  
  -- Send welcome message with verification button (sender_id NULL = system message)
  INSERT INTO public.chat_messages (
    room_id, 
    sender_id, 
    content, 
    message_type, 
    system_metadata
  )
  VALUES (
    new_room_id,
    NULL,
    'Welcome ' || COALESCE(NEW.first_name, 'Friend') || '! Please tap the button below to prove it''s really you.',
    'text',
    jsonb_build_object(
      'type', 'verification',
      'action', 'verify_account',
      'button_text', 'Verify my account',
      'is_system', true,
      'sender_name', 'Sow2Grow Bot',
      'profile_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create verification room on profile creation
DROP TRIGGER IF EXISTS on_profile_created_verification ON public.profiles;
CREATE TRIGGER on_profile_created_verification
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.is_chatapp_verified = false)
  EXECUTE FUNCTION public.create_verification_room();

-- RLS policy to allow reading system messages (sender_id IS NULL)
DROP POLICY IF EXISTS "System messages are viewable by room participants" ON public.chat_messages;
CREATE POLICY "System messages are viewable by room participants"
ON public.chat_messages
FOR SELECT
USING (
  sender_id IS NULL AND 
  room_id IN (
    SELECT room_id FROM public.chat_participants 
    WHERE user_id = auth.uid()
  )
);