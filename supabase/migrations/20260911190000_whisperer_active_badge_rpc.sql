-- Flow v2 SeedCard: a narrow, public-safe read for the gold "Whisperer X%"
-- badge. product_whisperer_assignments' own RLS ("Assignments viewable by
-- sower or whisperer") only lets the sower or the specific whisperer on a
-- row see it -- correct for the full row (it carries who's involved,
-- earnings totals, etc.), but it means an arbitrary browsing viewer can
-- never see that an active whisperer relationship exists at all, so the
-- badge silently never renders for them even when one legitimately does.
--
-- This function exposes only the two facts a public badge actually needs
-- -- which seed, and the real commission_percent -- for a row that is
-- already 'active' (never 'pending'/'declined'/'revoked'/'withdrawn', and
-- never the whisperer's identity). No new client-writable surface: this is
-- SELECT-only, SECURITY DEFINER purely to read across the RLS above, not
-- to bypass any write path.
CREATE OR REPLACE FUNCTION public.get_active_whisperer_badge(_seed_id uuid)
RETURNS TABLE(seed_id uuid, commission_percent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(a.product_id, a.orchard_id, a.book_id) AS seed_id, a.commission_percent
  FROM public.product_whisperer_assignments a
  WHERE a.status = 'active'
    AND (a.product_id = _seed_id OR a.orchard_id = _seed_id OR a.book_id = _seed_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_whisperer_badge(uuid) TO authenticated, anon;
