ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  linked_user_id uuid NOT NULL,
  label text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, linked_user_id)
);

GRANT SELECT ON public.account_links TO authenticated;
GRANT ALL ON public.account_links TO service_role;

ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'account_links' AND policyname = 'Users can view their own account links'
  ) THEN
    CREATE POLICY "Users can view their own account links"
      ON public.account_links
      FOR SELECT
      TO authenticated
      USING (owner_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'account_links' AND policyname = 'Admins can manage account links'
  ) THEN
    CREATE POLICY "Admins can manage account links"
      ON public.account_links
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_account_scope()
RETURNS TABLE(user_id uuid, is_primary boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() AS user_id, true AS is_primary
  WHERE auth.uid() IS NOT NULL
  UNION
  SELECT al.linked_user_id AS user_id, false AS is_primary
  FROM public.account_links al
  WHERE al.owner_user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_account_scope() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_dashboard_profile()
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  membership_tier text,
  location text,
  country text,
  timezone text,
  preferred_currency text,
  latitude numeric,
  longitude numeric,
  location_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope AS (
    SELECT * FROM public.get_my_account_scope()
  ), ranked_profiles AS (
    SELECT
      p.*,
      s.is_primary,
      CASE
        WHEN s.is_primary AND NULLIF(p.avatar_url, '') IS NOT NULL THEN 0
        WHEN NULLIF(p.avatar_url, '') IS NOT NULL THEN 1
        WHEN s.is_primary THEN 2
        ELSE 3
      END AS dashboard_rank
    FROM public.profiles p
    JOIN scope s ON s.user_id = p.user_id
  )
  SELECT
    p.user_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.avatar_url,
    p.membership_tier,
    p.location,
    p.country,
    p.timezone,
    p.preferred_currency,
    p.latitude,
    p.longitude,
    COALESCE(p.location_verified, false) AS location_verified
  FROM ranked_profiles p
  ORDER BY p.dashboard_rank ASC, p.updated_at DESC NULLS LAST
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_dashboard_profile() TO authenticated;

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
    'product'::text AS source,
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

GRANT EXECUTE ON FUNCTION public.get_my_dashboard_content() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_dashboard_tribe_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope AS (
    SELECT user_id FROM public.get_my_account_scope()
  ), direct_members AS (
    SELECT rc.referred_user_id AS member_id
    FROM public.referral_circle rc
    WHERE rc.referrer_id IN (SELECT user_id FROM scope)
      AND rc.referred_user_id IS NOT NULL

    UNION

    SELECT r.referred_id AS member_id
    FROM public.referrals r
    JOIN public.affiliates a ON a.id = r.referrer_id
    WHERE a.user_id IN (SELECT user_id FROM scope)
      AND r.referred_id IS NOT NULL
  )
  SELECT COALESCE(COUNT(DISTINCT member_id), 0)::integer
  FROM direct_members
$$;

GRANT EXECUTE ON FUNCTION public.get_my_dashboard_tribe_count() TO authenticated;

INSERT INTO public.account_links (owner_user_id, linked_user_id, label, created_by)
VALUES (
  '9cb1b19c-08dc-4586-95dd-23bb5f022428',
  '04754d57-d41d-4ea7-93df-542047a6785b',
  'Davison legacy Sow2Grow account data',
  '9cb1b19c-08dc-4586-95dd-23bb5f022428'
)
ON CONFLICT (owner_user_id, linked_user_id) DO NOTHING;

UPDATE public.profiles AS current_profile
SET
  first_name = COALESCE(NULLIF(current_profile.first_name, ''), legacy.first_name),
  last_name = COALESCE(NULLIF(current_profile.last_name, ''), legacy.last_name),
  display_name = COALESCE(NULLIF(current_profile.display_name, ''), legacy.display_name),
  avatar_url = COALESCE(NULLIF(current_profile.avatar_url, ''), legacy.avatar_url),
  location = COALESCE(NULLIF(current_profile.location, ''), legacy.location, 'South Africa'),
  preferred_currency = COALESCE(NULLIF(current_profile.preferred_currency, ''), legacy.preferred_currency, 'ZAR'),
  timezone = COALESCE(NULLIF(current_profile.timezone, ''), legacy.timezone, 'Africa/Johannesburg'),
  country = COALESCE(NULLIF(current_profile.country, ''), legacy.country, 'south africa'),
  phone = COALESCE(NULLIF(current_profile.phone, ''), legacy.phone, '0788442047'),
  membership_tier = COALESCE(NULLIF(current_profile.membership_tier, ''), legacy.membership_tier),
  updated_at = now()
FROM public.profiles legacy
WHERE current_profile.user_id = '9cb1b19c-08dc-4586-95dd-23bb5f022428'
  AND legacy.user_id = '04754d57-d41d-4ea7-93df-542047a6785b';

UPDATE public.public_profiles AS current_public
SET
  display_name = COALESCE(NULLIF(current_public.display_name, ''), legacy_public.display_name),
  avatar_url = COALESCE(NULLIF(current_public.avatar_url, ''), legacy_public.avatar_url),
  updated_at = now()
FROM public.public_profiles legacy_public
WHERE current_public.user_id = '9cb1b19c-08dc-4586-95dd-23bb5f022428'
  AND legacy_public.user_id = '04754d57-d41d-4ea7-93df-542047a6785b';