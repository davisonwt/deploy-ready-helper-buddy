REVOKE ALL ON FUNCTION public.get_my_account_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_account_scope() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_scope() TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_dashboard_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_dashboard_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_dashboard_content() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_dashboard_content() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_content() TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_dashboard_tribe_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_dashboard_tribe_count() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_tribe_count() TO authenticated;