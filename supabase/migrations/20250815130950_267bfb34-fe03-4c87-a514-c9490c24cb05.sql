-- Fix security definer functions by setting proper search_path
-- These functions need SECURITY DEFINER but should have stable search_path

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fix is_admin_or_gosat function  
CREATE OR REPLACE FUNCTION public.is_admin_or_gosat(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gosat')
  )
$$;

-- Fix user_is_in_room function
CREATE OR REPLACE FUNCTION public.user_is_in_room(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = check_user_id 
    AND is_active = true
  );
$$;

-- Fix increment_orchard_views function
CREATE OR REPLACE FUNCTION public.increment_orchard_views(orchard_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orchards
  SET views = views + 1
  WHERE id = orchard_uuid;
END;
$$;

-- Fix handle_new_user function  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(
        NEW.raw_user_meta_data ->> 'first_name',
        ' ',
        NEW.raw_user_meta_data ->> 'last_name'
      )
    )
  );
  RETURN NEW;
END;
$$;

-- Fix get_or_create_direct_room function
CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    room_id UUID;
    room_name TEXT;
BEGIN
    -- Check if a direct room already exists between these users
    SELECT cr.id INTO room_id
    FROM chat_rooms cr
    WHERE cr.room_type = 'direct'
    AND EXISTS (
        SELECT 1 FROM chat_participants cp1 
        WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id AND cp1.is_active = true
    )
    AND EXISTS (
        SELECT 1 FROM chat_participants cp2 
        WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id AND cp2.is_active = true
    )
    AND (
        SELECT COUNT(*) FROM chat_participants cp 
        WHERE cp.room_id = cr.id AND cp.is_active = true
    ) = 2;

    -- If no room exists, create one
    IF room_id IS NULL THEN
        -- Create room name from user profiles
        SELECT CONCAT(
            COALESCE(p1.display_name, p1.first_name, 'User'), 
            ' & ', 
            COALESCE(p2.display_name, p2.first_name, 'User')
        ) INTO room_name
        FROM profiles p1, profiles p2
        WHERE p1.user_id = user1_id AND p2.user_id = user2_id;

        -- Create the room
        INSERT INTO chat_rooms (room_type, name, created_by, max_participants)
        VALUES ('direct', room_name, user1_id, NULL)
        RETURNING id INTO room_id;

        -- Add both users as participants
        INSERT INTO chat_participants (room_id, user_id, is_moderator)
        VALUES 
            (room_id, user1_id, false),
            (room_id, user2_id, false);
    END IF;

    RETURN room_id;
END;
$$;