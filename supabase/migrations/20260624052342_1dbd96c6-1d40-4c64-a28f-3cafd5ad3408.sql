
ALTER TABLE public.premium_rooms
  ADD COLUMN IF NOT EXISTS chat_room_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS premium_rooms_chat_room_id_idx ON public.premium_rooms(chat_room_id);
