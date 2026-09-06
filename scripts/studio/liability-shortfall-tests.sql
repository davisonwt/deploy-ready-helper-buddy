-- Bookkeeping Phase 2: database-side tests for the liability view.
-- BEGIN ... ROLLBACK; nothing persists. Every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/liability-shortfall-tests.sql
--
-- Cases:
--   1. the snapshot's totals add up (owed + parked + orchards = liabilities_total)
--   2. environment isolation: a devnet holding is absent from 'live' and present in 'devnet'
--   3. shortfall fixture: a 1,000 USDC LIVE holding inserted for the test makes
--      treasury_verdict(<today's live cash>, <new liabilities>) RED, and the
--      snapshot's liabilities grow by exactly 1,000
--   4. verdict math: GREEN when covered, RED on shortfall, tolerance rule
--   5. access: a non-gosat caller is forbidden; a gosat can record a movement,
--      a non-gosat cannot; a movement without a note is refused

-- liability_snapshot() is gosat/admin-only; when this runs as the postgres role there is no JWT, so act as a gosat.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, false);

BEGIN;

ALTER TABLE public.orchards DISABLE TRIGGER trigger_auto_generate_premium_room;
CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;

DO $lst_1$
DECLARE
  v_user_a   uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';   -- test account A (non-admin)
  v_user_b   uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2';   -- test account B (sower of the test orchard)
  v_gosat    uuid := (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1);
  v_live     jsonb;
  v_devnet   jsonb;
  v_live2    jsonb;
  v_orchard  uuid;
  v_best     uuid;
  v_hold     uuid;
  v_liab     numeric;
  v_liab2    numeric;
  v_verdict  jsonb;
  v_mv       public.treasury_movements;
BEGIN
  v_live := public.liability_snapshot('live');
  v_devnet := public.liability_snapshot('devnet');

  -- 1. totals add up
  INSERT INTO test_results VALUES ('1. liabilities_total = owed + parked + held_for_orchards',
    (v_live->>'liabilities_total')::numeric
      = round((v_live->'held_for_members'->'owed'->>'total')::numeric + (v_live->'held_for_members'->'parked'->>'total')::numeric
              + (v_live->'held_for_orchards'->>'total')::numeric, 2),
    format('live: owed=%s parked=%s orchards=%s total=%s', v_live->'held_for_members'->'owed'->>'total',
           v_live->'held_for_members'->'parked'->>'total', v_live->'held_for_orchards'->>'total', v_live->>'liabilities_total'));

  -- 2. environment isolation (the 2026-09-06 devnet pocket is the fixture if present)
  INSERT INTO test_results VALUES ('2. devnet holdings are absent from live and present in devnet',
    (v_devnet->'held_for_orchards'->>'total')::numeric >= 0
    AND ((v_live->'other_environments'->'devnet'->>'held_for_orchards')::numeric IS NOT DISTINCT FROM
         NULLIF((v_devnet->'held_for_orchards'->>'total')::numeric, 0)),
    format('live.other.devnet.held=%s devnet.held=%s', v_live->'other_environments'->'devnet'->>'held_for_orchards', v_devnet->'held_for_orchards'->>'total'));

  -- 3. shortfall fixture: a LIVE 1,000 USDC holding on a temporary orchard
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency)
  VALUES ('Shortfall fixture orchard', 'liability-shortfall-tests.sql; rolled back', 'general', v_user_b,
          (SELECT id FROM public.profiles WHERE user_id = v_user_b), 1000, 1000, 1000, 'active', 'USDC')
  RETURNING id INTO v_orchard;
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES (v_orchard, v_user_a, 1000, 'USDC', 1, 'paypal', 'completed', 'paypal', 1000, 1000, 'pending', 'FIXTURE-CAPTURE', 'gift',
          jsonb_build_object('sower_user_id', v_user_b, 'sower_amount', round(1000 / 1.15, 2)))
  RETURNING id INTO v_best;
  -- provider paypal => payment_environment() says live (no app_settings override)
  v_hold := public.orchard_apply_holding(v_best);
  v_live2 := public.liability_snapshot('live');
  v_liab := (v_live->>'liabilities_total')::numeric;
  v_liab2 := (v_live2->>'liabilities_total')::numeric;
  INSERT INTO test_results VALUES ('3a. a live 1,000 holding raises live liabilities by exactly 1,000',
    v_hold IS NOT NULL AND v_liab2 = round(v_liab + 1000, 2), format('before=%s after=%s', v_liab, v_liab2));

  -- today's live cash on hand at the time of writing: 5.62 USDC hot wallet, nothing elsewhere; PayPal unknown -> 0
  v_verdict := public.treasury_verdict(5.62, v_liab2, (v_live2->'s2g_own'->>'operating_net')::numeric,
                                       (v_live2->'unrecorded'->>'solana_processor_fees')::numeric, (v_live2->'recorded_float'->>'total')::numeric);
  INSERT INTO test_results VALUES ('3b. verdict on the forced shortfall is RED with the shortfall stated',
    v_verdict->>'verdict' = 'RED' AND (v_verdict->>'shortfall')::numeric = round(v_liab2 - 5.62, 2), v_verdict::text);

  -- 4. verdict math
  v_verdict := public.treasury_verdict(100, 60, 20, 1, 19);
  INSERT INTO test_results VALUES ('4a. GREEN when covered and explained', v_verdict->>'verdict' = 'GREEN' AND (v_verdict->>'unexplained')::numeric = 0
    AND (v_verdict->>'unexplained_beyond_tolerance')::boolean = false, v_verdict::text);
  v_verdict := public.treasury_verdict(30, 20, -12.05);
  INSERT INTO test_results VALUES ('4b. negative recognised revenue counts as 0; unexplained = 10',
    (v_verdict->>'s2g_own')::numeric = 0 AND (v_verdict->>'unexplained')::numeric = 10, v_verdict::text);
  v_verdict := public.treasury_verdict(1006, 500, 0, 0, 0, 2);
  INSERT INTO test_results VALUES ('4c. tolerance: GREEN but flagged beyond tolerance',
    v_verdict->>'verdict' = 'GREEN' AND (v_verdict->>'unexplained_beyond_tolerance')::boolean = true, v_verdict::text);
  INSERT INTO test_results VALUES ('4d. default tolerance = max(1.00, 1% of expected)',
    (public.treasury_verdict(10, 5, 0)->>'tolerance')::numeric = 1.00 AND (public.treasury_verdict(1000, 500, 0)->>'tolerance')::numeric = 5.00, 'ok');

  -- 5. access
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_gosat, 'role', 'authenticated')::text, true);
  v_mv := public.record_treasury_movement('float_in', 'hot', 1.00, 'test: 1.00 USDC seeded float, rolled back');
  INSERT INTO test_results VALUES ('5a. gosat can record a movement with a note', v_mv.id IS NOT NULL AND v_mv.created_by = v_gosat, v_mv.id::text);
  BEGIN
    PERFORM public.record_treasury_movement('float_in', 'hot', 1.00, 'short');
    INSERT INTO test_results VALUES ('5b. movement without a real note is refused', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('5b. movement without a real note is refused', SQLERRM LIKE '%needs_note%', SQLERRM);
  END;
  v_live2 := public.liability_snapshot('live');
  INSERT INTO test_results VALUES ('5c. the movement shows in recorded_float',
    (v_live2->'recorded_float'->>'total')::numeric = round((v_live->'recorded_float'->>'total')::numeric + 1.00, 2), v_live2->'recorded_float'::text);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.liability_snapshot('live');
    INSERT INTO test_results VALUES ('5d. non-gosat snapshot is forbidden', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('5d. non-gosat snapshot is forbidden', SQLERRM = 'forbidden', SQLERRM);
  END;
  BEGIN
    PERFORM public.record_treasury_movement('float_in', 'hot', 1.00, 'test account A must not be able to do this');
    INSERT INTO test_results VALUES ('5e. non-gosat movement is forbidden', false, 'no error');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('5e. non-gosat movement is forbidden', SQLERRM = 'forbidden', SQLERRM);
  END;
  PERFORM set_config('request.jwt.claims', '', true);
END;
$lst_1$;

SELECT * FROM test_results ORDER BY name;

ROLLBACK;
