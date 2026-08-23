CREATE OR REPLACE FUNCTION public.get_my_dashboard_content()
RETURNS TABLE(
  source text,
  id uuid,
  title text,
  description text,
  category text,
  images text[],
  video_url text,
  cover_image_url text,
  image_urls text[],
  file_url text,
  music_genre text,
  music_mood text,
  artist_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope AS (
    SELECT user_id FROM public.get_my_account_scope()
  ), scoped_sowers AS (
    SELECT id FROM public.sowers WHERE user_id IN (SELECT user_id FROM scope)
  )
  SELECT
    'seed'::text,
    s.id,
    s.title,
    s.description,
    s.category,
    s.images,
    s.video_url,
    NULL::text,
    NULL::text[],
    NULL::text,
    s.music_genre,
    s.music_mood,
    NULL::text,
    s.created_at
  FROM public.seeds s
  WHERE s.gifter_id IN (SELECT user_id FROM scope)

  UNION ALL

  SELECT
    ('product:' || COALESCE(NULLIF(p.type, ''), 'product'))::text,
    p.id,
    p.title,
    p.description,
    COALESCE(p.category, p.type),
    COALESCE(p.image_urls, CASE WHEN p.cover_image_url IS NOT NULL THEN ARRAY[p.cover_image_url] ELSE ARRAY[]::text[] END),
    NULL::text,
    p.cover_image_url,
    p.image_urls,
    p.file_url,
    p.music_genre,
    p.music_mood,
    p.artist_name,
    p.created_at
  FROM public.products p
  WHERE p.sower_id IN (SELECT id FROM scoped_sowers)
    AND COALESCE(p.status, 'active') <> 'archived'

  UNION ALL

  SELECT
    'product:book'::text,
    b.id,
    b.title,
    b.description,
    COALESCE(b.genre, b.category, 'book'),
    COALESCE(b.image_urls, CASE WHEN b.cover_image_url IS NOT NULL THEN ARRAY[b.cover_image_url] ELSE ARRAY[]::text[] END),
    NULL::text,
    b.cover_image_url,
    b.image_urls,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    b.created_at
  FROM public.sower_books b
  WHERE b.user_id IN (SELECT user_id FROM scope)
    AND COALESCE(b.status, 'active') <> 'archived'
  ORDER BY created_at DESC NULLS LAST
  LIMIT 120
$$;

REVOKE ALL ON FUNCTION public.get_my_dashboard_content() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_dashboard_content() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_content() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_content() TO service_role;

CREATE OR REPLACE FUNCTION public.books_backfill_products(_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_cur text;
  v_enabled boolean;
  v_count integer := 0;
BEGIN
  SELECT c.owner_user_id, c.currency, c.books_enabled
    INTO v_owner, v_cur, v_enabled
    FROM public.companies c
   WHERE c.id = _business_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised for this business';
  END IF;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN 0;
  END IF;

  WITH scope AS (
    SELECT user_id FROM public.get_my_account_scope()
  ), scoped_sowers AS (
    SELECT id FROM public.sowers WHERE user_id IN (SELECT user_id FROM scope)
  ), src AS (
    SELECT
      p.id,
      p.title,
      p.description,
      COALESCE(p.type, 'product') AS kind,
      p.sku,
      COALESCE(p.price, 0) AS unit_price,
      COALESCE(p.status, 'active') <> 'archived' AS active
    FROM public.products p
    WHERE p.company_id = _business_id
       OR p.sower_id IN (SELECT id FROM scoped_sowers)

    UNION ALL

    SELECT
      b.id,
      b.title,
      b.description,
      'book'::text,
      b.isbn,
      COALESCE(b.bestowal_value, 0),
      COALESCE(b.status, 'active') <> 'archived'
    FROM public.sower_books b
    WHERE b.user_id IN (SELECT user_id FROM scope)
  ), ins AS (
    INSERT INTO public.books_items
      (business_id, product_id, name, description, kind, sku, unit_price, currency, source, active)
    SELECT
      _business_id,
      src.id,
      COALESCE(src.title, 'Untitled'),
      src.description,
      src.kind,
      src.sku,
      src.unit_price,
      COALESCE(v_cur, 'USD'),
      CASE WHEN src.kind = 'book' THEN 'marketplace-book' ELSE 'marketplace' END,
      src.active
    FROM src
    ON CONFLICT (business_id, product_id) WHERE product_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      kind = EXCLUDED.kind,
      sku = EXCLUDED.sku,
      unit_price = EXCLUDED.unit_price,
      source = EXCLUDED.source,
      active = EXCLUDED.active,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.books_backfill_products(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.books_backfill_products(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.books_backfill_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.books_backfill_products(uuid) TO service_role;