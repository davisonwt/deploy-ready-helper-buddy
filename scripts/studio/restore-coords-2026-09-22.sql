-- RESTORE -- undoes the coordinate correction of 2026-09-22.
--
-- Written BEFORE the change, per the snapshot golden rule in CLAUDE.md.
-- Every row below is restored to the exact value it held at capture:
-- latitude -26.2 / longitude 28 (the Johannesburg centroid), which is what
-- useUserLocation.ts stamped for any member whose profile merely said
-- "South Africa". Rows are named by id, never by a WHERE that could match
-- differently later.

update public.profiles set latitude = -26.2, longitude = 28 where user_id = 'c1deec05-8442-4627-a900-b8e2d48930ee'::uuid;  -- blomkind1
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '3971cc26-3894-4712-8f61-d50587c93dc9'::uuid;  -- callth3guy
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '198092bc-b360-4c8a-9f07-7615add074a6'::uuid;  -- camokahola
update public.profiles set latitude = -26.2, longitude = 28 where user_id = 'd9cf6f3f-f3cd-4b20-b3e6-73b863f85e7e'::uuid;  -- chariwellnesspro
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '58249abb-829a-406c-a78b-a831ca528cd1'::uuid;  -- coenie
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '04754d57-d41d-4ea7-93df-542047a6785b'::uuid;  -- davison.taljaard
update public.profiles set latitude = -26.2, longitude = 28 where user_id = 'fad5212e-9262-4317-9b3c-586c3d3693bc'::uuid;  -- dpak.wessel
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '0a24d607-1859-4e56-a4bd-c09af4697f16'::uuid;  -- ezra.taljaard
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '8d183fc5-2e38-487f-afd5-f97c59a42476'::uuid;  -- grootbrak
update public.profiles set latitude = -26.2, longitude = 28 where user_id = 'ae68cc49-9e46-410d-9fb0-e4f0b9041a66'::uuid;  -- jtphotographer2
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '0356b9d0-02d9-41a7-ae57-cca4acecdc79'::uuid;  -- lribouet
update public.profiles set latitude = -26.2, longitude = 28 where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51'::uuid;  -- otaviocosta1973
update public.profiles set latitude = -26.2, longitude = 28 where user_id = '9cb1b19c-08dc-4586-95dd-23bb5f022428'::uuid;  -- (no username)

update public.wandering_roles set lat = -26.2, lng = 28 where id = '0278a7fa-8053-4563-b583-808184a705e9'::uuid;  -- chariwellnesspro / pillow
update public.wandering_roles set lat = -26.2, lng = 28 where id = 'b380cbec-d151-4b1f-a395-c62ec5f3930f'::uuid;  -- davison.taljaard / hand
update public.wandering_roles set lat = -26.2, lng = 28 where id = 'a742d6db-80dc-4ffc-9f7d-8b0e29776616'::uuid;  -- davison.taljaard / pillow
update public.wandering_roles set lat = -26.2, lng = 28 where id = '9607b925-bd87-42d7-94d3-a5c36c301b82'::uuid;  -- davison.taljaard / wheel

select count(*) as profiles_back from public.profiles where latitude = -26.2 and longitude = 28;
select count(*) as roles_back from public.wandering_roles where lat = -26.2 and lng = 28;
