-- Backfill Chari Relling (d9cf6f3f-f3cd-4b20-b3e6-73b863f85e7e) into
-- Davison/gosat's tribe (04754d57-d41d-4ea7-93df-542047a6785b, his
-- actively-used auth id -- last sign-in 2026-09-20, vs. the other linked
-- id 9cb1b19c-... last used 2026-09-01).
--
-- Evidence basis: NOT database evidence. Her signup (2026-09-20 21:08:17)
-- left zero referral trace anywhere -- profiles.referred_by null,
-- referral_circle empty, referrals empty. Basis is Davison's own explicit
-- confirmation that she registered via his invite link, exactly as the
-- task authorized ("Davison confirms she used his link"). An evidence-
-- backed audit for any OTHER orphaned-referral user system-wide
-- (profiles.referred_by set with no matching referral_circle row) came
-- back empty -- Chari is the only backfill this script performs.
--
-- Runs process_referral() directly -- the exact SECURITY DEFINER function
-- claim_referral_code() would have run from her own session at signup --
-- so every real side effect happens (referral_circle insert,
-- profiles.referred_by stamp, followers auto-insert, the
-- affiliates/user_referrals counters), not a hand-rolled partial copy of
-- them.
--
-- Code used: S2G-ZUKZ4HV1, gosat's oldest still-active affiliate code
-- under his live id -- the same code ensureReferralCode() deterministically
-- returns for him today (his invite link burns whatever ensureReferralCode
-- returns, and has since at least 2026-09-06).
SELECT public.process_referral(
  'd9cf6f3f-f3cd-4b20-b3e6-73b863f85e7e'::uuid,
  'S2G-ZUKZ4HV1'
);
