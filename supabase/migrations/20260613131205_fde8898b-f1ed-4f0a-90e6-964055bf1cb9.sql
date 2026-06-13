REVOKE EXECUTE ON FUNCTION public.get_my_tribe_members() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_tribe_members() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_tribe_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tribe_members() TO service_role;