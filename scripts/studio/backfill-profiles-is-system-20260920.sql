-- Backfill for supabase/migrations/20260920130000_profiles_is_system.sql --
-- flags every currently-known non-member account so
-- get_total_member_count() (20260920120000_total_member_count_rpc.sql)
-- and UserManagementDashboard.jsx's Members/System split both exclude
-- them. Named explicitly by user_id, not a WHERE clause that could match
-- differently later; the six companion-* rows are named individually too,
-- even though they share a naming pattern, for the same reason.
--
-- The 13 accounts, confirmed live 2026-09-20:
--   S2G-run stall accounts: grovestation, wanderinghearts, companions
--     (Companions Village), scripturestudy (Scripture Study),
--     gosatsboardroom (Gosat's Boardroom -- missing from the admin
--     dashboard's own hardcoded set until now)
--   AI companion accounts: companion-alder, companion-beech,
--     companion-birch, companion-hawthorn, companion-thresh,
--     companion-willow
--   Playwright test accounts: davisontest1, davisontest2
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`) -- not a
-- migration, same one-off data-fix reasoning as the other scripts/studio/
-- backfill-*.sql files. Idempotent: safe to re-run.

UPDATE public.profiles SET is_system = true
WHERE user_id IN (
  'e9758e23-fba4-4778-8e58-4fd8e5550a72', -- grovestation
  '54ba45c3-382b-4cc2-9bb7-c1f895c3c119', -- wanderinghearts
  'b385c0c2-5e41-4058-b4e1-8afdc7c93f0c', -- companions
  '50f485b8-8aa0-462f-a01d-9c2f18d2105e', -- scripturestudy
  'be0aaebc-575a-4688-b0b0-09b77b2fa06f', -- gosatsboardroom
  '971ccdd7-203b-41f7-90e3-b3e48c531a33', -- companion-alder
  '4b6f54fa-b0be-49d3-925e-291225f0a788', -- companion-beech
  '2771c2aa-7f34-40cc-8381-73b6e56a7a86', -- companion-birch
  'aa38d402-a401-40d1-aea7-a76f4e4058b6', -- companion-hawthorn
  '9517b244-97a5-4b49-a95f-fdc1cda5862f', -- companion-thresh
  '6983c35b-5dbe-457b-bdf4-0629a1195440', -- companion-willow
  'de22c876-d477-4a5e-81a2-cd22091ce125', -- davisontest1
  'a8872ed5-951c-4343-ba05-d4921af18eb2'  -- davisontest2
);

-- --- Proof --------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.profiles) AS total_profiles,
  (SELECT count(*) FROM public.profiles WHERE is_system) AS system_flagged,
  (SELECT count(*) FROM public.profiles WHERE NOT is_system) AS real_members;
