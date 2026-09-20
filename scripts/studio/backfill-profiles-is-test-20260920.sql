-- Backfill for supabase/migrations/20260920150000_profiles_is_test.sql --
-- flags exactly the two Playwright test accounts, named explicitly by
-- user_id, not a WHERE clause that could match differently later.
--
-- Deliberately NOT the same set as is_system: is_system also covers real
-- S2G-run stall accounts (Grove Station etc.) that belong in the Tribal
-- Gardens feed; is_test covers only accounts whose stall a real member
-- must never see there.
--
-- Run this by hand in Supabase Studio's SQL editor (or `psql`).
-- Idempotent: safe to re-run.

UPDATE public.profiles SET is_test = true
WHERE user_id IN (
  'de22c876-d477-4a5e-81a2-cd22091ce125', -- davisontest1
  'a8872ed5-951c-4343-ba05-d4921af18eb2'  -- davisontest2
);

-- --- Proof --------------------------------------------------------------------
SELECT user_id, username, is_test, is_system FROM public.profiles
WHERE user_id IN (
  'de22c876-d477-4a5e-81a2-cd22091ce125',
  'a8872ed5-951c-4343-ba05-d4921af18eb2'
);
