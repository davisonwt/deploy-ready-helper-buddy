-- Update the function to use ON CONFLICT
CREATE OR REPLACE FUNCTION public.create_verification_room_for_user(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id uuid;
  user_email text;
  user_username text;
  user_firstname text;
  profile_id_val uuid;
BEGIN
  -- Check if room already exists
  SELECT cr.id INTO new_room_id
  FROM public.chat_rooms cr
  JOIN public.chat_participants cp ON cr.id = cp.room_id
  WHERE cp.user_id = target_user_id
  AND (cr.name = 'Sow2Grow Verification' OR cr.is_system_room = true)
  LIMIT 1;
  
  IF new_room_id IS NOT NULL THEN
    RAISE NOTICE 'Verification room already exists: %', new_room_id;
    RETURN new_room_id;
  END IF;
  
  -- Get user data
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
  SELECT username, first_name, id INTO user_username, user_firstname, profile_id_val 
  FROM public.profiles WHERE user_id = target_user_id;
  
  -- Create verification room
  new_room_id := gen_random_uuid();
  
  INSERT INTO public.chat_rooms (id, name, room_type, created_by, is_system_room)
  VALUES (new_room_id, 'Sow2Grow Verification', 'direct', target_user_id, true);
  
  -- Add user as participant (use ON CONFLICT to handle duplicates)
  INSERT INTO public.chat_participants (room_id, user_id, is_active)
  VALUES (new_room_id, target_user_id, true)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  
  -- Send verification message
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
    'Welcome ' || COALESCE(user_firstname, 'Friend') || '! To finish set-up, please re-enter your credentials below to verify your identity.',
    'text',
    jsonb_build_object(
      'type', 'credential_verification',
      'action', 'verify_credentials',
      'is_system', true,
      'sender_name', 'Sow2Grow Bot',
      'profile_id', profile_id_val,
      'prefill_username', user_username,
      'prefill_email', user_email,
      'user_id', target_user_id
    )
  );
  
  RAISE NOTICE 'Created verification room % for user %', new_room_id, target_user_id;
  RETURN new_room_id;
END;
$$;

-- Create room for the current user
SELECT public.create_verification_room_for_user('04754d57-d41d-4ea7-93df-542047a6785b');