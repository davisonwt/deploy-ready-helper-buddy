-- Create verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'expired');

-- Add verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN verification_status verification_status DEFAULT 'pending',
ADD COLUMN verifier_id uuid,
ADD COLUMN verification_chat_id uuid,
ADD COLUMN verification_expires_at timestamp with time zone DEFAULT (now() + interval '24 hours');

-- Create verification chat type
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'verification';

-- Add message types for verification
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'verification_request';
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'verification_acknowledgment';

-- Create automated verifier user function
CREATE OR REPLACE FUNCTION create_system_verifier()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verifier_user_id uuid;
BEGIN
  -- Check if system verifier already exists
  SELECT user_id INTO verifier_user_id
  FROM public.profiles
  WHERE display_name = 'Sow2Grow Verifier'
  AND bio = 'Automated verification system';
  
  IF verifier_user_id IS NULL THEN
    -- Create a system verifier profile
    INSERT INTO public.profiles (
      id,
      user_id,
      first_name,
      last_name,
      display_name,
      bio,
      avatar_url,
      verification_status
    ) VALUES (
      gen_random_uuid(),
      gen_random_uuid(), -- This will be our system verifier ID
      'Sow2Grow',
      'Verifier',
      'Sow2Grow Verifier',
      'Automated verification system',
      '/lovable-uploads/72bd9f21-20e8-4691-9dcc-f69772f64277.png',
      'verified'
    ) RETURNING user_id INTO verifier_user_id;
  END IF;
  
  RETURN verifier_user_id;
END;
$$;

-- Create system verifier
SELECT create_system_verifier();

-- Function to create verification chat and send welcome message
CREATE OR REPLACE FUNCTION create_verification_chat(new_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verifier_id uuid;
  chat_room_id uuid;
  user_profile_data record;
BEGIN
  -- Get system verifier ID
  SELECT user_id INTO verifier_id
  FROM public.profiles
  WHERE display_name = 'Sow2Grow Verifier'
  LIMIT 1;
  
  IF verifier_id IS NULL THEN
    verifier_id := create_system_verifier();
  END IF;
  
  -- Get user profile info for personalized message
  SELECT first_name, last_name, display_name, email
  INTO user_profile_data
  FROM public.profiles p
  JOIN auth.users au ON p.user_id = au.id
  WHERE p.user_id = new_user_id;
  
  -- Create verification chat room
  INSERT INTO public.chat_rooms (
    name,
    description,
    room_type,
    created_by,
    max_participants,
    is_premium
  ) VALUES (
    'Account Verification',
    'Welcome to Sow2Grow! Please verify your account to access all features.',
    'verification',
    verifier_id,
    2,
    false
  ) RETURNING id INTO chat_room_id;
  
  -- Add both users as participants
  INSERT INTO public.chat_participants (room_id, user_id, is_moderator)
  VALUES 
    (chat_room_id, verifier_id, true),
    (chat_room_id, new_user_id, false);
  
  -- Send welcome verification message
  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    content,
    message_type
  ) VALUES (
    chat_room_id,
    verifier_id,
    format('Welcome to Sow2Grow, %s! 🌱

Your account has been created successfully. To access all features of our platform, please verify your account by replying to this message with: "I confirm my account"

Account Details:
• Name: %s %s
• Email: %s
• Registration Time: %s

Simply reply with the confirmation phrase above to unlock:
🌱 Create and manage orchards
💝 Send and receive bestowals
🤝 Join premium chat rooms
📊 Access your dashboard
🎯 Participate in community features

Need help? Just ask! We''re here to help you grow. 💚',
      COALESCE(user_profile_data.first_name, 'Friend'),
      COALESCE(user_profile_data.first_name, ''),
      COALESCE(user_profile_data.last_name, ''),
      COALESCE(user_profile_data.email, 'Not provided'),
      to_char(now(), 'YYYY-MM-DD HH24:MI:SS UTC')
    ),
    'verification_request'
  );
  
  -- Update user profile with verification chat info
  UPDATE public.profiles
  SET 
    verifier_id = verifier_id,
    verification_chat_id = chat_room_id,
    verification_status = 'pending',
    verification_expires_at = now() + interval '24 hours'
  WHERE user_id = new_user_id;
  
  RETURN chat_room_id;
END;
$$;

-- Function to verify user account
CREATE OR REPLACE FUNCTION verify_user_account(user_id_param uuid, message_content text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_verification_message boolean := false;
BEGIN
  -- Check if message contains verification phrase
  IF lower(trim(message_content)) LIKE '%i confirm my account%' OR
     lower(trim(message_content)) = 'i confirm my account' THEN
    is_verification_message := true;
  END IF;
  
  -- If it's a verification message, verify the account
  IF is_verification_message THEN
    UPDATE public.profiles
    SET 
      verification_status = 'verified',
      verification_expires_at = null,
      updated_at = now()
    WHERE user_id = user_id_param;
    
    -- Send confirmation message
    INSERT INTO public.chat_messages (
      room_id,
      sender_id,
      content,
      message_type
    )
    SELECT 
      verification_chat_id,
      verifier_id,
      '🎉 Congratulations! Your account has been verified successfully!

You now have full access to all Sow2Grow features:
✅ Account verified
✅ All features unlocked
✅ Welcome to the community!

Feel free to explore:
• Create your first orchard in the Dashboard
• Browse existing orchards to bestow gifts
• Join community discussions
• Connect with other growers

Happy growing! 🌱💚',
      'verification_acknowledgment'
    FROM public.profiles
    WHERE user_id = user_id_param;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Trigger to create verification chat on new user registration
CREATE OR REPLACE FUNCTION handle_new_user_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create verification chat for new user
  PERFORM create_verification_chat(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger for new user verification
DROP TRIGGER IF EXISTS on_profile_created_verification ON public.profiles;
CREATE TRIGGER on_profile_created_verification
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_verification();

-- Function to handle verification message responses
CREATE OR REPLACE FUNCTION handle_verification_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_type_val text;
  sender_verification_status verification_status;
BEGIN
  -- Check if this is a verification room
  SELECT cr.room_type INTO room_type_val
  FROM public.chat_rooms cr
  WHERE cr.id = NEW.room_id;
  
  -- Get sender's verification status
  SELECT verification_status INTO sender_verification_status
  FROM public.profiles
  WHERE user_id = NEW.sender_id;
  
  -- Only process if it's a verification room and sender is pending verification
  IF room_type_val = 'verification' AND sender_verification_status = 'pending' THEN
    -- Try to verify the account based on message content
    PERFORM verify_user_account(NEW.sender_id, NEW.content);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for verification message handling
DROP TRIGGER IF EXISTS on_verification_message ON public.chat_messages;
CREATE TRIGGER on_verification_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_verification_message();

-- Enhanced RLS policies for verification system
CREATE POLICY "Users can view verification chats" 
ON public.chat_rooms 
FOR SELECT 
USING (
  room_type = 'verification' AND (
    auth.uid() IN (
      SELECT user_id FROM public.chat_participants 
      WHERE room_id = chat_rooms.id AND is_active = true
    )
  )
);

CREATE POLICY "Verification messages readable by participants" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    JOIN public.chat_rooms cr ON cp.room_id = cr.id
    WHERE cp.room_id = chat_messages.room_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
    AND cr.room_type = 'verification'
  )
);

-- Function to check if user is verified
CREATE OR REPLACE FUNCTION is_user_verified(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status = 'verified' 
     FROM public.profiles 
     WHERE user_id = user_id_param), 
    false
  );
$$;

-- Update existing RLS policies to consider verification status for core features
-- (We'll handle this in the frontend for now to avoid breaking existing functionality)