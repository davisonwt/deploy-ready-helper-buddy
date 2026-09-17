-- Step two of the Pillow units change. DO NOT RUN THIS WITH STEP ONE.
--
-- 20260917110000_pillow_units.sql created pillow_units and copied every
-- listing's stay_type, sleeps and rates into a first unit. Both shapes are
-- live at that point, which is deliberate: a browser tab open from before
-- the deploy still writes the old columns, and dropping them underneath it
-- turns a save into an error.
--
-- Run this only once all three are true:
--   1. The app build that writes pillow_units is live.
--   2. Every pillow listing has at least one unit (the check below refuses
--      to run otherwise).
--   3. Enough time has passed that no pre-deploy tab is still open. An hour
--      is plenty; a day is safer and costs nothing.
--
-- After this, units are the only place a Pillow rate or capacity lives.
-- pillow_seed_details keeps what genuinely belongs to the listing as a
-- whole: location, amenities, images, availability, currency, the legal
-- confirmation.
--
-- This drops columns holding member-typed content, so it is exactly what the
-- snapshot rule in CLAUDE.md covers. The restore script taken before step
-- one is at scripts/studio/restore-geodesic-domes-pre-units.sql. Take a
-- fresh snapshot of every pillow listing before running this if more have
-- been created since.

do $$
declare
  v_unconverted integer;
begin
  select count(*) into v_unconverted
    from public.pillow_seed_details d
   where not exists (select 1 from public.pillow_units u where u.product_id = d.product_id);

  if v_unconverted > 0 then
    raise exception
      'refusing to drop: % pillow listing(s) have no units yet', v_unconverted
      using hint = 'Run 20260917110000_pillow_units.sql first, and check for listings with no rate.';
  end if;
end $$;

alter table public.pillow_seed_details
  drop column if exists rate_nightly,
  drop column if exists rate_weekly,
  drop column if exists rate_monthly,
  drop column if exists sleeps,
  drop column if exists stay_type;

notify pgrst, 'reload schema';
