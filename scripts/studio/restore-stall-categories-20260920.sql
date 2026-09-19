-- Restore script for fix-stall-categories-20260920.sql -- run this FIRST
-- if that fix ever needs to be undone. Full path:
-- C:\Users\Ezra\Projects\deploy-ready-helper-buddy\scripts\studio\restore-stall-categories-20260920.sql
--
-- Snapshotted 2026-09-20, before correcting 5 real stalls' `categories`
-- (member-set content -- each value here is exactly what was live before
-- the fix, per-row by user_id, not a WHERE clause that could match
-- differently later).
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-fix reasoning as the other scripts/studio/
-- restore-*.sql files.

DO $restore_stall_categories_20260920$
BEGIN
  UPDATE public.stalls SET categories = ARRAY['books_writing','music','whisperer']::text[]
    WHERE user_id = 'c1deec05-8442-4627-a900-b8e2d48930ee'; -- Stan's Cottage
  UPDATE public.stalls SET categories = ARRAY['books_writing']::text[]
    WHERE user_id = '9892c99a-cae8-4057-917f-5f16fc455fd7'; -- Jamie Nicole; inspired breath
  UPDATE public.stalls SET categories = ARRAY['books_writing']::text[]
    WHERE user_id = '3971cc26-3894-4712-8f61-d50587c93dc9'; -- The Halls of Ancient Archives
  UPDATE public.stalls SET categories = ARRAY['books_writing','trades_services']::text[]
    WHERE user_id = 'ae68cc49-9e46-410d-9fb0-e4f0b9041a66'; -- J & T PHOTOGRAPHY
  UPDATE public.stalls SET categories = ARRAY['music']::text[]
    WHERE user_id = 'c34c0eba-0010-480b-8326-7063cd7221ae'; -- The Scribe's Library (Amber)
END;
$restore_stall_categories_20260920$;

-- --- Proof --------------------------------------------------------------------
SELECT user_id, name, categories FROM public.stalls
WHERE user_id IN (
  'c1deec05-8442-4627-a900-b8e2d48930ee',
  '9892c99a-cae8-4057-917f-5f16fc455fd7',
  '3971cc26-3894-4712-8f61-d50587c93dc9',
  'ae68cc49-9e46-410d-9fb0-e4f0b9041a66',
  'c34c0eba-0010-480b-8326-7063cd7221ae'
)
ORDER BY name;
