-- Global Chat: one community-wide room every member is auto-joined to.
--
-- No existing "community" room to reuse -- checked directly before writing
-- this: chat_room_type has never had a 'community' value, CommunityChatsPage
-- is a directory of many separate member-created group rooms, and the only
-- "community engagement" numbers anywhere in the code are hardcoded
-- decorative fakes. This is a genuinely new room; there is no history to
-- inherit because none existed.
--
-- Sentinel id 00000000-0000-0000-0000-000000000001, same convention as
-- this codebase's other hardcoded pinned ids (Scripture Study, Grove
-- Station, Companions Village). Referenced by the notify-trigger migration
-- that runs just before this one (excluded from per-message notification
-- there) and by the client (DashboardPage.tsx / BrowseOrchardsPage.jsx's
-- "Global Chat" buttons, both -> /conversations?c=<this id>).

INSERT INTO public.chat_rooms (id, name, room_type, is_system_room, is_active, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Global Chat',
  'group',
  true,
  true,
  '04754d57-d41d-4ea7-93df-542047a6785b'
)
ON CONFLICT (id) DO NOTHING;

-- Every existing member, today. New members join via the trigger below.
INSERT INTO public.chat_participants (room_id, user_id, is_active)
SELECT '00000000-0000-0000-0000-000000000001', p.user_id, true
FROM public.profiles p
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Auto-join on signup. A NEW, separate trigger on public.profiles (not a
-- change to the existing on_profile_created_verification/
-- create_verification_room trigger) -- keeps this additive and isolated
-- from the verification-room path.
CREATE OR REPLACE FUNCTION public.join_global_chat_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.chat_participants (room_id, user_id, is_active)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.user_id, true)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_global_chat_join ON public.profiles;
CREATE TRIGGER on_profile_created_global_chat_join
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.join_global_chat_room();
