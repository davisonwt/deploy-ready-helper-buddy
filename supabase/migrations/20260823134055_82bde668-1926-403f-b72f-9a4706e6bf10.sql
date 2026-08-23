REVOKE ALL ON FUNCTION public.resolve_whisperer_by_ref_code(uuid, text, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_whisperer_by_ref_code(uuid, text, uuid, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.ensure_whisperer_ref_link(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_whisperer_ref_link(uuid, uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.finalize_basket_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_basket_order(uuid) TO service_role;