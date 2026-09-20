-- get_nav_counts().tribal_gardens must move together with the Tribal
-- Gardens feed's own exclusion of test-account stalls
-- (StallsFeedPage.tsx's testUserIds filter) -- a badge that counts a
-- stall the feed itself hides is exactly the kind of disagreement the
-- nav badges' own hard rule forbids. profiles.is_test
-- (20260920150000_profiles_is_test.sql) is the flag; stalls.user_id has
-- no FK to profiles (only auth.users), so this needs a real join, which
-- SQL can do even though PostgREST's embed-join can't.

CREATE OR REPLACE FUNCTION public.get_nav_counts()
RETURNS TABLE (
  tribal_gardens integer,
  sleeping_seeds integer,
  my_listings integer,
  my_tribe integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.stalls s
      JOIN public.profiles p ON p.user_id = s.user_id
      WHERE s.published = true AND s.village IS NULL AND NOT p.is_test) AS tribal_gardens,

    (
      (SELECT count(*)::int FROM public.wheel_seed_details d JOIN public.products p ON p.id = d.product_id
        WHERE p.kind = 'wheel' AND coalesce(p.status,'active') <> 'archived'
          AND d.availability AND d.base_lat IS NOT NULL AND d.base_lng IS NOT NULL)
      +
      (SELECT count(*)::int FROM public.pillow_seed_details d JOIN public.products p ON p.id = d.product_id
        WHERE p.kind = 'pillow' AND coalesce(p.status,'active') <> 'archived'
          AND d.availability AND d.base_lat IS NOT NULL AND d.base_lng IS NOT NULL)
      +
      (SELECT count(*)::int FROM public.hand_seed_details d JOIN public.products p ON p.id = d.product_id
        WHERE p.kind = 'hand' AND coalesce(p.status,'active') <> 'archived'
          AND d.availability AND d.base_lat IS NOT NULL AND d.base_lng IS NOT NULL)
    ) AS sleeping_seeds,

    (
      SELECT count(*)::int FROM public.products p
      WHERE p.sower_id IN (
        SELECT id FROM public.sowers WHERE user_id IN (SELECT user_id FROM public.get_my_account_scope())
      )
      AND p.kind IN ('wheel', 'pillow', 'hand')
      AND coalesce(p.status, 'active') <> 'archived'
    ) AS my_listings,

    (SELECT count(*)::int FROM public.get_my_tribe_members() WHERE depth = 1) AS my_tribe
$$;
