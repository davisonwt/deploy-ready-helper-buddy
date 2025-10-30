-- Ensure chat room creators are always participants (server-side fix)
-- 1) Backfill missing creator participation
INSERT INTO public.chat_participants (room_id, user_id, is_moderator, is_active)
SELECT cr.id, cr.created_by, true, true
FROM public.chat_rooms cr
WHERE cr.created_by IS NOT NULL
  AND cr.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = cr.id AND cp.user_id = cr.created_by
  );

-- 2) Function to ensure creator is a participant on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.ensure_creator_participant()
RETURNS trigger AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.chat_participants (room_id, user_id, is_moderator, is_active)
    SELECT NEW.id, NEW.created_by, true, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE room_id = NEW.id AND user_id = NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Triggers for insert and created_by change
DROP TRIGGER IF EXISTS trg_ensure_creator_participant ON public.chat_rooms;
CREATE TRIGGER trg_ensure_creator_participant
AFTER INSERT ON public.chat_rooms
FOR EACH ROW EXECUTE FUNCTION public.ensure_creator_participant();

DROP TRIGGER IF EXISTS trg_ensure_creator_participant_update ON public.chat_rooms;
CREATE TRIGGER trg_ensure_creator_participant_update
AFTER UPDATE OF created_by ON public.chat_rooms
FOR EACH ROW
WHEN (NEW.created_by IS DISTINCT FROM OLD.created_by)
EXECUTE FUNCTION public.ensure_creator_participant();