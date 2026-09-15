-- Fix Gosat's Boardroom's 4 interior hotspots: all 4 were saved as
-- kind:'products' (a generic "browse this seller's products" content
-- sheet), not real links -- for gosatsboardroom (no products of its own)
-- that sheet always shows "Nothing in <label> yet / Add to <label>", the
-- same broken placeholder behavior for all 4, not just the 2 Davison
-- flagged. Root cause: the self-service "Mark your shelves" editor
-- (HotspotEditor.tsx) only offers TILE_KINDS (books/music/lyrics/story/
-- products/services/orchard/custom) and has no URL field for any of
-- them -- kind:'nav' + href (StallInteriorView.handleHotspotTap's ONLY
-- direct-navigate path, no sheet) isn't reachable from that UI at all, so
-- create-gosats-boardroom.mjs's original "pick kind 'custom', paste the
-- route into the custom-link field" instructions describe a field that
-- doesn't exist in the current build -- same pattern as every other
-- system stall's non-standard hotspot kinds (go_live/share/raise_hand/
-- companion_info/...), which are likewise only ever hand-authored via a
-- one-off script like this one, never the member-facing wizard.
--
-- This sets all 4 to kind:'nav' with the href mapping already documented
-- in create-gosats-boardroom.mjs's header comment. jsonb `||` merge keeps
-- each hotspot's own id/x/y/w/h/label untouched -- only kind/href change.
update public.stalls
set hotspots = (
  select jsonb_agg(
    case elem->>'label'
      when 'Seeds Management' THEN elem - 'text' || jsonb_build_object('kind', 'nav', 'href', '/admin/seeds')
      when 'AOD Station Radio Management' THEN elem - 'text' || jsonb_build_object('kind', 'nav', 'href', '/admin/radio')
      when 'Treasury' THEN elem - 'text' || jsonb_build_object('kind', 'nav', 'href', '/admin/treasury')
      when 'Admin Dashboard & Wallet Settings' THEN elem - 'text' || jsonb_build_object('kind', 'nav', 'href', '/admin/dashboard')
      else elem
    end
  )
  from jsonb_array_elements(hotspots) as elem
)
where user_id = (select id from auth.users where email = 'gosatsboardroom@sow2growapp.com');

-- --- Proof --------------------------------------------------------------------
select hotspots from public.stalls
where user_id = (select id from auth.users where email = 'gosatsboardroom@sow2growapp.com');
