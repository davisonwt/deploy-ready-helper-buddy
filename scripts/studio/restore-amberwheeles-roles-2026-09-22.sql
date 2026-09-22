-- SNAPSHOT + RESTORE: user_roles for amberwheeles
-- (432df4a7-07f1-4a5e-835c-a3c2806ce6c5, amberwheeles@gmail.com),
-- captured 2026-09-22 BEFORE revoking gosat, admin and radio_admin.
--
-- Why they were revoked: the gosat visibility audit found TWO accounts
-- one letter apart, both holding gosat + admin + radio_admin:
--
--   amberswheeles  c34c0eba…  amberswheeles@gmail.com  "Amber Shalene Wheeles"
--   amberwheeles   432df4a7…  amberwheeles@gmail.com   "Amber Wheeles"
--
-- amberswheeles is the live account -- 1 sower, 3 products, 1 stall, 36
-- messages through 2026-09-20. amberwheeles has been dormant since
-- November 2025: no sower, no products, no stall, one message on
-- 2025-11-26, and its 48 uploads all predate 2025-11-10. Amber confirmed
-- amberswheeles@gmail.com is her only account.
--
-- ONLY the three role rows were deleted. The account, its profile, its
-- 48 storage objects, its chat history and its radio_djs row were all
-- left untouched, deliberately -- this is a privilege revocation, not a
-- deletion.
--
-- Re-running this restores the three rows exactly as they were, ids,
-- granted_by and timestamps included. Named rows only, never a WHERE
-- that could match differently later.
insert into public.user_roles (id, user_id, role, granted_by, granted_at, created_at, updated_at)
values
  ('89ddb5ec-f31f-4c30-9e04-93376fda5c30',
   '432df4a7-07f1-4a5e-835c-a3c2806ce6c5', 'gosat',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '2025-08-22 01:40:30.077454+00', '2025-08-22 01:40:30.077454+00', '2025-08-22 01:40:30.077454+00'),
  ('6f98f1dc-774c-4367-930a-8e56b6210144',
   '432df4a7-07f1-4a5e-835c-a3c2806ce6c5', 'radio_admin',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '2025-08-22 01:40:37.968294+00', '2025-08-22 01:40:37.968294+00', '2025-08-22 01:40:37.968294+00'),
  ('377c2471-7600-4a6a-8b1b-178a8d43c92a',
   '432df4a7-07f1-4a5e-835c-a3c2806ce6c5', 'admin',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '2026-01-04 16:53:47.72736+00', '2026-01-04 16:53:47.72736+00', '2026-01-04 16:53:47.72736+00')
on conflict (id) do nothing;
