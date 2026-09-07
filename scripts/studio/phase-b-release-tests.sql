-- P0-5 Phase B: SQL fixture tests for orchard release. BEGIN ... ROLLBACK;
-- nothing persists. Every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/phase-b-release-tests.sql
--
-- Fixture: a Launch orchard sown by test account B (has a payout method and
-- consent) with 3 pockets x 10 USDC, funded by test account A with three
-- completed PayPal bestowals (2 claim pockets + 1 gift pocket), applied one
-- holding at a time through orchard_apply_holding, the real seam.
--
-- Cases:
--   1. after 2 of 3 pockets: not funded, orchard_release() refuses (not_funded), nothing owed
--   2. the 3rd holding completes the funding: release fires automatically inside
--      orchard_apply_holding (no explicit call)
--   3. every holding is released; filled_pockets = 3
--   4. the sower is now OWED the sower total through owed_payout_balances (3 x 8.70 = 26.10 on top of
--      whatever B was already owed before the fixture -- B has real owed rows since the Phase B devnet release)
--   5. exactly one orchard_fee revenue row, 3.90, environment live (PayPal), rail paypal,
--      release_ref = orchard id
--   6. gift units: orchard_stock row with 1 unit for the sower
--   7. calling orchard_release() again is a no-op (already_released), still one fee row
--   8. funding_status says released; funding_state = released; a release event exists
--   9. a fresh unfunded orchard refuses cleanly

BEGIN;
ALTER TABLE public.orchards DISABLE TRIGGER trigger_auto_generate_premium_room;
CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1), 'role', 'authenticated')::text, true);

DO $pbt_1$
DECLARE
  v_a        uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125';  -- bestower (test account A)
  v_b        uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2';  -- sower (test account B)
  v_orchard  uuid;
  v_other    uuid;
  v_o        public.orchards%ROWTYPE;
  v_best     uuid[] := ARRAY[]::uuid[];
  v_id       uuid;
  v_res      jsonb;
  v_owed     numeric;
  v_base     numeric;   -- B's owed balance before the fixture (B has real owed rows since the 2026-09-06 devnet release)
  v_fee_rows int;
  v_fee      numeric;
  v_f        record;
  i          int;
BEGIN
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type)
  VALUES ('Phase B release fixture', 'phase-b-release-tests.sql; rolled back', 'general', v_b,
          (SELECT id FROM public.profiles WHERE user_id = v_b), 26.09, 26.09, 10, 'active', 'USDC', 'physical')
  RETURNING id INTO v_orchard;
  SELECT COALESCE(sum(amount_usd), 0) INTO v_base FROM public.owed_payout_balances() WHERE recipient_user_id = v_b;
  SELECT * INTO v_o FROM public.orchards WHERE id = v_orchard;
  INSERT INTO test_results VALUES ('0. fixture: 3 pockets x 10, launch, open',
    v_o.total_pockets = 3 AND v_o.orchard_kind = 'launch' AND v_o.funding_state = 'open',
    format('total_pockets=%s kind=%s state=%s', v_o.total_pockets, v_o.orchard_kind, v_o.funding_state));

  -- Rows are inserted just before they are applied: in the live path a row
  -- is completed and applied in the same finalize call, so it never sits
  -- completed + pending (which owed_payout_balances would count).
  FOR i IN 1..2 LOOP
    INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                  provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type,
                                  delivery_address, distribution_data)
    VALUES (v_orchard, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PB-' || i, 'bestowal',
            '{"name":"A","line1":"1 Lane","city":"Cape Town","postal_code":"8001","country":"ZA"}'::jsonb,
            jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70))
    RETURNING id INTO v_id;
    v_best := array_append(v_best, v_id);
    PERFORM public.orchard_apply_holding(v_id);
  END LOOP;

  -- 1. two pockets applied: not funded, refuse, nothing owed
  v_res := public.orchard_release(v_orchard);
  SELECT COALESCE(sum(amount_usd), 0) INTO v_owed FROM public.owed_payout_balances() WHERE recipient_user_id = v_b;
  INSERT INTO test_results VALUES ('1. 2/3 pockets: release refuses (not_funded), sower owed nothing, holdings held',
    v_res ->> 'reason' = 'not_funded' AND v_owed = v_base
    AND (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_orchard AND status = 'held') = 2
    AND (SELECT funding_state FROM public.orchards WHERE id = v_orchard) = 'open',
    v_res::text);

  -- 2. the third pocket (a gift pocket) funds it: release fires inside orchard_apply_holding
  INSERT INTO public.bestowals (orchard_id, bestower_id, amount, currency, pockets_count, payment_method, payment_status,
                                provider, base_amount, buyer_total_amount, payout_status, payment_reference, pocket_type, distribution_data)
  VALUES (v_orchard, v_a, 10, 'USDC', 1, 'paypal', 'completed', 'paypal', 10, 10.49, 'pending', 'CAPTURE-PB-3', 'gift',
          jsonb_build_object('sower_user_id', v_b, 'sower_amount', 8.70))
  RETURNING id INTO v_id;
  v_best := array_append(v_best, v_id);
  PERFORM public.orchard_apply_holding(v_best[3]);
  SELECT * INTO v_o FROM public.orchards WHERE id = v_orchard;
  INSERT INTO test_results VALUES ('2. 3rd pocket: auto-release fired in the same call (no explicit release)',
    v_o.funding_state = 'released' AND v_o.released_at IS NOT NULL AND v_o.funded_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.orchard_releases WHERE orchard_id = v_orchard),
    format('state=%s released_at=%s', v_o.funding_state, v_o.released_at));

  -- 3. holdings released, count intact
  INSERT INTO test_results VALUES ('3. all 3 holdings released; filled_pockets = 3; none held',
    (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_orchard AND status = 'released') = 3
    AND (SELECT count(*) FROM public.orchard_holdings WHERE orchard_id = v_orchard AND status = 'held') = 0
    AND v_o.filled_pockets = 3,
    format('filled=%s', v_o.filled_pockets));

  -- 4. sower owed through the normal pipeline
  SELECT COALESCE(sum(amount_usd), 0) INTO v_owed FROM public.owed_payout_balances() WHERE recipient_user_id = v_b;
  INSERT INTO test_results VALUES ('4. sower owed 26.10 via owed_payout_balances (bestowals rows pending again)',
    v_owed = v_base + 26.10 AND (SELECT count(*) FROM public.bestowals WHERE orchard_id = v_orchard AND payout_status = 'pending') = 3,
    format('owed=%s base=%s', v_owed, v_base));

  -- 5. exactly one orchard_fee row
  SELECT count(*), COALESCE(sum(amount), 0) INTO v_fee_rows, v_fee FROM public.revenue_ledger
   WHERE kind = 'orchard_fee' AND source_table = 'orchard_releases'
     AND source_id = (SELECT id FROM public.orchard_releases WHERE orchard_id = v_orchard);
  INSERT INTO test_results VALUES ('5. one orchard_fee row, 3.90, live, rail paypal, release_ref = orchard id',
    v_fee_rows = 1 AND v_fee = 3.90
    AND (SELECT environment = 'live' AND rail = 'paypal' AND release_ref = v_orchard::text FROM public.revenue_ledger
          WHERE kind = 'orchard_fee' AND source_id = (SELECT id FROM public.orchard_releases WHERE orchard_id = v_orchard)),
    format('rows=%s fee=%s', v_fee_rows, v_fee));

  -- 6. gift stock
  INSERT INTO test_results VALUES ('6. gift pocket -> orchard_stock 1 unit for the sower; release row says gift_units 1',
    (SELECT units FROM public.orchard_stock WHERE orchard_id = v_orchard AND sower_user_id = v_b) = 1
    AND (SELECT gift_units FROM public.orchard_releases WHERE orchard_id = v_orchard) = 1
    AND (SELECT sower_total FROM public.orchard_releases WHERE orchard_id = v_orchard) = 26.10
    AND (SELECT s2g_total FROM public.orchard_releases WHERE orchard_id = v_orchard) = 3.90, 'ok');

  -- 7. second release is a no-op
  v_res := public.orchard_release(v_orchard);
  SELECT count(*) INTO v_fee_rows FROM public.revenue_ledger
   WHERE kind = 'orchard_fee' AND source_id = (SELECT id FROM public.orchard_releases WHERE orchard_id = v_orchard);
  INSERT INTO test_results VALUES ('7. second orchard_release is a no-op (already_released); still one fee row; still 26.10 owed',
    v_res ->> 'reason' = 'already_released' AND v_fee_rows = 1
    AND (SELECT COALESCE(sum(amount_usd), 0) FROM public.owed_payout_balances() WHERE recipient_user_id = v_b) = v_base + 26.10,
    v_res::text);

  -- 8. status + event
  SELECT * INTO v_f FROM public.orchard_funding_status(v_orchard);
  INSERT INTO test_results VALUES ('8. funding_status: funded + released; release event with the totals',
    v_f.funded AND v_f.released AND v_f.funding_state = 'released'
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_orchard AND event = 'released' AND amount = 26.10)
    AND EXISTS (SELECT 1 FROM public.orchard_events WHERE orchard_id = v_orchard AND event = 'funded'),
    format('funded=%s released=%s state=%s', v_f.funded, v_f.released, v_f.funding_state));

  -- 9. an unfunded orchard refuses
  INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency)
  VALUES ('Phase B unfunded fixture', 'rolled back', 'general', v_b, (SELECT id FROM public.profiles WHERE user_id = v_b), 100, 100, 10, 'active', 'USDC')
  RETURNING id INTO v_other;
  v_res := public.orchard_release(v_other);
  INSERT INTO test_results VALUES ('9. unfunded orchard refuses (not_funded); no release row, no fee, nothing owed',
    v_res ->> 'reason' = 'not_funded' AND NOT EXISTS (SELECT 1 FROM public.orchard_releases WHERE orchard_id = v_other), v_res::text);
END;
$pbt_1$;

SELECT * FROM test_results ORDER BY name;
ROLLBACK;
