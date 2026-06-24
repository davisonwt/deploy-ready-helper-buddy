CREATE OR REPLACE FUNCTION public.update_room_participant_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_rooms
    SET current_participants = COALESCE(current_participants, 0) + 1,
        updated_at = now()
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.live_rooms
    SET current_participants = GREATEST(0, COALESCE(current_participants, 0) - 1),
        updated_at = now()
    WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$function$;