-- Multi-category stalls: a stall can genuinely span more than one
-- category (e.g. a stall selling books, music, and faith teachings all
-- together) but the original schema only allowed exactly one
-- (stalls.category, single text + CHECK). Under that constraint such a
-- stall only ever surfaced under ONE category filter in the Tribal
-- Gardens feed, invisible to browsers filtering by any of the others.
--
-- Adds stalls.categories (text[], same 8-value vocabulary as the
-- original single-value check, at least one entry required) as the new
-- source of truth for the wizard's Step 1 picker and the feed's
-- filter/display. Backfills every existing row from its current
-- `category` value -- no data loss, becomes categories[1].
--
-- `category` is kept, not dropped (least disruption). The full blast
-- radius of every place in src/ that reads or writes stalls.category
-- was audited before this migration: StallBuildPage.tsx (writes) and
-- StallsFeedPage.tsx (reads/filters/displays) are the only two -- both
-- are updated in this same change to use `categories`. A trigger keeps
-- `category` synced to categories[1] going forward regardless, so any
-- caller this audit didn't catch (an edge function, a future admin
-- tool) still sees a sane single value with zero extra work from any
-- writer.

alter table public.stalls
  add column categories text[] not null default '{}'::text[];

update public.stalls
  set categories = array[category]
  where categories = '{}'::text[];

alter table public.stalls
  alter column categories drop default;

alter table public.stalls
  add constraint stalls_categories_check
  check (
    categories <> '{}'::text[]
    and categories <@ array['music','books_writing','art_craft','faith_teaching','trades_services','food_home','whisperer','orchard']::text[]
  );

-- Keeps the legacy single-value column in sync (categories[1]) so any
-- code path outside the audited two files still sees a sane value,
-- without forcing every writer to maintain both columns by hand. Fires
-- BEFORE so it satisfies stalls_category_check/NOT NULL on the same row,
-- same trigger-ordering pattern trg_stalls_default_tier already uses on
-- this table for `tier`.
create or replace function public.stalls_sync_category_from_categories()
returns trigger
language plpgsql
as $sync$
begin
  if new.categories is null or array_length(new.categories, 1) is null then
    return new; -- stalls_categories_check already forbids this; defensive only
  end if;
  new.category := new.categories[1];
  return new;
end;
$sync$;

drop trigger if exists trg_stalls_sync_category on public.stalls;
create trigger trg_stalls_sync_category
  before insert or update of categories on public.stalls
  for each row execute function public.stalls_sync_category_from_categories();

-- --- Proof --------------------------------------------------------------------
select
  count(*) as total_stalls,
  count(*) filter (where categories = '{}'::text[]) as unbackfilled,
  count(*) filter (where array_length(categories, 1) <> 1 or categories[1] <> category) as out_of_sync_with_legacy_column,
  pg_get_constraintdef((select oid from pg_constraint where conname = 'stalls_categories_check')) as categories_check
from public.stalls;
