-- P0-5 Phase C2: SQL fixture tests for orchard cancel + refund. BEGIN ... ROLLBACK;
-- nothing persists. Every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/phase-c-refund-tests.sql
--
-- Fixture: a Launch orchard sown by B, 5 pockets x 10, with three held
-- holdings from A: H1 PayPal (live), H2 Solana with a known payer (devnet),
-- H3 Solana with an unknown payer (devnet). No money moves: the worker's
-- RPCs are driven by hand the way orchard-refund-worker drives them.
--
-- Cases:
--   1. a non-gosat cannot cancel (forbidden); a reason is mandatory
--   2. gosat cancel: cancelling; H1+H2 queued, H3 needs_human; events + notifications
--   2b. liability_snapshot still counts the money as held (live and devnet unchanged)
--   3. cancel again refuses (already_cancelling); release refuses
--   4. a released orchard refuses cancel (released_orchards_cannot_be_cancelled)
--   5. worker claim: 2 rows -> sending with the guardrail facts; a second claim gets nothing
--   6. confirm H2 (Solana): refunded; bestowal refunded; one refund_cost -0.01 devnet; notification
--   7. double confirm is a no-op; still one refund_cost row
--   8. H1 fails 3 times -> failed, holding refund_failed, gosats notified
--   9. gosat retry -> queued; defer keeps attempts; PayPal PENDING -> sent; webhook confirm keeps the stored fee
--  10. a non-gosat cannot retry / write off (forbidden)
--  11. write off H3 (reason mandatory): written_off, no ledger row; the LAST holding done -> orchard cancelled
--  12. late payment into the cancelled orchard: holding refund_pending + queued refund, never counted; settles back to cancelled

BEGIN;
ALTER TABLE public.orchards DISABLE TRIGGER trigger_auto_generate_premium_room;
CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE fx (k text PRIMARY KEY, v text) ON COMMIT DROP;

-- ---- as gosat: build the fixture ------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, true);

DO $pct_fx$
DECLARE
  v_a       uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';  -- bestower (test account A)
  v_b       uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2';  -- sower (test account B)
  v_orchard uuid;
  v_o       public.orchards%ROWTYPE;
  v_id      uuid;
  v_h       uuid;
  v_snap    jsonb;
BEGIN
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type)
  VALUES ('Phase C refund fixture', 'phase-c-refund-tests.sql; rolled back', 'general', v_b,
          (SELECT id FROM public.profiles WHERE user_id = v_b), 43.48, 43.48, 10, 'active', 'USDC', 'physical')
  RETURNING id INTO v_orchard;
  INSERT INTO fx VALUES ('orchard', v_orchard::text);

  -- H1: PayPal, live
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES (v_orchard, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PC-1', 'bestowal',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70))
  RETURNING id INTO v_id;
  v_h := public.orchard_apply_holding(v_id);
  INSERT INTO fx VALUES ('h1', v_h::text), ('b1', v_id::text);

  -- H2: Solana, devnet, payer known via the intent
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data, processor_fee_amount)
  VALUES (v_orchard, v_a, 10, 'USDC', 1, 'solana', 'completed', 'solana', 10, 10.01, 'pending', 'SIG-IN-PC-2', 'bestowal',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70), 0.01)
  RETURNING id INTO v_id;
  INSERT INTO public.solana_payment_intents (order_kind, order_id, amount_usdc, reference_pubkey, hot_wallet_address, status, signature,
                                             received_amount_usdc, cluster, expires_at, paid_at, payer_address, payer_source)
  VALUES ('orchard', v_id, 10.01, 'REF-PC-' || replace(v_id::text, '-', ''), '6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ', 'paid', 'SIG-IN-PC-2',
          10.01, 'devnet', now() + interval '1 hour', now(), 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx', 'chain');
  v_h := public.orchard_apply_holding(v_id);
  INSERT INTO fx VALUES ('h2', v_h::text), ('b2', v_id::text);

  -- H3: Solana, devnet, payer unknown (no intent)
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data, processor_fee_amount)
  VALUES (v_orchard, v_a, 10, 'USDC', 1, 'solana', 'completed', 'solana', 10, 10.01, 'pending', 'SIG-IN-PC-3', 'bestowal',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70), 0.01)
  RETURNING id INTO v_id;
  v_h := public.orchard_apply_holding(v_id);
  INSERT INTO fx VALUES ('h3', v_h::text), ('b3', v_id::text);

  SELECT * INTO v_o FROM public.orchards WHERE id = v_orchard;
  INSERT INTO test_results VALUES ('0. fixture: 5 pockets, 3 held (paypal live / solana known / solana unknown), open',
    v_o.total_pockets = 5 AND v_o.funding_state = 'open'
    AND (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_orchard AND status = 'held') = 3
    AND (SELECT payer_source FROM public.orchard_holdings WHERE id = (SELECT v::uuid FROM fx WHERE k = 'h2')) = 'intent'
    AND (SELECT payer_source FROM public.orchard_holdings WHERE id = (SELECT v::uuid FROM fx WHERE k = 'h3')) = 'unknown',
    format('pockets=%s state=%s', v_o.total_pockets, v_o.funding_state));

  INSERT INTO fx VALUES ('owed_before', (SELECT COALESCE(sum(amount_usd), 0) FROM public.owed_payout_balances() WHERE recipient_user_id = v_b)::text);
  v_snap := public.liability_snapshot('live');
  INSERT INTO fx VALUES ('live_before', (v_snap #>> '{held_for_orchards,total}'));
  v_snap := public.liability_snapshot('devnet');
  INSERT INTO fx VALUES ('devnet_before', (v_snap #>> '{held_for_orchards,total}'));
END;
$pct_fx$;

-- ---- 1. as A (non-gosat): cannot cancel --------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', 'de22c876-d477-4a5e-81a2-cd22091ce125', 'role', 'authenticated')::text, true);
DO $pct_1$
DECLARE v_err text := 'no error';
BEGIN
  BEGIN
    PERFORM public.orchard_cancel((SELECT v::uuid FROM fx WHERE k = 'orchard'), 'A tries to cancel');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('1. a non-gosat cannot cancel (forbidden)', v_err = 'forbidden', v_err);
END;
$pct_1$;

-- ---- 2..4 as gosat ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, true);
DO $pct_2$
DECLARE
  v_orchard uuid := (SELECT v::uuid FROM fx WHERE k = 'orchard');
  v_h1 uuid := (SELECT v::uuid FROM fx WHERE k = 'h1');
  v_h2 uuid := (SELECT v::uuid FROM fx WHERE k = 'h2');
  v_h3 uuid := (SELECT v::uuid FROM fx WHERE k = 'h3');
  v_b  uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2';
  v_a  uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';
  v_res jsonb;
  v_err text := 'no error';
  v_o   public.orchards%ROWTYPE;
  v_r1  public.orchard_refunds%ROWTYPE;
  v_r2  public.orchard_refunds%ROWTYPE;
  v_r3  public.orchard_refunds%ROWTYPE;
  v_snap jsonb;
  v_other uuid;
  v_id  uuid;
BEGIN
  BEGIN
    PERFORM public.orchard_cancel(v_orchard, 'x');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('1b. a reason is mandatory (cancel_reason_required)', v_err = 'cancel_reason_required', v_err);

  v_res := public.orchard_cancel(v_orchard, 'Fixture: sower withdrew the offer');
  SELECT * INTO v_o FROM public.orchards WHERE id = v_orchard;
  SELECT * INTO v_r1 FROM public.orchard_refunds WHERE holding_id = v_h1;
  SELECT * INTO v_r2 FROM public.orchard_refunds WHERE holding_id = v_h2;
  SELECT * INTO v_r3 FROM public.orchard_refunds WHERE holding_id = v_h3;
  INSERT INTO fx VALUES ('r1', v_r1.id::text), ('r2', v_r2.id::text), ('r3', v_r3.id::text);
  INSERT INTO test_results VALUES ('2. gosat cancel: cancelling; 2 queued + 1 needs_human; 30.00 to return; reason stored',
    (v_res ->> 'cancelled')::boolean AND v_res ->> 'state' = 'cancelling'
    AND (v_res ->> 'refunds_queued')::int = 2 AND (v_res ->> 'refunds_needing_human')::int = 1
    AND (v_res ->> 'total_to_return')::numeric = 30.00
    AND v_o.funding_state = 'cancelling' AND v_o.cancelled_at IS NOT NULL AND v_o.cancel_reason = 'Fixture: sower withdrew the offer'
    AND v_o.cancelled_by = auth.uid(),
    v_res::text);
  INSERT INTO test_results VALUES ('2a. H1 paypal queued to its capture id (live); H2 solana queued to its payer (devnet); H3 needs_human (unknown payer), holding refund_failed',
    v_r1.status = 'queued' AND v_r1.destination = 'CAPTURE-PC-1' AND v_r1.environment = 'live' AND v_r1.amount = 10 AND v_r1.rail = 'paypal'
    AND v_r2.status = 'queued' AND v_r2.destination = 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx' AND v_r2.environment = 'devnet' AND v_r2.amount = 10 AND v_r2.rail = 'solana'
    AND v_r3.status = 'needs_human' AND v_r3.last_error LIKE 'payer wallet unknown%'
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h1) = 'refund_pending'
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h2) = 'refund_pending'
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h3) = 'refund_failed'
    AND (SELECT refund_id FROM public.orchard_holdings WHERE id = v_h1) = v_r1.id,
    format('r1=%s/%s r2=%s/%s r3=%s', v_r1.status, v_r1.destination, v_r2.status, v_r2.destination, v_r3.status));
  INSERT INTO test_results VALUES ('2c. events: cancelled + 3 refund_queued; notifications: sower cancelled, A refund pending x3 (H3 too), gosats about H3 exactly once each',
    EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_orchard AND event = 'cancelled' AND amount = 30)
    AND (SELECT count(*) FROM public.orchard_events WHERE orchard_id = v_orchard AND event = 'refund_queued') = 3
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = v_b AND type = 'orchard_cancelled' AND metadata ->> 'orchard_id' = v_orchard::text)
    AND (SELECT count(*) FROM public.user_notifications WHERE user_id = v_a AND type = 'orchard_refund_pending' AND metadata ->> 'orchard_id' = v_orchard::text) = 3
    AND (SELECT count(*) FROM public.user_notifications WHERE type = 'orchard_refund_failed' AND metadata ->> 'refund_id' = v_r3.id::text)
        = (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role IN ('admin', 'gosat')),
    'ok');

  -- 2b. the snapshot still counts it all as held
  v_snap := public.liability_snapshot('live');
  INSERT INTO test_results VALUES ('2b. liability_snapshot live: held_for_orchards unchanged by the cancel; refunding shows 10.00',
    (v_snap #>> '{held_for_orchards,total}')::numeric = (SELECT v::numeric FROM fx WHERE k = 'live_before')
    AND (v_snap #>> '{held_for_orchards,refunding,total}')::numeric >= 10,
    format('before=%s after=%s refunding=%s', (SELECT v FROM fx WHERE k = 'live_before'), v_snap #>> '{held_for_orchards,total}', v_snap #>> '{held_for_orchards,refunding,total}'));
  v_snap := public.liability_snapshot('devnet');
  INSERT INTO test_results VALUES ('2b. liability_snapshot devnet: unchanged; refunding >= 20.00 (refund_failed counts too); needs_human >= 1',
    (v_snap #>> '{held_for_orchards,total}')::numeric = (SELECT v::numeric FROM fx WHERE k = 'devnet_before')
    AND (v_snap #>> '{held_for_orchards,refunding,total}')::numeric >= 20
    AND (v_snap #>> '{held_for_orchards,refunding,needs_human}')::int >= 1,
    format('before=%s after=%s refunding=%s', (SELECT v FROM fx WHERE k = 'devnet_before'), v_snap #>> '{held_for_orchards,total}', v_snap #>> '{held_for_orchards,refunding}'));

  -- 3. again / release
  v_res := public.orchard_cancel(v_orchard, 'Fixture: second cancel');
  INSERT INTO test_results VALUES ('3. cancel again refuses (already_cancelling); release refuses; still 3 refund rows',
    v_res ->> 'reason' = 'already_cancelling'
    AND NOT (public.orchard_release(v_orchard) ->> 'released')::boolean
    AND (SELECT count(*) FROM public.orchard_refunds WHERE orchard_id = v_orchard) = 3,
    v_res::text);

  -- 4. a released orchard refuses
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency)
  VALUES ('Phase C released fixture', 'rolled back', 'general', v_b, (SELECT id FROM public.profiles WHERE user_id = v_b), 8.70, 8.70, 10, 'active', 'USDC')
  RETURNING id INTO v_other;
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES (v_other, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PC-REL', 'bestowal',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70))
  RETURNING id INTO v_id;
  PERFORM public.orchard_apply_holding(v_id);
  v_res := public.orchard_cancel(v_other, 'Fixture: try to cancel a released orchard');
  INSERT INTO test_results VALUES ('4. a released orchard refuses cancel; its holding stays released; sower still owed',
    (SELECT funding_state FROM public.orchards WHERE id = v_other) = 'released'
    AND v_res ->> 'reason' = 'released_orchards_cannot_be_cancelled'
    AND (SELECT status FROM public.orchard_holdings WHERE orchard_id = v_other) = 'released'
    AND NOT EXISTS (SELECT 1 FROM public.orchard_refunds WHERE orchard_id = v_other),
    v_res::text);
  INSERT INTO fx VALUES ('released', v_other::text);
END;
$pct_2$;

-- ---- 5..9 as the service role (the worker) -----------------------------------
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $pct_5$
DECLARE
  v_orchard uuid := (SELECT v::uuid FROM fx WHERE k = 'orchard');
  v_h1 uuid := (SELECT v::uuid FROM fx WHERE k = 'h1');
  v_h2 uuid := (SELECT v::uuid FROM fx WHERE k = 'h2');
  v_r1 uuid := (SELECT v::uuid FROM fx WHERE k = 'r1');
  v_r2 uuid := (SELECT v::uuid FROM fx WHERE k = 'r2');
  v_r3 uuid := (SELECT v::uuid FROM fx WHERE k = 'r3');
  v_a  uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';
  v_claims jsonb[];
  v_c   jsonb;
  v_n   int;
  v_res jsonb;
  v_res2 jsonb;
  v_res3 jsonb;
  v_rows int;
  v_fee numeric;
BEGIN
  -- 5. claim
  SELECT array_agg(c) INTO v_claims FROM public.orchard_refund_claim(10, v_orchard) c;
  SELECT count(*) INTO v_n FROM public.orchard_refund_claim(10, v_orchard);
  INSERT INTO test_results VALUES ('5. claim: 2 rows -> sending with claimed_at; H3 untouched; a second claim gets nothing',
    array_length(v_claims, 1) = 2 AND v_n = 0
    AND (SELECT count(*) FROM public.orchard_refunds WHERE orchard_id = v_orchard AND status = 'sending' AND claimed_at IS NOT NULL) = 2
    AND (SELECT status FROM public.orchard_refunds WHERE id = v_r3) = 'needs_human',
    format('claimed=%s second=%s', array_length(v_claims, 1), v_n));
  SELECT c INTO v_c FROM unnest(v_claims) c WHERE c ->> 'id' = v_r2::text;
  INSERT INTO test_results VALUES ('5a. guardrail facts on the claim: amount = holding gross; destination = holding payer; orchard cancelling; holding refund_pending',
    (v_c ->> 'amount')::numeric = (v_c ->> 'holding_gross')::numeric
    AND v_c ->> 'destination' = v_c ->> 'holding_payer'
    AND v_c ->> 'funding_state' = 'cancelling' AND v_c ->> 'holding_status' = 'refund_pending'
    AND v_c ->> 'rail_reference' IS NULL AND v_c ->> 'environment' = 'devnet',
    v_c::text);

  -- 6. confirm H2
  v_res := public.orchard_refund_confirm(v_r2, 'SIG-REFUND-PC-2', 0.01, 'fixture');
  SELECT count(*), COALESCE(sum(amount), 0) INTO v_rows, v_fee FROM public.revenue_ledger
   WHERE kind = 'refund_cost' AND source_table = 'orchard_refunds' AND source_id = v_r2;
  INSERT INTO test_results VALUES ('6. confirm H2: refunded; bestowal payout_status refunded; refund_cost -0.01 devnet solana; event; notification; orchard still cancelling',
    (v_res ->> 'confirmed')::boolean AND NOT (v_res ->> 'orchard_cancelled')::boolean
    AND (SELECT status = 'confirmed' AND rail_reference = 'SIG-REFUND-PC-2' AND fee_cost = 0.01 AND confirmed_at IS NOT NULL FROM public.orchard_refunds WHERE id = v_r2)
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h2) = 'refunded'
    AND (SELECT payout_status FROM public.bestowals WHERE id = (SELECT v::uuid FROM fx WHERE k = 'b2')) = 'refunded'
    AND v_rows = 1 AND v_fee = -0.01
    AND (SELECT environment = 'devnet' AND rail = 'solana' AND release_ref = v_orchard::text FROM public.revenue_ledger WHERE kind = 'refund_cost' AND source_id = v_r2)
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE holding_id = v_h2 AND event = 'refund_confirmed')
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = v_a AND type = 'orchard_refunded' AND metadata ->> 'refund_id' = v_r2::text)
    AND (SELECT funding_state FROM public.orchards WHERE id = v_orchard) = 'cancelling'
    AND public.orchard_refunds_sent_today('devnet') >= 10,
    format('res=%s rows=%s fee=%s', v_res::text, v_rows, v_fee));

  -- 7. double confirm
  v_res := public.orchard_refund_confirm(v_r2, 'SIG-REFUND-PC-2', 0.01, 'again');
  v_res2 := public.orchard_refund_confirm(v_r2, 'SIG-OTHER', 0.01, 'other ref');
  SELECT count(*) INTO v_rows FROM public.revenue_ledger WHERE kind = 'refund_cost' AND source_id = v_r2;
  INSERT INTO test_results VALUES ('7. double confirm is a no-op (already_confirmed), a different reference too; still one refund_cost row',
    v_res ->> 'reason' = 'already_confirmed' AND v_res2 ->> 'reason' = 'already_confirmed' AND v_rows = 1, format('%s | %s', v_res::text, v_res2::text));

  -- 8. H1 fails three times
  v_res := public.orchard_refund_fail(v_r1, 'paypal 500: first');
  SELECT count(*) INTO v_n FROM public.orchard_refund_claim(10, v_orchard);
  v_res2 := public.orchard_refund_fail(v_r1, 'paypal 500: second');
  SELECT count(*) INTO v_n FROM public.orchard_refund_claim(10, v_orchard);
  v_res3 := public.orchard_refund_fail(v_r1, 'paypal 500: third');
  INSERT INTO test_results VALUES ('8. H1: fail -> queued (1), fail -> queued (2), fail -> failed (3); holding refund_failed; gosats notified',
    v_res ->> 'status' = 'queued' AND (v_res ->> 'attempts')::int = 1
    AND v_res2 ->> 'status' = 'queued' AND (v_res2 ->> 'attempts')::int = 2
    AND v_res3 ->> 'status' = 'failed' AND (v_res3 ->> 'attempts')::int = 3
    AND (SELECT status = 'failed' AND attempts = 3 AND last_error = 'paypal 500: third' FROM public.orchard_refunds WHERE id = v_r1)
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h1) = 'refund_failed'
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE type = 'orchard_refund_failed' AND metadata ->> 'refund_id' = v_r1::text)
    AND (SELECT count(*) FROM public.orchard_refund_claim(10, v_orchard)) = 0,
    format('%s | %s | %s', v_res::text, v_res2::text, v_res3::text));
  INSERT INTO test_results VALUES ('8a. a failed row cannot be confirmed or deferred; a confirmed row cannot be failed',
    public.orchard_refund_confirm(v_r1, 'X', 0) ->> 'reason' = 'not_in_flight'
    AND public.orchard_refund_defer(v_r1, 'x') ->> 'reason' = 'not_sending'
    AND public.orchard_refund_fail(v_r2, 'x') ->> 'reason' = 'not_in_flight', 'ok');
END;
$pct_5$;

-- ---- 9. gosat retry, then worker defer / sent / webhook confirm -----------------
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, true);
DO $pct_9a$
DECLARE
  v_r1 uuid := (SELECT v::uuid FROM fx WHERE k = 'r1');
  v_h1 uuid := (SELECT v::uuid FROM fx WHERE k = 'h1');
  v_res jsonb;
BEGIN
  v_res := public.orchard_refund_retry(v_r1, 'PayPal is back');
  INSERT INTO test_results VALUES ('9. gosat retry: failed -> queued; holding refund_pending; attempts kept at 3; retry event',
    v_res ->> 'status' = 'queued'
    AND (SELECT status = 'queued' AND attempts = 3 AND last_error IS NULL AND claimed_at IS NULL FROM public.orchard_refunds WHERE id = v_r1)
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h1) = 'refund_pending'
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE holding_id = v_h1 AND event = 'refund_retry' AND actor_role = 'gosat'),
    v_res::text);
END;
$pct_9a$;

SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $pct_9b$
DECLARE
  v_orchard uuid := (SELECT v::uuid FROM fx WHERE k = 'orchard');
  v_r1 uuid := (SELECT v::uuid FROM fx WHERE k = 'r1');
  v_h1 uuid := (SELECT v::uuid FROM fx WHERE k = 'h1');
  v_n int;
  v_res jsonb;
  v_res2 jsonb;
  v_rows int;
  v_fee numeric;
BEGIN
  SELECT count(*) INTO v_n FROM public.orchard_refund_claim(10, v_orchard);
  v_res := public.orchard_refund_defer(v_r1, 'refund is live but the worker''s PayPal credentials are sandbox');
  INSERT INTO test_results VALUES ('9a. defer: sending -> queued, attempts unchanged (3), reason kept, deferred event',
    v_n = 1 AND v_res ->> 'status' = 'queued'
    AND (SELECT status = 'queued' AND attempts = 3 AND last_error LIKE 'refund is live%' FROM public.orchard_refunds WHERE id = v_r1)
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE holding_id = v_h1 AND event = 'refund_deferred'),
    v_res::text);

  SELECT count(*) INTO v_n FROM public.orchard_refund_claim(10, v_orchard);
  v_res := public.orchard_refund_sent(v_r1, 'PAYPAL-REFUND-PC-1', 0.30, 'paypal PENDING');
  INSERT INTO test_results VALUES ('9b. PayPal PENDING -> sent with the reference and the fee stored; a sent row cannot be failed, deferred, or confirmed with another reference',
    v_n = 1 AND v_res ->> 'status' = 'sent'
    AND (SELECT status = 'sent' AND rail_reference = 'PAYPAL-REFUND-PC-1' AND fee_cost = 0.30 AND sent_at IS NOT NULL FROM public.orchard_refunds WHERE id = v_r1)
    AND public.orchard_refund_fail(v_r1, 'x') ->> 'reason' = 'not_in_flight'
    AND public.orchard_refund_defer(v_r1, 'x') ->> 'reason' = 'not_sending'
    AND public.orchard_refund_confirm(v_r1, 'SOMETHING-ELSE', NULL) ->> 'reason' = 'reference_mismatch',
    v_res::text);

  -- the webhook confirms with a NULL fee: the stored 0.30 is used
  v_res := public.orchard_refund_confirm(v_r1, 'PAYPAL-REFUND-PC-1', NULL, 'paypal webhook WH-1');
  SELECT count(*), COALESCE(sum(amount), 0) INTO v_rows, v_fee FROM public.revenue_ledger
   WHERE kind = 'refund_cost' AND source_table = 'orchard_refunds' AND source_id = v_r1;
  INSERT INTO test_results VALUES ('9c. webhook confirm: confirmed; refund_cost -0.30 live paypal; holding refunded; orchard still cancelling (H3 open)',
    (v_res ->> 'confirmed')::boolean AND (v_res ->> 'fee_cost')::numeric = 0.30 AND NOT (v_res ->> 'orchard_cancelled')::boolean
    AND v_rows = 1 AND v_fee = -0.30
    AND (SELECT environment = 'live' AND rail = 'paypal' FROM public.revenue_ledger WHERE kind = 'refund_cost' AND source_id = v_r1)
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h1) = 'refunded'
    AND (SELECT funding_state FROM public.orchards WHERE id = v_orchard) = 'cancelling',
    format('res=%s rows=%s fee=%s', v_res::text, v_rows, v_fee));
  INSERT INTO test_results VALUES ('9d. after confirmation any further confirm, even with another reference, is already_confirmed',
    (SELECT public.orchard_refund_confirm(v_r1, 'SOMETHING-ELSE', NULL) ->> 'reason') = 'already_confirmed', 'ok');
END;
$pct_9b$;

-- ---- 10. as A: cannot retry / write off ------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', 'de22c876-d477-4a5e-81a2-cd22091ce125', 'role', 'authenticated')::text, true);
DO $pct_10$
DECLARE v_e1 text := 'no error'; v_e2 text := 'no error'; v_e3 text := 'no error';
DECLARE v_r3 uuid := (SELECT v::uuid FROM fx WHERE k = 'r3');
BEGIN
  BEGIN PERFORM public.orchard_refund_retry(v_r3, 'A'); EXCEPTION WHEN OTHERS THEN v_e1 := SQLERRM; END;
  BEGIN PERFORM public.orchard_refund_write_off(v_r3, 'A writes off'); EXCEPTION WHEN OTHERS THEN v_e2 := SQLERRM; END;
  BEGIN PERFORM public.orchard_refund_confirm(v_r3, 'X', 0); EXCEPTION WHEN OTHERS THEN v_e3 := SQLERRM; END;
  INSERT INTO test_results VALUES ('10. a non-gosat cannot retry, write off, or confirm (forbidden x3)',
    v_e1 = 'forbidden' AND v_e2 = 'forbidden' AND v_e3 = 'forbidden', format('%s | %s | %s', v_e1, v_e2, v_e3));
END;
$pct_10$;

-- ---- 11..12 as gosat: write off the last one; late payment ------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, true);
DO $pct_11$
DECLARE
  v_orchard uuid := (SELECT v::uuid FROM fx WHERE k = 'orchard');
  v_h3 uuid := (SELECT v::uuid FROM fx WHERE k = 'h3');
  v_r3 uuid := (SELECT v::uuid FROM fx WHERE k = 'r3');
  v_a  uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';
  v_b  uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2';
  v_err text := 'no error';
  v_res jsonb;
  v_id  uuid;
  v_h   uuid;
  v_f   record;
  v_rid uuid;
BEGIN
  BEGIN PERFORM public.orchard_refund_write_off(v_r3, 'x'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO test_results VALUES ('11a. write-off reason is mandatory; retry of an unknown payer refuses (payer_still_unknown)',
    v_err = 'write_off_reason_required' AND public.orchard_refund_retry(v_r3) ->> 'reason' = 'payer_still_unknown', v_err);

  v_res := public.orchard_refund_write_off(v_r3, 'Fixture: bestower unreachable, wallet unknown');
  INSERT INTO test_results VALUES ('11. write off H3: written_off (terminal); holding written_off; NO ledger row; the last holding done -> orchard cancelled; cancel_settled event',
    (v_res ->> 'ok')::boolean AND (v_res ->> 'orchard_cancelled')::boolean
    AND (SELECT status = 'written_off' AND written_off_by = auth.uid() AND written_off_reason LIKE 'Fixture: bestower%' FROM public.orchard_refunds WHERE id = v_r3)
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h3) = 'written_off'
    AND NOT EXISTS (SELECT 1 FROM public.revenue_ledger WHERE source_table = 'orchard_refunds' AND source_id = v_r3)
    AND (SELECT funding_state FROM public.orchards WHERE id = v_orchard) = 'cancelled'
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_orchard AND event = 'cancel_settled')
    AND public.orchard_refund_retry(v_r3) ->> 'reason' = 'not_retryable'
    AND public.orchard_refund_write_off(v_r3, 'again again') ->> 'reason' = 'not_writable_off',
    v_res::text);

  -- 12. late payment into the cancelled orchard
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES (v_orchard, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PC-LATE', 'bestowal',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70))
  RETURNING id INTO v_id;
  v_h := public.orchard_apply_holding(v_id);
  SELECT * INTO v_f FROM public.orchard_funding_status(v_orchard);
  SELECT refund_id INTO v_rid FROM public.orchard_holdings WHERE id = v_h;
  INSERT INTO test_results VALUES ('12. late payment: holding refund_pending + queued refund to its capture; late_payment event; pockets_held 0; orchard back to cancelling; nothing owed',
    v_h IS NOT NULL
    AND (SELECT status FROM public.orchard_holdings WHERE id = v_h) = 'refund_pending'
    AND (SELECT status = 'queued' AND destination = 'CAPTURE-PC-LATE' AND amount = 10 FROM public.orchard_refunds WHERE id = v_rid)
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE holding_id = v_h AND event = 'late_payment')
    AND v_f.pockets_held = 0 AND NOT v_f.funded
    AND (SELECT funding_state FROM public.orchards WHERE id = v_orchard) = 'cancelling'
    AND (SELECT COALESCE(sum(amount_usd), 0) FROM public.owed_payout_balances() WHERE recipient_user_id = v_b) = (SELECT v::numeric FROM fx WHERE k = 'owed_before') + 8.70,  -- only the released fixture's 8.70
    format('h=%s pockets_held=%s state=%s', v_h, v_f.pockets_held, (SELECT funding_state FROM public.orchards WHERE id = v_orchard)));
  INSERT INTO fx VALUES ('r_late', v_rid::text);

  -- a late payment into the RELEASED fixture too
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES ((SELECT v::uuid FROM fx WHERE k = 'released'), v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PC-LATE-REL', 'bestowal',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70))
  RETURNING id INTO v_id;
  v_h := public.orchard_apply_holding(v_id);
  INSERT INTO test_results VALUES ('12a. late payment into a released orchard: refund queued, orchard stays released, sower still owed only 8.70',
    (SELECT status FROM public.orchard_holdings WHERE id = v_h) = 'refund_pending'
    AND (SELECT funding_state FROM public.orchards WHERE id = (SELECT v::uuid FROM fx WHERE k = 'released')) = 'released'
    AND (SELECT COALESCE(sum(amount_usd), 0) FROM public.owed_payout_balances() WHERE recipient_user_id = v_b) = (SELECT v::numeric FROM fx WHERE k = 'owed_before') + 8.70
    AND (SELECT count(*) FROM public.orchard_refunds WHERE orchard_id = (SELECT v::uuid FROM fx WHERE k = 'released') AND status = 'queued') = 1,
    format('h=%s', v_h));
END;
$pct_11$;

SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $pct_12$
DECLARE
  v_orchard uuid := (SELECT v::uuid FROM fx WHERE k = 'orchard');
  v_rid uuid := (SELECT v::uuid FROM fx WHERE k = 'r_late');
  v_n int;
  v_res jsonb;
BEGIN
  SELECT count(*) INTO v_n FROM public.orchard_refund_claim(10, v_orchard);
  v_res := public.orchard_refund_confirm(v_rid, 'PAYPAL-REFUND-PC-LATE', 0.30, 'fixture');
  INSERT INTO test_results VALUES ('12b. the late refund confirms; orchard settles back to cancelled',
    v_n = 1 AND (v_res ->> 'confirmed')::boolean AND (v_res ->> 'orchard_cancelled')::boolean
    AND (SELECT funding_state FROM public.orchards WHERE id = v_orchard) = 'cancelled',
    v_res::text);
END;
$pct_12$;

SELECT * FROM test_results ORDER BY name;
ROLLBACK;
