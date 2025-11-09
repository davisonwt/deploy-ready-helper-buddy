
-- Fix duplicate key error in create_verification_room function
-- Add ON CONFLICT DO NOTHING to handle cases where user already exists
CREATE OR REPLACE FUNCTION public.create_verification_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  INSERT INTO public.chat_rooms (name, room_type, created_by, is_system_room)
  VALUES ('Sow2Grow Verification', 'direct', NEW.user_id, true)
  RETURNING id INTO new_room_id;
  
  -- Add new user as participant (handle duplicates gracefully)
  INSERT INTO public.chat_participants (room_id, user_id, is_active)
  VALUES (new_room_id, NEW.user_id, true)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
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
