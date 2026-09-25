-- Re-attribution, 2026-09-25, on Davison's instruction.
-- Restore: scripts/studio/restore-referrals-2026-09-25.sql (PART C).
-- Runs AFTER 20260925130000, so the new counter triggers move the counts.
--
-- 1. Anton Laubscher (antoncrossm) -> Louw De Beer (callth3guy).
--    He had no referrer (no code at signup). Created exactly as
--    process_referral would have: a referral_circle row, a referrals row
--    on Louw's active affiliate (5012E49B), profiles.referred_by, and a
--    follow of Louw. referred_at is his signup time, not today.
--    The member-welcome trigger on referral_circle is suspended for this
--    one insert: Anton never received the tribe welcome (it shipped the
--    day he joined), and whether to post one now, a day late, is
--    Davison's call, not a side effect.
--
-- 2. Otavio Costa (otaviocosta1973) -> Bianca Liebenberg
--    (bianca.liebenberg123, the only match). His existing rows move from
--    the founder. His follow of the founder is left alone: a follow is
--    his, not the attribution's. He never received the tribe welcome
--    (joined 2026-09-18), so there is no message to edit.

begin;

alter table public.referral_circle disable trigger member_welcome_on_referral;

insert into public.referral_circle (id, referrer_id, referred_user_id, status, referred_at)
values ('ea399a9f-bf1d-4510-9759-603013ae470c', '3971cc26-3894-4712-8f61-d50587c93dc9',
        'bdea1480-503b-4f60-a2bf-5408c3de0757', 'active', '2026-09-24 11:35:21.170612+00');

alter table public.referral_circle enable trigger member_welcome_on_referral;

insert into public.referrals (id, referrer_id, referred_id, status, commission_amount, commission_rate, created_at)
values ('12408484-19b7-45be-8850-dc8bc6560438', 'f9f8e0da-f379-4593-aa56-8165725bde4f',
        'bdea1480-503b-4f60-a2bf-5408c3de0757', 'completed', 0, 10, '2026-09-24 11:35:21.170612+00');

update public.profiles set referred_by = '3971cc26-3894-4712-8f61-d50587c93dc9'
 where user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757' and referred_by is null;

insert into public.followers (id, follower_id, following_id, source_type)
values ('34ba32c3-6f97-481f-9f02-b98d1f5748e0', 'bdea1480-503b-4f60-a2bf-5408c3de0757',
        '3971cc26-3894-4712-8f61-d50587c93dc9', 'profile')
on conflict (follower_id, following_id) do nothing;

update public.referral_circle set referrer_id = 'b19c9972-b30e-4113-ad80-683e21a13063'
 where id = '037db024-d950-475b-9f0a-f0b7611cab16' and referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b';
update public.referrals set referrer_id = 'afda93b0-2914-47f3-8c23-3b91c817b1a5'
 where id = '255d066b-75d1-426a-8b5f-7ddc69db1405' and referrer_id = 'a947ec5c-aa88-4d2f-b74b-63884e1ce423';
update public.profiles set referred_by = 'b19c9972-b30e-4113-ad80-683e21a13063'
 where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51' and referred_by = '04754d57-d41d-4ea7-93df-542047a6785b';

-- Every step above must have hit exactly its row; otherwise roll back.
do $$
begin
  if (select referrer_id from public.referral_circle where referred_user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757') is distinct from '3971cc26-3894-4712-8f61-d50587c93dc9'::uuid
  or (select referrer_id from public.referrals where referred_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757') is distinct from 'f9f8e0da-f379-4593-aa56-8165725bde4f'::uuid
  or (select referred_by from public.profiles where user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757') is distinct from '3971cc26-3894-4712-8f61-d50587c93dc9'::uuid
  or not exists (select 1 from public.followers where follower_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757' and following_id = '3971cc26-3894-4712-8f61-d50587c93dc9')
  or (select referrer_id from public.referral_circle where id = '037db024-d950-475b-9f0a-f0b7611cab16') is distinct from 'b19c9972-b30e-4113-ad80-683e21a13063'::uuid
  or (select referrer_id from public.referrals where id = '255d066b-75d1-426a-8b5f-7ddc69db1405') is distinct from 'afda93b0-2914-47f3-8c23-3b91c817b1a5'::uuid
  or (select referred_by from public.profiles where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51') is distinct from 'b19c9972-b30e-4113-ad80-683e21a13063'::uuid
  or exists (select 1 from public.member_welcomes where user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757')
  then
    raise exception 're-attribution did not land exactly as intended; rolled back';
  end if;
end $$;

commit;
