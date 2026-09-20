-- The Cockpit's Global Chat member-count badge (get_total_member_count(),
-- 20260920120000_total_member_count_rpc.sql) was counting every row in
-- profiles, S2G-run system accounts and Playwright test accounts
-- included. No persisted flag existed for "not a real member" --
-- src/components/admin/UserManagementDashboard.jsx's own Members/System
-- split is a hardcoded client-side username Set (SYSTEM_ACCOUNT_USERNAMES:
-- wanderinghearts, grovestation, companions, scripturestudy, plus a
-- companion- prefix check) with no backing column, and it's missing
-- Gosat's Boardroom -- a real gap, not something to just re-read.
--
-- This is the real, persisted flag both that admin split and the member
-- count should read going forward, so the two never drift independently
-- again. Backfilled for every currently-known non-member account in
-- scripts/studio/backfill-profiles-is-system-20260920.sql.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
