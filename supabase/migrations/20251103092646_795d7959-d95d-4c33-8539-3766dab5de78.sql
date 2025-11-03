-- Add username column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles(LOWER(username));

-- Update existing profiles to set username from auth.users email (before @)
UPDATE public.profiles p
SET username = SPLIT_PART(au.email, '@', 1)
FROM auth.users au
WHERE p.user_id = au.id 
AND p.username IS NULL 
AND au.email IS NOT NULL;

-- Update the verification room creation function to include credential verification
CREATE OR REPLACE FUNCTION public.create_verification_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id uuid;
  user_email text;
  user_username text;
BEGIN
  -- Only create verification room if user_id exists (not anonymous)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  -- Use existing username or generate from email
  user_username := COALESCE(NEW.username, SPLIT_PART(user_email, '@', 1));

  -- Create private room for verification
  INSERT INTO public.chat_rooms (name, is_private, created_by)
  VALUES ('Sow2Grow Verification', true, NEW.user_id)
  RETURNING id INTO new_room_id;
  
  -- Add new user as participant
  INSERT INTO public.chat_participants (room_id, user_id)
  VALUES (new_room_id, NEW.user_id);
  
  -- Send welcome message with credential verification form
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
    'Welcome ' || COALESCE(NEW.first_name, 'Friend') || '! To finish set-up, please re-enter your credentials below to verify your identity.',
    'text',
    jsonb_build_object(
      'type', 'credential_verification',
      'action', 'verify_credentials',
      'is_system', true,
      'sender_name', 'Sow2Grow Bot',
      'profile_id', NEW.id,
      'prefill_username', user_username,
      'prefill_email', user_email,
      'user_id', NEW.user_id
    )
  );
  
  RETURN NEW;
END;
$$;