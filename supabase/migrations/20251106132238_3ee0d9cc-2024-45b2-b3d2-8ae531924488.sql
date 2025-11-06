-- Fix remaining functions without SET search_path
CREATE OR REPLACE FUNCTION public.update_typing_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_room_participant_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_rooms
    SET participant_count = participant_count + 1,
        updated_at = now()
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.live_rooms
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = now()
    WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_live_room_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;