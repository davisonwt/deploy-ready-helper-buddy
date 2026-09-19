-- Restores davisontest2's own security-question row, overwritten while
-- verifying the SHA-256 fallback on 2026-09-18. Test account, but the
-- snapshot rule has no exceptions.

begin;

delete from public.user_security_questions where user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2';
insert into public.user_security_questions (id, user_id, question_1, answer_1_hash, question_2, answer_2_hash, question_3, answer_3_hash, created_at, updated_at)
  values ('d37a7ef6-90ad-49a1-a7a2-6f242e897a60', 'a8872ed5-951c-4343-ba05-d4921af18eb2', 'What was the name of your primary school?', '$2a$06$ZOC7tXVivUKzwZYYygEBVOw2t0Xq6doImaIl2OC2JGDsLHl1TE68m', 'What was the name of the street you grew up on?', '$2a$06$QlPpH1t0p/paF/I65JGZieKYmWNt3ixqD9VoBJFuBhG42vJ3m4vF.', 'What was the make of your first car?', '$2a$06$Y2mDwCWRN1RFNIXiCfTma.W4.c7.FgtKtA.qobEW/H37CgIF.0Cci', '2026-09-05 18:11:24.923691+00', '2026-09-05 18:11:24.923691+00');

commit;
