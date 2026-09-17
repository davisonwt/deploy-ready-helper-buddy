-- Restore script for "Beautifull Geodesic Domes Surrounded with Mountains".
--
-- Snapshot taken 2026-09-17, BEFORE the pillow_units migration
-- (20260917110000_pillow_units.sql) converts this listing's single
-- stay_type/sleeps/rates into its first unit row. Required by the
-- snapshot rule in CLAUDE.md.
--
-- Running this restores pillow_seed_details for this one product to
-- exactly the values below and removes any pillow_units rows created
-- for it. It names the row by its own id rather than re-deriving it
-- from a WHERE clause that could match differently later.
--
-- Owner: davison.taljaard. Product id: 3a238098-f438-40bb-90ed-d7d2f05540e6

-- Remove units created by the migration for this listing, if the table exists.
do $$ begin
  if to_regclass('public.pillow_units') is not null then
    delete from public.pillow_units where product_id = '3a238098-f438-40bb-90ed-d7d2f05540e6'::uuid;
  end if;
end $$;

update public.pillow_seed_details set
  stay_type                  = 'bush_camp'::pillow_stay_type,
  sleeps                     = 4,
  amenities                  = '{"own_bathroom","kitchen_access","wifi","parking","braai","pool"}'::text[],
  rate_nightly               = 1650.0,
  rate_weekly                = null,
  rate_monthly               = null,
  currency                   = 'ZAR',
  base_location              = 'Mossel Bay, Seven Bells, Western Cape',
  base_lat                   = -34.1832022,
  base_lng                   = 22.1536248,
  availability               = true,
  front_image_url            = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/1789621555395.jpg',
  interior_image_url         = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/1789621563747.jpg',
  gallery_urls               = '{"https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/pillow-1789621574346.jpg","https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/pillow-1789621585516.jpg","https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/pillow-1789621593700.jpg","https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/pillow-1789621600681.jpg","https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/covers/04754d57-d41d-4ea7-93df-542047a6785b/pillow-1789621605903.jpg"}'::text[],
  operator_confirmed_legal   = true,
  operator_confirmed_at      = '2026-09-17T05:10:12.135559+00:00'
where product_id = '3a238098-f438-40bb-90ed-d7d2f05540e6'::uuid;

-- The products row is not touched by the migration, but these are its
-- values as of the snapshot, for reference if they are ever needed:
--   title       Beautifull Geodesic Domes Surrounded with Mountains
--   price       1650.0
--   status      active
--   category    bush_camp

select product_id, stay_type, sleeps, rate_nightly, rate_weekly, rate_monthly,
       currency, base_location, base_lat, base_lng, availability
  from public.pillow_seed_details
 where product_id = '3a238098-f438-40bb-90ed-d7d2f05540e6'::uuid;
