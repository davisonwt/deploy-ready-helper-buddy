-- OPTIONAL. Clears the 129 review-queue entries that today's own test runs
-- created while verifying fail-open moderation. Run it only if you want the
-- Trust & Safety queue to start empty.
--
-- What these rows are: every upload made by the two test accounts on
-- 2026-09-17 while Sightengine's daily quota was exhausted. All of them are
-- the same repo asset, src/assets/tier-grove.jpg, uploaded by the live specs
-- (sleeping-pillows, pillow-units, sleeping-wheels, sleeping-hands) and by
-- the fail-open probes. None of them is member content.
--
--   de22c876-d477-4a5e-81a2-cd22091ce125  davisontest1@protonmail.com  126
--   04754d57-d41d-4ea7-93df-542047a6785b  davison.taljaard@icloud.com    3
--
-- reviewed_by is deliberately left NULL: no human looked at these, and the
-- audit trail should not claim otherwise. review_action 'allow' records the
-- outcome; a NULL reviewer is what marks it as a bulk test-data resolution.
--
-- Scoped to today and to those two uploader ids only, so it cannot touch a
-- real member's flagged upload. Check the count before committing.

begin;

-- Expect 129. If this is not 129, stop and look before continuing.
select count(*) as will_resolve
  from public.media_moderation
 where needs_review
   and reviewed_at is null
   and created_at::date = date '2026-09-17'
   and uploader_user_id in ('de22c876-d477-4a5e-81a2-cd22091ce125',
                            '04754d57-d41d-4ea7-93df-542047a6785b');

update public.media_moderation
   set reviewed_at = now(),
       review_action = 'allow'
 where needs_review
   and reviewed_at is null
   and created_at::date = date '2026-09-17'
   and uploader_user_id in ('de22c876-d477-4a5e-81a2-cd22091ce125',
                            '04754d57-d41d-4ea7-93df-542047a6785b');

-- Expect 0 left from those two accounts on that date.
select count(*) as still_queued
  from public.media_moderation
 where needs_review and reviewed_at is null;

commit;
