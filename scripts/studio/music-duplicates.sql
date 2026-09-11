-- Read-only. Lists music titles that exist in BOTH products (type='music')
-- and dj_music_tracks for the same owner, matched by normalized title
-- (lowercased, whitespace collapsed) -- the same normalization the
-- MUSIC hotspot sheet's dedupe now uses (products row wins ties there).
--
-- Deletes nothing. This is for a human to look at and decide what, if
-- anything, to do about each pair (same track re-listed as a sellable
-- product vs. its original radio upload, or two genuinely different
-- recordings that happen to share a title -- this script can't tell
-- those apart, only that the titles match).
--
-- Scoped to davison.taljaard@icloud.com for now (the account this was
-- run against) -- drop the WHERE clause on v_user_id to check every
-- owner at once.

WITH target AS (
  SELECT id AS user_id FROM auth.users WHERE email = 'davison.taljaard@icloud.com'
),
prod AS (
  SELECT p.id, p.title, p.price, p.created_at,
         lower(regexp_replace(btrim(p.title), '\s+', ' ', 'g')) AS norm
    FROM public.products p, target t
   WHERE p.type = 'music'
     AND (
       p.sower_id IN (SELECT id FROM public.sowers WHERE user_id = t.user_id)
       OR p.company_id IN (SELECT id FROM public.companies WHERE owner_user_id = t.user_id)
     )
),
dj AS (
  SELECT dt.id, dt.track_title AS title, dt.created_at,
         lower(regexp_replace(btrim(dt.track_title), '\s+', ' ', 'g')) AS norm
    FROM public.dj_music_tracks dt
    JOIN public.radio_djs rd ON rd.id = dt.dj_id, target t
   WHERE rd.user_id = t.user_id
)
SELECT
  prod.norm                AS normalized_title,
  prod.id                  AS product_id,
  prod.title               AS product_title,
  prod.price                AS product_price,
  prod.created_at          AS product_created_at,
  dj.id                    AS dj_track_id,
  dj.title                 AS dj_track_title,
  dj.created_at            AS dj_track_created_at
FROM prod
JOIN dj ON dj.norm = prod.norm
ORDER BY prod.title;
