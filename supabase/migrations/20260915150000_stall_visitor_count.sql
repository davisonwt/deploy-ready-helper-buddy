-- Stall visitor counter, on top of the existing stall_visits table (built
-- for the "new seeds" indicator, 20260912140000_stall_visits.sql).
-- stall_visits already has exactly one row per (viewer, stall owner) pair
-- (PRIMARY KEY (viewer_id, stall_user_id), upserted on interior open,
-- never inserted twice for the same viewer) -- so a plain count(*) here
-- already IS the distinct-visitor count; no separate DISTINCT needed, but
-- the function is still named/described in terms of DISTINCT viewer_id to
-- make that invariant explicit rather than relying on the caller trusting
-- the table's own uniqueness constraint.
--
-- Owner-only (Davison decision, 2026-09-15): unlike stall_new_seed_counts
-- (any authenticated member can ask about THEIR OWN "what's new to me"
-- state on any stall), a visitor COUNT is about the stall owner's own
-- audience size -- treated the same as the wallet balance shown in
-- StallTodayPanel: visible only to the owner looking at their own stall,
-- never to a visitor browsing it. Enforced the same way
-- stall_new_seed_counts enforces "viewer must be the caller": here,
-- `stall_owner` must equal auth.uid(), so the RPC can only ever answer
-- "how many people have visited MY stall", never anyone else's.
CREATE OR REPLACE FUNCTION public.stall_visitor_count(stall_owner uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result integer;
BEGIN
  IF stall_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'stall_visitor_count: stall_owner must be the calling user';
  END IF;

  SELECT count(DISTINCT viewer_id)::int INTO result
  FROM public.stall_visits
  WHERE stall_user_id = stall_owner;

  RETURN COALESCE(result, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.stall_visitor_count(uuid) TO authenticated;

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'rpc_exists', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'stall_visitor_count')
) AS proof;
