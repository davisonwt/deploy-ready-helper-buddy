-- Global Chat (is_system_room = true) must never be deletable, by anyone,
-- through any authenticated path -- not its creator, not a moderator, not
-- gosat/admin. Enforced at the RLS layer so a UI regression (a "Delete
-- Room" button reappearing on some future host page) can never actually
-- delete it -- the button being hidden was already proven, on a different
-- room-deletion bug earlier the same day, to never be the real security
-- boundary.
--
-- Both existing DELETE policies are widened with an is_system_room guard,
-- not replaced with new ones -- same shape, same other clauses, one added
-- condition each.

DROP POLICY IF EXISTS chat_rooms_delete ON public.chat_rooms;

CREATE POLICY chat_rooms_delete ON public.chat_rooms
FOR DELETE
USING (
  is_system_room = false
  AND (
    (created_by = auth.uid() AND room_type <> 'direct'::chat_room_type)
    OR is_admin_or_gosat(auth.uid())
  )
);

-- "Its membership" too -- a member removing themselves, or a creator/
-- moderator/gosat removing someone else, must not be able to shrink Global
-- Chat's participant list either. Every member is auto-joined to it; that
-- has to stay true regardless of who asks.
DROP POLICY IF EXISTS chat_participants_delete ON public.chat_participants;

CREATE POLICY chat_participants_delete ON public.chat_participants
FOR DELETE
USING (
  NOT EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id = chat_participants.room_id AND cr.is_system_room = true
  )
  AND (
    (user_id = auth.uid())
    OR (
      is_room_creator(room_id, auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.chat_rooms cr
        WHERE cr.id = chat_participants.room_id AND cr.room_type = 'direct'::chat_room_type
      )
    )
    OR is_moderator_in_room(room_id, auth.uid())
    OR is_admin_or_gosat(auth.uid())
  )
);
