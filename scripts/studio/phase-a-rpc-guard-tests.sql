-- P0-5 Phase A: SQL fixture tests for the two guards, in the style of
-- scripts/s2g-balance-flag-tests.sql. Everything is wrapped in
-- BEGIN ... ROLLBACK; nothing persists. Run the whole file in one Studio
-- session and read the final SELECT: every row must say pass = true.
--
-- Self-contained: builds its own temporary orchard (10 pockets x $10) with
-- test account A as sower, so it runs on an empty database. To get past
-- the BEFORE INSERT settlement-consent gate it inserts a consent row for A
-- at the current version; that row is rolled back with everything else.
--
-- Cases:
--   1. credit_earning_for_gift_bestowal() REFUSES an orchard row: the row
--      stays payout_status = 'pending' and no balance_ledger row appears,
--      whatever the s2g_balance_enabled flag says.
--   2. orchard_apply_holding() creates exactly one held holding for a
--      completed orchard bestowal, is idempotent on a second call, and the
--      trigger sets orchards.filled_pockets to the pockets bought.
--   3. orchard_funding_status() reports the holding and target = total_pockets x pocket_price.
--   4. orchard_apply_holding() does nothing for a non-orchard bestowal.
--   5. Filling the remaining pockets makes funded = true and stops there
--      (Phase A releases nothing).

BEGIN;

-- The legacy "orchard complete -> create a premium chat room" trigger would
-- fire in case 5. It is the pre-Phase-B completion side effect and not
-- under test here; disabling it is transactional and undone by ROLLBACK.
ALTER TABLE public.orchards DISABLE TRIGGER trigger_auto_generate_premium_room;

CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;

DO $$
DECLARE
  v_user      uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125'; -- test account A (sower AND bestower here)
  v_profile   uuid;
  v_orchard   uuid;
  v_o         public.orchards%ROWTYPE;
  v_b         uuid;
  v_b2        uuid;
  v_gift      uuid;
  v_holding1  uuid;
  v_holding2  uuid;
  v_status    text;
  v_ledger    int;
  v_filled    int;
  v_funding   record;
  v_flag      jsonb;
BEGIN
  -- Fixture: consent for A (gate on orchards INSERT), then the orchard.
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = v_user;
  IF v_profile IS NULL THEN
    INSERT INTO test_results VALUES ('fixture', false, 'test account A has no profiles row');
    RETURN;
  END IF;
  INSERT INTO public.settlement_consents (user_id, version, accepted_at, ip)
  SELECT v_user, public.get_settlement_consent_version(), now(), 'phase-a-test'
  WHERE NOT public.has_accepted_settlement_consent(v_user);

  INSERT INTO public.orchards (title, description, category, user_id, profile_id,
                               seed_value, original_seed_value, pocket_price, status, currency)
  VALUES ('Phase A test orchard', 'Temporary orchard created by phase-a-rpc-guard-tests.sql; rolled back.',
          'general', v_user, v_profile, 100, 100, 10, 'active', 'USDC')
  RETURNING id INTO v_orchard;
  SELECT * INTO v_o FROM public.orchards WHERE id = v_orchard;
  INSERT INTO test_results VALUES ('0. fixture orchard: 10 pockets x $10', v_o.total_pockets = 10 AND v_o.pocket_price = 10,
                                   format('total_pockets=%s pocket_price=%s filled=%s', v_o.total_pockets, v_o.pocket_price, v_o.filled_pockets));

  -- A completed orchard pocket bestowal (2 pockets), as create-orchard-bestowal-order + finalize would leave it.
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type,
                                distribution_data)
  VALUES (v_orchard, v_user, 20, 'USDC', 2, 'solana', 'completed',
          'solana', 20, 20, 'pending', 'TESTSIG-phase-a', 'gift',
          jsonb_build_object('sower_user_id', v_user, 'sower_amount', round(20 / 1.15, 2)))
  RETURNING id INTO v_b;

  -- Case 1: the gift credit must refuse the orchard row, flag on or off.
  SELECT value INTO v_flag FROM public.app_settings WHERE key = 's2g_balance_enabled';
  UPDATE public.app_settings SET value = 'true'::jsonb WHERE key = 's2g_balance_enabled';
  PERFORM public.credit_earning_for_gift_bestowal(v_b, NULL);
  SELECT payout_status INTO v_status FROM public.bestowals WHERE id = v_b;
  SELECT count(*) INTO v_ledger FROM public.balance_ledger WHERE reference_table = 'bestowals' AND reference_id = v_b;
  INSERT INTO test_results VALUES ('1. credit RPC refuses orchard row (flag ON)', v_status = 'pending' AND v_ledger = 0,
                                   format('payout_status=%s ledger_rows=%s', v_status, v_ledger));
  UPDATE public.app_settings SET value = COALESCE(v_flag, 'false'::jsonb) WHERE key = 's2g_balance_enabled';

  -- Case 2: apply holding, twice.
  v_holding1 := public.orchard_apply_holding(v_b);
  v_holding2 := public.orchard_apply_holding(v_b);
  SELECT filled_pockets INTO v_filled FROM public.orchards WHERE id = v_orchard;
  SELECT payout_status INTO v_status FROM public.bestowals WHERE id = v_b;
  INSERT INTO test_results VALUES ('2a. one held holding, idempotent',
      v_holding1 IS NOT NULL AND v_holding1 = v_holding2
      AND (SELECT count(*) FROM public.orchard_holdings WHERE bestowal_id = v_b AND status = 'held') = 1,
      format('holding=%s second_call=%s', v_holding1, v_holding2));
  INSERT INTO test_results VALUES ('2b. filled_pockets = 2 via trigger', v_filled = 2, format('filled_pockets=%s', v_filled));
  INSERT INTO test_results VALUES ('2c. row marked held_for_orchard, not credited', v_status = 'held_for_orchard', v_status);
  INSERT INTO test_results VALUES ('2d. holding carries kind, rail, reference and a held S2G share',
      (SELECT pocket_type = 'gift' AND rail = 'solana' AND rail_reference = 'TESTSIG-phase-a'
              AND gross_amount = 20 AND sower_amount = round(20 / 1.15, 2) AND s2g_amount = round(20 - round(20 / 1.15, 2), 2)
       FROM public.orchard_holdings WHERE id = v_holding1),
      (SELECT format('gross=%s sower=%s s2g=%s', gross_amount, sower_amount, s2g_amount) FROM public.orchard_holdings WHERE id = v_holding1));

  -- Case 3: funding status
  SELECT * INTO v_funding FROM public.orchard_funding_status(v_orchard);
  INSERT INTO test_results VALUES ('3. funding status: target 100, held 20, pockets 2/10, not funded',
      v_funding.target = 100 AND v_funding.held_total = 20 AND v_funding.pockets_held = 2
      AND v_funding.pockets_total = 10 AND v_funding.funded = false,
      format('target=%s held=%s pockets=%s/%s funded=%s', v_funding.target, v_funding.held_total, v_funding.pockets_held, v_funding.pockets_total, v_funding.funded));

  -- Case 4: a plain gift (no orchard) gets no holding.
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status)
  VALUES (NULL, v_user, 5, 'USDC', 1, 'solana', 'completed', 'solana', 5, 5, 'pending')
  RETURNING id INTO v_gift;
  INSERT INTO test_results VALUES ('4. non-orchard gift: no holding', public.orchard_apply_holding(v_gift) IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.orchard_holdings WHERE bestowal_id = v_gift), 'null + no row');

  -- Case 5: fill the remaining 8 pockets -> funded, nothing released.
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type,
                                distribution_data)
  VALUES (v_orchard, v_user, 80, 'USDC', 8, 'paypal', 'completed',
          'paypal', 80, 80, 'pending', 'CAPTURE-phase-a', 'bestowal',
          jsonb_build_object('sower_user_id', v_user, 'sower_amount', round(80 / 1.15, 2)))
  RETURNING id INTO v_b2;
  PERFORM public.orchard_apply_holding(v_b2);
  SELECT * INTO v_funding FROM public.orchard_funding_status(v_orchard);
  SELECT filled_pockets INTO v_filled FROM public.orchards WHERE id = v_orchard;
  INSERT INTO test_results VALUES ('5. fully funded: held 100 = target, pockets 10/10, funded = true, all holdings still held',
      v_funding.funded = true AND v_funding.held_total = 100 AND v_funding.pockets_held = 10 AND v_filled = 10
      AND (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_orchard AND status = 'held') = 2
      AND (SELECT count(*) FROM public.balance_ledger WHERE reference_table = 'bestowals' AND reference_id IN (v_b, v_b2)) = 0,
      format('held=%s pockets=%s/%s funded=%s filled=%s', v_funding.held_total, v_funding.pockets_held, v_funding.pockets_total, v_funding.funded, v_filled));
END;
$$;

SELECT * FROM test_results ORDER BY name;

ROLLBACK;
