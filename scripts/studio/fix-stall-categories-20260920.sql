-- Fixes 5 real stalls whose `categories` (the array the Tribal Gardens
-- feed's pill filter queries via .contains('categories', [chip])) is
-- stale or wrong against what the stall's OWN hotspots actually show.
-- Root cause: `categories` is set once at stall creation (a Studio script
-- or the /stall/build wizard) and is never kept in sync as the owner
-- later edits their own hotspots/shelves -- confirmed by cross-checking
-- every published, non-village stall's categories against its real
-- hotspot `kind` values (2026-09-20). This is exactly what produced the
-- report "clicking Music shows non-music stalls": Stan's Cottage has
-- zero music-kind hotspots but was tagged 'music' regardless.
--
-- If this needs to be undone, restore-stall-categories-20260920.sql
-- (same directory) has each row's exact prior value, snapshotted before
-- this ran.
--
-- Per-stall evidence (hotspot kind -> label, this session's own query):
--
-- Stan's Cottage (c1deec05-8442-4627-a900-b8e2d48930ee):
--   was ['books_writing','music','whisperer']. Hotspots: Stories=custom,
--   My Story=story, Books=books, Kitchen=products ("From My Fridge") --
--   zero music-kind hotspots anywhere. Removing 'music' (no supporting
--   evidence at all); adding 'food_home' (the Kitchen/"From My Fridge"
--   shelf is real food content the stall currently has no category for).
--   'whisperer' is correct and left alone -- confirmed this owner is a
--   real row in public.whisperers, not just a self-tag.
--
-- Jamie Nicole; inspired breath (9892c99a-cae8-4057-917f-5f16fc455fd7):
--   was ['books_writing']. Hotspots: Books=books, Music=music,
--   Lyrics=lyrics, My Story=story, Mugs=mugs -- a real Music shelf that
--   the Music pill currently can never surface this stall under. Adding
--   'music'.
--
-- The Halls of Ancient Archives (3971cc26-3894-4712-8f61-d50587c93dc9):
--   was ['books_writing']. Hotspots: BIOGRAPHY=story, MUSIC=music
--   (caption "HEALING - INSPIRATION - REST" -- also this stall's own
--   tagline verbatim, suggesting music may be a primary offering, not
--   secondary), BOOKS=books, STORIES=books, LEGACY=services. Adding
--   'music'.
--
-- J & T PHOTOGRAPHY (ae68cc49-9e46-410d-9fb0-e4f0b9041a66):
--   was ['books_writing','trades_services']. Hotspots: six buttons, ALL
--   kind=products (Family/Events/Portrait/Maternity/Baby/Couple Albums)
--   -- zero book or writing content anywhere. Removing 'books_writing'
--   (no supporting evidence at all). A photography business is a visual-
--   arts trade -- STALL_CATEGORIES has no dedicated "photography," but
--   'art_craft' ("Art & Craft") is the closest real fit, same reasoning
--   style create-cw-choice-stalls.sql already used for accounting/
--   pharmacy -> trades_services. Adding 'art_craft'; keeping
--   'trades_services' (a paid photography service is also that).
--
-- The Scribe's Library (c34c0eba-0010-480b-8326-7063cd7221ae, Amber):
--   was ['music']. create-ed-amber-stalls.sql set this from her real
--   product catalog at the time (12/12 products type=music) -- true then,
--   but she has since renamed the stall from "Amber Wheeles's Stall" to
--   "The Scribe's Library" and rebuilt its hotspots around books: Herbs/
--   Medicine Books=books, Native American History Books=books, Wall
--   Art=products, History Studies=story, Music=music (now one button out
--   of six), Hebrew History=story. Adding 'books_writing'; keeping
--   'music' (still real, current content, not removed).
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-fix reasoning as the other scripts/studio/
-- create-*-stall*.sql files.
--
-- Idempotent: safe to re-run, sets an exact final value each time rather
-- than appending/toggling.

DO $fix_stall_categories_20260920$
BEGIN
  UPDATE public.stalls SET categories = ARRAY['books_writing','food_home','whisperer']::text[]
    WHERE user_id = 'c1deec05-8442-4627-a900-b8e2d48930ee'; -- Stan's Cottage
  UPDATE public.stalls SET categories = ARRAY['books_writing','music']::text[]
    WHERE user_id = '9892c99a-cae8-4057-917f-5f16fc455fd7'; -- Jamie Nicole; inspired breath
  UPDATE public.stalls SET categories = ARRAY['books_writing','music']::text[]
    WHERE user_id = '3971cc26-3894-4712-8f61-d50587c93dc9'; -- The Halls of Ancient Archives
  UPDATE public.stalls SET categories = ARRAY['art_craft','trades_services']::text[]
    WHERE user_id = 'ae68cc49-9e46-410d-9fb0-e4f0b9041a66'; -- J & T PHOTOGRAPHY
  UPDATE public.stalls SET categories = ARRAY['books_writing','music']::text[]
    WHERE user_id = 'c34c0eba-0010-480b-8326-7063cd7221ae'; -- The Scribe's Library (Amber)
END;
$fix_stall_categories_20260920$;

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
