
REVOKE EXECUTE ON FUNCTION public.books_company_for_user(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.books_sync_product_item() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.books_sync_product_sale() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.books_sync_gift() FROM anon, authenticated;
