-- Bookkeeping Phase 1: database-side tests for the revenue ledger, in the
-- style of phase-a-rpc-guard-tests.sql. BEGIN ... ROLLBACK; nothing
-- persists. Read the final SELECT: every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/revenue-ledger-tests.sql
--
-- Cases:
--   1. duplicate source: second record_revenue returns the SAME row, count stays 1
--   2. sign/direction: a cost kind is stored negative; a negative income raises;
--      a direct INSERT breaking the CHECK raises
--   3. append-only: UPDATE and DELETE raise
--   4. non-released sources are refused as a clean no-op (NULL, no row):
--      pending product sale, orchard bestowal, unknown source
--   5. revenue_summary: devnet rows are invisible to 'live'; operating_net
--      excludes opening_balance; a non-gosat caller gets 'forbidden'
--   6. correction: needs a note, gosat only, is a new row (never an edit)
--   7. Phase B seam: orchard_fee against orchard_releases is refused cleanly
--      until the table exists

BEGIN;

CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;

DO $rlt_1$
DECLARE
  v_user_a   uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125'; -- test account A (non-admin)
  v_gosat    uuid := (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1);
  v_pb       uuid;      -- a completed product sale (any)
  v_pending  uuid;      -- a pending product sale, made here
  v_orch_b   uuid;      -- an orchard bestowal (held)
  v_row1     public.revenue_ledger;
  v_row2     public.revenue_ledger;
  v_rowc     public.revenue_ledger;
  v_n        int;
  v_before   int;
  v_sum      jsonb;
  v_err      text;
  v_sower    uuid;
  v_product  uuid;
BEGIN
  SELECT id INTO v_pb FROM public.product_bestowals WHERE status = 'completed' AND s2g_fee > 0 ORDER BY created_at LIMIT 1;
  SELECT count(*) INTO v_before FROM public.revenue_ledger;

  -- 1. duplicate source -------------------------------------------------
  v_row1 := public.record_revenue('sale_fee', 0.30, 'live', 'product_bestowals', v_pb, 'paypal', NULL, now(), 'dup test');
  v_row2 := public.record_revenue('sale_fee', 0.30, 'live', 'product_bestowals', v_pb, 'paypal', NULL, now(), 'dup test again');
  SELECT count(*) INTO v_n FROM public.revenue_ledger WHERE kind = 'sale_fee' AND source_id = v_pb;
  INSERT INTO test_results VALUES ('1. duplicate source returns the same row, count stays 1',
    v_row1.id IS NOT NULL AND v_row1.id = v_row2.id AND v_n = 1,
    format('first=%s second=%s rows=%s', v_row1.id, v_row2.id, v_n));

  -- 2. sign / direction --------------------------------------------------
  v_rowc := public.record_revenue('payout_fee_cost', 0.25, 'live', 'payouts',
              (SELECT id FROM public.payouts WHERE status = 'paid' LIMIT 1), 'solana', NULL, now(), 'cost sign test');
  INSERT INTO test_results VALUES ('2a. cost kind stored negative with direction cost',
    v_rowc.id IS NOT NULL AND v_rowc.amount = -0.25 AND v_rowc.direction = 'cost',
    format('amount=%s direction=%s', v_rowc.amount, v_rowc.direction));

  BEGIN
    PERFORM public.record_revenue('sale_fee', -0.30, 'live', 'product_bestowals', v_pb);
    INSERT INTO test_results VALUES ('2b. negative income raises', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    INSERT INTO test_results VALUES ('2b. negative income raises', v_err LIKE '%must be positive%', v_err);
  END;

  BEGIN
    INSERT INTO public.revenue_ledger (kind, direction, amount, environment) VALUES ('sale_fee', 'income', -1, 'live');
    INSERT INTO test_results VALUES ('2c. direct INSERT breaking the sign CHECK raises', false, 'no error');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO test_results VALUES ('2c. direct INSERT breaking the sign CHECK raises', true, SQLERRM);
  END;

  -- 3. append-only -------------------------------------------------------
  BEGIN
    UPDATE public.revenue_ledger SET amount = 99 WHERE id = v_row1.id;
    INSERT INTO test_results VALUES ('3a. UPDATE refused', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('3a. UPDATE refused', SQLERRM LIKE '%append_only%', SQLERRM);
  END;
  BEGIN
    DELETE FROM public.revenue_ledger WHERE id = v_row1.id;
    INSERT INTO test_results VALUES ('3b. DELETE refused', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('3b. DELETE refused', SQLERRM LIKE '%append_only%', SQLERRM);
  END;

  -- 4. non-released sources ---------------------------------------------
  SELECT sower_id, product_id INTO v_sower, v_product FROM public.product_bestowals WHERE id = v_pb;
  INSERT INTO public.product_bestowals (bestower_id, product_id, sower_id, amount, s2g_fee, sower_amount, grower_amount, status, payment_method)
  VALUES (v_user_a, v_product, v_sower, 2.30, 0.30, 2.00, 0, 'pending', 'solana') RETURNING id INTO v_pending;
  v_row1 := public.record_revenue('sale_fee', 0.30, 'live', 'product_bestowals', v_pending);
  INSERT INTO test_results VALUES ('4a. pending product sale refused (NULL, no row)',
    v_row1.id IS NULL AND NOT EXISTS (SELECT 1 FROM public.revenue_ledger WHERE source_id = v_pending), 'null + no row');

  SELECT id INTO v_orch_b FROM public.bestowals WHERE orchard_id IS NOT NULL AND payment_status = 'completed' LIMIT 1;
  IF v_orch_b IS NOT NULL THEN
    v_row1 := public.record_revenue('gift_fee', 1.30, 'devnet', 'bestowals', v_orch_b);
    INSERT INTO test_results VALUES ('4b. orchard bestowal refused as a gift fee (held until Phase B)',
      v_row1.id IS NULL AND NOT EXISTS (SELECT 1 FROM public.revenue_ledger WHERE source_id = v_orch_b), 'null + no row');
  ELSE
    INSERT INTO test_results VALUES ('4b. orchard bestowal refused as a gift fee', true, 'skipped: no completed orchard bestowal exists');
  END IF;

  BEGIN
    PERFORM public.record_revenue('sale_fee', 0.30, 'live', 'nonsense_table', v_pb);
    INSERT INTO test_results VALUES ('4c. unknown source table raises', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    INSERT INTO test_results VALUES ('4c. unknown source table raises', v_err LIKE '%not a valid source%', v_err);
  END;

  -- 5. revenue_summary --------------------------------------------------
  -- act as a gosat (auth.uid() reads request.jwt.claims)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_gosat, 'role', 'authenticated')::text, true);
  v_sum := public.revenue_summary(NULL, 'live');
  INSERT INTO test_results VALUES ('5a. live summary: net = income + cost, operating_net excludes opening_balance',
    (v_sum->>'net')::numeric = round((v_sum->>'income_total')::numeric + (v_sum->>'cost_total')::numeric, 2)
    AND (v_sum->>'operating_net')::numeric = round((v_sum->>'net')::numeric - COALESCE((v_sum->'by_kind'->>'opening_balance')::numeric, 0), 2),
    v_sum::text);
  INSERT INTO test_results VALUES ('5b. live summary has no devnet money: the devnet-tagged sales are absent',
    (SELECT round(sum(amount), 2) FROM public.revenue_ledger WHERE environment = 'live' AND kind = 'sale_fee')
      = COALESCE((v_sum->'by_kind'->>'sale_fee')::numeric, 0)
    AND (SELECT count(*) FROM public.revenue_ledger WHERE environment = 'devnet') > 0,
    format('live sale_fee=%s devnet rows=%s', v_sum->'by_kind'->>'sale_fee', (SELECT count(*) FROM public.revenue_ledger WHERE environment = 'devnet')));
  v_sum := public.revenue_summary(NULL, 'devnet');
  INSERT INTO test_results VALUES ('5c. devnet summary shows only devnet rows',
    (v_sum->>'rows')::int = (SELECT count(*) FROM public.revenue_ledger WHERE environment = 'devnet'), v_sum::text);

  -- 6. correction (gosat only, note mandatory, new row) ------------------
  v_rowc := public.record_revenue_correction(-0.10, 'test: reverse a fee recorded on test money', 'rlt-correction-1', 'live');
  INSERT INTO test_results VALUES ('6a. gosat correction is a new negative row',
    v_rowc.id IS NOT NULL AND v_rowc.kind = 'correction' AND v_rowc.amount = -0.10 AND v_rowc.created_by = v_gosat, v_rowc.id::text);
  BEGIN
    PERFORM public.record_revenue_correction(-0.10, 'short', 'rlt-correction-2', 'live');
    INSERT INTO test_results VALUES ('6b. correction without a real note raises', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('6b. correction without a real note raises', SQLERRM LIKE '%needs_note%', SQLERRM);
  END;

  -- act as test account A (no roles)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.revenue_summary(NULL, 'live');
    INSERT INTO test_results VALUES ('5d. non-gosat revenue_summary is forbidden', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('5d. non-gosat revenue_summary is forbidden', SQLERRM = 'forbidden', SQLERRM);
  END;
  BEGIN
    PERFORM public.record_revenue_correction(-0.10, 'test account A must not be able to do this', 'rlt-correction-3', 'live');
    INSERT INTO test_results VALUES ('6c. non-gosat correction is forbidden', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('6c. non-gosat correction is forbidden', SQLERRM = 'forbidden', SQLERRM);
  END;
  PERFORM set_config('request.jwt.claims', '', true);

  -- 7. Phase B seam ------------------------------------------------------
  v_row1 := public.record_revenue('orchard_fee', 1.30, 'devnet', 'orchard_releases', gen_random_uuid());
  INSERT INTO test_results VALUES ('7. orchard_fee refused cleanly until orchard_releases exists (Phase B seam)',
    v_row1.id IS NULL, CASE WHEN to_regclass('public.orchard_releases') IS NULL THEN 'table absent, NULL returned' ELSE 'table exists: unknown id refused' END);
END;
$rlt_1$;

SELECT * FROM test_results ORDER BY name;

ROLLBACK;
