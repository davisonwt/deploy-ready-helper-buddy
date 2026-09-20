-- Wandering Hearts men/women counters. The prior migration
-- (20260920140000_nav_counts_rpc.sql) deliberately left this nav item
-- with no badge: "nothing the nav item actually leads to displays a
-- number to match against." This build adds exactly that display (both
-- on the nav row and on /tribal-hearts, the real destination), which is
-- the condition that migration's own comment named as the reason to add
-- one -- not a reversal of that decision, its fulfillment.
--
-- Diagnosed first: a real participation table already exists
-- (tribal_hearts_profiles, one row per member's WH profile -- confirmed
-- via get_hearts_browse(), the actual "who's a valid candidate" query,
-- which reads this table, not tribal_hearts_matches). It already carries
-- a NOT NULL gender enum ('male'/'female', hearts_gender), required at
-- onboarding -- so no new gender field, no migration for that, and no
-- "existing participants uncounted until they set it" case exists: the
-- column cannot be null, full stop.
--
-- Real vs seed data, checked directly (2026-09-20): of 21 status='active'
-- rows, 20 are is_seed=true (synthetic/test profiles) and only 1 is a
-- real member. Counting seed rows would show fake numbers to real
-- members as if they were real activity -- excluded here the same way
-- is_test accounts are excluded from Tribal Gardens/nav_counts elsewhere
-- in this migration file's own siblings. The real counter is small (as
-- of this writing: 1 male, 0 female) because that is the honest number.
-- Adding output columns changes the function's return type, which
-- CREATE OR REPLACE cannot do in place -- drop first.
DROP FUNCTION IF EXISTS public.get_nav_counts();

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
    (SELECT count(*)::int FROM public.stalls WHERE published = true AND village IS NULL) AS tribal_gardens,

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

    (SELECT count(*)::int FROM public.tribal_hearts_profiles WHERE status = 'active' AND is_seed = false AND gender = 'male') AS wandering_hearts_male,
    (SELECT count(*)::int FROM public.tribal_hearts_profiles WHERE status = 'active' AND is_seed = false AND gender = 'female') AS wandering_hearts_female
$$;

REVOKE ALL ON FUNCTION public.get_nav_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_nav_counts() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nav_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nav_counts() TO service_role;
