-- P0-5 Phase D: SQL fixture tests for Uplift orchards. BEGIN ... ROLLBACK;
-- nothing persists. Every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/phase-d-uplift-tests.sql
--
-- Fixture: Uplift orchards opened by the gosat account, filled by test
-- account A with completed PayPal bestowals (environment live; nothing is
-- sent anywhere by SQL), applied through orchard_apply_holding, the real seam.
--
-- Cases:
--   0. a non-gosat (A) cannot insert kind = uplift (42501), nor flip a kind on their own orchard
--   1. the gosat opens U1 (2 x 10): kind uplift, opened_by_gosat = the gosat
--   2. two pockets fund U1: state funded, NOT released, no release row, gosats notified, nothing owed
--   3. U2 funded with no party rows can still be cancelled (refund queued)
--   4. release U1 with parties above the sower total is refused BEFORE releasing (still funded, no rows)
--   5. release U1 to two parties (10.00 + 7.40 = 17.40): released, release row, holdings released,
--      bestowals paid_to_parties, nothing owed to the opener, one orchard_fee 2.60 live/paypal, 2 rows sending
--   6. cancel U1 now refused: uplift_parties_already_paid
--   7. DB guard: a direct extra row of 0.01 raises party_payments_exceed_sower_total
--   8. worker seam: paid is idempotent per reference and refuses another reference
--   9. three failures -> needs_human + gosat alert; void frees the amount; a corrected party pays; settled
--  10. orchard_parties_paid_v: two paid rows for U1, no destination/reference columns
--  11. liability_snapshot: uplift_unpaid 17.40 right after release, 0 once every party is paid
--  12. fund-now: A is refused; the gosat moves an open Uplift to funded with a logged note;
--      releasing it with nothing held is refused cleanly

BEGIN;
ALTER TABLE public.orchards DISABLE TRIGGER trigger_auto_generate_premium_room;
CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE fx (k text PRIMARY KEY, v text) ON COMMIT DROP;

-- as test account A: the gate refuses an Uplift
SELECT set_config('request.jwt.claims', json_build_object('sub', 'de22c876-d477-4a5e-81a2-cd22091ce125', 'role', 'authenticated')::text, true);
DO $pdt_0$
DECLARE
  v_a  uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';
  v_ok boolean := false;
  v_msg text;
  v_launch uuid;
BEGIN
  BEGIN
    INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type, orchard_kind)
    VALUES ('Phase D non-gosat uplift', 'must be refused', 'general', v_a, (SELECT id FROM public.profiles WHERE user_id = v_a), 8.69, 8.69, 10, 'active', 'USDC', 'digital', 'uplift');
  EXCEPTION WHEN insufficient_privilege THEN
    v_ok := true; v_msg := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('0a. non-gosat insert of kind uplift raises 42501 uplift_orchards_are_gosat_only',
    v_ok AND v_msg LIKE 'uplift_orchards_are_gosat_only%', COALESCE(v_msg, 'no exception'));

  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type)
  VALUES ('Phase D launch by A', 'rolled back', 'general', v_a, (SELECT id FROM public.profiles WHERE user_id = v_a), 8.69, 8.69, 10, 'active', 'USDC', 'digital')
  RETURNING id INTO v_launch;
  v_ok := false; v_msg := NULL;
  BEGIN
    UPDATE public.orchards SET orchard_kind = 'uplift' WHERE id = v_launch;
  EXCEPTION WHEN insufficient_privilege THEN
    v_ok := true; v_msg := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('0b. non-gosat cannot flip their Launch to Uplift (42501); opened_by_gosat null on a Launch',
    v_ok AND (SELECT opened_by_gosat IS NULL AND orchard_kind = 'launch' FROM public.orchards WHERE id = v_launch), COALESCE(v_msg, 'no exception'));
END;
$pdt_0$;

-- as the gosat account
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' ORDER BY user_id LIMIT 1), 'role', 'authenticated')::text, true);
DO $pdt_1$
DECLARE
  v_a        uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';  -- bestower (test account A)
  v_g        uuid := (SELECT user_id FROM public.user_roles WHERE role = 'gosat' ORDER BY user_id LIMIT 1);
  v_u1       uuid; v_u2 uuid; v_u3 uuid;
  v_o        public.orchards%ROWTYPE;
  v_id       uuid;
  v_res      jsonb;
  v_owed     numeric;
  v_fee_rows int; v_fee numeric;
  v_rows     jsonb;
  v_p1       uuid; v_p2 uuid; v_p3 uuid;
  v_ok       boolean; v_msg text;
  v_snap     numeric;
  i          int;
BEGIN
  INSERT INTO fx VALUES ('g', v_g::text);

  -- 1. open U1
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type, orchard_kind)
  VALUES ('Phase D uplift fixture U1', 'phase-d-uplift-tests.sql; rolled back', 'general', v_g, (SELECT id FROM public.profiles WHERE user_id = v_g), 17.39, 17.39, 10, 'active', 'USDC', 'digital', 'uplift')
  RETURNING id INTO v_u1;
  SELECT * INTO v_o FROM public.orchards WHERE id = v_u1;
  INSERT INTO test_results VALUES ('1. gosat opens U1: 2 pockets x 10, kind uplift, opened_by_gosat = gosat, state open',
    v_o.total_pockets = 2 AND v_o.orchard_kind = 'uplift' AND v_o.opened_by_gosat = v_g AND v_o.funding_state = 'open',
    format('pockets=%s kind=%s opened_by=%s state=%s', v_o.total_pockets, v_o.orchard_kind, v_o.opened_by_gosat, v_o.funding_state));

  -- 2. two pockets by A: funded, not released
  FOR i IN 1..2 LOOP
    INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                  provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
    VALUES (v_u1, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PD-' || i, 'gift',
            jsonb_build_object('sower_user_id', v_g, 'sower_amount', 8.70))
    RETURNING id INTO v_id;
    PERFORM public.orchard_apply_holding(v_id);
  END LOOP;
  SELECT * INTO v_o FROM public.orchards WHERE id = v_u1;
  SELECT COALESCE(sum(amount_usd), 0) INTO v_owed FROM public.owed_payout_balances() WHERE recipient_user_id = v_g;
  INSERT INTO test_results VALUES ('2. U1 funded by pockets: state funded, no release row, holdings held, gosats notified in-app, nothing owed',
    v_o.funding_state = 'funded' AND v_o.released_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.orchard_releases WHERE orchard_id = v_u1)
    AND (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_u1 AND status = 'held') = 2
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = v_g AND type = 'orchard_uplift_funded' AND (metadata ->> 'orchard_id')::uuid = v_u1)
    AND v_owed = 0,
    format('state=%s owed=%s', v_o.funding_state, v_owed));

  -- 3. U2: funded, no party rows -> cancel still allowed
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type, orchard_kind)
  VALUES ('Phase D uplift fixture U2', 'rolled back', 'general', v_g, (SELECT id FROM public.profiles WHERE user_id = v_g), 8.69, 8.69, 10, 'active', 'USDC', 'digital', 'uplift')
  RETURNING id INTO v_u2;
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES (v_u2, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PD-U2', 'gift',
          jsonb_build_object('sower_user_id', v_g, 'sower_amount', 8.70))
  RETURNING id INTO v_id;
  PERFORM public.orchard_apply_holding(v_id);
  v_res := public.orchard_cancel(v_u2, 'Phase D fixture: cancel a funded Uplift with no party rows');
  INSERT INTO test_results VALUES ('3. funded U2 with zero party rows cancels (refund queued); it was funded first',
    (v_res ->> 'cancelled')::boolean AND (v_res ->> 'refunds_queued')::int = 1
    AND (SELECT funding_state FROM public.orchards WHERE id = v_u2) = 'cancelling', v_res::text);

  -- 4. over the sower total: refused before the release
  v_res := public.orchard_uplift_release(v_u1, '[{"label":"Builder","amount":10,"destination":"EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx"},{"label":"Supplier","amount":7.41,"destination":"7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r"}]'::jsonb);
  INSERT INTO test_results VALUES ('4. parties 17.41 > sower total 17.40: exceeds_sower_total, still funded, no release row, no party rows',
    v_res ->> 'reason' = 'exceeds_sower_total' AND (v_res ->> 'sower_total')::numeric = 17.40
    AND (SELECT funding_state FROM public.orchards WHERE id = v_u1) = 'funded'
    AND NOT EXISTS (SELECT 1 FROM public.orchard_releases WHERE orchard_id = v_u1)
    AND NOT EXISTS (SELECT 1 FROM public.orchard_release_payments WHERE orchard_id = v_u1), v_res::text);
  v_res := public.orchard_uplift_release(v_u1, '[{"label":"PayPal party","amount":1,"destination":"EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx","rail":"paypal"}]'::jsonb);
  INSERT INTO test_results VALUES ('4b. a PayPal party is refused in this phase (paypal_party_payments_not_yet_available)',
    v_res ->> 'reason' = 'paypal_party_payments_not_yet_available', v_res::text);

  -- 5. the release
  v_res := public.orchard_uplift_release(v_u1, '[{"label":"Builder","amount":10,"destination":"EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx"},{"label":"Supplier","amount":7.40,"destination":"7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r"}]'::jsonb);
  v_rows := v_res -> 'rows';
  v_p1 := (v_rows -> 0 ->> 'id')::uuid; v_p2 := (v_rows -> 1 ->> 'id')::uuid;
  INSERT INTO fx VALUES ('u1', v_u1::text), ('p1', v_p1::text), ('p2', v_p2::text);
  SELECT * INTO v_o FROM public.orchards WHERE id = v_u1;
  SELECT COALESCE(sum(amount_usd), 0) INTO v_owed FROM public.owed_payout_balances() WHERE recipient_user_id = v_g;
  SELECT count(*), COALESCE(sum(amount), 0) INTO v_fee_rows, v_fee FROM public.revenue_ledger
   WHERE kind = 'orchard_fee' AND source_table = 'orchard_releases' AND source_id = (SELECT id FROM public.orchard_releases WHERE orchard_id = v_u1);
  INSERT INTO test_results VALUES ('5. release to 2 parties: ok, released_now, state released, release row 17.40/2.60, holdings released, bestowals paid_to_parties, nothing owed, one orchard_fee 2.60 live/paypal, 2 rows sending',
    (v_res ->> 'ok')::boolean AND (v_res ->> 'released_now')::boolean AND jsonb_array_length(v_rows) = 2
    AND v_o.funding_state = 'released' AND v_o.released_at IS NOT NULL
    AND (SELECT sower_total = 17.40 AND s2g_total = 2.60 AND release_trigger = 'gosat' AND released_by = v_g FROM public.orchard_releases WHERE orchard_id = v_u1)
    AND (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_u1 AND status = 'released') = 2
    AND (SELECT count(*) FROM public.bestowals WHERE orchard_id = v_u1 AND payout_status = 'paid_to_parties') = 2
    AND v_owed = 0
    AND v_fee_rows = 1 AND v_fee = 2.60
    AND (SELECT environment = 'live' AND rail = 'paypal' AND release_ref = v_u1::text FROM public.revenue_ledger
          WHERE kind = 'orchard_fee' AND source_id = (SELECT id FROM public.orchard_releases WHERE orchard_id = v_u1))
    AND (SELECT count(*) FROM public.orchard_release_payments WHERE orchard_id = v_u1 AND status = 'sending' AND environment = 'live' AND paid_by_gosat = v_g) = 2
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = v_a AND type = 'orchard_released' AND (metadata ->> 'orchard_id')::uuid = v_u1),
    format('res=%s owed=%s fee_rows=%s fee=%s', left(v_res::text, 300), v_owed, v_fee_rows, v_fee));
  SELECT (public.liability_snapshot('live') -> 'held_for_orchards' -> 'uplift_unpaid' ->> 'total')::numeric INTO v_snap;
  INSERT INTO fx VALUES ('snap_after_release', v_snap::text);

  -- 6. cancel refused now
  v_res := public.orchard_cancel(v_u1, 'Phase D fixture: must be refused');
  INSERT INTO test_results VALUES ('6. cancel after party rows exist: refused uplift_parties_already_paid with a plain message',
    NOT (v_res ->> 'cancelled')::boolean AND v_res ->> 'reason' = 'uplift_parties_already_paid' AND (v_res ->> 'party_rows')::int = 2
    AND v_res ->> 'message' LIKE 'This Uplift orchard already has 2 party payment(s)%', v_res::text);

  -- 7. DB guard
  v_ok := false; v_msg := NULL;
  BEGIN
    INSERT INTO public.orchard_release_payments (orchard_id, release_id, label, amount, destination, environment)
    VALUES (v_u1, (SELECT id FROM public.orchard_releases WHERE orchard_id = v_u1), 'One cent too many', 0.01, 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx', 'live');
  EXCEPTION WHEN OTHERS THEN
    v_ok := true; v_msg := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('7. DB guard: one extra cent raises party_payments_exceed_sower_total',
    v_ok AND v_msg LIKE 'party_payments_exceed_sower_total%', COALESCE(v_msg, 'no exception'));
  v_ok := false; v_msg := NULL;
  BEGIN
    INSERT INTO public.orchard_release_payments (orchard_id, label, amount, destination, environment)
    VALUES (v_u2, 'Not released', 1, 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx', 'live');
  EXCEPTION WHEN OTHERS THEN
    v_ok := true; v_msg := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('7b. DB guard: a party row on an unreleased orchard raises orchard_not_released',
    v_ok AND v_msg LIKE 'orchard_not_released%', COALESCE(v_msg, 'no exception'));
END;
$pdt_1$;

-- as the service role: the worker seam
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $pdt_2$
DECLARE
  v_u1 uuid := (SELECT v::uuid FROM fx WHERE k = 'u1');
  v_p1 uuid := (SELECT v::uuid FROM fx WHERE k = 'p1');
  v_p2 uuid := (SELECT v::uuid FROM fx WHERE k = 'p2');
  v_g  uuid := (SELECT v::uuid FROM fx WHERE k = 'g');
  v_r1 jsonb; v_r2 jsonb; v_r3 jsonb;
  i int;
BEGIN
  v_r1 := public.orchard_uplift_payment_paid(v_p1, 'SIG-PD-1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'fixture');
  v_r2 := public.orchard_uplift_payment_paid(v_p1, 'SIG-PD-1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'fixture again');
  v_r3 := public.orchard_uplift_payment_paid(v_p1, 'SIG-PD-OTHER-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'fixture');
  INSERT INTO test_results VALUES ('8. paid records the reference once; same reference again is a no-op; another reference is refused',
    (v_r1 ->> 'ok')::boolean AND (v_r1 ->> 'paid_total')::numeric = 10.00
    AND (v_r2 ->> 'ok')::boolean AND (v_r2 ->> 'already')::boolean
    AND NOT (v_r3 ->> 'ok')::boolean AND v_r3 ->> 'reason' = 'already_paid_with_another_reference'
    AND (SELECT status = 'paid' AND reference LIKE 'SIG-PD-1-%' AND paid_at IS NOT NULL FROM public.orchard_release_payments WHERE id = v_p1)
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_u1 AND event = 'party_paid'),
    format('r1=%s r2=%s r3=%s', v_r1, v_r2, v_r3));

  -- 9a. three failures -> needs_human + gosat alert
  FOR i IN 1..3 LOOP
    v_r1 := public.orchard_uplift_payment_fail(v_p2, 'fixture failure ' || i);
    IF i < 3 THEN
      -- a gosat retry puts it back to sending (done via orchard_uplift_release in the next block for the real path; here re-arm directly)
      UPDATE public.orchard_release_payments SET status = 'sending', claimed_at = now() WHERE id = v_p2;
    END IF;
  END LOOP;
  INSERT INTO test_results VALUES ('9a. third failure parks the row at needs_human (attempts 3) and alerts the gosats',
    (v_r1 ->> 'status') = 'needs_human'
    AND (SELECT status = 'needs_human' AND attempts = 3 FROM public.orchard_release_payments WHERE id = v_p2)
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = v_g AND type = 'orchard_party_payment_failed' AND (metadata ->> 'payment_id')::uuid = v_p2),
    v_r1::text);
END;
$pdt_2$;

-- back as the gosat: void, corrected party, then settle as the service role
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT v FROM fx WHERE k = 'g'), 'role', 'authenticated')::text, true);
DO $pdt_3$
DECLARE
  v_u1 uuid := (SELECT v::uuid FROM fx WHERE k = 'u1');
  v_p2 uuid := (SELECT v::uuid FROM fx WHERE k = 'p2');
  v_res jsonb; v_p3 uuid;
BEGIN
  v_res := public.orchard_uplift_payment_void(v_p2, 'wrong wallet given by the party');
  INSERT INTO test_results VALUES ('9b. gosat voids the parked row; it no longer counts toward the pool',
    (v_res ->> 'ok')::boolean AND (SELECT status = 'voided' AND voided_reason IS NOT NULL FROM public.orchard_release_payments WHERE id = v_p2), v_res::text);
  v_res := public.orchard_uplift_release(v_u1, '[{"label":"Supplier (corrected)","amount":7.40,"destination":"7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r"}]'::jsonb);
  v_p3 := (v_res -> 'rows' -> 0 ->> 'id')::uuid;
  INSERT INTO fx VALUES ('p3', v_p3::text);
  INSERT INTO test_results VALUES ('9c. a corrected 7.40 party fits again: ok, released_now false (idempotent), one new sending row, committed 17.40',
    (v_res ->> 'ok')::boolean AND NOT (v_res ->> 'released_now')::boolean AND jsonb_array_length(v_res -> 'rows') = 1
    AND (v_res ->> 'committed')::numeric = 17.40
    AND (SELECT count(*) FROM public.orchard_releases WHERE orchard_id = v_u1) = 1, left(v_res::text, 300));
  v_res := public.orchard_uplift_release(v_u1, '[{"label":"Too much","amount":0.01,"destination":"7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r"}]'::jsonb);
  INSERT INTO test_results VALUES ('9d. with the pool fully committed, one more cent is refused (exceeds_sower_total, remaining 0)',
    v_res ->> 'reason' = 'exceeds_sower_total' AND (v_res ->> 'remaining')::numeric = 0, v_res::text);
END;
$pdt_3$;

SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $pdt_4$
DECLARE
  v_u1 uuid := (SELECT v::uuid FROM fx WHERE k = 'u1');
  v_p3 uuid := (SELECT v::uuid FROM fx WHERE k = 'p3');
  v_a  uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';
  v_res jsonb; v_snap numeric; v_after numeric;
BEGIN
  v_res := public.orchard_uplift_payment_paid(v_p3, 'SIG-PD-3-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'fixture');
  INSERT INTO test_results VALUES ('9e. last party paid: paid_total 17.40 = sower total, uplift_settled event, bestower A told where the gifts went',
    (v_res ->> 'ok')::boolean AND (v_res ->> 'paid_total')::numeric = 17.40
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_u1 AND event = 'uplift_settled')
    AND EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = v_a AND type = 'orchard_parties_paid' AND (metadata ->> 'orchard_id')::uuid = v_u1),
    v_res::text);

  INSERT INTO test_results VALUES ('10. orchard_parties_paid_v: two paid rows summing 17.40 for U1; the view has no destination or reference column',
    (SELECT count(*) = 2 AND sum(amount) = 17.40 FROM public.orchard_parties_paid_v WHERE orchard_id = v_u1)
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orchard_parties_paid_v' AND column_name IN ('destination', 'reference')),
    (SELECT string_agg(label || ' ' || amount, ', ' ORDER BY paid_at) FROM public.orchard_parties_paid_v WHERE orchard_id = v_u1));

  v_snap := (SELECT v::numeric FROM fx WHERE k = 'snap_after_release');
  SELECT (public.liability_snapshot('live') -> 'held_for_orchards' -> 'uplift_unpaid' ->> 'total')::numeric INTO v_after;
  INSERT INTO test_results VALUES ('11. liability_snapshot uplift_unpaid: 17.40 after release, 0 once every party is paid',
    v_snap = 17.40 AND v_after = 0, format('after_release=%s after_paid=%s', v_snap, v_after));
END;
$pdt_4$;

-- 12. fund-now: refused for A, works for the gosat
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT v FROM fx WHERE k = 'g'), 'role', 'authenticated')::text, true);
DO $pdt_5$
DECLARE
  v_g uuid := (SELECT v::uuid FROM fx WHERE k = 'g');
  v_u3 uuid; v_res jsonb; v_ok boolean := false; v_msg text;
BEGIN
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type, orchard_kind)
  VALUES ('Phase D uplift fixture U3', 'rolled back', 'general', v_g, (SELECT id FROM public.profiles WHERE user_id = v_g), 8.69, 8.69, 10, 'active', 'USDC', 'digital', 'uplift')
  RETURNING id INTO v_u3;
  INSERT INTO fx VALUES ('u3', v_u3::text);
  v_res := public.orchard_uplift_fund_now(v_u3, 'Phase D fixture: top-up confirmed outside the app');
  INSERT INTO test_results VALUES ('12b. gosat fund-now: open -> funded with a funded_override event carrying the note',
    (v_res ->> 'ok')::boolean AND (SELECT funding_state = 'funded' AND funded_at IS NOT NULL FROM public.orchards WHERE id = v_u3)
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_u3 AND event = 'funded_override' AND notes LIKE '%top-up confirmed outside the app%'),
    v_res::text);
  v_res := public.orchard_uplift_release(v_u3, '[{"label":"Nobody","amount":1,"destination":"EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx"}]'::jsonb);
  INSERT INTO test_results VALUES ('12c. releasing a fund-now Uplift that holds nothing on-app is refused cleanly (no_held_holdings), no rows',
    v_res ->> 'reason' = 'no_held_holdings' AND NOT EXISTS (SELECT 1 FROM public.orchard_release_payments WHERE orchard_id = v_u3), v_res::text);
END;
$pdt_5$;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'de22c876-d477-4a5e-81a2-cd22091ce125', 'role', 'authenticated')::text, true);
DO $pdt_6$
DECLARE v_ok boolean := false; v_msg text; v_u3 uuid := (SELECT v::uuid FROM fx WHERE k = 'u3');
BEGIN
  BEGIN
    PERFORM public.orchard_uplift_fund_now(v_u3, 'A must not be able to do this');
  EXCEPTION WHEN OTHERS THEN v_ok := true; v_msg := SQLERRM;
  END;
  INSERT INTO test_results VALUES ('12a. non-gosat fund-now raises forbidden', v_ok AND v_msg = 'forbidden', COALESCE(v_msg, 'no exception'));
END;
$pdt_6$;

SELECT * FROM test_results ORDER BY name;
ROLLBACK;
