GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.sower_books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sower_books TO authenticated;
GRANT ALL ON public.sower_books TO service_role;

GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books_items TO authenticated;
GRANT ALL ON public.books_items TO service_role;