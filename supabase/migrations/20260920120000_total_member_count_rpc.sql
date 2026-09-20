-- The Cockpit's Global Chat member-count badge needs "how many S2G
-- members exist", not any individual's data. profiles' own RLS
-- (profiles_select_self_or_admin) restricts an ordinary member to their
-- own row -- a client-side count(*) against it returns 1, not the real
-- total. public_profiles is openly readable but is not 1:1 with real
-- users (measured live 2026-09-20: 102 rows vs. 96 in both auth.users
-- and profiles), so it overcounts. This exposes only the aggregate
-- number from the real, canonical table, via the same SECURITY DEFINER
-- pattern get_my_tribe_members() already uses for a controlled RLS
-- bypass -- no per-row data leaves this function, just an integer.

CREATE OR REPLACE FUNCTION public.get_total_member_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles;
$$;

REVOKE EXECUTE ON FUNCTION public.get_total_member_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_total_member_count() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_total_member_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_member_count() TO service_role;
