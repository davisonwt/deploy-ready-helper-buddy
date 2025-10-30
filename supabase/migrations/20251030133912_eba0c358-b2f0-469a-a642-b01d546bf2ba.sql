-- Fix the get_or_create_direct_room function to handle missing profiles
CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(user1_id uuid, user2_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    room_id UUID;
    room_name TEXT;
BEGIN
    -- First try to find existing direct room between these users
    SELECT cr.id INTO room_id FROM public.chat_rooms cr
    WHERE cr.room_type = 'direct'
    AND EXISTS (SELECT 1 FROM public.chat_participants cp1 WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id AND (cp1.is_active = true OR cp1.is_active IS NULL))
    AND EXISTS (SELECT 1 FROM public.chat_participants cp2 WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id AND (cp2.is_active = true OR cp2.is_active IS NULL))
    AND (SELECT COUNT(*) FROM public.chat_participants cp WHERE cp.room_id = cr.id AND (cp.is_active = true OR cp.is_active IS NULL)) = 2;

    -- If no room exists, create one
    IF room_id IS NULL THEN
        -- Generate room name with fallback for missing profiles
        SELECT COALESCE(
            CONCAT(COALESCE(p1.display_name, p1.first_name, 'User'), ' & ', COALESCE(p2.display_name, p2.first_name, 'User')),
            'Direct Chat'
        ) INTO room_name 
        FROM public.profiles p1 
        FULL OUTER JOIN public.profiles p2 ON true
        WHERE p1.user_id = user1_id AND p2.user_id = user2_id;
        
        -- Fallback if query returns null
        IF room_name IS NULL THEN
            room_name := 'Direct Chat';
        END IF;

        INSERT INTO public.chat_rooms (room_type, name, created_by, max_participants, is_active)
        VALUES ('direct', room_name, user1_id, 2, true) RETURNING id INTO room_id;

        INSERT INTO public.chat_participants (room_id, user_id, is_moderator, is_active)
        VALUES (room_id, user1_id, false, true), (room_id, user2_id, false, true);
    END IF;
    
    RETURN room_id;
END;
$function$;

-- Fix all null is_active values to true
UPDATE public.chat_participants SET is_active = true WHERE is_active IS NULL;