CREATE OR REPLACE FUNCTION public.get_my_orchards_scoped()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  description text,
  category text,
  images text[],
  orchard_type text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH scope AS (SELECT user_id FROM public.get_my_account_scope())
  SELECT o.id, o.user_id, o.title, o.description, o.category, o.images, o.orchard_type, o.status, o.created_at
  FROM public.orchards o
  WHERE o.user_id IN (SELECT user_id FROM scope)
  ORDER BY o.created_at DESC NULLS LAST
  LIMIT 200
$$;

GRANT EXECUTE ON FUNCTION public.get_my_orchards_scoped() TO authenticated;