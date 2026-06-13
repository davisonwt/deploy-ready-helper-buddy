CREATE OR REPLACE FUNCTION public.get_my_tribe_members()
RETURNS TABLE (
  user_id uuid,
  referrer_id uuid,
  referrer_name text,
  depth integer,
  status text,
  referred_at timestamp with time zone,
  display_name text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE edges AS (
    SELECT
      rc.referrer_id,
      rc.referred_user_id,
      COALESCE(NULLIF(rc.status, ''), 'active') AS status,
      rc.referred_at
    FROM public.referral_circle rc
    WHERE rc.referrer_id IS NOT NULL
      AND rc.referred_user_id IS NOT NULL

    UNION

    SELECT
      a.user_id AS referrer_id,
      r.referred_id AS referred_user_id,
      COALESCE(NULLIF(r.status, ''), 'active') AS status,
      r.created_at AS referred_at
    FROM public.referrals r
    JOIN public.affiliates a ON a.id = r.referrer_id
    WHERE a.user_id IS NOT NULL
      AND r.referred_id IS NOT NULL
  ), tribe AS (
    SELECT
      e.referrer_id,
      e.referred_user_id,
      e.status,
      e.referred_at,
      1 AS depth,
      ARRAY[e.referrer_id, e.referred_user_id] AS path
    FROM edges e
    WHERE e.referrer_id = auth.uid()

    UNION ALL

    SELECT
      e.referrer_id,
      e.referred_user_id,
      e.status,
      e.referred_at,
      t.depth + 1 AS depth,
      t.path || e.referred_user_id AS path
    FROM tribe t
    JOIN edges e ON e.referrer_id = t.referred_user_id
    WHERE NOT e.referred_user_id = ANY(t.path)
      AND t.depth < 12
  ), ranked AS (
    SELECT
      t.*,
      row_number() OVER (
        PARTITION BY t.referred_user_id
        ORDER BY t.depth ASC, t.referred_at DESC NULLS LAST
      ) AS rn
    FROM tribe t
  )
  SELECT
    r.referred_user_id AS user_id,
    r.referrer_id,
    COALESCE(
      NULLIF(referrer_public.display_name, ''),
      NULLIF(referrer_public.username, ''),
      LEFT(r.referrer_id::text, 8)
    ) AS referrer_name,
    r.depth,
    r.status,
    r.referred_at,
    COALESCE(
      NULLIF(p.display_name, ''),
      NULLIF(public_p.display_name, ''),
      NULLIF(BTRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
      NULLIF(p.username, ''),
      NULLIF(public_p.username, ''),
      LEFT(r.referred_user_id::text, 8)
    ) AS display_name,
    COALESCE(NULLIF(p.username, ''), NULLIF(public_p.username, '')) AS username,
    COALESCE(NULLIF(p.avatar_url, ''), NULLIF(public_p.avatar_url, '')) AS avatar_url
  FROM ranked r
  LEFT JOIN public.profiles p ON p.user_id = r.referred_user_id
  LEFT JOIN public.public_profiles public_p ON public_p.user_id = r.referred_user_id
  LEFT JOIN public.public_profiles referrer_public ON referrer_public.user_id = r.referrer_id
  WHERE r.rn = 1
  ORDER BY r.referred_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tribe_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tribe_members() TO service_role;