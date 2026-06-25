
REVOKE EXECUTE ON FUNCTION public.finalize_content_purchase(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_content_purchase(uuid) TO service_role;
