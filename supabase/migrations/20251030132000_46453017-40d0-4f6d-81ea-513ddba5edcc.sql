-- Fix is_active_participant to handle legacy null values
CREATE OR REPLACE FUNCTION public.is_active_participant(_room_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id AND user_id = _user_id AND (is_active = true OR is_active IS NULL)
  );
$function$;