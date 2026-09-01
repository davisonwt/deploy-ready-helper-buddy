-- Test cases for public.wh_detect_contact_info() -- ~30 positive (should be
-- blocked) and ~15 negative (should be allowed). Run this after any change
-- to the detector; a non-empty result means something regressed (or the
-- new case needs the pattern tuned) -- an empty result means every case
-- below behaves as expected.
--
-- Run via the Supabase SQL editor or the Management API.

WITH cases(expect_block, content) AS (
  VALUES
  -- Positive: should be blocked -----------------------------------------
  (true, 'email me at jane@example.com'),
  (true, 'jane.doe123@gmail.com'),
  (true, 'reach me at test_user@yahoo.co.za'),
  (true, 'my number is 082 123 4567'),
  (true, 'call me on 0821234567'),
  (true, '0821234567'),
  (true, '+27 82 123 4567'),
  (true, '+1 (555) 123-4567'),
  (true, '082-123-4567'),
  (true, '082.123.4567'),
  (true, '(082) 123 4567'),
  (true, 'zero eight two one two three four five six seven'),
  (true, '0 8 2 1 2 3 4 5 6 7'),
  (true, '08two1two3four5six7'),
  (true, 'my insta is @janedoe'),
  (true, '@jane_doe123'),
  (true, 'check out instagram.com/janedoe'),
  (true, 'find me on tiktok'),
  (true, 'add me on snapchat'),
  (true, 'whatsapp me'),
  (true, 'here''s my number 555 123 4567'),
  (true, 'hit me up on telegram'),
  (true, 'www.example.com'),
  (true, 'https://example.com/profile'),
  (true, 'text me on 0731234567'),
  (true, 'call me at +27821234567'),
  (true, 'dm me on facebook'),
  (true, 'my linkedin is linkedin.com/in/janedoe'),
  (true, 'contact me at jane@work.co'),
  (true, 'signal me at +15551234567'),

  -- Negative: should be allowed ------------------------------------------
  (false, 'I had a great time yesterday, one of the best dates ever'),
  (false, 'Table for two at 7pm sounds lovely'),
  (false, 'I love hiking and going on adventures'),
  (false, 'That seed sold for R150000 last year'),
  (false, 'My order number is 12345'),
  (false, 'See you at 8'),
  (false, 'I have three siblings and two dogs'),
  (false, 'Let''s meet at 6:30pm on Friday'),
  (false, 'I scored 95 out of 100'),
  (false, 'My birthday is on the 15th of June'),
  (false, 'I''ve lived here for eight years'),
  (false, 'The recipe needs four eggs and two cups of flour'),
  (false, 'It''s been one heck of a day, but I''m having a good one'),
  (false, 'I''m free between 2 and 4 today'),
  (false, 'That coffee shop is amazing, five stars')
)
SELECT
  expect_block,
  (public.wh_detect_contact_info(content) IS NOT NULL) AS got_block,
  public.wh_detect_contact_info(content) AS rule,
  content
FROM cases
WHERE expect_block IS DISTINCT FROM (public.wh_detect_contact_info(content) IS NOT NULL);
-- ^ Filters to MISMATCHES ONLY. Empty result = all 45 cases pass (verified
-- live against the deployed function on 2026-09-01).
