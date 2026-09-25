-- Referrals follow-up, 2026-09-25, on Davison's instruction.
-- Restore: scripts/studio/restore-referrals-2026-09-25b.sql.
-- One transaction; the closing assertions roll everything back if any
-- step did not land exactly.
--
-- 1. Petrus Booyens (camokahola): davisontest1 -> davison.taljaard.
--    Commission row onto the founder's ACTIVE affiliate (S2G-XVZ8K4P5).
-- 2. Chari Relling (chariwellnesspro): davison.taljaard -> Louw
--    (callth3guy). Her commission row sat on 36f08f61, a deactivated
--    affiliate row of the founder's; it moves to Louw's active 5012E49B.
--    Neither Petrus nor Chari ever received the tribe welcome (both joined
--    before it shipped), so there is no message to edit.
-- 3. profiles.referred_by backfilled from referral_circle for every member
--    who has a tribe row but no referred_by (the column only exists since
--    2026-09-12). Runs after 1-2, so it never overrides them.
-- 4. Anton (antoncrossm): the welcome he never got, Global + private,
--    through Louw's tribe.
-- 5. Otavio (otaviocosta1973): private welcome only. send_member_welcome
--    skips Global for a test profile, so he is marked is_test for that one
--    call and unmarked in the same transaction -- no Global row is ever
--    written (a post-and-delete would still fire the participants'
--    notification trigger).
-- The counter triggers (20260925130000) move each count by exactly one.

begin;

-- 1 -----------------------------------------------------------------
update public.referral_circle set referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b'
 where id = 'f87f127c-f845-4040-bf05-5ea874df69b7' and referrer_id = 'de22c876-d477-4a5e-81a2-cd22091ce125';
update public.referrals set referrer_id = 'a947ec5c-aa88-4d2f-b74b-63884e1ce423'
 where id = '4e697388-33f8-4378-b43a-0e2a9bca3c75' and referrer_id = '3a39724a-5619-4ce5-b50c-ff747f8f2e54';
update public.profiles set referred_by = '04754d57-d41d-4ea7-93df-542047a6785b'
 where user_id = '198092bc-b360-4c8a-9f07-7615add074a6' and referred_by = 'de22c876-d477-4a5e-81a2-cd22091ce125';

-- 2 -----------------------------------------------------------------
update public.referral_circle set referrer_id = '3971cc26-3894-4712-8f61-d50587c93dc9'
 where id = 'e0bae563-ac4d-4e67-a4b6-6e85ab1b99c6' and referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b';
update public.referrals set referrer_id = 'f9f8e0da-f379-4593-aa56-8165725bde4f'
 where id = 'f47bd58b-d4ba-41a5-b74d-2e62cbae9d7a' and referrer_id = '36f08f61-f6ce-46d2-ad82-a8b55cdf52c5';
update public.profiles set referred_by = '3971cc26-3894-4712-8f61-d50587c93dc9'
 where user_id = 'd9cf6f3f-f3cd-4b20-b3e6-73b863f85e7e' and referred_by = '04754d57-d41d-4ea7-93df-542047a6785b';

-- 3 -----------------------------------------------------------------
update public.profiles p set referred_by = rc.referrer_id
  from public.referral_circle rc
 where rc.referred_user_id = p.user_id and p.referred_by is null;

-- 4 -----------------------------------------------------------------
select public.send_member_welcome('bdea1480-503b-4f60-a2bf-5408c3de0757', '3971cc26-3894-4712-8f61-d50587c93dc9');

-- 5 -----------------------------------------------------------------
update public.profiles set is_test = true where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51' and not coalesce(is_test, false);
select public.send_member_welcome('ef206f1c-3c1c-49f4-8bca-3bddcb9deb51', 'b19c9972-b30e-4113-ad80-683e21a13063');
update public.profiles set is_test = false where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51';
update public.member_welcomes set global_skipped = 'late welcome, private only (joined 2026-09-18)'
 where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51';

-- assertions --------------------------------------------------------
do $$
declare
  bad text := '';
begin
  if (select referrer_id from public.referral_circle where id = 'f87f127c-f845-4040-bf05-5ea874df69b7') <> '04754d57-d41d-4ea7-93df-542047a6785b'
     or (select referrer_id from public.referrals where id = '4e697388-33f8-4378-b43a-0e2a9bca3c75') <> 'a947ec5c-aa88-4d2f-b74b-63884e1ce423'
     or (select referred_by from public.profiles where user_id = '198092bc-b360-4c8a-9f07-7615add074a6') <> '04754d57-d41d-4ea7-93df-542047a6785b' then
    bad := bad || ' petrus';
  end if;
  if (select referrer_id from public.referral_circle where id = 'e0bae563-ac4d-4e67-a4b6-6e85ab1b99c6') <> '3971cc26-3894-4712-8f61-d50587c93dc9'
     or (select referrer_id from public.referrals where id = 'f47bd58b-d4ba-41a5-b74d-2e62cbae9d7a') <> 'f9f8e0da-f379-4593-aa56-8165725bde4f'
     or (select referred_by from public.profiles where user_id = 'd9cf6f3f-f3cd-4b20-b3e6-73b863f85e7e') <> '3971cc26-3894-4712-8f61-d50587c93dc9' then
    bad := bad || ' chari';
  end if;
  if exists (select 1 from public.referral_circle rc join public.profiles p on p.user_id = rc.referred_user_id
              where p.referred_by is distinct from rc.referrer_id) then
    bad := bad || ' referred_by-disagrees';
  end if;
  if (select count(*) from public.chat_messages where system_metadata->>'user_id' = 'bdea1480-503b-4f60-a2bf-5408c3de0757'
        and system_metadata->>'type' in ('member_welcome_global', 'member_welcome_private')) <> 2
     or (select tribe_label from public.member_welcomes where user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757') <> 'Louw''s tribe' then
    bad := bad || ' anton-welcome';
  end if;
  if (select count(*) from public.chat_messages where system_metadata->>'user_id' = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51'
        and system_metadata->>'type' = 'member_welcome_global') <> 0
     or (select count(*) from public.chat_messages where system_metadata->>'user_id' = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51'
        and system_metadata->>'type' = 'member_welcome_private') <> 1
     or (select is_test from public.profiles where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51')
     or (select tribe_label from public.member_welcomes where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51') <> 'Bianca''s tribe' then
    bad := bad || ' otavio-welcome';
  end if;
  if exists (select 1 from public.user_referrals u
              where u.total_signups <> (select count(*) from public.referral_circle rc where rc.referrer_id = u.user_id))
     or exists (select 1 from public.affiliates a
              where a.total_referrals <> (select count(*) from public.referrals r where r.referrer_id = a.id)) then
    bad := bad || ' counters';
  end if;
  if exists (select 1 from public.referral_circle rc
               join public.profiles rp on rp.user_id = rc.referrer_id
               join public.profiles p on p.user_id = rc.referred_user_id
              where (coalesce(rp.is_test, false) or coalesce(rp.is_system, false))
                and not coalesce(p.is_test, false) and not coalesce(p.is_system, false)) then
    bad := bad || ' real-member-on-test-account';
  end if;
  if bad <> '' then
    raise exception 'follow-up did not land exactly:%; rolled back', bad;
  end if;
end $$;

commit;
