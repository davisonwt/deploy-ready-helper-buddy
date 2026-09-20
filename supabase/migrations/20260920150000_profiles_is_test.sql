-- Separate from profiles.is_system (20260920130000) on purpose: a
-- Playwright/QA test account (davisontest1, davisontest2) IS flagged
-- is_system=true today for the member-count badge's sake, but that flag
-- also legitimately covers S2G-run stall accounts (Grove Station,
-- Wandering Hearts, Companions Village, Scripture Study, Gosat's
-- Boardroom) that belong in the Tribal Gardens feed and combobox --
-- reusing is_system to hide stalls would wrongly hide those too.
-- is_test is narrower: only accounts whose STALL a real member must
-- never see on a public browsing surface, backfilled for exactly the two
-- Playwright test accounts, no one else.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
