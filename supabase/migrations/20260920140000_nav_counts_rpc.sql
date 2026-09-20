-- Cockpit sidebar nav badges: one SECURITY DEFINER RPC for the counts that
-- have a real, stable, table-backed definition -- client-side counts
-- undercount under RLS, same trap the member-count badge hit
-- (profiles_select_self_or_admin). Two of the six nav items are
-- deliberately NOT here, each for a reason checked against the hard rule
-- that a badge must equal exactly what its destination page shows:
--
-- - Live Now: its page (LiveNowPage.tsx) lists useTribalLiveOrchard()'s
--   `liveSeeds`, which comes from Supabase Realtime PRESENCE state, not
--   any table a SQL function can read. A periodic table-based count
--   (e.g. gathering_sessions WHERE ended_at IS NULL) can provably
--   disagree with true presence during a crashed/disconnected host --
--   presence times that client out via its own heartbeat; a DB row can
--   sit stale until something explicitly closes it. Handled client-side
--   instead, by mounting the same shared useTribalLiveOrchard() store the
--   real page reads, so the nav badge and the page can never disagree --
--   they're reading the identical live value.
-- - Wandering Hearts: the nav item's real destination is
--   /stall/wanderinghearts (cockpitNav.ts), whose hotspots are plain
--   navigational stubs (Meet someone/My connections/Live circle/Stories)
--   with no member-count of any kind on that page; /tribal-hearts itself
--   (the deeper matching feature) shows no such count either, checked
--   directly. A real participation table (tribal_hearts_matches) exists,
--   but nothing the nav item actually leads to displays a number to
--   match against -- exactly the condition the task's own instruction
--   covers ("if WH genuinely has no data model yet... leave this one
--   badge off"). No badge rendered for it.
--
-- Sleeping Seeds is a genuine simplification worth naming: its browse
-- page (sleeping_wheels_near/pillows_near/hands_near) is proximity-
-- bounded ("no worldwide mode by design"), so what a real viewer's own
-- page lists varies by their location -- a single global count can't
-- equal that for every viewer at once. This returns the global "all
-- active, all members" total the task's own definition asks for; live
-- verification checks whether that also matches the ordinary test
-- account's own page in practice and reports honestly either way.

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
    -- Tribal Gardens: published stalls the feed shows (system stalls
    -- included), same base query StallsFeedPage.tsx's own unfiltered
    -- (For You / New) view uses -- village-tagged stalls excluded, they
    -- never show in this feed at all.
    (SELECT count(*)::int FROM public.stalls WHERE published = true AND village IS NULL) AS tribal_gardens,

    -- Sleeping Seeds: active, placed (has coordinates), non-archived
    -- listings across all three kinds, all members -- the same WHERE
    -- clause sleeping_wheels_near/pillows_near/hands_near each already
    -- use, minus their per-viewer radius bound.
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

    -- My Listings: the CALLER's own wheel/pillow/hand products, across
    -- linked accounts (get_my_account_scope(), the same scope
    -- get_my_dashboard_content() uses) -- MyListingsPage shows these
    -- regardless of availability (a paused listing still needs to be
    -- seen to un-pause), so no availability filter here, only the same
    -- non-archived one every dashboard content query applies.
    (
      SELECT count(*)::int FROM public.products p
      WHERE p.sower_id IN (
        SELECT id FROM public.sowers WHERE user_id IN (SELECT user_id FROM public.get_my_account_scope())
      )
      AND p.kind IN ('wheel', 'pillow', 'hand')
      AND coalesce(p.status, 'active') <> 'archived'
    ) AS my_listings,

    -- My Tribe: literally get_my_tribe_members(), the same function
    -- TribeInviteSheetContent.tsx's own "Tribe size" stat counts,
    -- filtered to direct (depth=1) referrals -- can't drift from that
    -- sheet's own number since it's the identical source.
    (SELECT count(*)::int FROM public.get_my_tribe_members() WHERE depth = 1) AS my_tribe
$$;

REVOKE EXECUTE ON FUNCTION public.get_nav_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_nav_counts() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nav_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nav_counts() TO service_role;
