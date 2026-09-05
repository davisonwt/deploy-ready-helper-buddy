-- P0-5 Phase A: SQL fixture tests for the two guards, in the style of
-- scripts/s2g-balance-flag-tests.sql. Everything is wrapped in
-- BEGIN ... ROLLBACK; nothing persists. Run the whole file in one Studio
-- session and read the final SELECT: every row must say pass = true.
--
-- Cases:
--   1. credit_earning_for_gift_bestowal() REFUSES an orchard row: the row
--      stays payout_status = 'pending' and no balance_ledger row appears,
--      whatever the s2g_balance_enabled flag says.
--   2. orchard_apply_holding() creates exactly one held holding for a
--      completed orchard bestowal, is idempotent on a second call, and the
--      trigger bumps orchards.filled_pockets by the pockets bought.
--   3. orchard_funding_status() reports the holding and target = total_pockets x pocket_price.
--   4. orchard_apply_holding() does nothing for a non-orchard bestowal.
--
-- Fixture: the newest ACTIVE orchard and test account A as the bestower.
-- Real rows are only read; the bestowal rows inserted here are rolled back.

BEGIN;

CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;

DO $$
DECLARE
  v_orchard   public.orchards%ROWTYPE;
  v_bestower  uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125'; -- test account A
  v_b         uuid;
  v_gift      uuid;
  v_holding1  uuid;
  v_holding2  uuid;
  v_status    text;
  v_ledger    int;
  v_filled_before int;
  v_filled_after  int;
  v_funding   record;
  v_flag      jsonb;
BEGIN
  SELECT * INTO v_orchard FROM public.orchards WHERE status = 'active' AND total_pockets > 0 ORDER BY created_at DESC LIMIT 1;
  IF v_orchard.id IS NULL THEN
    INSERT INTO test_results VALUES ('fixture', false, 'no active orchard with pockets');
    RETURN;
  END IF;
  v_filled_before := COALESCE(v_orchard.filled_pockets, 0);

  -- A completed orchard pocket bestowal (2 pockets), as create-orchard-bestowal-order + finalize would leave it.
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type,
                                distribution_data)
  VALUES (v_orchard.id, v_bestower, v_orchard.pocket_price * 2, 'USDC', 2, 'solana', 'completed',
          'solana', v_orchard.pocket_price * 2, v_orchard.pocket_price * 2, 'pending', 'TESTSIG-phase-a', 'gift',
          jsonb_build_object('sower_user_id', v_orchard.user_id, 'sower_amount', round(v_orchard.pocket_price * 2 / 1.15, 2)))
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
  SELECT filled_pockets INTO v_filled_after FROM public.orchards WHERE id = v_orchard.id;
  SELECT payout_status INTO v_status FROM public.bestowals WHERE id = v_b;
  INSERT INTO test_results VALUES ('2a. one held holding, idempotent',
      v_holding1 IS NOT NULL AND v_holding1 = v_holding2
      AND (SELECT count(*) FROM public.orchard_holdings WHERE bestowal_id = v_b AND status = 'held') = 1,
      format('holding=%s second_call=%s', v_holding1, v_holding2));
  INSERT INTO test_results VALUES ('2b. filled_pockets +2 via trigger', v_filled_after = v_filled_before + 2,
                                   format('before=%s after=%s', v_filled_before, v_filled_after));
  INSERT INTO test_results VALUES ('2c. row marked held_for_orchard, not credited', v_status = 'held_for_orchard', v_status);
  INSERT INTO test_results VALUES ('2d. holding carries pocket_type and reference',
      (SELECT pocket_type = 'gift' AND rail = 'solana' AND rail_reference = 'TESTSIG-phase-a' AND s2g_amount > 0
       FROM public.orchard_holdings WHERE id = v_holding1), 'gift/solana/TESTSIG');

  -- Case 3: funding status
  SELECT * INTO v_funding FROM public.orchard_funding_status(v_orchard.id);
  INSERT INTO test_results VALUES ('3. funding status counts the holding and computes target',
      v_funding.pockets_held >= 2
      AND v_funding.target = round(v_orchard.total_pockets * v_orchard.pocket_price, 2)
      AND v_funding.held_total >= round(v_orchard.pocket_price * 2, 2),
      format('target=%s held=%s pockets=%s/%s funded=%s', v_funding.target, v_funding.held_total, v_funding.pockets_held, v_funding.pockets_total, v_funding.funded));

  -- Case 4: a plain gift (no orchard) gets no holding.
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status)
  VALUES (NULL, v_bestower, 5, 'USDC', 1, 'solana', 'completed', 'solana', 5, 5, 'pending')
  RETURNING id INTO v_gift;
  INSERT INTO test_results VALUES ('4. non-orchard gift: no holding', public.orchard_apply_holding(v_gift) IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.orchard_holdings WHERE bestowal_id = v_gift), 'null + no row');
END;
$$;

SELECT * FROM test_results ORDER BY name;

ROLLBACK;
