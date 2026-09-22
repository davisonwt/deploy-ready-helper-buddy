-- BACKFILL: the one role revocation that predates the audit trigger.
--
-- Applied 2026-09-22 via the Management API, alongside migration
-- 20260922160000_user_role_audit.sql. This file records what was run;
-- it was not in the repo when it ran, which is the gap this commit closes.
--
-- The trigger records everything from the moment it was created. The
-- revocation that prompted it (commit 64a84b01) happened hours earlier,
-- so the trail would have started one entry short. These three rows make
-- it complete from its own first cause.
--
-- THREE rows, not one. The table's grain is one row per user_roles row,
-- and three role rows were deleted. A single row would have needed
-- role = 'gosat,admin,radio_admin', which breaks that column's meaning
-- and every query that groups or filters by it.
--
-- actor is 04754d57 (davison.taljaard) on all three, and that is the one
-- value here NOT captured by the database. The deletion ran through the
-- Management API, where auth.uid() is null; the note on each row says so
-- explicitly rather than letting a recorded actor imply a captured one.
--
-- old_row is the row as it stood before deletion, taken from the snapshot
-- in scripts/studio/restore-amberwheeles-roles-2026-09-22.sql -- ids,
-- granted_by and all three timestamps included.
--
-- Named ids, `on conflict do nothing`: re-running restores these exact
-- three rows and never duplicates them.
insert into public.user_role_audit
  (id, action, user_id, role, granted_by, actor, old_row, new_row, note, at)
values
  ('f6267081-1c79-4bdc-8ecd-8013f8e3a837',
   'delete',
   '432df4a7-07f1-4a5e-835c-a3c2806ce6c5',
   'gosat',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '{"id":"89ddb5ec-f31f-4c30-9e04-93376fda5c30","role":"gosat","user_id":"432df4a7-07f1-4a5e-835c-a3c2806ce6c5","created_at":"2025-08-22T01:40:30.077454+00:00","granted_at":"2025-08-22T01:40:30.077454+00:00","granted_by":"04754d57-d41d-4ea7-93df-542047a6785b","updated_at":"2025-08-22T01:40:30.077454+00:00"}'::jsonb,
   null,
   'BACKFILLED 2026-09-22. Revoked from the dormant duplicate amberwheeles@gmail.com after Amber confirmed amberswheeles@gmail.com is her only account. Authorised by davison.taljaard; executed by Claude Code via the Management API, so no auth.uid() existed at the time and actor is recorded from the authorising decision, not captured. Commit 64a84b01; restore script scripts/studio/restore-amberwheeles-roles-2026-09-22.sql.',
   '2026-09-22 14:20:00+00'),

  ('97c643a4-ee78-4158-a48f-247211009646',
   'delete',
   '432df4a7-07f1-4a5e-835c-a3c2806ce6c5',
   'admin',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '{"id":"377c2471-7600-4a6a-8b1b-178a8d43c92a","role":"admin","user_id":"432df4a7-07f1-4a5e-835c-a3c2806ce6c5","created_at":"2026-01-04T16:53:47.72736+00:00","granted_at":"2026-01-04T16:53:47.72736+00:00","granted_by":"04754d57-d41d-4ea7-93df-542047a6785b","updated_at":"2026-01-04T16:53:47.72736+00:00"}'::jsonb,
   null,
   'BACKFILLED 2026-09-22. Same revocation as the gosat row above. Commit 64a84b01.',
   '2026-09-22 14:20:00+00'),

  ('81744a8e-06cd-4eaa-9d4c-6d92ea18f058',
   'delete',
   '432df4a7-07f1-4a5e-835c-a3c2806ce6c5',
   'radio_admin',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '04754d57-d41d-4ea7-93df-542047a6785b',
   '{"id":"6f98f1dc-774c-4367-930a-8e56b6210144","role":"radio_admin","user_id":"432df4a7-07f1-4a5e-835c-a3c2806ce6c5","created_at":"2025-08-22T01:40:37.968294+00:00","granted_at":"2025-08-22T01:40:37.968294+00:00","granted_by":"04754d57-d41d-4ea7-93df-542047a6785b","updated_at":"2025-08-22T01:40:37.968294+00:00"}'::jsonb,
   null,
   'BACKFILLED 2026-09-22. Same revocation as the gosat row above. Commit 64a84b01.',
   '2026-09-22 14:20:00+00')
on conflict (id) do nothing;
