-- Farm-Stalls batch 2, item 3: /stall/:username must work for a signed-out
-- visitor (RLS on public.stalls already grants anon SELECT for published
-- rows -- 20260910220000_farm_stalls.sql). Resolving a username to a
-- user_id was the missing piece: public.public_profiles is granted to
-- `authenticated` only (20250819162908 and earlier), not `anon`.
--
-- Rather than widen that view's grant (display_name/avatar_url to anyone
-- signed out, never asked for here), this is a narrow SECURITY DEFINER
-- RPC exposing exactly one fact: the user_id behind a username, when that
-- user has a published stall -- OR any stall at all, if the caller IS
-- that user (so an owner can preview their own unpublished draft via the
-- same visitor route, matching stalls' own RLS shape of "owner sees own
-- row regardless of published"). Anyone else's unpublished stall, or no
-- stall, resolves to no row either way -- never confirms or denies that a
-- username exists on its own.
CREATE OR REPLACE FUNCTION public.get_stall_owner_id_by_username(_username text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $gsobu$
  SELECT s.user_id
  FROM public.stalls s
  JOIN public.profiles p ON p.user_id = s.user_id
  WHERE p.username = _username
    AND (s.published = true OR s.user_id = auth.uid())
  LIMIT 1;
$gsobu$;

REVOKE ALL ON FUNCTION public.get_stall_owner_id_by_username(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_stall_owner_id_by_username(text) TO anon, authenticated;

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'function_exists', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_stall_owner_id_by_username'),
  'anon_can_execute', has_function_privilege('anon', 'public.get_stall_owner_id_by_username(text)', 'EXECUTE')
) AS proof;
