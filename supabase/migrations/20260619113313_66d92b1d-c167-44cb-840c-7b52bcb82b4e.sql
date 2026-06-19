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
    'seed'::text AS source,
    s.id,
    s.title,
    s.description,
    s.category,
    s.images,
    s.video_url,
    NULL::text AS cover_image_url,
    NULL::text[] AS image_urls,
    NULL::text AS file_url,
    s.music_genre,
    s.music_mood,
    NULL::text AS artist_name,
    s.created_at
  FROM public.seeds s
  WHERE s.gifter_id IN (SELECT user_id FROM scope)

  UNION ALL

  SELECT
    ('product:' || COALESCE(NULLIF(p.type, ''), 'product'))::text AS source,
    p.id,
    p.title,
    p.description,
    COALESCE(p.category, p.type) AS category,
    COALESCE(p.image_urls, CASE WHEN p.cover_image_url IS NOT NULL THEN ARRAY[p.cover_image_url] ELSE ARRAY[]::text[] END) AS images,
    NULL::text AS video_url,
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
  ORDER BY created_at DESC NULLS LAST
  LIMIT 80
$$;

REVOKE ALL ON FUNCTION public.get_my_dashboard_content() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_dashboard_content() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_content() TO authenticated;