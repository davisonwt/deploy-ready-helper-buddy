-- Same principle as 20260920150500_nav_counts_exclude_test_stalls.sql: a
-- Playwright/QA account (davisontest1, davisontest2) must never inflate a
-- public counter. That migration excluded test-account stalls from
-- tribal_gardens via profiles.is_test; this does the same for the new
-- Wandering Hearts counters, which the earlier WH migration
-- (20260920240000) only excluded seed rows from, not test-account rows.
--
-- Verified live before this landed: a real self-inserted test row
-- (davisontest2, gender=female) DID move both counters (nav badge and
-- /tribal-hearts destination, in lockstep, male 1/female 1) while this
-- exclusion did not yet exist -- that was the proof that badge and
-- destination agree. The row was then deleted (counters back to
-- male 1/female 0) and this exclusion added so a future test row can
-- never repeat that inflation on the public-facing numbers.

CREATE OR REPLACE FUNCTION public.get_nav_counts()
RETURNS TABLE (
  tribal_gardens integer,
  sleeping_seeds integer,
  my_listings integer,
  my_tribe integer,
  wandering_hearts_male integer,
  wandering_hearts_female integer
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
    (SELECT count(*)::int FROM public.get_my_tribe_members() WHERE depth = 1) AS my_tribe,
    (SELECT count(*)::int FROM public.tribal_hearts_profiles t
      JOIN public.profiles p ON p.user_id = t.user_id
      WHERE t.status = 'active' AND NOT t.is_seed AND NOT p.is_test AND t.gender = 'male') AS wandering_hearts_male,
    (SELECT count(*)::int FROM public.tribal_hearts_profiles t
      JOIN public.profiles p ON p.user_id = t.user_id
      WHERE t.status = 'active' AND NOT t.is_seed AND NOT p.is_test AND t.gender = 'female') AS wandering_hearts_female
$$;
