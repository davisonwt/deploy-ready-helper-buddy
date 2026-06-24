
-- 1. New columns
ALTER TABLE public.classroom_sessions
  ADD COLUMN IF NOT EXISTS chat_room_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS session_fee numeric NOT NULL DEFAULT 0;

ALTER TABLE public.skilldrop_sessions
  ADD COLUMN IF NOT EXISTS chat_room_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS classroom_sessions_chat_room_id_idx ON public.classroom_sessions(chat_room_id);
CREATE INDEX IF NOT EXISTS skilldrop_sessions_chat_room_id_idx ON public.skilldrop_sessions(chat_room_id);

-- 2. Tighten classroom_sessions SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all classroom sessions" ON public.classroom_sessions;
DROP POLICY IF EXISTS "Users can view sessions in their circles" ON public.classroom_sessions;

CREATE POLICY "Creator or invited participants can view classroom sessions"
  ON public.classroom_sessions
  FOR SELECT
  TO authenticated
  USING (
    instructor_id = auth.uid()
    OR (chat_room_id IS NOT NULL AND public.is_chat_room_participant(chat_room_id, auth.uid()))
  );

-- 3. Tighten skilldrop_sessions SELECT
DROP POLICY IF EXISTS "Users can view skilldrop sessions" ON public.skilldrop_sessions;

CREATE POLICY "Creator or invited participants can view skilldrop sessions"
  ON public.skilldrop_sessions
  FOR SELECT
  TO authenticated
  USING (
    presenter_id = auth.uid()
    OR (chat_room_id IS NOT NULL AND public.is_chat_room_participant(chat_room_id, auth.uid()))
  );
