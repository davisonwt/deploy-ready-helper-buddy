-- Fix the broken room: add "Coming Into Truth" as a participant
INSERT INTO public.chat_participants (room_id, user_id, is_active)
VALUES ('4dbd1413-b748-4477-9f6f-72971ab8bde8', '6ec87b18-44fe-4c68-8c6a-f5b2a79ae7b2', true)
ON CONFLICT DO NOTHING;