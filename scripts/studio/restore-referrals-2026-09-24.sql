-- SNAPSHOT + RESTORE: referral attribution, captured 2026-09-24 BEFORE
-- re-attributing three members from the founder to Lou de Beer.
--
-- WHO MOVES, and why. Sophia Loots (lootssophia9), Ilze Du Plessis
-- (sprinklesandmore8) and Frans Botes (fransbotes) each arrived carrying
-- the FOUNDER's own active invitation code S2G-XVZ8K4P5 in their signup
-- metadata, so attribution recorded him faithfully. Davison's account is
-- that they joined through Lou de Beer (callth3guy, display name "Louw"),
-- whose own code 5012E49B is live and demonstrably works -- Stan De Beer
-- and jtphotographer2 are both correctly attributed to her by it.
--
-- NOT moved, deliberately:
--   antoncrossm (Anton Laubscher) -- no code at signup and NO referrer at
--     all. He was never credited to the founder, so there is nothing to
--     correct; adding a referrer would be inventing an attribution.
--   otaviocosta1973 -- arrived on the same founder code but was not named
--     as one of Lou's, so he is left as he is.
--   callth3guy (Lou herself) -- correctly the founder's: she signed up on
--     his code.
--
-- Re-running this file restores every row by id. Named rows only.

-- 1. profiles.referred_by
update public.profiles p set referred_by = v.referred_by
  from (values
  ('505a2a20-45f9-452a-bc18-c107bda049b4'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid)  -- lootssophia9,
  ('a2a14cc5-b3d1-4cf3-a2cc-c4e1e8304ee4'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid)  -- sprinklesandmore8,
  ('1eb85366-907f-4aac-aa5a-75631c1225d4'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid)  -- fransbotes
) as v(user_id, referred_by)
 where p.user_id = v.user_id;

-- 2. referral_circle
update public.referral_circle rc set referrer_id = v.referrer_id
  from (values
  ('04886238-2f7f-4b57-8b8c-2142ac5d507c'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid)  -- lootssophia9 @ 2026-09-24 12:02:34.460595+00,
  ('da3a5aef-e67e-4c9e-9285-0d84adedc478'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid)  -- sprinklesandmore8 @ 2026-09-24 14:45:11.449608+00,
  ('fc2816d1-3b1f-416d-aed5-34fc2469d53c'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid)  -- fransbotes @ 2026-09-22 16:24:49.328947+00
) as v(id, referrer_id)
 where rc.id = v.id;

-- 3. referrals (the commission row; referrer_id here is an AFFILIATE id)
update public.referrals r set referrer_id = v.referrer_id
  from (values
  ('0849122c-7568-48e4-a272-2839ab468e75'::uuid, 'a947ec5c-aa88-4d2f-b74b-63884e1ce423'::uuid)  -- fransbotes,
  ('61ad48e1-a093-42c5-b847-0a1f0a30ec07'::uuid, 'a947ec5c-aa88-4d2f-b74b-63884e1ce423'::uuid)  -- lootssophia9,
  ('67832ce7-74ef-4084-947d-982c54ccff5b'::uuid, 'a947ec5c-aa88-4d2f-b74b-63884e1ce423'::uuid)  -- sprinklesandmore8
) as v(id, referrer_id)
 where r.id = v.id;

-- 4. the two members' counters
update public.user_referrals set total_signups = 3 where user_id='3971cc26-3894-4712-8f61-d50587c93dc9';  -- callth3guy
update public.affiliates set total_referrals = 3 where user_id='3971cc26-3894-4712-8f61-d50587c93dc9' and coalesce(is_active,true);  -- callth3guy
update public.user_referrals set total_signups = 36 where user_id='04754d57-d41d-4ea7-93df-542047a6785b';  -- davison.taljaard
update public.affiliates set total_referrals = 44 where user_id='04754d57-d41d-4ea7-93df-542047a6785b' and coalesce(is_active,true);  -- davison.taljaard

-- 5. member_welcomes labels
update public.member_welcomes mw set referrer_id = v.referrer_id, tribe_label = v.tribe_label
  from (values
  ('505a2a20-45f9-452a-bc18-c107bda049b4'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid, 'davison.taljaard''s tribe')  -- lootssophia9,
  ('a2a14cc5-b3d1-4cf3-a2cc-c4e1e8304ee4'::uuid, '04754d57-d41d-4ea7-93df-542047a6785b'::uuid, 'davison.taljaard''s tribe')  -- sprinklesandmore8
) as v(user_id, referrer_id, tribe_label)
 where mw.user_id = v.user_id;

-- 6. the welcome messages exactly as posted
update public.chat_messages m set content = v.content
  from (values
  ('c1b489af-73ac-43f8-9d19-537c81789a33'::uuid, '🌱 Sophia just joined S2G through davison.taljaard''s tribe — welcome to the Global Tribe! Say hi and help them find their feet.'),
  ('584d857d-a6e5-4294-963b-04473907ff0b'::uuid, 'Welcome to Sow2Grow, Sophia! You''re now part of davison.taljaard''s tribe — and of S2G''s Global Tribe. Start here: open your door, sow your first seed, and wander the orchard. The GoSats are in this room if you need anything — just reply.'),
  ('15be62e7-2df5-4624-a527-6023c1f161f4'::uuid, '🌱 Ilze just joined S2G through davison.taljaard''s tribe — welcome to the Global Tribe! Say hi and help them find their feet.'),
  ('a60b5334-4d69-4952-816a-488ca2f8078b'::uuid, 'Welcome to Sow2Grow, Ilze! You''re now part of davison.taljaard''s tribe — and of S2G''s Global Tribe. Start here: open your door, sow your first seed, and wander the orchard. The GoSats are in this room if you need anything — just reply.')
) as v(id, content)
 where m.id = v.id;
