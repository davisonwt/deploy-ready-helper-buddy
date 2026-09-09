-- Member invoicing Phase 1 full workflow (jobs, estimates, payment
-- schedules, auto-invoicing, chat-only messaging): database-side tests.
-- BEGIN ... ROLLBACK; nothing persists. Every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/phase-1-job-invoicing-tests.sql
--
-- Same reasoning as phase-1-invoice-tests.sql: `db query` connects as
-- `postgres` (rolbypassrls=true), so RLS-sensitive cases run under
-- `SET LOCAL ROLE authenticated` with the right JWT claim, proven against
-- a real policy violation. fixture_ids carries uuids between blocks.

BEGIN;

CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE fixture_ids (key text PRIMARY KEY, val text) ON COMMIT DROP;
GRANT ALL ON test_results, fixture_ids TO authenticated;

-- ---------------------------------------------------------------------
-- Setup: business, gosat trial grant, a not-yet-member customer B, and a
-- second "existing member" customer (test account B itself, already a
-- real auth user) -- as postgres, bypasses RLS (fixture, not under test).
-- ---------------------------------------------------------------------
DO $setup$
DECLARE
  v_user_a uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125'; -- test account A (sower)
  v_user_b uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2'; -- test account B (existing member customer)
  v_gosat  uuid := (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1);
  v_biz    uuid;
  v_b_email text;
BEGIN
  INSERT INTO public.companies (name, slug, owner_user_id, currency, books_enabled)
  VALUES ('Job invoicing test co', 'job-invoicing-test-co-' || gen_random_uuid()::text, v_user_a, 'USD', true)
  RETURNING id INTO v_biz;

  SELECT email INTO v_b_email FROM auth.users WHERE id = v_user_b;

  INSERT INTO public.feature_subscriptions (user_id, feature, status, current_period_end, source)
  VALUES (v_user_a, 'invoicing', 'trial', now() + interval '30 days', 'gosat');

  INSERT INTO fixture_ids VALUES
    ('user_a', v_user_a::text), ('user_b', v_user_b::text), ('gosat', v_gosat::text),
    ('biz', v_biz::text), ('b_email', v_b_email);
END;
$setup$;

-- ---------------------------------------------------------------------
-- As A: job, quotes, customers (invite + existing-member cases), estimate.
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_1_9$
DECLARE
  v_biz uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'biz');
  v_b_email text := (SELECT val FROM fixture_ids WHERE key = 'b_email');
  v_job public.job_notes%ROWTYPE;
  v_room_participants integer;
  v_cust_invite uuid;
  v_cust_member uuid;
  v_estimate uuid;
  v_est_number text;
  v_sent public.estimates%ROWTYPE;
  v_msg_count integer;
BEGIN
  -- 1. create_job_note creates the job row (status planning)
  v_job := public.create_job_note(v_biz, 'Fixture kitchen remodel', 'Test job', current_date + 14, 'Cape Town', 'Bring own tools');
  INSERT INTO test_results VALUES ('1. create_job_note creates a job_notes row (status=planning)', v_job.id IS NOT NULL AND v_job.status = 'planning', v_job.id::text);
  INSERT INTO fixture_ids VALUES ('job', v_job.id::text);

  -- 2. create_job_note also creates the chat room and adds the sower
  SELECT count(*) INTO v_room_participants FROM public.chat_participants WHERE room_id = v_job.chat_channel_id;
  INSERT INTO test_results VALUES ('2. job gets a chat_channel_id with the sower already a participant', v_job.chat_channel_id IS NOT NULL AND v_room_participants = 1, v_room_participants::text);

  -- supplier quotes
  INSERT INTO public.supplier_quotes (job_notes_id, supplier_name, amount) VALUES (v_job.id, 'Supplier X', 500);
  INSERT INTO public.supplier_quotes (job_notes_id, supplier_name, amount) VALUES (v_job.id, 'Supplier Y', 450);
  PERFORM 1 FROM (SELECT count(*) n FROM public.supplier_quotes WHERE job_notes_id = v_job.id) s WHERE s.n = 2;
  INSERT INTO test_results VALUES ('3. two supplier_quotes rows recorded on the job', FOUND, 'ok');

  -- 4. customer with no matching Sow2Grow account: invite_token set
  INSERT INTO public.customers (business_id, name, email, invite_token, invite_expires_at)
  VALUES (v_biz, 'Fixture Customer (no account)', 'fixture-customer-noaccount@example.com', gen_random_uuid(), now() + interval '30 days')
  RETURNING id INTO v_cust_invite;
  PERFORM 1 FROM public.customers WHERE id = v_cust_invite AND invite_token IS NOT NULL AND member_user_id IS NULL;
  INSERT INTO test_results VALUES ('4. customer with no S2G account gets an invite_token, member_user_id null', FOUND, 'ok');
  INSERT INTO fixture_ids VALUES ('cust_invite', v_cust_invite::text);

  -- 5. customer whose email matches an existing member (find_member_by_email + direct link)
  INSERT INTO public.customers (business_id, name, email, member_user_id)
  VALUES (v_biz, 'Fixture Customer (existing member)', v_b_email, public.find_member_by_email(v_b_email))
  RETURNING id INTO v_cust_member;
  PERFORM 1 FROM public.customers WHERE id = v_cust_member AND member_user_id = (SELECT val::uuid FROM fixture_ids WHERE key = 'user_b') AND invite_token IS NULL;
  INSERT INTO test_results VALUES ('5. customer whose email matches an existing member links member_user_id immediately', FOUND, 'ok');
  INSERT INTO fixture_ids VALUES ('cust_member', v_cust_member::text);

  -- 6. estimate create (draft) with lines + a 3-part payment schedule
  v_est_number := public.next_estimate_number(v_biz);
  INSERT INTO public.estimates (business_id, job_notes_id, customer_id, number, subtotal, total)
  VALUES (v_biz, v_job.id, v_cust_invite, v_est_number, 1000, 1000)
  RETURNING id INTO v_estimate;
  INSERT INTO test_results VALUES ('6. estimate insert succeeds (draft) with invoicing access', v_estimate IS NOT NULL, v_estimate::text);
  INSERT INTO fixture_ids VALUES ('estimate', v_estimate::text);

  INSERT INTO public.line_items (estimate_id, position, description, quantity, unit_price)
  VALUES (v_estimate, 0, 'Remodel labour', 1, 1000);

  INSERT INTO public.payment_schedule_items (estimate_id, position, label, percentage_of_total, amount, trigger_type, due_offset_days)
  VALUES (v_estimate, 0, 'Deposit 25%', 25, 250, 'date', 0);
  INSERT INTO public.payment_schedule_items (estimate_id, position, label, percentage_of_total, amount, trigger_type, trigger_job_status)
  VALUES (v_estimate, 1, '50% Milestone', 50, 500, 'job_status', 'job_50pct');
  INSERT INTO public.payment_schedule_items (estimate_id, position, label, percentage_of_total, amount, trigger_type, trigger_job_status)
  VALUES (v_estimate, 2, 'Final Balance', 25, 250, 'job_status', 'job_completion');
  PERFORM 1 FROM (SELECT count(*) n FROM public.payment_schedule_items WHERE estimate_id = v_estimate) s WHERE s.n = 3;
  INSERT INTO test_results VALUES ('7. three-part payment schedule recorded (deposit/50%/balance)', FOUND, 'ok');

  -- 8. send_estimate: draft -> sent, invite_token already present so
  -- reused (not regenerated), invite link posted to chat
  v_sent := public.send_estimate(v_estimate);
  INSERT INTO test_results VALUES ('8. send_estimate moves draft -> sent with a public_token', v_sent.status = 'sent' AND v_sent.public_token IS NOT NULL, v_sent.public_token::text);

  SELECT count(*) INTO v_msg_count FROM public.chat_messages WHERE room_id = v_job.chat_channel_id AND content LIKE '%join?invite=%';
  INSERT INTO test_results VALUES ('9. estimate sent to a non-member customer posts the invite link in job chat', v_msg_count >= 1, v_msg_count::text);

  -- Stash the real invite token now, as A (who owns this customer row and
  -- can read it) -- B cannot SELECT it directly (RLS correctly refuses;
  -- in the real app the token comes from the /join?invite= URL itself,
  -- never a live query B makes), so cases 10-12 read it from here.
  INSERT INTO fixture_ids VALUES ('real_invite_token', (SELECT invite_token::text FROM public.customers WHERE id = v_cust_invite));
END;
$case_1_9$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- Case 11 runs against the placeholder email already on the row (a
-- genuine mismatch with B's own); case 12 re-points it to B's real email
-- as postgres further down (the sower's own data, not the customer's to
-- edit) before B claims it for real.
-- ---------------------------------------------------------------------
-- claim_customer_invite: wrong email refused, right email links + joins
-- chat. Runs as user_b (a real, distinct auth user) under authenticated
-- role -- this is the actual customer accepting their invite.
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_b';
SET LOCAL ROLE authenticated;

DO $case_10_11$
DECLARE
  v_wrong_token uuid;
  v_real_token uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'real_invite_token');
  v_result jsonb;
BEGIN
  -- 10. wrong/unknown token is refused, not silently accepted
  v_wrong_token := gen_random_uuid();
  v_result := public.claim_customer_invite(v_wrong_token);
  INSERT INTO test_results VALUES ('10. claim_customer_invite refuses an unknown token', (v_result->>'ok')::boolean = false AND v_result->>'error' = 'invite_not_found', v_result::text);

  -- B's own account email does NOT match the fixture invite customer's
  -- email (fixture-customer-noaccount@example.com) -- must be refused.
  -- v_real_token comes from fixture_ids (stashed by A in case 8/9), never
  -- a live query here -- B cannot read customers.invite_token directly
  -- (correctly RLS-refused; in production the token is already in the
  -- /join?invite= URL the customer clicked, never queried by them).
  v_result := public.claim_customer_invite(v_real_token);
  INSERT INTO test_results VALUES ('11. claim_customer_invite refuses when the caller''s email does not match the invite', (v_result->>'ok')::boolean = false AND v_result->>'error' = 'email_mismatch', v_result::text);
END;
$case_10_11$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- Re-point the invite at B's real email, as postgres (the sower's own
-- data, not something the fixture should edit "as the customer").
DO $case_12_setup$
DECLARE
  v_cust_invite uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'cust_invite');
  v_b_email text := (SELECT val FROM fixture_ids WHERE key = 'b_email');
BEGIN
  UPDATE public.customers SET email = v_b_email WHERE id = v_cust_invite;
END;
$case_12_setup$;

SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_b';
SET LOCAL ROLE authenticated;

DO $case_12_13$
DECLARE
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_cust_invite uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'cust_invite');
  v_user_b uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'user_b');
  v_real_token uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'real_invite_token');
  v_result jsonb;
  v_participant_count integer;
  v_join_msg integer;
  v_event_count integer;
BEGIN
  v_result := public.claim_customer_invite(v_real_token);
  INSERT INTO test_results VALUES ('12. claim_customer_invite succeeds and links member_user_id, clears the token', (v_result->>'ok')::boolean = true, v_result::text);
  PERFORM 1 FROM public.customers WHERE id = v_cust_invite AND member_user_id = v_user_b AND invite_token IS NULL;
  INSERT INTO test_results VALUES ('12b. customers row now has member_user_id set and invite_token cleared', FOUND, 'ok');

  SELECT count(*) INTO v_participant_count FROM public.chat_participants WHERE room_id = (SELECT chat_channel_id FROM public.job_notes WHERE id = v_job) AND user_id = v_user_b;
  INSERT INTO test_results VALUES ('13a. claiming the invite adds the customer to the job''s chat_participants', v_participant_count = 1, v_participant_count::text);

  -- job_events has no customer-facing SELECT policy (by design, per the
  -- brief's own RLS list: "job_events -- owner SELECT own; public with
  -- customer_invite event" -- nothing broader for a linked customer), so
  -- the row itself is checked in the next block as the owner, not here.
  SELECT count(*) INTO v_join_msg FROM public.chat_messages WHERE room_id = (SELECT chat_channel_id FROM public.job_notes WHERE id = v_job) AND content = 'Customer joined the chat.';
  INSERT INTO test_results VALUES ('13b. "Customer joined" chat message posted', v_join_msg >= 1, v_join_msg::text);
END;
$case_12_13$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_13c$
DECLARE
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_event_count integer;
BEGIN
  -- As the job's owner (A), who does have SELECT on job_events.
  SELECT count(*) INTO v_event_count FROM public.job_events WHERE job_notes_id = v_job AND event_type = 'customer_joined';
  INSERT INTO test_results VALUES ('13c. claim_customer_invite recorded a customer_joined job_events row (checked by the job owner)', v_event_count >= 1, v_event_count::text);
END;
$case_13c$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- ---------------------------------------------------------------------
-- Estimate approval: refused for a stranger, succeeds for the linked
-- customer (B, now linked above), generates the 3 invoices.
-- ---------------------------------------------------------------------
DO $case_14_setup$
DECLARE
  v_user_gosat uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'gosat');
BEGIN
  NULL; -- placeholder, the actual case-14 refusal check runs as user_a (a stranger to this estimate's customer) below
END;
$case_14_setup$;

SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_14$
DECLARE
  v_estimate uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'estimate');
BEGIN
  -- 14. A (the sower, not the customer) cannot approve their own estimate
  BEGIN
    PERFORM public.approve_estimate(v_estimate);
    INSERT INTO test_results VALUES ('14. approve_estimate refuses a caller who is not the linked customer', false, 'no error raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('14. approve_estimate refuses a caller who is not the linked customer', SQLERRM LIKE '%forbidden%', SQLERRM);
  END;
END;
$case_14$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_b';
SET LOCAL ROLE authenticated;

DO $case_15_17$
DECLARE
  v_estimate uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'estimate');
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_result jsonb;
  v_result2 jsonb;
  v_inv_count integer;
  v_deposit_count integer;
  v_draft_count integer;
BEGIN
  -- 15. B (now the linked customer) approves successfully. Diagnostic
  -- context on failure (rather than aborting the whole fixture run
  -- opaquely) -- prints what claim_customer_invite actually left behind.
  BEGIN
    v_result := public.approve_estimate(v_estimate);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('15. approve_estimate succeeds for the linked customer', false,
      SQLERRM || ' | customer.member_user_id=' || (SELECT member_user_id::text FROM public.customers WHERE id = (SELECT customer_id FROM public.estimates WHERE id = v_estimate))
      || ' | expected(B)=' || (SELECT val FROM fixture_ids WHERE key = 'user_b'));
    RETURN;
  END;
  INSERT INTO test_results VALUES ('15. approve_estimate succeeds for the linked customer', v_result ? 'invoice_ids', v_result::text);
  PERFORM 1 FROM public.estimates WHERE id = v_estimate AND status = 'approved';
  INSERT INTO test_results VALUES ('15b. estimate status is approved', FOUND, 'ok');
  PERFORM 1 FROM public.job_notes WHERE id = v_job AND status = 'approved';
  INSERT INTO test_results VALUES ('15c. job_notes status moves to approved', FOUND, 'ok');

  -- 16. exactly 3 invoices, deposit sent, the other two draft
  SELECT count(*) INTO v_inv_count FROM public.invoices WHERE estimate_id = v_estimate;
  SELECT count(*) INTO v_deposit_count FROM public.invoices WHERE estimate_id = v_estimate AND kind = 'deposit' AND status = 'sent';
  SELECT count(*) INTO v_draft_count FROM public.invoices WHERE estimate_id = v_estimate AND status = 'draft';
  INSERT INTO test_results VALUES ('16. generate_estimate_invoices creates one invoice per schedule item (3), deposit sent, rest draft',
    v_inv_count = 3 AND v_deposit_count = 1 AND v_draft_count = 2, format('total=%s deposit_sent=%s draft=%s', v_inv_count, v_deposit_count, v_draft_count));

  -- 17. idempotent: calling generate_estimate_invoices again does not duplicate
  v_result2 := public.generate_estimate_invoices(v_estimate);
  SELECT count(*) INTO v_inv_count FROM public.invoices WHERE estimate_id = v_estimate;
  INSERT INTO test_results VALUES ('17. generate_estimate_invoices is idempotent (still 3 invoices)', v_inv_count = 3, v_inv_count::text);
END;
$case_15_17$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- 18: paying an invoice is never a direct client insert into
-- invoice_payments (no INSERT policy exists for `authenticated` at all --
-- confirmed live: B's own attempt was correctly RLS-refused). In
-- production this row is written by create-invoice-payment's service-role
-- client; matched here by running as postgres, not as B.
DO $case_18$
DECLARE
  v_estimate uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'estimate');
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_deposit_id uuid;
  v_payment_id uuid;
BEGIN
  SELECT id INTO v_deposit_id FROM public.invoices WHERE estimate_id = v_estimate AND kind = 'deposit';
  INSERT INTO public.invoice_payments (invoice_id, amount, rail, environment, status)
  VALUES (v_deposit_id, 250, 'solana', 'devnet', 'pending') RETURNING id INTO v_payment_id;
  PERFORM public.finalize_invoice_payment(v_payment_id, 'devnet', 'TEST-SIG-DEPOSIT');
  PERFORM 1 FROM public.invoices WHERE id = v_deposit_id AND status = 'paid';
  INSERT INTO test_results VALUES ('18a. deposit invoice finalizes to paid', FOUND, 'ok');
  PERFORM 1 FROM public.revenue_ledger WHERE kind = 'invoice_fee' AND source_id = v_payment_id AND amount = 37.50;
  INSERT INTO test_results VALUES ('18b. invoice_fee ledger row is exactly 15% of the deposit (37.50)', FOUND, 'ok');
  PERFORM 1 FROM public.job_notes WHERE id = v_job AND status = 'completed';
  INSERT INTO test_results VALUES ('18c. job is NOT auto-completed yet (two invoices still owed)', NOT FOUND, 'ok');
END;
$case_18$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- ---------------------------------------------------------------------
-- mark_job_progress (sower action) + the balance payment completing the
-- job. As A (the sower) for mark_job_progress, then B for the payments
-- (payments themselves run service-role-shaped, no client role needed).
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_19$
DECLARE
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_estimate uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'estimate');
  v_milestone_id uuid;
  v_msg_count integer;
BEGIN
  PERFORM public.mark_job_progress(v_job, 'job_50pct');
  SELECT id INTO v_milestone_id FROM public.invoices WHERE estimate_id = v_estimate AND kind = 'milestone';
  PERFORM 1 FROM public.invoices WHERE id = v_milestone_id AND status = 'sent';
  INSERT INTO test_results VALUES ('19a. mark_job_progress(job_50pct) sends the milestone invoice', FOUND, 'ok');
  SELECT count(*) INTO v_msg_count FROM public.chat_messages
   WHERE room_id = (SELECT chat_channel_id FROM public.job_notes WHERE id = v_job) AND content LIKE '%50%% complete%';
  INSERT INTO test_results VALUES ('19b. "Job marked 50%% complete" posted in chat', v_msg_count >= 1, v_msg_count::text);
  INSERT INTO fixture_ids VALUES ('milestone_invoice', v_milestone_id::text);
END;
$case_19$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

DO $case_20$
DECLARE
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_estimate uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'estimate');
  v_milestone_id uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'milestone_invoice');
  v_balance_id uuid;
  v_payment_id uuid;
  v_prior_completed integer;
  v_sower_id uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'user_a');
BEGIN
  IF v_milestone_id IS NULL THEN
    INSERT INTO test_results VALUES ('20a. balance invoice is still draft before job_completion is marked', false, 'SKIPPED: no milestone invoice id from case 19 (see 19a/16 for the real failure)');
    RETURN;
  END IF;
  -- Pay the milestone too, so only the balance remains before completion.
  INSERT INTO public.invoice_payments (invoice_id, amount, rail, environment, status)
  VALUES (v_milestone_id, 500, 'solana', 'devnet', 'pending') RETURNING id INTO v_payment_id;
  PERFORM public.finalize_invoice_payment(v_payment_id, 'devnet', 'TEST-SIG-MILESTONE');

  SELECT count(*) INTO v_prior_completed FROM public.job_notes WHERE sower_user_id = v_sower_id AND status = 'completed';

  -- Balance invoice is still draft until job_completion is marked.
  SELECT id INTO v_balance_id FROM public.invoices WHERE estimate_id = v_estimate AND kind = 'balance';
  PERFORM 1 FROM public.invoices WHERE id = v_balance_id AND status = 'draft';
  INSERT INTO test_results VALUES ('20a. balance invoice is still draft before job_completion is marked', FOUND, 'ok');
END;
$case_20$;

SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_20b$
DECLARE
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_estimate uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'estimate');
  v_balance_id uuid;
BEGIN
  PERFORM public.mark_job_progress(v_job, 'job_completion');
  SELECT id INTO v_balance_id FROM public.invoices WHERE estimate_id = v_estimate AND kind = 'balance';
  IF v_balance_id IS NULL THEN
    INSERT INTO test_results VALUES ('20b. mark_job_progress(job_completion) sends the balance invoice', false, 'no invoice with kind=balance exists for this estimate at all');
    RETURN;
  END IF;
  PERFORM 1 FROM public.invoices WHERE id = v_balance_id AND status = 'sent';
  INSERT INTO test_results VALUES ('20b. mark_job_progress(job_completion) sends the balance invoice', FOUND,
    'status=' || (SELECT status FROM public.invoices WHERE id = v_balance_id));
  INSERT INTO fixture_ids VALUES ('balance_invoice', v_balance_id::text);
END;
$case_20b$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

DO $case_20c$
DECLARE
  v_job uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'job');
  v_balance_id uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'balance_invoice');
  v_payment_id uuid;
  v_sower_id uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'user_a');
  v_prior_completed integer;
  v_congrats_count integer;
  v_completed_msg integer;
BEGIN
  IF v_balance_id IS NULL THEN
    INSERT INTO test_results VALUES ('20c. paying the balance auto-completes the job (all invoices paid)', false, 'SKIPPED: no balance invoice id from case 20b');
    RETURN;
  END IF;
  SELECT count(*) INTO v_prior_completed FROM public.job_notes WHERE sower_user_id = v_sower_id AND status = 'completed';

  INSERT INTO public.invoice_payments (invoice_id, amount, rail, environment, status)
  VALUES (v_balance_id, 250, 'solana', 'devnet', 'pending') RETURNING id INTO v_payment_id;
  PERFORM public.finalize_invoice_payment(v_payment_id, 'devnet', 'TEST-SIG-BALANCE');

  PERFORM 1 FROM public.job_notes WHERE id = v_job AND status = 'completed';
  INSERT INTO test_results VALUES ('20c. paying the balance auto-completes the job (all invoices paid)', FOUND, 'ok');

  SELECT count(*) INTO v_completed_msg FROM public.chat_messages
   WHERE room_id = (SELECT chat_channel_id FROM public.job_notes WHERE id = v_job) AND content = 'Job completed! All invoices paid.';
  INSERT INTO test_results VALUES ('20d. "Job completed! All invoices paid." posted in chat', v_completed_msg >= 1, v_completed_msg::text);

  IF v_prior_completed = 0 THEN
    SELECT count(*) INTO v_congrats_count FROM public.chat_messages
     WHERE room_id = (SELECT chat_channel_id FROM public.job_notes WHERE id = v_job) AND content LIKE '%Congratulations on your first completed job%';
    INSERT INTO test_results VALUES ('20e. first completed job for this sower posts a congratulations message', v_congrats_count >= 1, v_congrats_count::text);
  ELSE
    INSERT INTO test_results VALUES ('20e. first-job congratulations check skipped (sower already had a completed job before this fixture ran)', true, 'prior_completed=' || v_prior_completed::text);
  END IF;
END;
$case_20c$;

SELECT * FROM test_results ORDER BY name;

ROLLBACK;
