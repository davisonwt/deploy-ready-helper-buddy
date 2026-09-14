-- Diagnosed (read-only, no changes) 2026-09-14: object hotspots on Davison's
-- and Ed's (primitivevsns) stalls were saved with kind='products' (or, on
-- Ed's, kind='custom') regardless of their own label -- StallHotspotSheet.tsx
-- resolves content purely by `kind` (a category query: kind='products' ->
-- products.type='product', kind='music' -> type='music' union
-- dj_music_tracks, kind='story' -> stalls.story/profiles.bio, etc.) --
-- `label` is decorative only, never used to pick content. Every mis-kinded
-- box on a stall with exactly one products.type='product' row (a $75 "coffee
-- mugs x6" for Davison, a $36.01 "Creator's Bead Calendar" for Ed) landed on
-- that same one item regardless of what it was actually labeled.
--
-- scripts/studio/set-davison-object-hotspots.sql is NOT current -- confirmed
-- live: its x-coordinates (7.8, 1, 38, 27, 40, 77, 56, 83, 47, 34, 63, 11
-- boxes) don't match the stall's actual current hotspots (9 boxes, decimal
-- coordinates like 82.74986768534002 -- clearly hand-repositioned via the
-- wizard since that script ran). Re-running it would silently drop the 9th
-- box and reset every position the owner has since moved. This migration
-- instead rewrites only the `kind` field of each existing box, by its own
-- current label, leaving id/x/y/w/h/caption exactly as they are -- nothing
-- added, nothing removed, nothing repositioned.
--
-- Davison: every kind='products' box gets kind inferred from its label
-- (My Music -> music, My Story -> story, My Books -> books, My Coffee Mugs
-- -> mugs). The correctly-kinded plaque row (Books/Music/Lyrics/My Story,
-- kind already matching label) is untouched by these ilike checks.
update public.stalls
set hotspots = (
  select jsonb_agg(
    case
      when h ->> 'kind' = 'products' and (h ->> 'label') ilike '%music%' then h || jsonb_build_object('kind', 'music')
      when h ->> 'kind' = 'products' and (h ->> 'label') ilike '%book%'  then h || jsonb_build_object('kind', 'books')
      when h ->> 'kind' = 'products' and (h ->> 'label') ilike '%lyric%' then h || jsonb_build_object('kind', 'lyrics')
      when h ->> 'kind' = 'products' and (h ->> 'label') ilike '%story%' then h || jsonb_build_object('kind', 'story')
      when h ->> 'kind' = 'products' and (h ->> 'label') ilike '%mug%'   then h || jsonb_build_object('kind', 'mugs')
      else h
    end
    order by ord
  )
  from jsonb_array_elements(hotspots) with ordinality as t(h, ord)
)
where user_id = '04754d57-d41d-4ea7-93df-542047a6785b';

-- Ed (primitivevsns): only "Creator's Bead Calendars" is mis-kinded
-- (kind='custom', which falls through to StallHotspotSheet's generic
-- books/ebooks query -- Ed has none, so it showed nothing at all) --
-- corrected to 'products', which is what a Craft-Calendar physical item
-- actually is. "364 HYVH Ball Caps" is left exactly as-is: its kind
-- ('products') is already the semantically correct one for merchandise --
-- the real problem there is that no ball-caps seed exists in his inventory
-- at all (confirmed live: his only products.type='product' row is the bead
-- calendar), which is a missing-content gap, not a kind-mismatch this
-- migration can fix.
update public.stalls
set hotspots = (
  select jsonb_agg(
    case
      when h ->> 'kind' = 'custom' and (h ->> 'label') ilike '%calendar%' then h || jsonb_build_object('kind', 'products')
      else h
    end
    order by ord
  )
  from jsonb_array_elements(hotspots) with ordinality as t(h, ord)
)
where user_id = (select user_id from public.profiles where username = 'primitivevsns');

-- --- Proof --------------------------------------------------------------------
select p.username, jsonb_agg((h ->> 'label') || '=' || (h ->> 'kind') order by (h ->> 'label')) as label_to_kind
from public.stalls s
join public.profiles p on p.user_id = s.user_id
cross join lateral jsonb_array_elements(s.hotspots) h
where p.username in ('davison.taljaard', 'primitivevsns')
group by p.username;
