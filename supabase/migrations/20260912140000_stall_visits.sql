-- "New seeds" indicators (Farm-Stalls) -- lets a visitor's feed card,
-- interior hotspots, and SeedCard rows show what's actually NEW on a
-- stall since they last looked, instead of everything looking identical
-- on every visit.
--
-- stall_visits: one row per (viewer, stall owner) pair, holding when the
-- viewer last opened that stall's interior. RLS mirrors stalls' own
-- "owner_all" shape -- a viewer only ever reads/writes their OWN rows
-- (viewer_id = auth.uid()), never another viewer's.
CREATE TABLE public.stall_visits (
  viewer_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stall_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_id, stall_user_id)
);

ALTER TABLE public.stall_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stall_visits FROM public, anon;
GRANT SELECT, INSERT, UPDATE ON public.stall_visits TO authenticated;
GRANT ALL ON public.stall_visits TO service_role;

CREATE POLICY "stall_visits_viewer_all" ON public.stall_visits
  FOR ALL TO authenticated
  USING (viewer_id = auth.uid())
  WITH CHECK (viewer_id = auth.uid());

-- --- stall_new_seed_counts(viewer) --------------------------------------
-- Per published stall (excluding stalls with nothing new), the count of
-- products/sower_books/dj_music_tracks rows created after the viewer's
-- own last_seen_at for that stall -- or in the last 14 days if the
-- viewer has never visited it. SECURITY DEFINER because it reads across
-- products/sowers/companies/radio_djs/sower_books/dj_music_tracks for
-- every stall, not just rows the caller owns -- same shape as
-- get_stall_owner_id_by_username (narrow, single-purpose, RLS on the
-- underlying tables would otherwise block a visitor from seeing this).
-- `viewer` must equal auth.uid() -- accepted as an explicit argument
-- (rather than reading auth.uid() directly inside the function body) so
-- the caller shape matches what the task asked for, but a caller can
-- only ever ask about their OWN "new to me" state, never someone else's
-- (which would otherwise leak that viewer's stall_visits history).
--
-- kind mapping (mirrors StallHotspotSheet.tsx's own type/category rules,
-- so a per-kind count here always means the same thing that sheet would
-- actually show if opened right now):
--   products.type IN ('book','ebook'), category = 'lyrics'  -> 'lyrics'
--   products.type IN ('book','ebook'), category <> 'lyrics' -> 'books'
--   products.type = 'music'                                 -> 'music'
--   products.type = 'service'                                -> 'services'
--   products.type = 'product', category = 'mugs'            -> 'mugs'
--   products.type = 'product', category <> 'mugs'           -> 'products'
--   products.type IN ('produce','file','art') (no TileKind of their own) -> 'products'
--   sower_books row (always books)                          -> 'books'
--   dj_music_tracks row (always music)                      -> 'music'
-- Deliberately NOT deduped by title against products the way
-- StallHotspotSheet's own UI is (a products row and a dj_music_tracks row
-- sharing a title) -- an occasional 1-off over-count on a notification
-- badge is a fine trade against the cost of replicating that dedupe in
-- SQL; the sheet itself remains the source of truth for what's actually
-- shown once opened.
CREATE OR REPLACE FUNCTION public.stall_new_seed_counts(viewer uuid)
RETURNS TABLE (
  stall_user_id      uuid,
  total_count        integer,
  per_kind           jsonb,
  latest_created_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF viewer IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'stall_new_seed_counts: viewer must be the calling user';
  END IF;

  RETURN QUERY
  WITH cutoffs AS (
    SELECT
      s.user_id AS stall_user_id,
      COALESCE(sv.last_seen_at, now() - interval '14 days') AS cutoff
    FROM public.stalls s
    LEFT JOIN public.stall_visits sv
      ON sv.stall_user_id = s.user_id AND sv.viewer_id = viewer
    WHERE s.published = true
  ),
  owner_ids AS (
    SELECT
      c.stall_user_id,
      c.cutoff,
      sw.id AS sower_id,
      co.id AS company_id,
      dj.id AS dj_id
    FROM cutoffs c
    LEFT JOIN public.sowers sw ON sw.user_id = c.stall_user_id
    LEFT JOIN public.companies co ON co.owner_user_id = c.stall_user_id
    LEFT JOIN public.radio_djs dj ON dj.user_id = c.stall_user_id
  ),
  new_rows AS (
    SELECT
      o.stall_user_id,
      (CASE
        WHEN p.type IN ('book','ebook') AND lower(COALESCE(p.category,'')) = 'lyrics' THEN 'lyrics'
        WHEN p.type IN ('book','ebook') THEN 'books'
        WHEN p.type = 'music' THEN 'music'
        WHEN p.type = 'service' THEN 'services'
        WHEN p.type = 'product' AND lower(COALESCE(p.category,'')) = 'mugs' THEN 'mugs'
        ELSE 'products'
      END) AS kind,
      p.created_at
    FROM owner_ids o
    JOIN public.products p
      ON (o.sower_id IS NOT NULL AND p.sower_id = o.sower_id)
      OR (o.company_id IS NOT NULL AND p.company_id = o.company_id)
    WHERE p.created_at > o.cutoff

    UNION ALL

    SELECT o.stall_user_id, 'books' AS kind, b.created_at
    FROM owner_ids o
    JOIN public.sower_books b ON b.user_id = o.stall_user_id
    WHERE b.created_at > o.cutoff

    UNION ALL

    SELECT o.stall_user_id, 'music' AS kind, t.created_at
    FROM owner_ids o
    JOIN public.dj_music_tracks t ON o.dj_id IS NOT NULL AND t.dj_id = o.dj_id
    WHERE t.created_at > o.cutoff
  ),
  per_kind_counts AS (
    SELECT stall_user_id, kind, count(*) AS kind_count
    FROM new_rows
    GROUP BY stall_user_id, kind
  )
  SELECT
    n.stall_user_id,
    count(*)::int AS total_count,
    (SELECT jsonb_object_agg(k.kind, k.kind_count) FROM per_kind_counts k WHERE k.stall_user_id = n.stall_user_id) AS per_kind,
    max(n.created_at) AS latest_created_at
  FROM new_rows n
  GROUP BY n.stall_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stall_new_seed_counts(uuid) TO authenticated;

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'stall_visits_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stall_visits'),
  'rpc_exists', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'stall_new_seed_counts')
) AS proof;
